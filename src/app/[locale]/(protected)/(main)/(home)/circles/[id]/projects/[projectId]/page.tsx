'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';

import { ButtonType1 } from '@/components/custom/button';
import { EmptyState, ErrorState } from '@/components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, useRouter } from '@/i18n/navigation';
import { CIRCLE_COLUMN_CLASS } from '@/lib/feedColumnLayout';
import { useUserStore } from '@/store/useUserStore';
import { circleUserDisplayName, useCircleUsers } from '@/hooks/useCircleUsers';
import {
  CIRCLE_CHAT,
  CIRCLE_CONTRIBUTIONS,
  CIRCLE_PROJECT,
  CIRCLE_PROJECT_GOALS,
} from '@/services/gql/circles';
import { GET_MESSAGES } from '@/services/gql/messaging';
import type { GetMessagesData } from '@/services/gql/types/messaging';
import type {
  CircleChatData,
  CircleContributionsData,
  CircleContributionsVariables,
  CircleProjectData,
  CircleProjectGoalsData,
  CircleProjectGoalsVariables,
  CircleProjectVariables,
} from '@/services/gql/types/circles';
import {
  AddGoalForm,
  ContributionsPanel,
  GoalProgressPanel,
  ProjectDiscussion,
  ProjectHeader,
} from '@/components/circles/project';

/** One ledger page. "See all" grows the limit rather than merging pages, so no
 *  cache field policy is needed and the list can never show a torn total. */
const CONTRIBUTIONS_PAGE = 25;

/**
 * Screen 5 — Project detail.
 *
 * Identity, description, overall progress and the discussion on the left; the
 * contribution ledger and the Contribute CTA in a rail on the right.
 *
 * ## The two things this screen has to get right
 *
 * **Progress is read, never computed.** `circleGoalProgress` returns a SUM over
 * the whole append-only ledger. The contributions rail beside it is paged, so
 * adding up what is on screen would under-report the moment a project outgrows
 * one page. `GoalProgressPanel` owns that query; nothing here totals anything.
 *
 * **Money and metrics are different types wearing the same shape.** Only an
 * `AMOUNT` goal is money — see `components/circles/project/metric.ts`, which is
 * the single place that branch is decided, and the single ÷100 on the way out.
 *
 * ## Why the two columns are laid out this way
 *
 * The rail is not supplementary the way `PeopleYouMayKnow` is on the post page,
 * so it is NOT `hidden lg:block` — contributing is the point of the screen and
 * a phone must reach it. Instead the shell scrolls as one column on mobile and
 * splits into two independently-scrolling columns at `lg`, which keeps every
 * block mounted exactly once. Rendering the rail twice behind `lg:hidden` /
 * `hidden lg:block` would mount two `ContributeForm`s, each minting its own
 * idempotency key — and that key is the only thing standing between a retry and
 * a double-counted ledger row.
 */
