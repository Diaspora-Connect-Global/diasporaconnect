'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

import { WeeklyScoreChart } from './WeeklyScoreChart';
import type { WeeklyScoreSeries } from './useWeeklyScoreSeries';

export interface CollectiveViewProps {
  /** A `SUM` over the ledger. Signed, so it can legitimately be zero or below. */
  collectiveTotal: number;
  week: WeeklyScoreSeries;
  className?: string;
}

/**
 * The collective panel — one shared total, and the week that built it.
 *
 * ## Collective is a framing, not the ranked board with the ranks removed
 *
 * This is the ONLY view a ranking-disabled circle ever sees, so it has to stand
 * on its own. The total gets the largest type on the screen; the ranked framing
 * has no equivalent hero number, and this one carries no rank, no position and
 * no comparison. Nothing here is per-person, which is also why it renders
 * unchanged when `rows` is empty — the shared total, that it was built together,
 * and that everyone wins are all still true with individual scoring switched
 * off.
 *
 * ## The hero number is not tinted
 *
 * `text-brand` is the same dark navy in both themes, so a brand-coloured hero
 * sits at roughly 1.6:1 against the dark ground — the largest thing on the
 * screen would be the least legible. Size carries the emphasis instead. The
 * closing note keeps the brand colour because it sits on `surface-brand-light`,
 * which is also fixed across themes and is the pairing that token exists for.
 */
export function CollectiveView({
  collectiveTotal,
  week,
  className,
}: CollectiveViewProps) {
  const t = useTranslations('circles');

  return (
    <section
      className={cn(
        'flex flex-col rounded-2xl border border-border-subtle p-5',
        className,
      )}
    >
      <h2 className="label-medium text-text-primary">
        {t('leaderboard.collectiveTitle')}
      </h2>

      <p className="heading-large mt-2 text-text-primary tabular-nums">
        {t('leaderboard.points', { points: collectiveTotal })}
      </p>

      <p className="caption-small mt-1 text-text-secondary">
        {t('leaderboard.builtTogether')}
      </p>

      <WeeklyScoreChart
        className="mt-6"
        days={week.days}
        loading={week.loading}
        unavailable={week.unavailable}
        truncated={week.truncated}
        entriesRead={week.entriesRead}
      />

      {/*
        `surface-brand-light` is the same light blue in both themes and is only
        legible against `text-text-brand`.
      */}
      <p className="body-small mt-6 rounded-2xl bg-surface-brand-light px-4 py-3 text-center text-text-brand">
        {t('leaderboard.collectiveNote')}
      </p>
    </section>
  );
}
