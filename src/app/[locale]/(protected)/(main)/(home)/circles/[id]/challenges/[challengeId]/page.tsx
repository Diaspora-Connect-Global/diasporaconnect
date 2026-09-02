'use client';

import { useMemo } from 'react';
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
  ChallengeProgress,
  JoinChallengeButton,
  VerificationModePanel,
} from '@/components/circles/challenge';

/**
 * Entries fetched to derive the participant list.
 *
 * A recurring challenge produces one entry PER PERIOD per person, so the row
 * count outruns the head count; the cap is generous enough that a circle capped
 * at a couple of dozen members cannot page out of its own participant list.
 */
const ENTRIES_PAGE = 100;

/**
 * Screen 6 — Challenge detail.
 *
 * Title, who started it, the locked verification mode, progress, and the
 * "I'm in!" CTA.
 *
 * The verification mode is the centrepiece rather than a settings row: it is
 * the platform-never-adjudicates rule in miniature. The circle decided who
 * confirms a completion, that decision froze when the challenge started, and
 * this screen states it as settled fact.
 */
export default function CircleChallengePage() {
  const t = useTranslations('circles');
  const locale = useLocale();
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

  const joined = Boolean(
    currentUserId && participantIds.includes(currentUserId),
  );

  const starter = challenge?.createdBy
    ? usersById[challenge.createdBy]
    : undefined;

  const startedOn = useMemo(() => {
    const iso = challenge?.startsAt ?? challenge?.createdAt;
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }, [challenge?.startsAt, challenge?.createdAt, locale]);

  const header = (
    <button
      type="button"
      onClick={() => router.push(`/circles/${circleId}`)}
      className="mb-4 inline-flex items-center gap-2 text-text-secondary transition-colors hover:text-text-primary"
    >
      <ArrowLeft className="size-4" />
      <span className="label-medium">{t('challenge.title')}</span>
    </button>
  );

  if (challengeLoading && !challenge) {
    return (
      <div className="h-app-inner flex overflow-hidden">
        <div className={FEED_COLUMN_CLASS}>
          {header}
          <Skeleton className="mb-3 h-8 w-3/4" />
          <Skeleton className="mb-6 h-10 w-48" />
          <Skeleton className="mb-3 h-4 w-40" />
          <Skeleton className="mb-6 h-24 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (challengeError && !challenge) {
    return (
      <div className="h-app-inner flex overflow-hidden">
        <div className={FEED_COLUMN_CLASS}>
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

        <h1 className="heading-small text-text-primary">{challenge.title}</h1>

        {challenge.createdBy && (
          <div className="mt-3 flex items-center gap-3">
            <Avatar className="size-9 shrink-0 border border-border-subtle">
              <AvatarImage src={starter?.avatarUrl ?? undefined} alt="" />
              <AvatarFallback className="caption-small bg-surface-subtle text-text-primary">
                {(circleUserDisplayName(starter, '?').charAt(0) || '?').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="label-small truncate text-text-primary">
                {t('common.startedBy', {
                  name: circleUserDisplayName(starter, t('common.loading')),
                })}
              </p>
              {startedOn && (
                <p className="caption-small text-text-secondary">{startedOn}</p>
              )}
            </div>
          </div>
        )}

        <VerificationModePanel mode={challenge.verificationMode} />

        <ChallengeProgress
          participants={participants}
          endsAt={challenge.endsAt}
        />

        {challenge.description && (
          <section className="mt-6">
            <h2 className="label-medium text-text-primary">
              {t('challenge.aboutTitle')}
            </h2>
            <p className="body-small mt-2 whitespace-pre-line text-text-primary">
              {challenge.description}
            </p>
          </section>
        )}

        <div className="mt-8 pb-4">
          <JoinChallengeButton
            circleId={circleId}
            challenge={challenge}
            joined={joined}
            loading={entriesLoading}
          />
        </div>
      </div>
    </div>
  );
}
