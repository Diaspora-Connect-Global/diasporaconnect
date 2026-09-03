'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';

import { ButtonType1 } from '@/components/custom/button';
import { EmptyState, ErrorState } from '@/components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, useRouter } from '@/i18n/navigation';
import { CIRCLE_COLUMN_CLASS } from '@/lib/feedColumnLayout';
import { useUserStore } from '@/store/useUserStore';
import { useCircleUsers } from '@/hooks/useCircleUsers';
import { CIRCLE_LEADERBOARD } from '@/services/gql/circles';
import type {
  CircleLeaderboardData,
  CircleLeaderboardVariables,
} from '@/services/gql/types/circles';
import {
  SegmentedControl,
  type SegmentedOption,
} from '@/components/circles/primitives';
import {
  CollectiveView,
  ContributionBreakdown,
  LEADERBOARD_PAGE_LIMIT,
  RankedList,
  RankedSummary,
  useWeeklyScoreSeries,
} from '@/components/circles/leaderboard';

/**
 * Widest the two columns are allowed to get. `CIRCLE_COLUMN_CLASS` deliberately
 * has no cap so the sidebar stays at the page edge, which on a wide monitor
 * would otherwise stretch a six-row list across most of the screen.
 */
const SHELL_CLASS = 'mx-auto w-full max-w-5xl';

type LeaderboardMode = 'RANKED' | 'COLLECTIVE';

/**
 * Screen 8 — Leaderboard.
 *
 * ## Two framings, two layouts — not one layout sorted two ways
 *
 * Each mode is a hero panel plus a list panel, and the hero is what makes them
 * different readings of the same ledger rather than a toggle over a sort order:
 *
 *   COLLECTIVE — the shared total and the week that built it, then an
 *                un-numbered breakdown of who contributed to it.
 *   RANKED     — the viewer's own position and who is out in front, then the
 *                numbered standings.
 *
 * Neither hero appears in the other mode. A circle total sitting above a ranked
 * list, or a rank column under "our collective progress", would collapse the two
 * back into one screen with a different sort applied.
 *
 * ## Ranking off is a state, not a filter
 *
 * When a circle switches individual ranking off, `circleLeaderboard` comes back
 * with `rankingEnabled: false` and no rows. That is not "the ranked tab happens
 * to be empty" — it is the circle having decided that a permanent, visible list
 * of who is last has no place among friends. So the toggle is not rendered at
 * all, and the displayed mode is DERIVED rather than read from state, which
 * means no sequence of interactions (toggling while ranking was on, then a
 * refetch that turns it off) can leave a ranked view on screen. Hiding the
 * ranked tab while leaving the state reachable would put the decision back in
 * the UI's hands, where it does not belong.
 *
 * The right-hand column is gated on rows existing for the same reason, and the
 * collective panel then simply takes the full measure — it is complete on its
 * own, so nothing has to be invented to fill the gap.
 *
 * ## The row count is a page, not a census
 *
 * The board comes back one page at a time and the API carries no contributor
 * total, so the page size lives beside the panels that print counts from it
 * (`boardPage.ts`) rather than as a private constant here — the request and the
 * claim made about its result have to move together.
 *
 * ## The query is nullable
 *
 * A non-member gets `null`, not an error. That is a real state with its own
 * copy, not a crash and not an empty board.
 */
