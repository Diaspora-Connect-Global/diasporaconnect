'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient, useLazyQuery, useQuery } from '@apollo/client/react';
import {
  GET_FEED,
  GET_POST,
  GET_POSTS_BY_HASHTAG,
  RECOMMENDED_POSTS,
  JOINED_COMMUNITY_FEED,
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
  RankedFeedPage,
  RecommendedPostsData,
  JoinedCommunityFeedData,
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
   * Both FOR_YOU and FOLLOWING are now served by the recommendation-service:
   *   - FOR_YOU         → `recommendedPosts`         (ranked, personalised)
   *   - FOLLOWING       → `joinedCommunityFeed`      (recency, membership-scoped)
   * TRENDING and other legacy modes stay on the post-feed-service `feed` query.
   *
   * Both ranked queries return IDs only; full posts are hydrated client-side
   * via `GET_POST` (same `hydrateRankedItems` helper).
   */
  const isRecommendedFeed = !isHashtagFeed && resolvedFeedType === 'FOR_YOU';
  const isJoinedCommunityFeed = !isHashtagFeed && resolvedFeedType === 'FOLLOWING';
  const isRankedFeed = isRecommendedFeed || isJoinedCommunityFeed;

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

  /**
   * If the create-post page redirected to home after a successful create,
   * it stashed the new post id in sessionStorage. Hydrate it and stage it
   * to prepend at the top of the feed (ahead of whatever the recommender
   * returns). The Kafka projection into `content_item` usually lands within
   * seconds, so the next natural refresh will dedupe this prepend out of
   * the user's view.
   *
   * Reads + clears the sentinel exactly once per mount.
   */
  const [pendingPrepend, setPendingPrepend] = useState<Post | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    let justCreatedId: string | null = null;
    try {
      justCreatedId = sessionStorage.getItem('justCreatedPostId');
      if (justCreatedId) sessionStorage.removeItem('justCreatedPostId');
    } catch {
      /* sessionStorage may be unavailable — silent skip */
    }
    if (!justCreatedId) return;

    void apolloClient
      .query<GetPostData>({
        query: GET_POST,
        variables: { id: justCreatedId },
        fetchPolicy: 'network-only',
        errorPolicy: 'ignore',
      })
      .then((res) => {
        if (cancelled) return;
        const raw = res.data?.post;
        if (!raw) return;
        const post = normalizeFeedPost(raw);
        // Tag so we can identify this as the "just-created" prepend, in case
        // we want to flag it in the UI later.
        post.__source = 'just_created';
        setPendingPrepend(post);
      })
      .catch(() => {
        /* Non-fatal: post will still appear on the next normal refresh. */
      });
    return () => {
      cancelled = true;
    };
  }, [apolloClient]);

  useEffect(() => {
    if (!isRankedFeed) return;
    let cancelled = false;

    // Pick the right ranked-feed query based on the current tab. Both queries
    // return the same `RankedFeedPage` shape — the typed response field
    // differs (`recommendedPosts` vs `joinedCommunityFeed`), which we
    // narrow with an `in` check after the call.
    const query = isRecommendedFeed ? RECOMMENDED_POSTS : JOINED_COMMUNITY_FEED;

    const run = async () => {
      setRecommendedLoading(true);
      setRecommendedError(undefined);
      try {
        const { data, error } = await apolloClient.query<
          RecommendedPostsData | JoinedCommunityFeedData
        >({
          query,
          variables: { limit: initialLimit },
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
        const page: RankedFeedPage | undefined = data
          ? 'recommendedPosts' in data
            ? data.recommendedPosts
            : 'joinedCommunityFeed' in data
              ? data.joinedCommunityFeed
              : undefined
          : undefined;
        const rankedItems = page?.items ?? [];
        const hydrated = await hydrateRankedItems(rankedItems);
        if (cancelled) return;
        // If a just-created post is staged, prepend it (deduping against
        // anything the recommender already happened to return).
        const merged = pendingPrepend
          ? dedupePostsById([pendingPrepend, ...hydrated])
          : dedupePostsById(hydrated);
        setMergedPosts(merged);
        if (pendingPrepend) setPendingPrepend(null);
        setTotal(merged.length);
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
  }, [isRankedFeed, isRecommendedFeed, initialLimit, apolloClient, hydrateRankedItems, refreshTick]);

  // ============================================================================
  // LEGACY BRANCH — FOLLOWING / TRENDING / ... served by `feed` query
  // ============================================================================

  const useLegacyFeed = !isHashtagFeed && !isRankedFeed;

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
    // Prepend just-created post for the legacy feed branch too, so a
    // user who lands on TRENDING immediately after creating still sees
    // their post at the top.
    const posts = mapPosts(f.posts);
    const merged = pendingPrepend
      ? dedupePostsById([pendingPrepend, ...posts])
      : dedupePostsById(posts);
    setMergedPosts(merged);
    if (pendingPrepend) setPendingPrepend(null);
    setTotal(f.total ?? 0);
    setNextCursor(f.nextCursor ?? null);
    setFeedMeta({
      hasMore: f.hasMore,
      isExhausted: f.isExhausted,
      isSeenFallback: f.isSeenFallback,
      hasSeenFallbackOption: f.hasSeenFallbackOption,
      nextCursor: f.nextCursor ?? null,
    });
  }, [feedData?.feed, useLegacyFeed, pendingPrepend]);

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
    if (isRankedFeed) {
      return Boolean(nextCursor);
    }
    if (feedMeta.hasMore === false) return false;
    if (feedMeta.hasMore === true) return true;
    if (nextCursor) return true;
    return mergedPosts.length < total;
  }, [feedMeta.hasMore, isHashtagFeed, isRankedFeed, mergedPosts.length, nextCursor, total]);

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

    if (isRankedFeed) {
      if (recommendedLoadingMore || !hasMore || !nextCursor) return;
      setRecommendedLoadingMore(true);
      const query = isRecommendedFeed ? RECOMMENDED_POSTS : JOINED_COMMUNITY_FEED;
      apolloClient
        .query<RecommendedPostsData | JoinedCommunityFeedData>({
          query,
          variables: { limit: pageSize, cursor: nextCursor },
          fetchPolicy: 'network-only',
          errorPolicy: 'all',
        })
        .then(async (res) => {
          const page: RankedFeedPage | undefined = res.data
            ? 'recommendedPosts' in res.data
              ? res.data.recommendedPosts
              : 'joinedCommunityFeed' in res.data
                ? res.data.joinedCommunityFeed
                : undefined
            : undefined;
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
    isRankedFeed,
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
    : isRankedFeed
      ? recommendedLoading
      : feedLoading;
  const error = isHashtagFeed
    ? hashtagError
    : isRankedFeed
      ? recommendedError
      : feedError;
  const loadingMore = isHashtagFeed
    ? loadingMoreHashtag
    : isRankedFeed
      ? recommendedLoadingMore
      : loadingMoreFeed;

  const refetch = useCallback(() => {
    if (isHashtagFeed) {
      refetchHashtagQuery();
      return;
    }
    if (isRankedFeed) {
      // Pull-to-refresh: bump tick so the ranked-feed effect re-runs
      // (covers both FOR_YOU and FOLLOWING).
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
    isRankedFeed,
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
