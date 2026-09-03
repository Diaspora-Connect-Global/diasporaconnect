'use client';

import { useQuery } from '@apollo/client/react';
import { Clock, Gavel } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Countdown, ProgressWithLabel, StatusPill, type StatusPillVariant } from '@/components/circles/primitives';
import { cn } from '@/lib/utils';
import { CIRCLE_MOTION_TALLY } from '@/services/gql/circles';
import type {
  CircleMotion,
  CircleMotionStatus,
  CircleMotionTally,
} from '@/services/gql/types/circles';

import { InlineCard } from './InlineCard';

interface MotionCardProps {
  circleId: string;
  motion: CircleMotion;
  /** Display name of `motion.proposedBy`, already resolved and fallback-filled. */
  proposerName: string;
}

interface MotionTallyData {
  circleMotionTally?: CircleMotionTally | null;
}

/**
 * Status → pill. `ENACTED` reads as "Passed" because to the circle those are
 * the same news; `ENACTMENT_FAILED` reads as "Failed" and the motion detail
 * page carries `enactmentError`, which is the only place with room to explain
 * that a motion passed but could not be applied.
 */
const STATUS_LABEL: Record<CircleMotionStatus, 'open' | 'passed' | 'failed' | 'closed' | 'withdrawn'> = {
  OPEN: 'open',
  PASSED: 'passed',
  ENACTED: 'passed',
  REJECTED: 'failed',
  ENACTMENT_FAILED: 'failed',
  EXPIRED: 'closed',
  WITHDRAWN: 'withdrawn',
};

const STATUS_VARIANT: Record<CircleMotionStatus, StatusPillVariant> = {
  OPEN: 'success',
  PASSED: 'success',
  ENACTED: 'success',
  REJECTED: 'danger',
  ENACTMENT_FAILED: 'danger',
  EXPIRED: 'neutral',
  WITHDRAWN: 'neutral',
};

/**
 * Ballots needed to meet quorum, from the motion's PINNED fraction.
 *
 * Returns null rather than a guess when the fraction is unusable, so a broken
 * rule shows no quorum line instead of a confident wrong one — "Quorum: 3 of 0"
 * is worse than silence.
 */
function quorumRequired(motion: CircleMotion, electorateSize: number): number | null {
  const { quorumNumerator: num, quorumDenominator: den } = motion;
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0 || num < 0) return null;
  return Math.min(electorateSize, Math.ceil((electorateSize * num) / den));
}

/**
 * A motion, rendered where it was proposed.
 *
 * ── THE TALLY IS LIVE, THE OUTCOME IS FINAL ─────────────────────────────────
 * An OPEN motion's `outcomeYes/No/Abstain` are all zero — those columns are
 * written once, at tally time. Reading them for an open motion would show
 * "0 Yes, 0 No" under a vote three people had already cast. So an open motion
 * queries `circleMotionTally` (the live count) and a decided one reads the
 * frozen outcome columns.
 *
 * ── QUORUM AND MAJORITY COME OFF THE MOTION, NOT THE CIRCLE ─────────────────
 * `quorumNumerator/Denominator` and `electorateSize` here are the SNAPSHOT
 * pinned when the motion opened. Reading today's `circleGovernanceRules`
 * instead would silently restate every in-flight vote's threshold the moment
 * someone amended the rules — and three people joining mid-window would raise
 * the bar on a vote already under way.
 */
