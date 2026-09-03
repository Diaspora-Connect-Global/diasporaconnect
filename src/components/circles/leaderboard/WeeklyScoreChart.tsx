'use client';

import { useTranslations } from 'next-intl';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import type { WeeklyScoreDay } from './useWeeklyScoreSeries';

/**
 * Plot height in px. Kept as a number because the zero axis is positioned as a
 * fraction of it, and a Tailwind class alone cannot be measured.
 */
const PLOT_HEIGHT = 128;

/** A day with a real but tiny value must still be visible, not rounded away. */
const MIN_BAR_PX = 2;

export interface WeeklyScoreChartProps {
  days: WeeklyScoreDay[];
  loading: boolean;
  /** The ledger could not be read at all. */
  unavailable: boolean;
  /** A full ledger page did not reach back past Monday. */
  truncated: boolean;
  entriesRead: number;
  className?: string;
}

/**
 * The circle's week, one bar per day.
 *
 * ## The axis is at zero, not at the bottom
 *
 * Score entries are signed — a correction is a negative row — so a day's NET can
 * be below zero. A chart anchored at the bottom of its box would draw a -40 day
 * the same way it draws a +40 day, which is not a cosmetic problem: it inverts
 * the meaning. The plot is therefore split at zero, sized by the largest
 * magnitude in EITHER direction, with the split moving to the top when every day
 * is negative and to the bottom when none is.
 *
 * ## The bars are decorative; the list is not
 *
 * Unlike the per-member breakdown, nothing else on the screen spells out a day's
 * value, so this cannot be `aria-hidden` and left at that. The bars carry
 * `aria-hidden` and each column pairs its visible weekday letter with an
 * `sr-only` sentence carrying the full day name and its points.
 *
 * ## A chart is drawn only when the data covers it
 *
 * There is no per-day aggregate on the wire — `Leaderboard` carries no dated
 * field at all — so this series is folded client-side from one bounded page of
 * `circleScoreEntries`. That page can fail to cover the week, and a bar chart
 * built from a known-incomplete page understates the earlier days while looking
 * exactly as authoritative as a complete one. Heights ARE the claim, and a
 * caption under them does not retract it, so an incomplete week renders the
 * explanation INSTEAD of the plot. Likewise an unreadable ledger renders
 * nothing: seven flat bars look precisely like a quiet week.
 */
export function WeeklyScoreChart({
  days,
  loading,
  unavailable,
  truncated,
  entriesRead,
  className,
}: WeeklyScoreChartProps) {
  const t = useTranslations('circles');

  if (unavailable) return null;

  if (loading) {
    return (
      <div className={cn('w-full', className)}>
        <p className="label-small text-text-primary">
          {t('leaderboard.thisWeek')}
        </p>
        <Skeleton className="mt-4 h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (truncated) {
    return (
      <div className={cn('w-full', className)}>
        <p className="label-small text-text-primary">
          {t('leaderboard.thisWeek')}
        </p>
        <p className="caption-small mt-2 text-text-secondary">
          {t('leaderboard.weekPartial', { count: entriesRead })}
        </p>
      </div>
    );
  }

  const maxPositive = days.reduce((max, day) => Math.max(max, day.points), 0);
  const maxNegative = days.reduce((max, day) => Math.max(max, -day.points), 0);
  const span = maxPositive + maxNegative;

  // All-zero week: keep the axis on the floor so the empty week reads as empty
  // rather than as a chart whose baseline has drifted into the middle.
  const positiveShare = span > 0 ? (maxPositive / span) * 100 : 100;

  return (
    <div className={cn('w-full', className)}>
      <p className="label-small text-text-primary">
        {t('leaderboard.thisWeek')}
      </p>

      <div className="relative mt-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 border-t border-border-subtle"
          style={{ top: `${(positiveShare / 100) * PLOT_HEIGHT}px` }}
        />

        {/*
          Named, because the visible heading is a sibling `<p>` rather than a
          label: without this the list announces as seven bare items.
        */}
        <ul
          aria-label={t('leaderboard.thisWeek')}
          className="flex items-end gap-1.5 sm:gap-2"
        >
          {days.map((day) => {
            const positivePct =
              day.points > 0 && maxPositive > 0
                ? (day.points / maxPositive) * 100
                : 0;
            const negativePct =
              day.points < 0 && maxNegative > 0
                ? (-day.points / maxNegative) * 100
                : 0;

            return (
              <li key={day.key} className="flex min-w-0 flex-1 flex-col">
                <div
                  aria-hidden="true"
                  title={`${day.fullLabel} · ${t('leaderboard.points', {
                    points: day.points,
                  })}`}
                  className="flex flex-col"
                  style={{ height: PLOT_HEIGHT }}
                >
                  <div
                    className="flex items-end"
                    style={{ height: `${positiveShare}%` }}
                  >
                    {positivePct > 0 && (
                      <div
                        className="w-full rounded-t-sm bg-text-success"
                        style={{
                          height: `${positivePct}%`,
                          minHeight: MIN_BAR_PX,
                        }}
                      />
                    )}
                  </div>

                  <div
                    className="flex items-start"
                    style={{ height: `${100 - positiveShare}%` }}
                  >
                    {negativePct > 0 && (
                      <div
                        className="w-full rounded-b-sm bg-text-danger"
                        style={{
                          height: `${negativePct}%`,
                          minHeight: MIN_BAR_PX,
                        }}
                      />
                    )}
                  </div>
                </div>

                <span
                  aria-hidden="true"
                  className={cn(
                    'caption-small mt-2 truncate text-center',
                    day.isToday && 'text-text-primary',
                    !day.isToday && day.isFuture && 'text-text-tertiary',
                    !day.isToday && !day.isFuture && 'text-text-secondary',
                  )}
                >
                  {day.label}
                </span>

                <span className="sr-only">
                  {t('leaderboard.dayPoints', {
                    day: day.fullLabel,
                    points: day.points,
                  })}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
