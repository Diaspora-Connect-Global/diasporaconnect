'use client';

import { useCallback, useEffect, useMemo, useRef, useState, Fragment, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Newspaper } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useFeed, type UseFeedOptions } from '@/hooks/useFeed';
import { usePostEngagementHandlers } from '@/hooks/usePostEngagementHandlers';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import type { Post as ApiPost } from '@/services/gql/types/postsFeed';
import type { usePostEngagementHandlers as UsePostEngagementHandlers } from '@/hooks/usePostEngagementHandlers';
import { EmptyState, ErrorState } from '@/components/feedback';
import { Spinner } from '@/components/ui/spinner';
import PageLoader from '@/components/custom/PageLoader';

export type FeedTab = 'forYou' | 'latest' | 'following';
type Tab = FeedTab;

/** What the optional slots get to render from; all of it comes from the ONE feed this component owns. */
export interface FeedSlotContext {
  tab: FeedTab;
  category: string;
  setTab: (tab: FeedTab) => void;
  posts: ApiPost[];
  loading: boolean;
  error: boolean;
  isChronoFallback: boolean;
  handlers: ReturnType<typeof UsePostEngagementHandlers>;
  removePost: (postId: string) => void;
}
const TABS: Tab[] = ['forYou', 'latest', 'following'];

/**
 * The post categories ai-service assigns (its default taxonomy, minus "Other").
 * Labels come from the shared `categoryBadge` messages, so they read the same
 * as the badge on each post.
 */
const CATEGORIES = [
  'Business', 'Community', 'Culture', 'Diaspora', 'Education', 'Entertainment', 'Family', 'Finance', 'Food', 'Health',
  'Jobs', 'Lifestyle', 'News', 'Personal', 'Politics', 'Religion', 'Sports', 'Tech', 'Travel',
] as const;

/**
 * Feed tabs (For you / Latest / Following) over the same post cards Home uses,
 * so the Happy / Hopeful / Sad reactions are identical. `scrollRoot` is the
 * page's scroll container, which drives infinite scroll.
 *
 * The "All posts" filter narrows the feed to one category. A category feed is
 * newest-first, so picking one selects Latest; For you / Following clear it.
 */
export interface CommunityFeedProps {
  scrollRoot: Element | null;
  /**
   * 'community' (default): only posts authored by communities and associations,
   * with no fallback to member posts. 'all': the mixed feed (Home passes this).
   */
  scope?: 'community' | 'all';
  /** Home only: open media in the page's own modal instead of the post page. */
  onOpenMedia?: (postId: string, mediaIndex: number) => void;
  /** Home only: rendered above the list (interests prompt, fallback nudge). */
  renderTop?: (ctx: FeedSlotContext) => ReactNode;
  /** Home only: replaces the default empty state when it returns a node (never while a category filter is on). */
  renderEmpty?: (ctx: FeedSlotContext) => ReactNode;
  /** Home only: a node spliced into the list before the post at `index`. */
  inlineItem?: { index: number; node: ReactNode };
  /** Home only: overlays that need the feed's posts (the media modal). */
  renderOverlay?: (ctx: FeedSlotContext) => ReactNode;
}

const COMMUNITY_AUTHOR_TYPES = ['COMMUNITY', 'ASSOCIATION'];

/**
 * Which feed each tab reads.
 *  - 'all' (Home): unchanged - ranked recommendations, newest-first ALL, joined-community feed.
 *  - 'community': posts authored by communities/associations only. For you is the ranked
 *    COMMUNITIES_AND_ASSOCIATIONS feed (no recommender, so no NETWORK/ALL fallback can pull
 *    member posts in), Latest the same set newest-first, Following the membership-scoped
 *    joinedCommunityFeed (already community-only).
 */
function feedOptions(scope: 'community' | 'all', tab: Tab, category: string): UseFeedOptions {
  if (scope === 'all') {
    return category ? { category } : tab === 'latest' ? { feedType: 'ALL' } : { mode: tab === 'following' ? 'following' : 'you' };
  }
  if (category) return { category, authorTypes: COMMUNITY_AUTHOR_TYPES };
  if (tab === 'latest') return { feedType: 'COMMUNITIES_AND_ASSOCIATIONS', chronological: true };
  if (tab === 'following') return { mode: 'following' };
  return { feedType: 'COMMUNITIES_AND_ASSOCIATIONS' };
}

