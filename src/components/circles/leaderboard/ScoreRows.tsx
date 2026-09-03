'use client';

import { useTranslations } from 'next-intl';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { CircleLeaderboardRow } from '@/services/gql/types/circles';
import { circleUserDisplayName, type CircleUser } from '@/hooks/useCircleUsers';

export interface ScoreRowsProps {
  rows: CircleLeaderboardRow[];
  usersById: Record<string, CircleUser>;
  currentUserId?: string | null;
  /**
   * Show the server's rank number in a leading column.
   *
   * OFF in the collective framing on purpose: a numbered list is the ranked
   * framing wearing a different heading, and the point of collective mode is
   * that the total is the achievement and the rows only say how it was built.
   */
  showRank?: boolean;
  className?: string;
}

/**
 * Avatar, name, points — the row shared by both framings of this screen.
 *
 * Rows render in the order the server returned them and the server's `rank` is
 * printed verbatim. Re-sorting or re-numbering client-side would quietly invent
 * a different answer than the score ledger computed, and ties — which share a
 * rank — would come out renumbered.
 *
 * Points are SIGNED. A member carrying a correction can be on zero or below,
 * which is a legitimate standing and is rendered as-is rather than clamped: the
 * ledger is the record, and a UI that floors it at zero is lying about it.
 */
export function ScoreRows({
  rows,
  usersById,
  currentUserId,
  showRank = false,
  className,
}: ScoreRowsProps) {
  const t = useTranslations('circles');

  return (
    <ol className={cn('divide-y divide-border-subtle', className)}>
      {rows.map((row) => {
        const user = usersById[row.userId];
        const isMe = Boolean(currentUserId) && row.userId === currentUserId;
        const name = isMe
          ? t('common.you')
          : circleUserDisplayName(user, t('common.loading'));

        return (
          <li
            key={row.userId}
            className={cn(
              'flex items-center gap-3 py-3',
              // The viewer's own row is tinted rather than badged: it needs to
              // be findable in a scroll, not decorated.
              isMe && 'rounded-lg bg-surface-subtle px-2',
            )}
          >
            {showRank && (
              <span className="label-small w-6 shrink-0 text-center text-text-secondary tabular-nums">
                {row.rank}
              </span>
            )}

            <Avatar className="size-9 shrink-0 border border-border-subtle">
              <AvatarImage src={user?.avatarUrl ?? undefined} alt="" />
              <AvatarFallback className="caption-small bg-surface-subtle text-text-primary">
                {(name.trim().charAt(0) || '?').toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <p className="label-small min-w-0 flex-1 truncate text-text-primary">
              {name}
            </p>

            <span className="label-small shrink-0 text-text-primary tabular-nums">
              {t('leaderboard.points', { points: row.points })}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