export function MotionCard({ circleId, motion, proposerName }: MotionCardProps) {
  const t = useTranslations('circles');
  const isOpen = motion.status === 'OPEN';

  const { data } = useQuery<MotionTallyData>(CIRCLE_MOTION_TALLY, {
    variables: { circleId, motionId: motion.id },
    // A decided motion's numbers never change again, so only open motions pay
    // for the extra round trip.
    skip: !isOpen,
    fetchPolicy: 'cache-and-network',
    // Best-effort: a tally that fails to load falls through to the outcome
    // columns below rather than erroring the whole conversation.
    errorPolicy: 'all',
  });

  const tally = data?.circleMotionTally ?? null;

  const yes = tally?.yes ?? motion.outcomeYes;
  const no = tally?.no ?? motion.outcomeNo;
  const abstain = tally?.abstain ?? motion.outcomeAbstain;
  const electorateSize = tally?.electorateSize ?? motion.electorateSize;

  const cast = yes + no + abstain;
  const pending = tally?.notVoted ?? Math.max(0, electorateSize - cast);

  const required = quorumRequired(motion, electorateSize);
  const quorumPercent = required && required > 0 ? (cast / required) * 100 : 0;
  const quorumMet = tally?.quorumMet ?? (required !== null && cast >= required);

  const closesAt = motion.closesAt ?? tally?.closesAt ?? null;
  const statusKey = STATUS_LABEL[motion.status];

  return (
    <InlineCard
      icon={<Gavel aria-hidden="true" />}
      typeLabel={t('home.cards.motionLabel', { name: proposerName })}
      labelAside={
        <StatusPill
          label={t(`motion.status.${statusKey}`)}
          variant={STATUS_VARIANT[motion.status]}
        />
      }
      title={motion.title?.trim() || t('motion.number', { number: motion.motionNumber })}
      href={`/circles/${circleId}/motions/${motion.id}`}
      actionLabel={t('home.cards.viewMotion')}
    >
      {motion.rationale?.trim() && (
        <p className="body-small mt-1 line-clamp-2 text-text-secondary">{motion.rationale}</p>
      )}

      {/*
        One row: the three counts and the quorum they are measured against.
        Quorum used to sit below as a labelled bar, which read as a second,
        separate fact — but "3 Yes, 0 No, 3 Pending" is meaningless without
        "of how many", and a member deciding whether their vote still matters
        needs both in one glance. The bar stays underneath as the shape of it.
      */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="label-small text-text-success">
          {t('home.cards.tallyYes', { count: yes })}
        </span>
        <span className="label-small text-text-danger">
          {t('home.cards.tallyNo', { count: no })}
        </span>
        <span className="label-small text-text-secondary">
          {t('home.cards.tallyPending', { count: pending })}
        </span>

        {required !== null && (
          <>
            <span aria-hidden="true" className="h-3.5 w-px bg-border-subtle" />
            <span
              className={cn(
                'label-small',
                quorumMet ? 'text-text-success' : 'text-text-secondary',
              )}
            >
              {t('home.cards.quorum', { voted: cast, required })}
            </span>
          </>
        )}
      </div>

      {/*
        Hidden from the accessibility tree on purpose: the row above already
        states "Quorum: 3 of 4" in words, and an unlabelled progressbar would
        announce a bare percentage that repeats it less clearly.
      */}
      {required !== null && (
        <div aria-hidden="true">
          <ProgressWithLabel
            className="mt-2"
            value={quorumPercent}
            showPercentage={false}
            tone={quorumMet ? 'success' : 'brand'}
          />
        </div>
      )}

      {isOpen && closesAt && (
        <div className="mt-3 flex items-start gap-1.5">
          <Clock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-text-secondary" />
          {/*
            `both`, not `absolute`. The mockup shows only the deadline on this
            card, but `absolute` renders NOTHING once the deadline passes — and
            a motion sits OPEN between its window closing and being tallied, so
            that row would go blank under a lone clock at exactly the moment the
            circle most wants to know where the vote stands. `both` fills that
            gap with "Closed", and the relative line ("2d 7h left") answers the
            question a voter actually has.

            On the labels: `Countdown` takes TEMPLATES and does its own `{name}`
            replacement as the clock ticks, but next-intl insists every
            placeholder in a message has a value. So each template is passed
            through `t()` with its own placeholders as their own values — a
            pass-through that satisfies next-intl and hands `Countdown` the
            template intact. `closesAt` also renames a slot (`{time}` in the
            catalogue, `{datetime}` in the primitive).
          */}
          <Countdown
            deadline={closesAt}
            variant="both"
            precision="compact"
            labels={{
              closesAt: t('home.cards.closes', { time: '{datetime}' }),
              daysHours: t('time.daysHoursLeft', { days: '{days}', hours: '{hours}' }),
              hoursMinutes: t('time.hoursMinutesLeft', {
                hours: '{hours}',
                minutes: '{minutes}',
              }),
              // The catalogue does ship a minutes-only string, and the final
              // hour of a vote is exactly when people read this — borrowing
              // the hours+minutes form with a zero rendered "0h 45m left".
              minutes: t('time.minutesLeft', { minutes: '{minutes}' }),
              ended: t('time.closed'),
            }}
          />
        </div>
      )}
    </InlineCard>
  );
}
