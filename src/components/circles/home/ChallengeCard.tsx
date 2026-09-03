'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Flag, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CIRCLE_CHALLENGE_ENTRIES } from '@/services/gql/circles';
import type {
  CircleChallenge,
  CircleChallengeEntry,
  CircleVerificationMode,
} from '@/services/gql/types/circles';

import { InlineCard } from './InlineCard';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How many entries are read to count participants.
 *
 * There is no participant count on `CircleChallenge` and no join record — the
 * only per-person row is a submitted entry — so the count is DISTINCT
 * `userId` over one page of entries. A circle is capped by entitlement (12
 * members on the free plan), so a page this size covers every participant many
 * times over even on a DAILY-cadence challenge where one person submits often.
 */
const ENTRY_PAGE_SIZE = 200;

interface ChallengeCardProps {
  circleId: string;
  challenge: CircleChallenge;
  /** Display name of `challenge.createdBy`, already resolved and fallback-filled. */
  starterName: string;
}

interface ChallengeEntriesData {
  circleChallengeEntries?: CircleChallengeEntry[] | null;
}

/** Verification mode → the message key describing it in the circle's own words. */
const VERIFICATION_KEY: Record<CircleVerificationMode, string> = {
  HONOUR: 'trustLabel',
  LEAD: 'leadLabel',
  CIRCLE: 'voteLabel',
};

/**
 * Whole days until `iso`, or null before hydration and for an unusable date.
 *
 * Withheld until mount for the same reason the `Countdown` primitive withholds
 * its relative line: anything derived from `Date.now()` differs between the
 * server render and the first client render, and React would flag the
 * mismatch. Returning null (rather than 0) keeps "no answer yet" distinct from
 * "the challenge ends today".
 */
function useDaysUntil(iso?: string | null): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    // A day boundary is far too coarse to warrant a ticking timer; the card is
    // re-rendered whenever the conversation moves, which is often enough.
  }, []);

  if (now === null || !iso) return null;
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - now) / DAY_MS);
}

/**
 * A challenge, rendered where it was started.
 *
 * `verificationMode` is shown because it is the circle's honesty contract with
 * itself and is IMMUTABLE once the challenge leaves DRAFT — it belongs next to
 * the challenge everywhere the challenge appears, not only on its detail page.
 */
export function ChallengeCard({ circleId, challenge, starterName }: ChallengeCardProps) {
  const t = useTranslations('circles');

  const { data } = useQuery<ChallengeEntriesData>(CIRCLE_CHALLENGE_ENTRIES, {
    variables: { circleId, challengeId: challenge.id, limit: ENTRY_PAGE_SIZE },
    fetchPolicy: 'cache-and-network',
    // Best-effort: a failed entries read costs the participant count, not the
    // card.
    errorPolicy: 'all',
  });

  const entries = data?.circleChallengeEntries ?? [];
  const joined = new Set(entries.map((entry) => entry.userId).filter(Boolean)).size;

  const daysLeft = useDaysUntil(challenge.endsAt);
  const verificationKey = challenge.verificationMode
    ? VERIFICATION_KEY[challenge.verificationMode]
    : null;

  return (
    <InlineCard
      icon={<Flag aria-hidden="true" />}
      typeLabel={t('home.cards.challengeLabel', { name: starterName })}
      title={challenge.title}
      href={`/circles/${circleId}/challenges/${challenge.id}`}
      actionLabel={t('home.cards.viewChallenge')}
    >
      {verificationKey && (
        <p className="caption-small mt-1 flex items-center gap-1.5 text-text-secondary">
          <ShieldCheck aria-hidden="true" className="size-3.5 shrink-0" />
          {t(`challenge.verification.${verificationKey}`)}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="label-small text-text-primary">
          {t('home.cards.joined', { count: joined })}
        </span>

        {daysLeft !== null && (
          <span className="caption-small text-text-secondary">
            {daysLeft > 0 ? t('home.cards.daysLeft', { days: daysLeft }) : t('time.ended')}
          </span>
        )}
      </div>
    </InlineCard>
  );
}
