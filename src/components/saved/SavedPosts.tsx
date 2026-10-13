'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { Bookmark } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { GET_SAVED_POSTS, GetSavedPostsData, Post } from '@/services/gql/postsFeed';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { usePostEngagementHandlers } from '@/hooks/usePostEngagementHandlers';
import { EmptyState } from '@/components/feedback';
import { Spinner } from '@/components/ui/spinner';

const PAGE_SIZE = 20;
const SILENT = { context: { silentErrors: true } } as const;

type CountKey = 'likes' | 'comments' | 'shares' | 'saves' | 'happy' | 'hopeful' | 'sad';
type Delta = Partial<Record<CountKey, number>> & { hasLiked?: boolean; hasSaved?: boolean; myReaction?: 'HAPPY' | 'HOPEFUL' | 'SAD' | null };
const COUNT_KEYS: CountKey[] = ['likes', 'comments', 'shares', 'saves', 'happy', 'hopeful', 'sad'];

/** A post with this page's optimistic changes (reactions, saves, comments) applied on top of the server copy. */
function withDelta(post: Post, d: Delta | undefined): Post {
  if (!d) return post;
  const ec = { ...(post.engagementCounts ?? {}) } as Record<CountKey, number>;
  for (const k of COUNT_KEYS) if (typeof d[k] === 'number') ec[k] = Math.max(0, (ec[k] ?? 0) + (d[k] as number));
  const ue = { ...(post.userEngagement ?? {}) } as NonNullable<Post['userEngagement']>;
  if (d.hasLiked !== undefined) ue.hasLiked = d.hasLiked;
  if (d.hasSaved !== undefined) ue.hasSaved = d.hasSaved;
  if (d.myReaction !== undefined) ue.myReaction = d.myReaction;
  return { ...post, engagementCounts: ec as Post['engagementCounts'], userEngagement: ue };
}

export function SavedPosts() {
  const t = useTranslations('savedPage');
  const router = useRouter();
  const [loadingMore, setLoadingMore] = useState(false);
  // Optimistic changes made on this page, per post, so the card reacts instantly like it does in the feed.
  const [deltas, setDeltas] = useState<Record<string, Delta>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const updatePostCounts = useCallback((postId: string, d: Delta) => {
    setDeltas((prev) => {
      const cur = prev[postId] ?? {};
      const next: Delta = { ...cur };
      for (const k of COUNT_KEYS) if (typeof d[k] === 'number') next[k] = (cur[k] ?? 0) + (d[k] as number);
      if (d.hasLiked !== undefined) next.hasLiked = d.hasLiked;
      if (d.hasSaved !== undefined) next.hasSaved = d.hasSaved;
      if (d.myReaction !== undefined) next.myReaction = d.myReaction;
      return { ...prev, [postId]: next };
    });
  }, []);
  const handlers = usePostEngagementHandlers(updatePostCounts);
  const removePost = useCallback((postId: string) => setRemoved((prev) => new Set(prev).add(postId)), []);
  const handleOpenMedia = useCallback((postId: string) => router.push(`/post/${encodeURIComponent(postId)}`), [router]);

  const { data, loading, fetchMore } = useQuery<GetSavedPostsData>(GET_SAVED_POSTS, {
    variables: { limit: PAGE_SIZE, offset: 0 },
    fetchPolicy: 'cache-and-network',
    ...SILENT,
  });

  const fetched = useMemo(() => (data?.savedPosts?.posts ?? []).filter((p): p is Post => !!p && !!p.id), [data]);
  const posts = useMemo(() => fetched.filter((p) => !removed.has(p.id)).map((p) => withDelta(p, deltas[p.id])), [fetched, removed, deltas]);
  const total = data?.savedPosts?.total ?? 0;
  const hasMore = fetched.length < total;

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      await fetchMore({
        variables: { offset: fetched.length },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult?.savedPosts) return prev;
          return {
            savedPosts: {
              ...fetchMoreResult.savedPosts,
              posts: [...(prev.savedPosts?.posts ?? []), ...(fetchMoreResult.savedPosts.posts ?? [])],
            },
          };
        },
      });
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="size-6 text-text-brand" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface-default p-8">
        <EmptyState size="sm" icon={Bookmark} title={t('empty.posts')} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post, i) => (
        <FeedPostCard
          key={post.id}
          post={post}
          index={i}
          surface="saved"
          handleReact={handlers.handleReact}
          handleShare={handlers.handleShare}
          handleSave={handlers.handleSave}
          handleSendComment={handlers.handleSendComment}
          removePost={removePost}
          handleOpenMedia={handleOpenMedia}
        />
      ))}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-border-subtle bg-surface-default px-5 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand disabled:opacity-60"
          >
            {loadingMore ? <Spinner className="size-4" /> : t('loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}
