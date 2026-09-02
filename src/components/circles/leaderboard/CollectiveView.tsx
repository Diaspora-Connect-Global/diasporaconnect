'use client';

import { useTranslations } from 'next-intl';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { CircleLeaderboardRow } from '@/services/gql/types/circles';
import { circleUserDisplayName, type CircleUser } from '@/hooks/useCircleUsers';

import { AvatarGroup } from '../primitives';

/** Bars past this point are hairlines that read as texture, not as data. */
const MAX_BARS = 12;
/** Floor so a member on zero points still occupies the board. */
const MIN_BAR_PERCENT = 8;

export interface CollectiveViewProps {
  collectiveTotal: number;
  /**
   * Per-member standings, EMPTY when the circle has ranking switched off.
   *
   * Everything per-person on this screen is gated on this list being non-empty
   * — see the note in the component.
   */
  rows: CircleLeaderboardRow[];
  usersById: Record<string, CircleUser>;
  currentUserId?: string | null;
}

/**
 * The collective board — one shared total, and how it was built.
 *
 * ## Collective is a choice, not a fallback
 *
 * This is the ONLY view a ranking-disabled circle ever sees, so it must not
 * read as the ranked board with the interesting part removed. The total gets
 * the largest type on the screen and the brand colour; the ranked list has no
 * equivalent hero number.
 *
 * ## Why the per-person sections are conditional
 *
 * `circleLeaderboard` returns `rows: []` when `rankingEnabled` is false — the
 * circle turned individual scoring off precisely so nobody's standing is on
 * permanent display. So the bars, the contributor stack, the member count and
 * the breakdown all render only when rows exist (ranking on, viewer chose
 * Collective). Falling back to a members list to fill those sections would
 * reconstruct the very thing the setting removes, and a "contribution
 * breakdown" listing everyone at an implied zero would be worse than absent.
 *
 * What survives with no rows is exactly what is still true: the circle's total,
 * that it was built together, and that in collective mode everyone wins.
 */
export function CollectiveView({
  collectiveTotal,
  rows,
  usersById,
  currentUserId,
}: CollectiveViewProps) {
  const t = useTranslations('circles');

  const hasBreakdown = rows.length > 0;
  const topPoints = hasBreakdown
    ? Math.max(...rows.map((row) => row.points))
    : 0;

  return (
    <section className="rounded-2xl border border-border-subtle p-5">
      <h2 className="label-medium text-text-primary">
        {t('leaderboard.collectiveTitle')}
      </h2>

      <p className="heading-medium mt-2 text-text-brand tabular-nums">
        {t('leaderboard.points', { points: collectiveTotal })}
      </p>

      <p className="caption-small mt-1 text-text-secondary">
        {t('leaderboard.builtTogether')}
      </p>

      {hasBreakdown && (
        <>
          {/*
            Height encodes points against the leader. Decorative only — every
            number it stands for is spelled out in the breakdown below, so the
            bars carry no labels and are hidden from assistive tech rather than
            announced as a meaningless run of values.
          */}
          <div
            aria-hidden="true"
            className="mt-5 flex h-24 items-end gap-1.5"
          >
            {rows.slice(0, MAX_BARS).map((row) => (
              <div
                key={row.userId}
                className="flex-1 rounded-t-sm bg-text-success"
                style={{
                  height: `${
                    topPoints > 0
                      ? Math.max(
                          MIN_BAR_PERCENT,
                          Math.round((row.points / topPoints) * 100),
                        )
                      : MIN_BAR_PERCENT
                  }%`,
                }}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <AvatarGroup
              size="sm"
              max={5}
              users={rows.map((row) => ({
                id: row.userId,
                name:
                  usersById[row.userId]?.name ?? t('common.loading'),
                avatarUrl: usersById[row.userId]?.avatarUrl,
              }))}
            />
            <p className="caption-small text-text-secondary">
              {t('leaderboard.membersContributing', { count: rows.length })}
            </p>
          </div>

          <h3 className="label-medium mt-6 text-text-primary">
            {t('leaderboard.breakdownTitle')}
          </h3>

          <ul className="mt-2 divide-y divide-border-subtle">
            {rows.map((row) => {
              const user = usersById[row.userId];
              const isMe =
                Boolean(currentUserId) && row.userId === currentUserId;
              const name = isMe
                ? t('common.you')
                : circleUserDisplayName(user, t('common.loading'));

              return (
                <li key={row.userId} className="flex items-center gap-3 py-2.5">
                  <Avatar className="size-8 shrink-0 border border-border-subtle">
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
          </ul>
        </>
      )}

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
