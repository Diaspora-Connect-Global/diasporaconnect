'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { DoorOpen, Flag, Mail, Plus, Search, Target, UserPlus, Users, Vote, X } from 'lucide-react';

import PageLoader from '@/components/custom/PageLoader';
import { EmptyState, ErrorState } from '@/components/feedback';
import {
  DiscoverCircleCard,
  MyCircleCard,
  useCircleUnreadCounts,
} from '@/components/circles/index';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { PageHero } from '@/components/redesign/PageHero';
import { REDESIGN_IMAGES } from '@/lib/redesignImages';
import { ICON_CHIP_CLASS } from '@/components/more/MoreLinkCard';
import { useMyCircleInvitations } from '@/components/circles/invitations';
import { MY_CIRCLES, SEARCH_CIRCLES } from '@/services/gql/circles';
import type {
  MyCirclesData,
  SearchCirclesData,
} from '@/services/gql/types/circles';

/** One screenful of the caller's own circles. Circles are few by design. */
const MY_CIRCLES_PAGE = 20;

/** Discover fetches a page and shows one row of it until "See all"; a search shows every match. */
const DISCOVER_PAGE = 12;
const DISCOVER_PREVIEW = 3;

/** Cards keep their own design; the grid follows the section's width (1 → 2 → 3 across). */
const CARD_GRID_CLASS = 'grid gap-4 @[34rem]:grid-cols-2 @[52rem]:grid-cols-3';

