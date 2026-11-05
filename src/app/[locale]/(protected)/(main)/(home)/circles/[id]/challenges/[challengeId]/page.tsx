'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';

import { ButtonType1 } from '@/components/custom/button';
import PageLoader from '@/components/custom/PageLoader';
import { EmptyState, ErrorState } from '@/components/feedback';
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
 * Geometry of the challenge screen inside the circle frame: one column on a
 * phone, the main column plus the join/entry panel from `lg`, the same two-column
 * grid Discover and the circle home use. Each piece is mounted exactly once:
 * rendering the panel twice behind `lg:hidden` / `hidden lg:block` would put two
 * entry forms in the DOM with duplicate input ids and two independent
 * idempotency keys.
 */
const SHELL_CLASS = 'flex w-full min-w-0 flex-col gap-5';
const MAIN_COLUMN_CLASS = 'flex min-w-0 flex-col gap-5';
const GRID_CLASS = 'grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_24rem]';

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
      className="inline-flex w-fit items-center gap-2 rounded-full border border-border-subtle bg-surface-default px-3 py-1.5 text-text-secondary shadow-sm transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      <span className="text-sm font-medium">{t('challenge.title')}</span>
    </button>
  );

  if (challengeLoading && !challenge) {
    return (
      <div className={SHELL_CLASS}>
        <div className={MAIN_COLUMN_CLASS}>
          {header}
          <PageLoader />
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
      {header}

      <div className={GRID_CLASS}>
        <div className={MAIN_COLUMN_CLASS}>
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
        </div>

        <div className="min-w-0">
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
    </div>
  );
}
