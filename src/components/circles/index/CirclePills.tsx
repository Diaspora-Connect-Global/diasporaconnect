'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Flame, Gavel, MessageSquare, Target } from 'lucide-react';

import { Countdown, StatusPill } from '@/components/circles/primitives';
import { Skeleton } from '@/components/ui/skeleton';

import type { CircleSignals } from './useCircleSignals';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CirclePillsProps {
  signals: CircleSignals;
  /** From `useCircleUnreadCounts`. Undefined when the circle has no chat conversation. */
  unreadCount?: number;
}

/**
 * Read the clock, but only after mount.
 *
 * Urgency is a function of `Date.now()`, which differs between the server
 * render and the first client render. Deciding the pill's colour during SSR
 * would therefore hydrate mismatched. Until the first tick lands the deadline
 * is rendered without an urgency judgement — the deadline itself is
 * deterministic, so nothing shifts.
 *
 * One minute is plenty: the thresholds this drives are 24 hours and "has the
 * window closed", not seconds. `Countdown` runs its own faster tick for the
 * text it renders.
 */
function useNowAfterMount(): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return now;
}

/**
 * The status pills on a circle card.
 *
 * These answer "does anything need me?" at a glance, so the colour ladder is
 * load-bearing rather than decorative:
 *
 *   neutral  nothing is waiting on you ("No open votes")
 *   brand    something is running (unread messages, an open vote)
 *   danger   an open vote closes within 24 hours
 *
 * A circle with a vote closing tonight is therefore visibly louder than one
 * with the same vote closing next week, without either card changing shape.
 */
export function CirclePills({ signals, unreadCount }: CirclePillsProps) {
  const t = useTranslations('circles');
  const now = useNowAfterMount();

  const closesMs = signals.voteClosesAt
    ? new Date(signals.voteClosesAt).getTime()
    : NaN;
  const hasDeadline = Number.isFinite(closesMs);
  // Both are false until mount, which is the correct pre-hydration answer:
  // "we have not read the clock yet", not "it is not urgent".
  const windowClosed = now !== null && hasDeadline && closesMs <= now;
  const urgent =
    now !== null && hasDeadline && !windowClosed && closesMs - now <= DAY_MS;

  /*
   * First load only. "No open votes" is a factual claim, and rendering it
   * before the motions query answers would state it and then take it back.
   */
  if (signals.votesPending) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {unreadCount ? (
          <UnreadPill
            count={unreadCount}
            label={t('index.unreadLabel', { count: unreadCount })}
          />
        ) : null}
        <Skeleton className="h-5 w-28 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {unreadCount ? (
        <UnreadPill
          count={unreadCount}
          label={t('index.unreadLabel', { count: unreadCount })}
        />
      ) : null}

      {signals.openVoteCount === 0 ? (
        <StatusPill variant="neutral" label={t('index.pills.noOpenVotes')} />
      ) : signals.voteClosesAt && !windowClosed ? (
        <StatusPill
          variant={urgent ? 'danger' : 'brand'}
          icon={<Gavel aria-hidden="true" />}
          label={
            <Countdown
              deadline={signals.voteClosesAt}
              variant="absolute"
              /*
               * `Countdown` interpolates `{datetime}` into its `closesAt`
               * template, so the catalogue string is turned INTO that template
               * by substituting the placeholder for its own argument. The pill,
               * not the countdown, owns urgency colour — hence text-inherit
               * over the primitive's own danger/primary classes.
               */
              labels={{ closesAt: t('index.pills.voteCloses', { time: '{datetime}' }) }}
              className="[&_span]:text-inherit"
            />
          }
        />
      ) : (
        /*
         * Open, but with no future deadline to show — either the motion carries
         * none, or the window elapsed and the tally has not landed yet. "Open"
         * is the only thing still true about it.
         */
        <StatusPill
          variant="brand"
          icon={<Gavel aria-hidden="true" />}
          label={t('motion.status.open')}
        />
      )}

      {signals.goalPercent !== null ? (
        <StatusPill
          variant="success"
          icon={<Target aria-hidden="true" />}
          label={t('index.pills.goal', { percent: signals.goalPercent })}
        />
      ) : null}

      {signals.hasLiveChallenge ? (
        <StatusPill
          variant="info"
          icon={<Flame aria-hidden="true" />}
          label={t('index.pills.challengeLive')}
        />
      ) : null}
    </div>
  );
}

/**
 * The count is the whole visible label, so the readable sentence ("3 unread
 * messages") is carried alongside it for screen readers rather than left to be
 * inferred from a bare numeral next to an icon.
 */
function UnreadPill({ count, label }: { count: number; label: string }) {
  return (
    <StatusPill
      variant="brand"
      icon={<MessageSquare aria-hidden="true" />}
      label={
        <>
          <span aria-hidden="true">{count}</span>
          <span className="sr-only">{label}</span>
        </>
      }
    />
  );
}
