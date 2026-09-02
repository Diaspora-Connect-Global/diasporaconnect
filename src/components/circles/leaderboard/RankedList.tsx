'use client';

import { useTranslations } from 'next-intl';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EmptyState } from '@/components/feedback';
import { cn } from '@/lib/utils';
import type { CircleLeaderboardRow } from '@/services/gql/types/circles';
import { circleUserDisplayName, type CircleUser } from '@/hooks/useCircleUsers';

export interface RankedListProps {
  rows: CircleLeaderboardRow[];
  usersById: Record<string, CircleUser>;
  currentUserId?: string | null;
}

/**
 * The ranked standings — rank, avatar, name, points.
 *
 * Rendered ONLY when the circle has ranking enabled. The page decides that; see
 * the page for why this component must never be reachable otherwise.
 *
 * Rows are shown in the order the server returned them and the server's `rank`
 * is displayed verbatim — re-sorting or re-numbering client-side would quietly
 * invent a different answer than the one the score ledger computed, and ties
 * (which share a rank) would come out renumbered.
 */
export function RankedList({
  rows,
  usersById,
  currentUserId,
}: RankedListProps) {
  const t = useTranslations('circles');

  if (rows.length === 0) {
    return (
      <EmptyState
        title={t('empty.leaderboard.title')}
        description={t('empty.leaderboard.description')}
      />
    );
  }

  return (
    <ol className="divide-y divide-border-subtle">
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
            <span className="label-small w-6 shrink-0 text-center text-text-secondary tabular-nums">
              {row.rank}
            </span>

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
