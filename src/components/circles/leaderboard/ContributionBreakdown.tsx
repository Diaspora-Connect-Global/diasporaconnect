'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import type { CircleLeaderboardRow } from '@/services/gql/types/circles';
import type { CircleUser } from '@/hooks/useCircleUsers';

import { AvatarGroup } from '../primitives';
import { ScoreRows } from './ScoreRows';
import { isWholeBoard } from './boardPage';

export interface ContributionBreakdownProps {
  rows: CircleLeaderboardRow[];
  usersById: Record<string, CircleUser>;
  currentUserId?: string | null;
  className?: string;
}

/**
 * How the shared total was built — the collective framing's companion panel.
 *
 * Deliberately un-numbered. The same people in the same order with a rank column
 * added is the ranked board, and a circle that chose collective mode chose not
 * to have one; the order here is a consequence of the arithmetic, not a
 * standing being asserted.
 *
 * ## Never rendered without rows
 *
 * `circleLeaderboard` returns `rows: []` when `rankingEnabled` is false — the
 * circle switched individual scoring off precisely so nobody's contribution is
 * on permanent display. The caller gates this whole panel on rows existing;
 * substituting a members list to fill it would rebuild the very thing that
 * setting removes, and a breakdown listing everyone at an implied zero would be
 * worse than no panel at all.
 *
 * ## The footer count is a claim, so it is only made when it is true
 *
 * `rows` is one page of the board and the API carries no contributor total, so
 * a full page is labelled as a top-N rather than counted as though it were
 * everybody. See `boardPage.ts`.
 */
export function ContributionBreakdown({
  rows,
  usersById,
  currentUserId,
  className,
}: ContributionBreakdownProps) {
  const t = useTranslations('circles');

  return (
    <section
      className={cn(
        'flex flex-col rounded-2xl border border-border-subtle p-5',
        className,
      )}
    >
      <h2 className="label-medium text-text-primary">
        {t('leaderboard.breakdownTitle')}
      </h2>

      <ScoreRows
        className="mt-2"
        rows={rows}
        usersById={usersById}
        currentUserId={currentUserId}
      />

      <div className="mt-4 flex items-center gap-3 border-t border-border-subtle pt-4">
        <AvatarGroup
          size="sm"
          max={5}
          users={rows.map((row) => ({
            id: row.userId,
            name: usersById[row.userId]?.name ?? t('common.loading'),
            avatarUrl: usersById[row.userId]?.avatarUrl,
          }))}
        />
        <p className="caption-small text-text-secondary">
          {isWholeBoard(rows.length)
            ? t('leaderboard.membersContributing', { count: rows.length })
            : t('leaderboard.topContributors', { count: rows.length })}
        </p>
      </div>
    </section>
  );
}
