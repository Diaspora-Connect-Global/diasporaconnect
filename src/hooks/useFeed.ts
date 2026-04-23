'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLazyQuery, useQuery } from '@apollo/client/react';
import { GET_FEED, GET_POSTS_BY_HASHTAG, type GetFeedData, type GetPostsByHashtagData } from '@/services/gql/postsFeed';
import { normalizeFeedPost } from '@/lib/normalizeFeedPost';
import type { FeedModeType, FeedViewMode, GetFeedInput, Post } from '@/services/gql/types/postsFeed';

const INITIAL_LIMIT = 12;
const PAGE_SIZE = 12;
const SCROLL_THRESHOLD_PX = 200;

function mapPosts(raw: GetFeedData['feed']['posts']): Post[] {
  return raw.map((p) => normalizeFeedPost(p));
}

/** Keep first occurrence of each id (stable order). */
function dedupePostsById(posts: Post[]): Post[] {
  const seen = new Set<string>();
  return posts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

/** Append only posts whose ids are not already present (avoids duplicate React keys). */
function appendPostsUnique(existing: Post[], incoming: Post[]): Post[] {
  const seen = new Set(existing.map((p) => p.id));
  const novel = incoming.filter((p) => !seen.has(p.id));
  if (!novel.length) return existing;
  return [...existing, ...novel];
}

export interface UseFeedOptions {
  mode?: FeedViewMode;
  /** When set, overrides `mode` mapping (e.g. TRENDING). */
  feedType?: FeedModeType;
  hashtag?: string | null;
  initialLimit?: number;
  pageSize?: number;
}

export interface FeedStateMeta {
  hasMore?: boolean | null;
  isExhausted?: boolean | null;
  isSeenFallback?: boolean | null;
  hasSeenFallbackOption?: boolean | null;
  nextCursor?: string | null;
}

export interface UseFeedResult {
  posts: Post[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: Error | undefined;
  refetch: () => void;
  hasMore: boolean;
  loadMore: () => void;
  feedContainerRef: React.RefObject<HTMLDivElement | null>;
  feedMeta: FeedStateMeta;
}

export function useFeed(options: UseFeedOptions = {}): UseFeedResult {
  const {
    mode = 'you',
    feedType: feedTypeOverride,
    hashtag = null,
    initialLimit = INITIAL_LIMIT,
    pageSize = PAGE_SIZE,
  } = options;

  const isHashtagFeed = Boolean(hashtag && hashtag.trim());
  const trimmedHashtag = (hashtag ?? '').trim();

  const [mergedPosts, setMergedPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [feedMeta, setFeedMeta] = useState<FeedStateMeta>({});
  const feedContainerRef = useRef<HTMLDivElement | null>(null);

  const resolvedFeedType: FeedModeType =
    feedTypeOverride ?? (mode === 'following' ? 'FOLLOWING' : 'FOR_YOU');

  const feedInputBase = useMemo((): Omit<GetFeedInput, 'limit' | 'offset' | 'cursor' | 'refreshSeed'> => {
    const input: GetFeedInput = { type: resolvedFeedType };
    // For You: personalized feed plus trending and discovery surfacing (backend GetFeedInput).
    if (resolvedFeedType === 'FOR_YOU' || resolvedFeedType === 'TRENDING') {
      input.includeDiscovery = true;
    }
    return input;
  }, [resolvedFeedType]);

  const initialFeedVariables = useMemo(
    () => ({
      input: {
        ...feedInputBase,
        limit: initialLimit,
        offset: 0,
        clearHistory: true,
      } as GetFeedInput,
    }),
    [feedInputBase, initialLimit]
  );

  const {
    data: feedData,
    loading: feedLoading,
    error: feedError,
    refetch: refetchFeedQuery,
  } = useQuery<GetFeedData>(GET_FEED, {
    variables: initialFeedVariables,
    skip: isHashtagFeed,
    notifyOnNetworkStatusChange: true,
  });

  const {
    data: hashtagData,
    loading: hashtagLoading,
    error: hashtagError,
    refetch: refetchHashtagQuery,
  } = useQuery<GetPostsByHashtagData>(GET_POSTS_BY_HASHTAG, {
    variables: { input: { hashtag: trimmedHashtag, limit: initialLimit, offset: 0 } },
    skip: !isHashtagFeed,
    notifyOnNetworkStatusChange: true,
  });

  const [fetchMoreFeed, { loading: loadingMoreFeed }] = useLazyQuery<GetFeedData>(GET_FEED, {
    fetchPolicy: 'network-only',
  });

  const [fetchMoreHashtag, { loading: loadingMoreHashtag }] = useLazyQuery<GetPostsByHashtagData>(
    GET_POSTS_BY_HASHTAG,
    { fetchPolicy: 'network-only' }
  );

  useEffect(() => {
    if (isHashtagFeed) return;
    if (!feedData?.feed) return;
    const f = feedData.feed;
    setMergedPosts(dedupePostsById(mapPosts(f.posts)));
    setTotal(f.total ?? 0);
    setNextCursor(f.nextCursor ?? null);
    setFeedMeta({
      hasMore: f.hasMore,
      isExhausted: f.isExhausted,
      isSeenFallback: f.isSeenFallback,
      hasSeenFallbackOption: f.hasSeenFallbackOption,
      nextCursor: f.nextCursor ?? null,
    });
  }, [feedData?.feed, isHashtagFeed]);

  useEffect(() => {
    if (!isHashtagFeed) return;
    if (!hashtagData?.postsByHashtag) return;
    const h = hashtagData.postsByHashtag;
    setMergedPosts(dedupePostsById(mapPosts(h.posts)));
    setTotal(h.total ?? 0);
    setNextCursor(null);
    setFeedMeta({ hasMore: h.hasMore });
  }, [hashtagData?.postsByHashtag, isHashtagFeed]);

  const hasMore = useMemo(() => {
    if (isHashtagFeed) {
      if (feedMeta.hasMore === false) return false;
      if (feedMeta.hasMore === true) return true;
      return mergedPosts.length < total;
    }
    if (feedMeta.hasMore === false) return false;
    if (feedMeta.hasMore === true) return true;
    if (nextCursor) return true;
    return mergedPosts.length < total;
  }, [feedMeta.hasMore, isHashtagFeed, mergedPosts.length, nextCursor, total]);

  const loadMore = useCallback(() => {
    if (isHashtagFeed) {
      if (loadingMoreHashtag || !hasMore) return;
      const nextOffset = mergedPosts.length;
      fetchMoreHashtag({
        variables: {
          input: { hashtag: trimmedHashtag, limit: pageSize, offset: nextOffset },
        },
      }).then((res) => {
        const h = res.data?.postsByHashtag;
        if (!h) return;
        const more = mapPosts(h.posts);
        if (more.length) setMergedPosts((prev) => appendPostsUnique(prev, more));
        setTotal(h.total ?? 0);
        setFeedMeta({ hasMore: h.hasMore });
      });
      return;
    }

    if (loadingMoreFeed || !hasMore) return;

    const input: GetFeedInput = {
      ...feedInputBase,
      limit: pageSize,
      ...(nextCursor ? { cursor: nextCursor } : { offset: mergedPosts.length }),
    };

    fetchMoreFeed({ variables: { input } }).then((res) => {
      const f = res.data?.feed;
      if (!f) return;
      const more = mapPosts(f.posts);
      if (more.length) setMergedPosts((prev) => appendPostsUnique(prev, more));
      setTotal(f.total ?? 0);
      setNextCursor(f.nextCursor ?? null);
      setFeedMeta({
        hasMore: f.hasMore,
        isExhausted: f.isExhausted,
        isSeenFallback: f.isSeenFallback,
        hasSeenFallbackOption: f.hasSeenFallbackOption,
        nextCursor: f.nextCursor ?? null,
      });
    });
  }, [
    fetchMoreFeed,
    fetchMoreHashtag,
    feedInputBase,
    hasMore,
    isHashtagFeed,
    loadingMoreFeed,
    loadingMoreHashtag,
    mergedPosts.length,
    nextCursor,
    pageSize,
    trimmedHashtag,
  ]);

  const loading = isHashtagFeed ? hashtagLoading : feedLoading;
  const error = isHashtagFeed ? hashtagError : feedError;
  const loadingMore = isHashtagFeed ? loadingMoreHashtag : loadingMoreFeed;

  const refetch = useCallback(() => {
    if (isHashtagFeed) {
      refetchHashtagQuery();
      return;
    }
    // Pull-to-refresh: client-generated seed only; no cursor; reshuffles tier ordering on the server.
    const newSeed = Date.now().toString();
    refetchFeedQuery({
      input: {
        ...feedInputBase,
        limit: initialLimit,
        offset: 0,
        refreshSeed: newSeed,
      } as GetFeedInput,
    }).then((result) => {
      const f = result.data?.feed;
      if (!f) return;
      setMergedPosts(dedupePostsById(mapPosts(f.posts)));
      setTotal(f.total ?? 0);
      setNextCursor(f.nextCursor ?? null);
      setFeedMeta({
        hasMore: f.hasMore,
        isExhausted: f.isExhausted,
        isSeenFallback: f.isSeenFallback,
        hasSeenFallbackOption: f.hasSeenFallbackOption,
        nextCursor: f.nextCursor ?? null,
      });
    });
  }, [feedInputBase, initialLimit, isHashtagFeed, refetchFeedQuery, refetchHashtagQuery]);

  useEffect(() => {
    const el = feedContainerRef.current;
    if (!el) return;

    const checkScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      if (distanceFromBottom <= SCROLL_THRESHOLD_PX && hasMore && !loading && !loadingMore) {
        loadMore();
      }
    };

    el.addEventListener('scroll', checkScroll, { passive: true });
    return () => el.removeEventListener('scroll', checkScroll);
  }, [hasMore, loadMore, loading, loadingMore]);

  return {
    posts: mergedPosts,
    total,
    loading,
    loadingMore,
    error: error ?? undefined,
    refetch,
    hasMore,
    loadMore,
    feedContainerRef,
    feedMeta,
  };
}
