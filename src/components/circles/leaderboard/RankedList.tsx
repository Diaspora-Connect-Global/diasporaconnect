'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import type { CircleLeaderboardRow } from '@/services/gql/types/circles';
import type { CircleUser } from '@/hooks/useCircleUsers';

import { ScoreRows } from './ScoreRows';
import { isWholeBoard } from './boardPage';

export interface RankedListProps {
  rows: CircleLeaderboardRow[];
  usersById: Record<string, CircleUser>;
  currentUserId?: string | null;
  className?: string;
}

/**
 * The standings — rank, avatar, name, points.
 *
 * Rendered ONLY when the circle has ranking enabled, and only with rows; the
 * page decides both. A ranking-disabled circle must never be able to reach this
 * component, which is why the page derives the mode rather than storing it.
 *
 * The `rank` column is the whole difference from `ContributionBreakdown`: the
 * two panels list the same people in the same order, and the number is what
 * turns "here is how the total was built" into "here is where you stand".
 *
 * The footer count is only presented as a total when the page proves it is one
 * — see `boardPage.ts`; otherwise it says top-N.
 */
export function RankedList({
  rows,
  usersById,
  currentUserId,
  className,
}: RankedListProps) {
  const t = useTranslations('circles');

  return (
    <section
      className={cn(
        'flex flex-col rounded-2xl border border-border-subtle p-5',
        className,
      )}
    >
      <h2 className="label-medium text-text-primary">
        {t('leaderboard.standingsTitle')}
      </h2>

      <ScoreRows
        className="mt-2"
        rows={rows}
        usersById={usersById}
        currentUserId={currentUserId}
        showRank
      />

      <p className="caption-small mt-4 border-t border-border-subtle pt-4 text-text-secondary">
        {isWholeBoard(rows.length)
          ? t('leaderboard.membersContributing', { count: rows.length })
          : t('leaderboard.topContributors', { count: rows.length })}
      </p>
    </section>
  );
}