export default function CircleLeaderboardPage() {
  const t = useTranslations('circles');
  const router = useRouter();
  const params = useParams();

  const circleId = String(params?.id ?? '');
  const currentUserId = useUserStore((state) => state.user?.userId) ?? null;

  const [preferredMode, setPreferredMode] = useState<LeaderboardMode>('RANKED');

  const { data, loading, error, refetch } = useQuery<
    CircleLeaderboardData,
    CircleLeaderboardVariables
  >(CIRCLE_LEADERBOARD, {
    variables: { circleId, limit: LEADERBOARD_PAGE_LIMIT },
    skip: !circleId,
    errorPolicy: 'all',
  });

  const leaderboard = data?.circleLeaderboard ?? null;
  const rankingEnabled = leaderboard?.rankingEnabled ?? false;
  const rows = useMemo(() => leaderboard?.rows ?? [], [leaderboard]);

  // Derived, never stored: with ranking off there is exactly one possible view.
  const mode: LeaderboardMode = rankingEnabled ? preferredMode : 'COLLECTIVE';

  const userIds = useMemo(() => rows.map((row) => row.userId), [rows]);
  const { usersById } = useCircleUsers(userIds);

  /*
   * The day series is the circle's, not any one member's, so it is read
   * regardless of the ranking switch — turning individual scoring off hides the
   * comparison between people, not when the circle earned its points. Called
   * unconditionally because it is a hook; it skips itself without a circle id
   * and degrades to `unavailable` (chart absent) if the ledger cannot be read.
   */
  const week = useWeeklyScoreSeries(
    circleId,
    // `undefined` while the leaderboard is still loading, so the ledger is read
    // ONCE under the season the total above it is using. Written as an explicit
    // ternary rather than `leaderboard?.seasonKey` so a resolved board with an
    // absent field still yields `null` and cannot hold the query forever.
    leaderboard ? leaderboard.seasonKey ?? null : undefined,
  );

  const options: readonly [
    SegmentedOption<LeaderboardMode>,
    SegmentedOption<LeaderboardMode>,
  ] = [
    { value: 'RANKED', label: t('leaderboard.modeRanked') },
    { value: 'COLLECTIVE', label: t('leaderboard.modeCollective') },
  ];

  const header = (
    <button
      type="button"
      onClick={() => router.push(`/circles/${circleId}`)}
      className="mb-4 inline-flex items-center gap-2 text-text-secondary transition-colors hover:text-text-primary"
    >
      <ArrowLeft className="size-4" />
      <span className="label-medium">{t('leaderboard.title')}</span>
    </button>
  );

  if (loading && !leaderboard) {
    return (
      <div className="h-app-inner flex overflow-hidden">
        <div className={CIRCLE_COLUMN_CLASS}>
          <div className={SHELL_CLASS}>
            {header}
            <Skeleton className="mx-auto mb-6 h-10 w-56 rounded-full" />
            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-12">
              <Skeleton className="h-80 w-full rounded-2xl" />
              <Skeleton className="hidden h-80 w-full rounded-2xl lg:block" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !leaderboard) {
    return (
      <div className="h-app-inner flex overflow-hidden">
        <div className={CIRCLE_COLUMN_CLASS}>
          <div className={SHELL_CLASS}>
            {header}
            <ErrorState
              title={t('errors.loadLeaderboard')}
              retryLabel={t('common.retry')}
              onRetry={() => void refetch()}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!leaderboard) {
    return (
      <div className="h-app-inner flex overflow-hidden">
        <div className={CIRCLE_COLUMN_CLASS}>
          <div className={SHELL_CLASS}>
            {header}
            <EmptyState
              title={t('errors.noAccess.title')}
              description={t('errors.noAccess.description')}
              action={
                <Link href="/circles">
                  <ButtonType1>{t('errors.notFound.cta')}</ButtonType1>
                </Link>
              }
            />
          </div>
        </div>
      </div>
    );
  }

  const hasBreakdown = rows.length > 0;

  return (
    <div className="h-app-inner flex overflow-hidden">
      <div className={CIRCLE_COLUMN_CLASS}>
        <div className={SHELL_CLASS}>
          {header}

          {rankingEnabled && (
            <SegmentedControl
              className="mx-auto mb-6 w-full max-w-xs"
              aria-label={t('leaderboard.title')}
              options={options}
              value={mode}
              onChange={setPreferredMode}
            />
          )}

          {/*
            Ranked with an empty board has no hero to show and no list to show —
            "#—  of 0" beside an empty panel is two ways of saying the same
            nothing. One empty state says it once.
          */}
          {mode === 'RANKED' && !hasBreakdown ? (
            <EmptyState
              title={t('empty.leaderboard.title')}
              description={t('empty.leaderboard.description')}
            />
          ) : (
            <div
              className={
                hasBreakdown
                  ? 'grid grid-cols-1 items-start gap-8 pb-4 lg:grid-cols-2 lg:gap-12'
                  : 'mx-auto w-full max-w-xl pb-4'
              }
            >
              {mode === 'RANKED' ? (
                <RankedSummary
                  rows={rows}
                  usersById={usersById}
                  currentUserId={currentUserId}
                />
              ) : (
                <CollectiveView
                  collectiveTotal={leaderboard.collectiveTotal}
                  week={week}
                />
              )}

              {hasBreakdown &&
                (mode === 'RANKED' ? (
                  <RankedList
                    rows={rows}
                    usersById={usersById}
                    currentUserId={currentUserId}
                  />
                ) : (
                  <ContributionBreakdown
                    rows={rows}
                    usersById={usersById}
                    currentUserId={currentUserId}
                  />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