export function CommunityFeed({ scrollRoot, scope = 'community', onOpenMedia, renderTop, renderEmpty, inlineItem, renderOverlay }: CommunityFeedProps) {
  const t = useTranslations('communityPage');
  const tCategory = useTranslations('categoryBadge');
  const tFeedback = useTranslations('feedback');
  const router = useRouter();
  const [tab, setTabState] = useState<Tab>('forYou');
  const [category, setCategory] = useState('');
  const setTab = (next: Tab) => {
    setTabState(next);
    if (next !== 'latest') setCategory('');
  };
  const chooseCategory = (next: string) => {
    setCategory(next);
    if (next) setTabState('latest');
  };
  const categoryOptions = useMemo(
    () => CATEGORIES.map((c) => ({ value: c, label: tCategory(c) })).sort((a, b) => a.label.localeCompare(b.label)),
    [tCategory],
  );
  const feed = useFeed(feedOptions(scope, tab, category));
  const { posts, loading, loadingMore, error, refetch, hasMore, loadMore, updatePostCounts, removePost } = feed;
  const handlers = usePostEngagementHandlers(updatePostCounts);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const handleOpenMedia = useCallback(
    (postId: string, mediaIndex: number) => {
      if (onOpenMedia) onOpenMedia(postId, mediaIndex);
      else router.push(`/post/${encodeURIComponent(postId)}`);
    },
    [router, onOpenMedia],
  );
  const slotCtx: FeedSlotContext = {
    tab, category, setTab, posts, loading, error: !!error,
    isChronoFallback: feed.feedMeta?.isChronoFallback === true,
    handlers, removePost,
  };

  useEffect(() => {
    const el = sentinel.current;
    if (!el || posts.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && hasMore && !loadingMore && !loading) loadMore();
      },
      { root: scrollRoot, rootMargin: '800px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [posts.length, hasMore, loadingMore, loading, loadMore, scrollRoot]);

  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    setTab(next);
    (e.currentTarget.parentElement?.querySelector(`[data-tab="${next}"]`) as HTMLElement | null)?.focus();
  };

  return (
    <section aria-label={t('tabs.label')} data-testid="community-feed">
      <div className="mb-3 flex items-end justify-between gap-3 border-b border-border-subtle">
      <div role="tablist" aria-label={t('tabs.label')} className="flex gap-6">
        {TABS.map((k, i) => (
          <button
            key={k}
            type="button"
            role="tab"
            data-tab={k}
            aria-selected={tab === k}
            tabIndex={tab === k ? 0 : -1}
            onClick={() => setTab(k)}
            onKeyDown={(e) => onKey(e, i)}
            className={`-mb-px border-b-2 px-1 pb-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand ${tab === k ? 'border-text-brand text-text-brand' : 'border-transparent text-muted-foreground hover:text-text-primary'}`}
          >
            {t(`tabs.${k}`)}
          </button>
        ))}
      </div>
        <div className="relative mb-2 shrink-0">
          <label htmlFor="community-feed-filter" className="sr-only">{t('filter.label')}</label>
          <select
            id="community-feed-filter"
            data-testid="community-feed-filter"
            value={category}
            onChange={(e) => chooseCategory(e.target.value)}
            className="h-8 cursor-pointer appearance-none rounded-full border border-border-subtle bg-surface-default py-1 pl-3 pr-8 text-base font-medium text-text-primary hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand md:text-xs"
          >
            <option value="">{t('filter.all')}</option>
            {categoryOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-secondary" aria-hidden />
        </div>
      </div>
      <div role="tabpanel" className="space-y-2">
        {loading && posts.length === 0 && !error && <PageLoader />}
        {!loading && !error && renderTop?.(slotCtx)}
        {error && <ErrorState title={tFeedback('error.title')} description={t('feed.error')} retryLabel={t('feed.retry')} onRetry={() => refetch()} />}
        {!loading && !error && posts.length === 0 && ((!category && renderEmpty?.(slotCtx)) || (
          <EmptyState icon={Newspaper} title={category ? t('filter.empty', { category: tCategory(category) }) : t('feed.empty')} />
        ))}
        {posts.map((post, i) => (
          <Fragment key={post.id}>
          {inlineItem && inlineItem.index === i && inlineItem.node}
          <FeedPostCard
            post={post}
            index={i}
            surface={tab === 'forYou' ? 'home_feed' : 'community_feed'}
            handleReact={handlers.handleReact}
            handleShare={handlers.handleShare}
            handleSave={handlers.handleSave}
            handleSendComment={handlers.handleSendComment}
            removePost={removePost}
            handleOpenMedia={handleOpenMedia}
          />
          </Fragment>
        ))}
        {loadingMore && (
          <div className="flex justify-center py-4">
            <Spinner className="size-5 text-text-brand" />
          </div>
        )}
        <div ref={sentinel} className="h-px w-full" />
      </div>
      {renderOverlay?.(slotCtx)}
    </section>
  );
}