export default function CircleProjectPage() {
  const t = useTranslations('circles');
  const router = useRouter();
  const params = useParams();

  const circleId = String(params?.id ?? '');
  const projectId = String(params?.projectId ?? '');
  const currentUserId = useUserStore((state) => state.user?.userId) ?? null;

  const [limit, setLimit] = useState(CONTRIBUTIONS_PAGE);
  const [addingGoal, setAddingGoal] = useState(false);

  const {
    data: projectData,
    loading: projectLoading,
    error: projectError,
    refetch: refetchProject,
  } = useQuery<CircleProjectData, CircleProjectVariables>(CIRCLE_PROJECT, {
    variables: { circleId, projectId },
    skip: !circleId || !projectId,
    errorPolicy: 'all',
  });

  const { data: goalsData, loading: goalsLoading } = useQuery<
    CircleProjectGoalsData,
    CircleProjectGoalsVariables
  >(CIRCLE_PROJECT_GOALS, {
    variables: { circleId, projectId },
    skip: !circleId || !projectId,
    errorPolicy: 'all',
  });

  const project = projectData?.circleProject ?? null;
  const goals = useMemo(() => goalsData?.circleProjectGoals ?? [], [goalsData]);

  /*
   * A goal carries no title of its own, so a project realistically has one.
   * The first is treated as primary: it owns the "Overall progress" label, the
   * ledger beside it, and the Contribute CTA. Any further goals still render
   * their own progress bar (each panel fetches its own progress) so nothing is
   * hidden — they simply have no ledger of their own on this screen.
   */
  const primaryGoal = goals[0] ?? null;

  const { data: contributionsData, loading: contributionsLoading } = useQuery<
    CircleContributionsData,
    CircleContributionsVariables
  >(CIRCLE_CONTRIBUTIONS, {
    variables: { circleId, goalId: primaryGoal?.id ?? '', limit },
    skip: !circleId || !primaryGoal,
    errorPolicy: 'all',
  });

  const contributions = useMemo(
    () => contributionsData?.circleContributions ?? [],
    [contributionsData],
  );

  /*
   * A project has no thread of its own — it is proposed and argued in the
   * circle chat — so the discussion link goes there and counts that. Both reads
   * are `cache-first`: the circle home issues the identical queries, and a
   * message count is not worth a round trip on a detail screen.
   */
  const { data: chatData } = useQuery<CircleChatData>(CIRCLE_CHAT, {
    variables: { circleId },
    skip: !circleId,
    fetchPolicy: 'cache-first',
    errorPolicy: 'all',
  });

  const conversationId = chatData?.circleChat?.available
    ? chatData.circleChat.conversationId
    : null;

  const { data: messagesData } = useQuery<GetMessagesData>(GET_MESSAGES, {
    variables: { conversationId: conversationId ?? '', limit: 1, offset: 0 },
    skip: !conversationId,
    fetchPolicy: 'cache-first',
    errorPolicy: 'all',
  });

  // A full page back means there may be more; a short page is the end of the
  // ledger. Contributors and the proposer are resolved in one pass.
  const hasMore = contributions.length === limit;

  const userIds = useMemo(() => {
    const ids = contributions.map((c) => c.contributorUserId);
    if (project?.createdBy) ids.push(project.createdBy);
    return ids;
  }, [contributions, project?.createdBy]);

  const { usersById } = useCircleUsers(userIds);

  const proposerName = project?.createdBy
    ? circleUserDisplayName(usersById[project.createdBy], t('common.loading'))
    : null;

  /*
   * Back arrow. Icon-only with a generic accessible name rather than the page
   * title — labelling it "Project" would announce it as a link TO this page,
   * which is where the reader already is.
   */
  const header = (
    <div className="mb-4 flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => router.push(`/circles/${circleId}`)}
        aria-label={t('common.back')}
        className="cursor-pointer rounded-full p-1.5 text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
      >
        <ArrowLeft className="size-5" />
      </button>
    </div>
  );

  const loading = projectLoading || goalsLoading;

  if (loading && !project) {
    return (
      <div className="h-app-inner flex overflow-hidden">
        <div className={CIRCLE_COLUMN_CLASS}>
          {header}
          <Skeleton className="mb-3 h-6 w-40 rounded-full" />
          <Skeleton className="mb-3 h-8 w-3/4" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-6 h-4 w-2/3" />
          <Skeleton className="mb-6 h-14 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (projectError && !project) {
    return (
      <div className="h-app-inner flex overflow-hidden">
        <div className={CIRCLE_COLUMN_CLASS}>
          {header}
          <ErrorState
            title={t('errors.loadProject')}
            retryLabel={t('common.retry')}
            onRetry={() => void refetchProject()}
          />
        </div>
      </div>
    );
  }

  /*
   * `circleProject` is nullable and the gateway returns null to a non-member
   * rather than erroring, so an absent project is far more likely to mean "you
   * are not in this circle" than "this id is wrong". The copy says so, and the
   * only useful action left is going back.
   */
  if (!project) {
    return (
      <div className="h-app-inner flex overflow-hidden">
        <div className={CIRCLE_COLUMN_CLASS}>
          {header}
          <EmptyState
            title={t('errors.noAccess.title')}
            description={t('errors.noAccess.description')}
            action={
              <Link href="/circles">
                <ButtonType1>{t('errors.notFound.cta')}</ButtonType1>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    /*
     * One scroll container on mobile; two side-by-side ones from `lg`. The
     * breakpoint switch lives here rather than in `feedColumnLayout` because it
     * is specific to this screen having a second column of primary content.
     */
    <div className="h-app-inner scrollbar-hide overflow-y-auto lg:flex lg:overflow-hidden">
      <div className="scrollbar-hide mx-4 flex min-w-0 flex-col py-4 lg:mr-6 lg:flex-1 lg:overflow-y-auto">
        {header}

        <ProjectHeader project={project} proposerName={proposerName} />

        {goals.length > 0 && (
          <section className="mt-6 space-y-5">
            {goals.map((goal, index) => (
              <GoalProgressPanel
                key={goal.id}
                circleId={circleId}
                goal={goal}
                // Only the primary goal carries the section heading; the rest
                // are additional bars under it, not competing headings.
                label={index === 0 ? t('project.progressTitle') : undefined}
              />
            ))}
          </section>
        )}

        {/*
          A project with no goal cannot be contributed to at all —
          `ContributeForm` needs one and renders nothing without it — so this is
          not an extra: it is the step that makes a freshly created project
          usable. Creation puts a project straight into ACTIVE with zero goals,
          which is exactly the state that would otherwise be a dead end.
        */}
        <section className="mt-6">
          {addingGoal ? (
            <AddGoalForm
              circleId={circleId}
              projectId={projectId}
              onDone={() => setAddingGoal(false)}
            />
          ) : (
            <ButtonType1 className="w-full" onClick={() => setAddingGoal(true)}>
              {goals.length === 0 ? t('newGoal.ctaFirst') : t('newGoal.cta')}
            </ButtonType1>
          )}
        </section>

        {/*
          Where the project is actually talked about. Rendered only when the
          circle's chat is really available — the chat adapter is behind a
          server flag, and a link into a room that does not exist is worse than
          no link at all.
        */}
        {conversationId && (
          <section className="mt-6">
            <ProjectDiscussion
              circleId={circleId}
              messageCount={messagesData?.getMessages?.total ?? null}
            />
          </section>
        )}
      </div>

      <ContributionsPanel
        circleId={circleId}
        contributions={contributions}
        usersById={usersById}
        goal={primaryGoal}
        currentUserId={currentUserId}
        loading={contributionsLoading}
        hasMore={hasMore}
        onSeeAll={() => setLimit((current) => current + CONTRIBUTIONS_PAGE)}
        className="mx-4 mb-4 lg:my-4 lg:ml-0 lg:mr-4 lg:w-[22rem] lg:shrink-0 xl:w-[24rem]"
      />
    </div>
  );
}
