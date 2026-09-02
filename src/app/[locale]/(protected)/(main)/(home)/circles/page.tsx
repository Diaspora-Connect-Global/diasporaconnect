'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';

import { ButtonType2, ButtonType3 } from '@/components/custom/button';
import { EmptyState, ErrorState } from '@/components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DiscoverCircleRow,
  MyCircleCard,
  useCircleUnreadCounts,
} from '@/components/circles/index';
import { Link } from '@/i18n/navigation';
import { FEED_COLUMN_CLASS } from '@/lib/feedColumnLayout';
import { MY_CIRCLES, SEARCH_CIRCLES } from '@/services/gql/circles';
import type {
  MyCirclesData,
  SearchCirclesData,
} from '@/services/gql/types/circles';

/** One screenful of the caller's own circles. Circles are few by design. */
const MY_CIRCLES_PAGE = 20;

/**
 * Discover is a preview on this screen, so it fetches a page and reveals two.
 * "See all" expands what is already loaded rather than linking anywhere: a
 * dedicated `/circles/discover` route is where a real "all" belongs, and
 * pointing at a route that does not exist would be a dead end.
 */
const DISCOVER_PAGE = 12;
const DISCOVER_PREVIEW = 2;

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

  // `cache-and-network` reports loading on every background refresh, so the
  // skeletons are gated on there being nothing to show yet — not on `loading`
  // alone, which would blank a populated list on each revisit.
  const myCirclesPending = mine.loading && myCircles.length === 0;
  const discoverPending = discover.loading && discoverable.length === 0;

  return (
    <div className="h-app-inner flex overflow-hidden">
      <div className={FEED_COLUMN_CLASS}>
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
          <h1 className="heading-small text-text-primary">{t('index.title')}</h1>
          <Link href="/circles/create">
            <ButtonType2>{t('index.createCta')}</ButtonType2>
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
        ) : myCirclesPending ? (
          <MyCirclesSkeleton />
        ) : myCircles.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('empty.circles.title')}
            description={t('empty.circles.description')}
            action={
              <Link href="/circles/create">
                <ButtonType2>{t('empty.circles.cta')}</ButtonType2>
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
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
          <h2 className="label-medium text-text-primary">
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
        ) : discoverPending ? (
          <DiscoverSkeleton />
        ) : discoverable.length === 0 ? (
          <EmptyState
            size="sm"
            title={t('empty.discover.title')}
            description={t('empty.discover.description')}
          />
        ) : (
          <div className="space-y-3">
            {visibleDiscover.map((circle) => (
              <DiscoverCircleRow key={circle.id} circle={circle} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Shaped like `MyCircleCard`: banner, overlapping avatar, name, count, pills. */
function MyCirclesSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-lg border border-border-subtle"
        >
          <Skeleton className="h-28 w-full rounded-none" />
          <div className="p-4">
            <Skeleton className="-mt-12 mb-3 size-14 rounded-full border-4 border-surface-default" />
            <Skeleton className="mb-2 h-5 w-40" />
            <Skeleton className="mb-3 h-3 w-24" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Shaped like `DiscoverCircleRow`: avatar, name, count, access line, CTA. */
function DiscoverSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-lg border border-border-subtle p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
          <Skeleton className="mt-3 h-9 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}