export default function CirclesPage() {
  const t = useTranslations('circles');
  const tPage = useTranslations('circles.index');
  const tFeedback = useTranslations('feedback');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim().slice(0, 100);
  const [draft, setDraft] = useState(query);
  const [showAllDiscover, setShowAllDiscover] = useState(false);

  const mine = useQuery<MyCirclesData>(MY_CIRCLES, {
    variables: { limit: MY_CIRCLES_PAGE, offset: 0 },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const discover = useQuery<SearchCirclesData>(SEARCH_CIRCLES, {
    variables: { query: query || null, limit: DISCOVER_PAGE, offset: 0 },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const { unreadByConversationId } = useCircleUnreadCounts();
  const { pending: pendingInvitations } = useMyCircleInvitations();

  const myCircles = useMemo(() => mine.data?.myCircles ?? [], [mine.data]);

  /*
   * Discovery results are identical for every viewer (circle-service does not
   * personalise them), so a circle the viewer already belongs to can come back
   * and `requestToJoinCircle` would refuse it. Filtering is the client's job.
   */
  const myCircleIds = useMemo(() => new Set(myCircles.map((c) => c.id)), [myCircles]);
  const discoverable = useMemo(
    () => (discover.data?.searchCircles ?? []).filter((c) => !myCircleIds.has(c.id)),
    [discover.data, myCircleIds],
  );
  const visibleDiscover = showAllDiscover || query ? discoverable : discoverable.slice(0, DISCOVER_PREVIEW);

  const setQuery = (next: string) => {
    const q = next.trim().slice(0, 100);
    router.replace(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname, { scroll: false });
  };
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setQuery(draft);
  };

  // First paint waits for both sections together; a warm-cache revisit never blanks the screen.
  if ((mine.loading && !mine.data) || (discover.loading && !discover.data && !query)) {
    return <PageLoader />;
  }

  const how = [
    { icon: Users, tone: 'info' as const, title: tPage('how.smallTitle'), body: tPage('how.smallBody') },
    { icon: Target, tone: 'success' as const, title: tPage('how.goalsTitle'), body: tPage('how.goalsBody') },
    { icon: Vote, tone: 'brand' as const, title: tPage('how.voteTitle'), body: tPage('how.voteBody') },
  ];

  const ways = [
    { icon: Mail, title: tPage('ways.inviteTitle'), body: tPage('ways.inviteBody') },
    { icon: UserPlus, title: tPage('ways.requestTitle'), body: tPage('ways.requestBody') },
    { icon: DoorOpen, title: tPage('ways.openTitle'), body: tPage('ways.openBody') },
  ];

  return (
    <div className="h-app-inner overflow-y-auto scrollbar-hide">
      <div className="mx-auto w-full space-y-5 px-4 py-4 pb-10 lg:px-0 lg:py-6">
        <PageHero id="circles-title" eyebrow={tPage('eyebrow')} title={tPage('heroTitle')} subtitle={tPage('heroSubtitle')} image={REDESIGN_IMAGES.connectCard} priority>
          <div className="flex flex-wrap items-center gap-3">
            <form role="search" onSubmit={onSubmit} className="flex min-w-0 max-w-xl flex-1 items-center gap-2 rounded-full border border-border-subtle bg-surface-default p-1.5 pl-4 shadow-sm focus-within:border-border-brand">
              <label htmlFor="circles-search" className="sr-only">{tPage('searchPlaceholder')}</label>
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              {/* 16px on phones: iOS Safari zooms the page into smaller fields. */}
              <input
                id="circles-search"
                type="search"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={tPage('searchPlaceholder')}
                autoComplete="off"
                enterKeyHint="search"
                maxLength={100}
                className="min-w-0 flex-1 bg-transparent text-base text-text-primary outline-none placeholder:text-muted-foreground md:text-sm"
              />
              <button type="submit" className="shrink-0 rounded-full bg-surface-brand px-5 py-2 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2">
                {tPage('searchButton')}
              </button>
            </form>
            <Link href="/circles/create" data-testid="create-circle-link" className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-text-brand bg-surface-default px-5 text-sm font-semibold text-text-brand hover:bg-surface-brand-light/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2">
              {/* The glyph is decorative — the label already says it. */}
              <Plus aria-hidden className="size-4 shrink-0" />
              {tPage('createCta')}
            </Link>
            <Link href="/circles/invitations" data-testid="circle-invitations-link" className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-border-subtle bg-surface-default px-5 text-sm font-semibold text-text-primary hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2">
              <Mail aria-hidden className="size-4 shrink-0" />
              {t('invitations.cta')}
              {pendingInvitations.length > 0 && (
                <span data-testid="circle-invitations-badge" aria-label={t('invitations.badgeCount', { count: pendingInvitations.length })} className="grid min-w-5 place-items-center rounded-full bg-surface-brand px-1.5 text-xs font-bold text-white">
                  {pendingInvitations.length}
                </span>
              )}
            </Link>
          </div>
        </PageHero>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-5">
            {!query && (
              <section aria-labelledby="my-circles-title" data-testid="my-circles" className="rounded-2xl border border-border-subtle bg-surface-default p-5 shadow-sm">
                <div className="mb-4 flex items-baseline justify-between gap-3">
                  <h2 id="my-circles-title" className="text-lg font-bold text-text-primary">{tPage('title')}</h2>
                  {myCircles.length > 0 && <span className="text-sm text-text-secondary">{myCircles.length}</span>}
                </div>
                {mine.error && myCircles.length === 0 ? (
                  <ErrorState title={tFeedback('error.title')} description={t('errors.loadCircles')} retryLabel={t('common.retry')} onRetry={() => void mine.refetch()} />
                ) : myCircles.length === 0 ? (
                  <EmptyState icon={Users} title={t('empty.circles.title')} description={t('empty.circles.description')} />
                ) : (
                  <div className="@container">
                    <div className={CARD_GRID_CLASS}>
                      {myCircles.map((circle) => (
                        <MyCircleCard
                          key={circle.id}
                          circle={circle}
                          unreadCount={circle.chatConversationId ? unreadByConversationId[circle.chatConversationId] : undefined}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            <section aria-labelledby="discover-circles-title" data-testid="discover-circles" className="rounded-2xl border border-border-subtle bg-surface-default p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="discover-circles-title" className="text-lg font-bold text-text-primary">
                    {query ? tPage('resultsTitle', { query }) : tPage('discoverTitle')}
                  </h2>
                  {!query && <p className="mt-0.5 text-sm text-text-secondary">{tPage('discoverSubtitle')}</p>}
                </div>
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDraft('');
                      setQuery('');
                    }}
                    className="inline-flex items-center gap-1 text-sm font-medium text-text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
                  >
                    <X className="size-4" aria-hidden />
                    {tPage('clearSearch')}
                  </button>
                ) : !showAllDiscover && discoverable.length > DISCOVER_PREVIEW ? (
                  <button type="button" onClick={() => setShowAllDiscover(true)} className="text-sm font-medium text-text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
                    {t('common.seeAll')}
                  </button>
                ) : null}
              </div>

              {discover.loading && !discover.data ? (
                <PageLoader />
              ) : discover.error && discoverable.length === 0 ? (
                <ErrorState size="sm" title={tFeedback('error.title')} description={t('errors.generic')} retryLabel={t('common.retry')} onRetry={() => void discover.refetch()} />
              ) : discoverable.length === 0 ? (
                <EmptyState size="sm" title={query ? tPage('noResults', { query }) : t('empty.discover.title')} description={query ? undefined : t('empty.discover.description')} />
              ) : (
                <div className="@container">
                  <div className={CARD_GRID_CLASS}>
                    {visibleDiscover.map((circle) => (
                      <DiscoverCircleCard key={circle.id} circle={circle} />
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* How circles work: what makes a circle different from a group or a community. */}
          <aside aria-labelledby="circles-how-title" data-testid="circles-how" className="h-fit space-y-4 rounded-2xl border border-border-subtle bg-surface-default p-5 shadow-sm lg:sticky lg:top-0">
            <h2 id="circles-how-title" className="text-base font-bold text-text-primary">{tPage('how.title')}</h2>
            <ul className="space-y-4">
              {how.map(({ icon: Icon, tone, title, body }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${ICON_CHIP_CLASS}`}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-text-primary">{title}</span>
                    <span className="block text-xs text-text-secondary">{body}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="space-y-3 border-t border-border-subtle pt-4" data-testid="circles-ways">
              <h3 id="circles-ways-title" className="text-sm font-bold text-text-primary">{tPage('ways.title')}</h3>
              <ul aria-labelledby="circles-ways-title" className="space-y-3">
                {ways.map(({ icon: Icon, title, body }) => (
                  <li key={title} className="flex items-start gap-3">
                    <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${ICON_CHIP_CLASS}`}>
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-text-primary">{title}</span>
                      <span className="block text-xs text-text-secondary">{body}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/circles/create" className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full bg-surface-brand px-5 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2">
              <Flag className="size-4" aria-hidden />
              {tPage('startCta')}
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
