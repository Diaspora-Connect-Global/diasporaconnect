'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import type { CircleLeaderboardRow } from '@/services/gql/types/circles';
import type { CircleUser } from '@/hooks/useCircleUsers';

import { ScoreRows } from './ScoreRows';
import { isWholeBoard } from './boardPage';

export interface RankedSummaryProps {
  rows: CircleLeaderboardRow[];
  usersById: Record<string, CircleUser>;
  currentUserId?: string | null;
  className?: string;
}

/**
 * The ranked framing's hero panel — where YOU stand.
 *
 * ## Why this exists rather than reusing the collective panel
 *
 * Ranked and collective are two readings of the same numbers, not a sort order,
 * so they get different heroes. Collective answers "what did we build?" with the
 * shared total. Ranked answers "where am I?" with the viewer's own position, and
 * deliberately shows NO circle total — a hero total under a ranked heading would
 * make the two modes look like the same screen with the list re-sorted.
 *
 * ## No standing is a real state
 *
 * A member with no ledger entries is absent from `rows` entirely — the
 * leaderboard is a `GROUP BY` over the ledger, so nothing generates a row for
 * somebody who has never scored. That is shown as an em-dash and its own caption
 * rather than as rank 0 or as the last position, both of which would be invented
 * facts.
 *
 * ## Points can go down
 *
 * The ledger is append-only and signed — a correction is a negative row, never a
 * delete — so a standing can fall and a total can be zero or negative. The
 * closing note says so, because a number that drops with no explanation reads as
 * a bug.
 *
 * ## "Out of N" is only printed when N is real
 *
 * `rows` is one page of the board and the API carries no contributor total (see
 * `boardPage.ts`), so on a full page the denominator is dropped rather than
 * quietly reported as the page size — "#3 of 50" on a circle of eighty is a
 * fabricated standing, and it is the kind that looks right.
 */
export function RankedSummary({
  rows,
  usersById,
  currentUserId,
  className,
}: RankedSummaryProps) {
  const t = useTranslations('circles');

  const myRow = currentUserId
    ? rows.find((row) => row.userId === currentUserId) ?? null
    : null;
  const leader = rows.length > 0 ? rows[0] : null;

  return (
    <section
      className={cn(
        'flex flex-col rounded-2xl border border-border-subtle p-5',
        className,
      )}
    >
      <h2 className="label-medium text-text-primary">
        {t('leaderboard.rankedTitle')}
      </h2>

      <p className="heading-large mt-2 text-text-primary tabular-nums">
        {myRow ? t('leaderboard.rankValue', { rank: myRow.rank }) : '—'}
      </p>

      <p className="caption-small mt-1 text-text-secondary">
        {!myRow
          ? t('leaderboard.notOnBoard')
          : isWholeBoard(rows.length)
            ? t('leaderboard.yourStandingOf', { total: rows.length })
            : t('leaderboard.yourStanding')}
      </p>

      {myRow && (
        <p className="label-medium mt-3 text-text-primary tabular-nums">
          {t('leaderboard.points', { points: myRow.points })}
        </p>
      )}

      {leader && (
        <div className="mt-6">
          <p className="label-small text-text-primary">
            {t('leaderboard.leadingNow')}
          </p>
          <ScoreRows
            className="mt-1"
            rows={[leader]}
            usersById={usersById}
            currentUserId={currentUserId}
          />
        </div>
      )}

      <p className="caption-small mt-6 text-text-secondary">
        {t('leaderboard.rankedNote')}
      </p>
    </section>
  );
}
