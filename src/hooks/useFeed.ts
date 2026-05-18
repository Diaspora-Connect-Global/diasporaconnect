'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient, useLazyQuery, useQuery } from '@apollo/client/react';
import {
  GET_FEED,
  GET_POST,
  GET_POSTS_BY_HASHTAG,
  RECOMMENDED_POSTS,
  type GetFeedData,
  type GetPostsByHashtagData,
} from '@/services/gql/postsFeed';
import { normalizeFeedPost } from '@/lib/normalizeFeedPost';
import type {
  FeedModeType,
  FeedViewMode,
  GetFeedInput,
  GetPostData,
  Post,
} from '@/services/gql/types/postsFeed';
import type {
  RankedItemGQL,
  RecommendedPostsData,
  RecommendedPostsInput,
} from '@/services/gql/types/recommendation';

const INITIAL_LIMIT = 12;
const PAGE_SIZE = 12;
const SCROLL_THRESHOLD_PX = 800;

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
  updatePostCounts: (postId: string, delta: Partial<{ likes: number; comments: number; shares: number; saves: number; hasLiked: boolean; hasSaved: boolean }>) => void;
  removePost: (postId: string) => void;
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

  /**
   * FOR_YOU is now served by the recommendation-service via `recommendedPosts`.
   * All other modes (FOLLOWING, TRENDING, ...) keep the legacy `feed` query.
   */
  const isRecommendedFeed = !isHashtagFeed && resolvedFeedType === 'FOR_YOU';

  // ============================================================================
  // RECOMMENDED (FOR_YOU) BRANCH — recommendation-service + post-feed hydration
  // ============================================================================

  const apolloClient = useApolloClient();
  // Tracks ranked-feed loading state independent of Apollo's internal flags.
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [recommendedLoadingMore, setRecommendedLoadingMore] = useState(false);
  const [recommendedError, setRecommendedError] = useState<Error | undefined>(undefined);
  // Bumping `refreshTick` forces a re-fetch of the ranked feed (pull-to-refresh).
  const [refreshTick, setRefreshTick] = useState(0);

  /**
   * Hydrate ranked items into full UI posts via parallel `GET_POST` queries,
   * preserving the recommendation order, and carrying source/score into the
   * resulting Post objects as `__source` / `__score`.
   *
   * TODO(perf): replace per-id parallel fan-out with a single batch `getPostsByIds([ID!])`
   * query when api-gateway exposes one. With INITIAL_LIMIT=12 the fan-out is
   * acceptable (Apollo dedupes in-flight, results are cached), but at higher
   * page sizes this becomes the bottleneck.
   */
  const hydrateRankedItems = useCallback(
    async (items: RankedItemGQL[]): Promise<Post[]> => {
      if (!items.length) return [];
      const settled = await Promise.allSettled(
        items.map((item) =>
          apolloClient.query<GetPostData>({
            query: GET_POST,
            variables: { id: item.itemId },
            // Use the Apollo cache; multiple ImpressionTracker/feed renders share it.
            fetchPolicy: 'cache-first',
            errorPolicy: 'ignore',
          })
        )
      );

      const byId = new Map<string, Post>();
      settled.forEach((res, idx) => {
        if (res.status !== 'fulfilled') return;
        const raw = res.value.data?.post;
        if (!raw) return;
        const normalized = normalizeFeedPost(raw);
        const ranked = items[idx];
        if (ranked) {
          normalized.__source = ranked.source;
          if (typeof ranked.score === 'number') normalized.__score = ranked.score;
        }
        byId.set(normalized.id, normalized);
      });

      // Preserve the recommender's order. Any items that failed to hydrate are dropped.
      const ordered: Post[] = [];
      for (const item of items) {
        const p = byId.get(item.itemId);
        if (p) ordered.push(p);
      }
      return ordered;
    },
    [apolloClient]
  );

  useEffect(() => {
    if (!isRecommendedFeed) return;
    let cancelled = false;

    const run = async () => {
      setRecommendedLoading(true);
      setRecommendedError(undefined);
      try {
        const input: RecommendedPostsInput = { limit: initialLimit };
        const { data, error } = await apolloClient.query<RecommendedPostsData>({
          query: RECOMMENDED_POSTS,
          variables: { input },
          fetchPolicy: 'network-only',
          errorPolicy: 'all',
        });
        if (cancelled) return;
        if (error) {
          setRecommendedError(error);
          setMergedPosts([]);
          setTotal(0);
          setNextCursor(null);
          setFeedMeta({ hasMore: false });
          return;
        }
        const page = data?.recommendedPosts;
        const rankedItems = page?.items ?? [];
        const hydrated = await hydrateRankedItems(rankedItems);
        if (cancelled) return;
        setMergedPosts(dedupePostsById(hydrated));
        setTotal(hydrated.length);
        setNextCursor(page?.nextCursor ?? null);
        setFeedMeta({
          hasMore: Boolean(page?.nextCursor),
          isExhausted: !page?.nextCursor && hydrated.length === 0,
          nextCursor: page?.nextCursor ?? null,
        });
      } catch (e) {
        if (cancelled) return;
        setRecommendedError(e instanceof Error ? e : new Error(String(e)));
        setMergedPosts([]);
        setTotal(0);
        setNextCursor(null);
        setFeedMeta({ hasMore: false });
      } finally {
        if (!cancelled) setRecommendedLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isRecommendedFeed, initialLimit, apolloClient, hydrateRankedItems, refreshTick]);

  // ============================================================================
  // LEGACY BRANCH — FOLLOWING / TRENDING / ... served by `feed` query
  // ============================================================================

  const useLegacyFeed = !isHashtagFeed && !isRecommendedFeed;

  const feedInputBase = useMemo((): Omit<GetFeedInput, 'limit' | 'offset' | 'cursor' | 'refreshSeed'> => {
    const input: GetFeedInput = { type: resolvedFeedType };
    // For You: personalized feed plus trending and discovery surfacing (backend GetFeedInput).
    // (Now handled by the recommendation branch — kept here only for TRENDING.)
    if (resolvedFeedType === 'TRENDING') {
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
    skip: !useLegacyFeed,
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
    if (!useLegacyFeed) return;
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
  }, [feedData?.feed, useLegacyFeed]);

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
    if (isRecommendedFeed) {
      return Boolean(nextCursor);
    }
    if (feedMeta.hasMore === false) return false;
    if (feedMeta.hasMore === true) return true;
    if (nextCursor) return true;
    return mergedPosts.length < total;
  }, [feedMeta.hasMore, isHashtagFeed, isRecommendedFeed, mergedPosts.length, nextCursor, total]);

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

    if (isRecommendedFeed) {
      if (recommendedLoadingMore || !hasMore || !nextCursor) return;
      setRecommendedLoadingMore(true);
      const input: RecommendedPostsInput = { limit: pageSize, cursor: nextCursor };
      apolloClient
        .query<RecommendedPostsData>({
          query: RECOMMENDED_POSTS,
          variables: { input },
          fetchPolicy: 'network-only',
          errorPolicy: 'all',
        })
        .then(async (res) => {
          const page = res.data?.recommendedPosts;
          const rankedItems = page?.items ?? [];
          const hydrated = await hydrateRankedItems(rankedItems);
          if (hydrated.length) {
            setMergedPosts((prev) => appendPostsUnique(prev, hydrated));
          }
          setNextCursor(page?.nextCursor ?? null);
          setFeedMeta({
            hasMore: Boolean(page?.nextCursor),
            nextCursor: page?.nextCursor ?? null,
          });
        })
        .catch(() => {
          // Non-fatal — keep existing posts visible.
        })
        .finally(() => setRecommendedLoadingMore(false));
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
    apolloClient,
    fetchMoreFeed,
    fetchMoreHashtag,
    feedInputBase,
    hasMore,
    hydrateRankedItems,
    isHashtagFeed,
    isRecommendedFeed,
    loadingMoreFeed,
    loadingMoreHashtag,
    mergedPosts.length,
    nextCursor,
    pageSize,
    recommendedLoadingMore,
    trimmedHashtag,
  ]);

  const loading = isHashtagFeed
    ? hashtagLoading
    : isRecommendedFeed
      ? recommendedLoading
      : feedLoading;
  const error = isHashtagFeed
    ? hashtagError
    : isRecommendedFeed
      ? recommendedError
      : feedError;
  const loadingMore = isHashtagFeed
    ? loadingMoreHashtag
    : isRecommendedFeed
      ? recommendedLoadingMore
      : loadingMoreFeed;

  const refetch = useCallback(() => {
    if (isHashtagFeed) {
      refetchHashtagQuery();
      return;
    }
    if (isRecommendedFeed) {
      // Pull-to-refresh: bump tick so the recommended-feed effect re-runs.
      setRefreshTick((t) => t + 1);
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
  }, [
    feedInputBase,
    initialLimit,
    isHashtagFeed,
    isRecommendedFeed,
    refetchFeedQuery,
    refetchHashtagQuery,
  ]);

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

  const removePost = useCallback((postId: string) => {
    setMergedPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

  const updatePostCounts = useCallback((
    postId: string,
    delta: Partial<{ likes: number; comments: number; shares: number; saves: number; hasLiked: boolean; hasSaved: boolean }>,
  ) => {
    setMergedPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const updated = {
        ...p,
        engagementCounts: {
          likes: (p.engagementCounts?.likes ?? 0) + (delta.likes ?? 0),
          comments: (p.engagementCounts?.comments ?? 0) + (delta.comments ?? 0),
          shares: (p.engagementCounts?.shares ?? 0) + (delta.shares ?? 0),
          saves: (p.engagementCounts?.saves ?? 0) + (delta.saves ?? 0),
        },
      };
      if (delta.hasLiked !== undefined || delta.hasSaved !== undefined) {
        updated.userEngagement = {
          ...p.userEngagement,
          ...(delta.hasLiked !== undefined ? { hasLiked: delta.hasLiked } : {}),
          ...(delta.hasSaved !== undefined ? { hasSaved: delta.hasSaved } : {}),
        };
      }
      return updated;
    }));
  }, []);

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
    updatePostCounts,
    removePost,
  };
}
