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
import { FEED_COLUMN_CLASS } from '@/lib/feedColumnLayout';
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
import { CollectiveView, RankedList } from '@/components/circles/leaderboard';

const LEADERBOARD_LIMIT = 50;

type LeaderboardMode = 'RANKED' | 'COLLECTIVE';

/**
 * Screen 8 — Leaderboard.
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
    variables: { circleId, limit: LEADERBOARD_LIMIT },
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
        <div className={FEED_COLUMN_CLASS}>
          {header}
          <Skeleton className="mx-auto mb-6 h-10 w-56 rounded-full" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error && !leaderboard) {
    return (
      <div className="h-app-inner flex overflow-hidden">
        <div className={FEED_COLUMN_CLASS}>
          {header}
          <ErrorState
            title={t('errors.loadLeaderboard')}
            retryLabel={t('common.retry')}
            onRetry={() => void refetch()}
          />
        </div>
      </div>
    );
  }

  if (!leaderboard) {
    return (
      <div className="h-app-inner flex overflow-hidden">
        <div className={FEED_COLUMN_CLASS}>
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
    );
  }

  return (
    <div className="h-app-inner flex overflow-hidden">
      <div className={FEED_COLUMN_CLASS}>
        {header}

        {rankingEnabled && (
          <SegmentedControl
            className="mx-auto mb-5 w-full max-w-xs"
            aria-label={t('leaderboard.title')}
            options={options}
            value={mode}
            onChange={setPreferredMode}
          />
        )}

        <div className="pb-4">
          {mode === 'RANKED' ? (
            <RankedList
              rows={rows}
              usersById={usersById}
              currentUserId={currentUserId}
            />
          ) : (
            <CollectiveView
              collectiveTotal={leaderboard.collectiveTotal}
              rows={rows}
              usersById={usersById}
              currentUserId={currentUserId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
