'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Newspaper } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useFeed } from '@/hooks/useFeed';
import { usePostEngagementHandlers } from '@/hooks/usePostEngagementHandlers';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { EmptyState, ErrorState } from '@/components/feedback';
import { Spinner } from '@/components/ui/spinner';
import PageLoader from '@/components/custom/PageLoader';

type Tab = 'forYou' | 'latest' | 'following';
const TABS: Tab[] = ['forYou', 'latest', 'following'];

/**
 * Feed tabs (For you / Latest / Following) over the same post cards Home uses,
 * so the Happy / Hopeful / Sad reactions are identical. `scrollRoot` is the
 * page's scroll container, which drives infinite scroll.
 */
export function CommunityFeed({ scrollRoot }: { scrollRoot: Element | null }) {
  const t = useTranslations('communityPage');
  const tFeedback = useTranslations('feedback');
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('forYou');
  const feed = useFeed(tab === 'latest' ? { feedType: 'ALL' } : { mode: tab === 'following' ? 'following' : 'you' });
  const { posts, loading, loadingMore, error, refetch, hasMore, loadMore, updatePostCounts, removePost } = feed;
  const handlers = usePostEngagementHandlers(updatePostCounts);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const handleOpenMedia = useCallback((postId: string) => router.push(`/post/${encodeURIComponent(postId)}`), [router]);

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
      <div role="tablist" aria-label={t('tabs.label')} className="mb-3 flex gap-6 border-b border-border-subtle">
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
      <div role="tabpanel" className="space-y-2">
        {loading && posts.length === 0 && !error && <PageLoader />}
        {error && <ErrorState title={tFeedback('error.title')} description={t('feed.error')} retryLabel={t('feed.retry')} onRetry={() => refetch()} />}
        {!loading && !error && posts.length === 0 && <EmptyState icon={Newspaper} title={t('feed.empty')} />}
        {posts.map((post, i) => (
          <FeedPostCard
            key={post.id}
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
        ))}
        {loadingMore && (
          <div className="flex justify-center py-4">
            <Spinner className="size-5 text-text-brand" />
          </div>
        )}
        <div ref={sentinel} className="h-px w-full" />
      </div>
    </section>
  );
}
