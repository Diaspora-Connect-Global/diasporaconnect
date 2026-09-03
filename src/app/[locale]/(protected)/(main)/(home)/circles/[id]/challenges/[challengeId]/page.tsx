'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';

import { ButtonType1 } from '@/components/custom/button';
import { EmptyState, ErrorState } from '@/components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, useRouter } from '@/i18n/navigation';
import { useUserStore } from '@/store/useUserStore';
import { useCircleUsers } from '@/hooks/useCircleUsers';
import {
  CIRCLE_CHALLENGE,
  CIRCLE_CHALLENGE_ENTRIES,
} from '@/services/gql/circles';
import type {
  CircleChallengeData,
  CircleChallengeEntriesData,
  CircleChallengeEntriesVariables,
  CircleChallengeVariables,
} from '@/services/gql/types/circles';
import {
  ChallengeActivity,
  ChallengeAside,
  ChallengeHeader,
  ChallengeProgress,
  VerificationModePanel,
} from '@/components/circles/challenge';

/**
 * Entries fetched to derive the participant list and the activity feed.
 *
 * A recurring challenge produces one entry PER PERIOD per person, so the row
 * count outruns the head count; the cap is generous enough that a circle capped
 * at a couple of dozen members cannot page out of its own participant list.
 */
const ENTRIES_PAGE = 100;

/**
 * Geometry of the challenge screen inside the `(home)` sidebar shell.
 *
 * `CIRCLE_COLUMN_CLASS` is deliberately NOT reused. It is `flex-1` with no
 * width cap, which is right for the single-column Circles screens — a capped
 * column would leave `20vw` sidebar + `40vw` content as a 60vw block that the
 * centring shell pushes into the middle of the page, so the sidebar stops
 * looking like a sidebar. This screen has a second column that takes the
 * remaining width, so the row fills the viewport on its own and the main column
 * can be pinned; that is exactly the arrangement `FEED_COLUMN_POST_PAGE_CLASS`
 * describes for the post page, and pinning stops the column resizing as the
 * side panel's content loads.
 *
 * Below `lg` the shell itself scrolls and the two columns simply stack, so the
 * side panel becomes the last section of one continuous page rather than a
 * second scroll region fighting the first. That is also why each piece is
 * mounted exactly once: rendering the panel twice behind `lg:hidden` /
 * `hidden lg:block` would put two entry forms in the DOM with duplicate input
 * ids and two independent idempotency keys.
 */
const SHELL_CLASS = 'h-app-inner overflow-y-auto scrollbar-hide lg:flex lg:overflow-hidden';
const MAIN_COLUMN_CLASS =
  'mx-4 flex w-full min-w-0 flex-col py-4 lg:w-[40vw] lg:min-w-[40vw] lg:max-w-[40vw] lg:flex-none lg:overflow-y-auto lg:overflow-x-hidden scrollbar-hide';
const SIDE_COLUMN_CLASS =
  'mx-4 mb-6 min-w-0 lg:mb-0 lg:flex-1 lg:overflow-y-auto lg:py-4 scrollbar-hide';

/**
 * Screen 6 — Challenge detail.
 *
 * What it is, who started it, the locked verification mode, who is in, what
 * people have been doing — and, in the side panel, what that mode actually
 * means plus the "I'm in!" CTA.
 *
 * The verification mode is the centrepiece rather than a settings row: it is
 * the platform-never-adjudicates rule in miniature. The circle decided who
 * confirms a completion, that decision froze the moment the challenge left
 * DRAFT, and this screen states it as settled fact — which is why nothing here
 * offers to change it, not even disabled.
 */
