'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';

import { ButtonType1 } from '@/components/custom/button';
import { EmptyState, ErrorState } from '@/components/feedback';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, useRouter } from '@/i18n/navigation';
import { FEED_COLUMN_CLASS } from '@/lib/feedColumnLayout';
import { useUserStore } from '@/store/useUserStore';
import { circleUserDisplayName, useCircleUsers } from '@/hooks/useCircleUsers';
import {
  CIRCLE_CONTRIBUTIONS,
  CIRCLE_PROJECT,
  CIRCLE_PROJECT_GOALS,
} from '@/services/gql/circles';
import type {
  CircleContributionsData,
  CircleContributionsVariables,
  CircleProjectData,
  CircleProjectGoalsData,
  CircleProjectGoalsVariables,
  CircleProjectVariables,
} from '@/services/gql/types/circles';
import {
  ContributeForm,
  ContributionList,
  GoalProgressPanel,
} from '@/components/circles/project';

/** One ledger page. "See all" grows the limit rather than merging pages, so no
 *  cache field policy is needed and the list can never show a torn total. */
const CONTRIBUTIONS_PAGE = 25;

/**
 * Screen 5 — Project detail.
 *
 * Title, proposer, description, overall progress, the contribution ledger and
 * the Contribute CTA.
 *
 * ## The two things this screen has to get right
 *
 * **Progress is read, never computed.** `circleGoalProgress` returns a SUM over
 * the whole append-only ledger. The contributions list below it is paged, so
 * adding up what is on screen would under-report the moment a project outgrows
 * one page. `GoalProgressPanel` owns that query; nothing here totals anything.
 *
 * **Money and metrics are different types wearing the same shape.** Only an
 * `AMOUNT` goal is money — see `components/circles/project/metric.ts`, which is
 * the single place that branch is decided.
 */
export default function CircleProjectPage() {
  const t = useTranslations('circles');
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();

  const circleId = String(params?.id ?? '');
  const projectId = String(params?.projectId ?? '');
  const currentUserId = useUserStore((state) => state.user?.userId) ?? null;

  const [limit, setLimit] = useState(CONTRIBUTIONS_PAGE);

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
   * ledger below, and the Contribute CTA. Any further goals still render their
   * own progress bar (each panel fetches its own progress) so nothing is
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

  // A full page back means there may be more; a short page is the end of the
  // ledger. Contributors and the proposer are resolved in one pass.
  const hasMore = contributions.length === limit;

  const userIds = useMemo(() => {
    const ids = contributions.map((c) => c.contributorUserId);
    if (project?.createdBy) ids.push(project.createdBy);
    return ids;
  }, [contributions, project?.createdBy]);

  const { usersById } = useCircleUsers(userIds);

  const proposer = project?.createdBy ? usersById[project.createdBy] : undefined;

  const createdOn = useMemo(() => {
    if (!project?.createdAt) return '';
    const date = new Date(project.createdAt);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }, [project?.createdAt, locale]);

  const header = (
    <button
      type="button"
      onClick={() => router.push(`/circles/${circleId}`)}
      className="mb-4 inline-flex items-center gap-2 text-text-secondary transition-colors hover:text-text-primary"
    >
      <ArrowLeft className="size-4" />
      <span className="label-medium">{t('project.title')}</span>
    </button>
  );

  const loading = projectLoading || goalsLoading;

  if (loading && !project) {
    return (
      <div className="h-app-inner flex overflow-hidden">
        <div className={FEED_COLUMN_CLASS}>
          {header}
          <Skeleton className="mb-3 h-8 w-3/4" />
          <Skeleton className="mb-4 h-10 w-48" />
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
        <div className={FEED_COLUMN_CLASS}>
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
        <div className={FEED_COLUMN_CLASS}>
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
    <div className="h-app-inner flex overflow-hidden">
      <div className={FEED_COLUMN_CLASS}>
        {header}

        <h1 className="heading-small text-text-primary">{project.title}</h1>

        {project.createdBy && (
          <div className="mt-3 flex items-center gap-3">
            <Avatar className="size-9 shrink-0 border border-border-subtle">
              <AvatarImage src={proposer?.avatarUrl ?? undefined} alt="" />
              <AvatarFallback className="caption-small bg-surface-subtle text-text-primary">
                {(circleUserDisplayName(proposer, '?').charAt(0) || '?').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="label-small truncate text-text-primary">
                {t('common.proposedBy', {
                  name: circleUserDisplayName(proposer, t('common.loading')),
                })}
              </p>
              {createdOn && (
                <p className="caption-small text-text-secondary">{createdOn}</p>
              )}
            </div>
          </div>
        )}

        {project.description && (
          <p className="body-small mt-4 whitespace-pre-line text-text-primary">
            {project.description}
          </p>
        )}

        {goals.length > 0 && (
          <section className="mt-6 space-y-4">
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

        <section className="mt-8">
          <h2 className="label-medium text-text-primary">
            {t('project.contributionsTitle')}
          </h2>

          <div className="mt-2">
            <ContributionList
              contributions={contributions}
              usersById={usersById}
              goal={primaryGoal}
              currentUserId={currentUserId}
              loading={contributionsLoading}
            />
          </div>

          {hasMore && (
            <div className="mt-3 flex justify-center">
              <ButtonType1
                onClick={() => setLimit((current) => current + CONTRIBUTIONS_PAGE)}
                disabled={contributionsLoading}
              >
                {t('common.seeAll')}
              </ButtonType1>
            </div>
          )}
        </section>

        <div className="mt-8 pb-4">
          <ContributeForm circleId={circleId} goal={primaryGoal} />
        </div>
      </div>
    </div>
  );
}
