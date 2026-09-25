'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { Plus, Users } from 'lucide-react';

import { ButtonType2, ButtonType3 } from '@/components/custom/button';
import PageLoader from '@/components/custom/PageLoader';
import { EmptyState, ErrorState } from '@/components/feedback';
import {
  DiscoverCircleCard,
  MyCircleCard,
  useCircleUnreadCounts,
} from '@/components/circles/index';
import { Link } from '@/i18n/navigation';
import { CIRCLE_COLUMN_CLASS } from '@/lib/feedColumnLayout';
import { MY_CIRCLES, SEARCH_CIRCLES } from '@/services/gql/circles';
import type {
  MyCirclesData,
  SearchCirclesData,
} from '@/services/gql/types/circles';

/** One screenful of the caller's own circles. Circles are few by design. */
const MY_CIRCLES_PAGE = 20;

/**
 * Discover is a preview on this screen, so it fetches a page and reveals one
 * row of it. "See all" expands what is already loaded rather than linking
 * anywhere: a dedicated `/circles/discover` route is where a real "all"
 * belongs, and pointing at a route that does not exist would be a dead end.
 */
const DISCOVER_PAGE = 12;
/** One full row of the three-across grid — the preview is a row, not a count. */
const DISCOVER_PREVIEW = 3;

/**
 * Both grids, one class.
 *
 * Three across on desktop, per the design. Two at `sm` and one below that,
 * because `CIRCLE_COLUMN_CLASS` is uncapped — it takes whatever the sidebar
 * leaves — so the tiles have to earn their width rather than assume it.
 * `items-stretch` (the grid default) plus `h-full` inside each tile is what
 * lets a tile with a two-line name stay level with its neighbours.
 */
const CARD_GRID_CLASS = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3';

export default function CirclesPage() {
  const t = useTranslations('circles');
  // `ErrorState`'s own default title is a hardcoded English string; the shared
  // `feedback` namespace is where the translated one lives (see circles/error.tsx).
  const tFeedback = useTranslations('feedback');
  const [showAllDiscover, setShowAllDiscover] = useState(false);

  const mine = useQuery<MyCirclesData>(MY_CIRCLES, {
    variables: { limit: MY_CIRCLES_PAGE, offset: 0 },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const discover = useQuery<SearchCirclesData>(SEARCH_CIRCLES, {
    variables: { query: null, limit: DISCOVER_PAGE, offset: 0 },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const { unreadByConversationId } = useCircleUnreadCounts();

  const myCircles = useMemo(() => mine.data?.myCircles ?? [], [mine.data]);

  /*
   * Discovery results are deliberately identical for every viewer — circle-service
   * does not personalise them, so "what can a stranger see?" stays testable.
   * That means a circle the viewer already belongs to can come back here, and
   * `requestToJoinCircle` would refuse it with a membership conflict. Filtering
   * is therefore the client's job.
   *
   * Bounded by the page above: someone in more than MY_CIRCLES_PAGE circles
   * could still see one of their own here until the list is paginated.
   */
  const myCircleIds = useMemo(
    () => new Set(myCircles.map((c) => c.id)),
    [myCircles],
  );

  const discoverable = useMemo(
    () =>
      (discover.data?.searchCircles ?? []).filter((c) => !myCircleIds.has(c.id)),
    [discover.data, myCircleIds],
  );

  const visibleDiscover = showAllDiscover
    ? discoverable
    : discoverable.slice(0, DISCOVER_PREVIEW);

  /*
   * Both sections are above the fold from the first frame, so first paint waits
   * on both together rather than showing "My circles" while "Discover" is still
   * a skeleton underneath it. `cache-and-network` reports `loading` on every
   * background refresh too, so the gate is on there being no data YET, not on
   * `loading` alone — a revisit with a warm cache must never blank the screen.
   */
  if ((mine.loading && !mine.data) || (discover.loading && !discover.data)) {
    return <PageLoader />;
  }

  return (
    <div className="h-app-inner flex overflow-hidden">
      <div className={CIRCLE_COLUMN_CLASS}>
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
          <h1 className="heading-small text-text-primary">{t('index.title')}</h1>
          <Link href="/circles/create">
            {/* The glyph is decorative — "Create a Circle" already says it. */}
            <ButtonType2 className="inline-flex items-center gap-1.5">
              <Plus aria-hidden="true" className="size-4 shrink-0" />
              {t('index.createCta')}
            </ButtonType2>
          </Link>
        </div>

        {mine.error && myCircles.length === 0 ? (
          <ErrorState
            title={tFeedback('error.title')}
            description={t('errors.loadCircles')}
            retryLabel={t('common.retry')}
            onRetry={() => {
              void mine.refetch();
            }}
          />
        ) : myCircles.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('empty.circles.title')}
            description={t('empty.circles.description')}
          />
        ) : (
          <div className={CARD_GRID_CLASS}>
            {myCircles.map((circle) => (
              <MyCircleCard
                key={circle.id}
                circle={circle}
                unreadCount={
                  circle.chatConversationId
                    ? unreadByConversationId[circle.chatConversationId]
                    : undefined
                }
              />
            ))}
          </div>
        )}

        <div className="mb-4 mt-8 flex shrink-0 items-center justify-between gap-3">
          <h2 className="label-large text-text-primary">
            {t('index.discoverTitle')}
          </h2>
          {!showAllDiscover && discoverable.length > DISCOVER_PREVIEW ? (
            <ButtonType3 onClick={() => setShowAllDiscover(true)}>
              {t('common.seeAll')}
            </ButtonType3>
          ) : null}
        </div>

        {discover.error && discoverable.length === 0 ? (
          <ErrorState
            size="sm"
            title={tFeedback('error.title')}
            description={t('errors.generic')}
            retryLabel={t('common.retry')}
            onRetry={() => {
              void discover.refetch();
            }}
          />
        ) : discoverable.length === 0 ? (
          <EmptyState
            size="sm"
            title={t('empty.discover.title')}
            description={t('empty.discover.description')}
          />
        ) : (
          <div className={CARD_GRID_CLASS}>
            {visibleDiscover.map((circle) => (
              <DiscoverCircleCard key={circle.id} circle={circle} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