export default function CircleChallengePage() {
  const t = useTranslations('circles');
  const router = useRouter();
  const params = useParams();

  const circleId = String(params?.id ?? '');
  const challengeId = String(params?.challengeId ?? '');
  const currentUserId = useUserStore((state) => state.user?.userId) ?? null;

  const {
    data: challengeData,
    loading: challengeLoading,
    error: challengeError,
    refetch: refetchChallenge,
  } = useQuery<CircleChallengeData, CircleChallengeVariables>(CIRCLE_CHALLENGE, {
    variables: { circleId, challengeId },
    skip: !circleId || !challengeId,
    errorPolicy: 'all',
  });

  const { data: entriesData, loading: entriesLoading } = useQuery<
    CircleChallengeEntriesData,
    CircleChallengeEntriesVariables
  >(CIRCLE_CHALLENGE_ENTRIES, {
    variables: { circleId, challengeId, limit: ENTRIES_PAGE },
    skip: !circleId || !challengeId,
    errorPolicy: 'all',
  });

  const challenge = challengeData?.circleChallenge ?? null;
  const entries = useMemo(
    () => entriesData?.circleChallengeEntries ?? [],
    [entriesData],
  );

  /*
   * "5 joined" counts PEOPLE, not entries. On a weekly challenge one member
   * accumulates an entry a week, so counting rows would report a five-person
   * circle as thirty joined. Insertion order is preserved so the avatar stack
   * shows whoever joined first.
   */
  const participantIds = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.userId))),
    [entries],
  );

  const userIds = useMemo(() => {
    const ids = [...participantIds];
    if (challenge?.createdBy) ids.push(challenge.createdBy);
    return ids;
  }, [participantIds, challenge?.createdBy]);

  const { usersById } = useCircleUsers(userIds);

  const participants = useMemo(
    () =>
      participantIds.map(
        (userId) =>
          usersById[userId] ?? {
            userId,
            name: null,
            firstName: null,
            avatarUrl: null,
          },
      ),
    [participantIds, usersById],
  );

  const header = (
    <button
      type="button"
      onClick={() => router.push(`/circles/${circleId}`)}
      className="mb-4 inline-flex w-fit items-center gap-2 text-text-secondary transition-colors hover:text-text-primary"
    >
      <ArrowLeft className="size-4" />
      <span className="label-medium">{t('challenge.title')}</span>
    </button>
  );

  if (challengeLoading && !challenge) {
    return (
      <div className={SHELL_CLASS}>
        <div className={MAIN_COLUMN_CLASS}>
          {header}
          <Skeleton className="mb-3 h-6 w-40 rounded-full" />
          <Skeleton className="mb-3 h-8 w-3/4" />
          <Skeleton className="mb-6 h-4 w-2/3" />
          <Skeleton className="mb-6 h-24 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className={SIDE_COLUMN_CLASS}>
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (challengeError && !challenge) {
    return (
      <div className={SHELL_CLASS}>
        <div className={MAIN_COLUMN_CLASS}>
          {header}
          <ErrorState
            title={t('errors.loadChallenge')}
            retryLabel={t('common.retry')}
            onRetry={() => void refetchChallenge()}
          />
        </div>
      </div>
    );
  }

  // Nullable by contract: the gateway hands a non-member `null` rather than an
  // error, so absence is far more likely to be "not your circle" than a bad id.
  if (!challenge) {
    return (
      <div className={SHELL_CLASS}>
        <div className={MAIN_COLUMN_CLASS}>
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
    <div className={SHELL_CLASS}>
      <div className={MAIN_COLUMN_CLASS}>
        {header}

        <ChallengeHeader
          challenge={challenge}
          starter={
            challenge.createdBy ? usersById[challenge.createdBy] : undefined
          }
        />

        <VerificationModePanel mode={challenge.verificationMode} />

        <ChallengeProgress participants={participants} endsAt={challenge.endsAt} />

        <ChallengeActivity
          entries={entries}
          usersById={usersById}
          currentUserId={currentUserId}
          loading={entriesLoading}
        />

        <div className="pb-4" />
      </div>

      <div className={SIDE_COLUMN_CLASS}>
        {/*
          The raw entries are passed rather than a `joined` boolean: a recurring
          challenge is meant to be entered again each period, so the CTA has to
          ask "entered for THIS period?" — a question a single has-ever-entered
          flag cannot answer.
        */}
        <ChallengeAside
          circleId={circleId}
          challenge={challenge}
          entries={entries}
          currentUserId={currentUserId}
          loading={entriesLoading}
        />
      </div>
    </div>
  );
}
