'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient, useLazyQuery, useQuery } from '@apollo/client/react';
import {
  GET_FEED,
  GET_POST,
  GET_POSTS_BY_IDS,
  GET_POSTS_BY_HASHTAG,
  GET_POSTS_BY_CATEGORY,
  RECOMMENDED_POSTS,
  JOINED_COMMUNITY_FEED,
  type GetFeedData,
  type GetPostsByHashtagData,
  type GetPostsByCategoryData,
} from '@/services/gql/postsFeed';
import { normalizeFeedPost } from '@/lib/normalizeFeedPost';
import type {
  FeedModeType,
  FeedViewMode,
  GetFeedInput,
  GetPostData,
  GetPostsByIdsData,
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

/**
 * Chronological fallback feed types tried (in order) when the FOR_YOU ("You")
 * ranked feed is exhausted with zero personalised items. NETWORK is the
 * social-graph chronological feed; ALL is the platform-wide chronological feed.
 */
const FALLBACK_TYPES: FeedModeType[] = ['NETWORK', 'ALL'];

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
  /** AI-classified category label (e.g. "Politics"). Mutually exclusive with `hashtag`. */
  category?: string | null;
  initialLimit?: number;
  pageSize?: number;
}

export interface FeedStateMeta {
  hasMore?: boolean | null;
  isExhausted?: boolean | null;
  isSeenFallback?: boolean | null;
  hasSeenFallbackOption?: boolean | null;
  nextCursor?: string | null;
  /**
   * True when the FOR_YOU ("You") tab returned no personalised items and we
   * degraded to the chronological `feed` query (NETWORK → ALL). The home page
   * uses this to surface a "Set your interests" CTA above the fallback list
   * instead of a hard empty state.
   */
  isChronoFallback?: boolean | null;
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
    category = null,
    initialLimit = INITIAL_LIMIT,
    pageSize = PAGE_SIZE,
  } = options;

  const isHashtagFeed = Boolean(hashtag && hashtag.trim());
  const trimmedHashtag = (hashtag ?? '').trim();
  const isCategoryFeed = !isHashtagFeed && Boolean(category && category.trim());
  const trimmedCategory = (category ?? '').trim();

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
  const isRecommendedFeed = !isHashtagFeed && !isCategoryFeed && resolvedFeedType === 'FOR_YOU';
  const isJoinedCommunityFeed = !isHashtagFeed && !isCategoryFeed && resolvedFeedType === 'FOLLOWING';
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

  // ── Chronological fallback (C1) ─────────────────────────────────────────────
  // When the FOR_YOU ("You") ranked feed is exhausted with zero items (a
  // brand-new / cold-start account the recommender can't personalise yet), we
  // degrade to the chronological `feed` query (type NETWORK, falling back to
  // ALL) so the user sees populated content instead of an empty box. The
  // fallback carries its own cursor for infinite scroll and is flagged via
  // `feedMeta.isChronoFallback` so the page can show a "Set your interests"
  // CTA above the list.
  const [fallbackActive, setFallbackActive] = useState(false);
  const fallbackTypeRef = useRef<FeedModeType | null>(null);

  /**
   * Fetch the chronological fallback feed. Tries NETWORK first; if that returns
   * no posts, falls back to ALL. Returns the populated posts + paging metadata,
   * or null if both arms were empty.
   */
  const fetchChronoFallback = useCallback(
    async (
      limit: number,
    ): Promise<
      | { posts: Post[]; nextCursor: string | null; hasMore: boolean; type: FeedModeType }
      | null
    > => {
      for (const type of FALLBACK_TYPES) {
        try {
          const { data } = await apolloClient.query<GetFeedData>({
            query: GET_FEED,
            variables: {
              input: { type, limit, offset: 0, clearHistory: true } as GetFeedInput,
            },
            fetchPolicy: 'network-only',
            errorPolicy: 'all',
          });
          const f = data?.feed;
          const posts = f ? dedupePostsById(mapPosts(f.posts)) : [];
          if (posts.length > 0) {
            return {
              posts,
              nextCursor: f?.nextCursor ?? null,
              hasMore: Boolean(f?.hasMore ?? f?.nextCursor),
              type,
            };
          }
        } catch {
          // Non-fatal — try the next arm.
        }
      }
      return null;
    },
    [apolloClient],
  );

  /**
   * Hydrate ranked items into full UI posts via a single batch `postsByIds`
   * query, preserving the recommendation order, and carrying source/score into
   * the resulting Post objects as `__source` / `__score`.
   *
   * One round-trip replaces the former per-id `GET_POST` fan-out. Each returned
   * post is written into the Apollo cache keyed for `GET_POST` (variables
   * `{ id }`, field `post`) so the post-detail page still resolves from cache
   * without a network hit. The backend may omit ids it can't resolve, so we
   * build a byId map and re-join against the original ranked order (dropping
   * any omitted ids — same behaviour as before).
   */
  const hydrateRankedItems = useCallback(
    async (items: RankedItemGQL[]): Promise<Post[]> => {
      if (!items.length) return [];

      let returned: GetPostsByIdsData['postsByIds'] = [];
      try {
        const { data } = await apolloClient.query<GetPostsByIdsData>({
          query: GET_POSTS_BY_IDS,
          variables: { ids: items.map((i) => i.itemId) },
          // Always pull fresh — the ranked order changes per request and we
          // re-seed the per-post `GET_POST` cache below.
          fetchPolicy: 'network-only',
          errorPolicy: 'ignore',
        });
        returned = data?.postsByIds ?? [];
      } catch {
        // Non-fatal — treat as "nothing hydrated" so the caller can fall back.
        return [];
      }

      const byId = new Map<string, Post>();
      for (const raw of returned) {
        if (!raw?.id) continue;
        // Seed the post-detail cache so navigating to /post/[id] hits cache.
        apolloClient.writeQuery<GetPostData>({
          query: GET_POST,
          variables: { id: raw.id },
          data: { post: raw },
        });
        byId.set(raw.id, normalizeFeedPost(raw));
      }

      // Re-join each post to its ranked item by id: attach __source/__score and
      // preserve the recommender's order. Ids the backend omitted are dropped.
      const ordered: Post[] = [];
      for (const item of items) {
        const p = byId.get(item.itemId);
        if (!p) continue;
        p.__source = item.source;
        if (typeof item.score === 'number') p.__score = item.score;
        ordered.push(p);
      }
      return ordered;
    },
    [apolloClient]
  );

  /**
   * If the create-post page redirected to home after a successful create,
   * it stashed the new post id in sessionStorage. Hydrate it and stage it
   * to prepend at the top of the feed (ahead of whatever the recommender
   * returns).
   *
   * This is the "first-mount-after-create" affordance: the Kafka projection
   * into `content_item` takes ~1-2s, so until then the recommendation-service
   * has no row to surface. Durability across subsequent refreshes is owed
   * to the backend "own_recent" prelude inside `RankFeedHandler`, which
   * pins the viewer's posts published in the last 30 minutes to the top of
   * their feed regardless of the `author <> viewer` exclusion every
   * retriever enforces. The dedupe in `run()` below collapses the overlap.
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
        // `refreshTick > 0` ⇒ explicit pull-to-refresh. Pass refresh:true so
        // the recommendation-service skips its 60s feed cache and recomputes
        // with the impression filter applied — same items the user just
        // dismissed don't come back.
        const isRefresh = isRecommendedFeed && refreshTick > 0;
        const { data, error } = await apolloClient.query<
          RecommendedPostsData | JoinedCommunityFeedData
        >({
          query,
          variables: isRecommendedFeed
            ? { limit: initialLimit, refresh: isRefresh }
            : { limit: initialLimit },
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
        // The just-created post (if any) is prepended by the derived `posts`
        // memo below — not merged here — so this branch only reflects what
        // the recommender returned (keeps the cold-start fallback test honest).
        const merged = dedupePostsById(hydrated);

        // C1: FOR_YOU exhausted with nothing to show (cold start). Degrade to
        // the chronological feed (NETWORK → ALL) instead of an empty box.
        if (
          isRecommendedFeed &&
          merged.length === 0 &&
          !page?.nextCursor
        ) {
          const fallback = await fetchChronoFallback(initialLimit);
          if (cancelled) return;
          if (fallback) {
            fallbackTypeRef.current = fallback.type;
            setFallbackActive(true);
            setMergedPosts(fallback.posts);
            setTotal(fallback.posts.length);
            setNextCursor(fallback.nextCursor);
            setFeedMeta({
              hasMore: fallback.hasMore,
              isExhausted: false,
              isChronoFallback: true,
              nextCursor: fallback.nextCursor,
            });
            return;
          }
          // Both fallback arms empty → absolute last resort empty state.
          fallbackTypeRef.current = null;
          setFallbackActive(false);
        } else {
          fallbackTypeRef.current = null;
          setFallbackActive(false);
        }

        setMergedPosts(merged);
        setTotal(merged.length);
        setNextCursor(page?.nextCursor ?? null);
        setFeedMeta({
          hasMore: Boolean(page?.nextCursor),
          isExhausted: !page?.nextCursor && hydrated.length === 0,
          isChronoFallback: false,
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
  }, [isRankedFeed, isRecommendedFeed, initialLimit, apolloClient, hydrateRankedItems, fetchChronoFallback, refreshTick]);

  // ============================================================================
  // LEGACY BRANCH — FOLLOWING / TRENDING / ... served by `feed` query
  // ============================================================================

  const useLegacyFeed = !isHashtagFeed && !isCategoryFeed && !isRankedFeed;

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
    // Initial mount still hits the network (unchanged default semantics), but
    // subsequent reads (tab switches, back-nav, re-renders) serve from the
    // normalized cache so returning to the feed is instant.
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first',
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
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first',
  });

  const {
    data: categoryData,
    loading: categoryLoading,
    error: categoryError,
    refetch: refetchCategoryQuery,
  } = useQuery<GetPostsByCategoryData>(GET_POSTS_BY_CATEGORY, {
    variables: { input: { category: trimmedCategory, limit: initialLimit, offset: 0 } },
    skip: !isCategoryFeed,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first',
  });

  const [fetchMoreFeed, { loading: loadingMoreFeed }] = useLazyQuery<GetFeedData>(GET_FEED, {
    fetchPolicy: 'network-only',
  });

  const [fetchMoreHashtag, { loading: loadingMoreHashtag }] = useLazyQuery<GetPostsByHashtagData>(
    GET_POSTS_BY_HASHTAG,
    { fetchPolicy: 'network-only' }
  );

  const [fetchMoreCategory, { loading: loadingMoreCategory }] = useLazyQuery<GetPostsByCategoryData>(
    GET_POSTS_BY_CATEGORY,
    { fetchPolicy: 'network-only' }
  );

  useEffect(() => {
    if (!useLegacyFeed) return;
    if (!feedData?.feed) return;
    const f = feedData.feed;
    // The just-created post (if any) is prepended by the derived `posts` memo
    // below, so this branch just reflects the backend feed as-is.
    const merged = dedupePostsById(mapPosts(f.posts));
    setMergedPosts(merged);
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

  useEffect(() => {
    if (!isCategoryFeed) return;
    if (!categoryData?.postsByCategory) return;
    const c = categoryData.postsByCategory;
    setMergedPosts(dedupePostsById(mapPosts(c.posts)));
    setTotal(c.total ?? 0);
    setNextCursor(null);
    setFeedMeta({ hasMore: c.hasMore });
  }, [categoryData?.postsByCategory, isCategoryFeed]);

  const hasMore = useMemo(() => {
    if (isHashtagFeed || isCategoryFeed) {
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
  }, [feedMeta.hasMore, isHashtagFeed, isCategoryFeed, isRankedFeed, mergedPosts.length, nextCursor, total]);

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

    if (isCategoryFeed) {
      if (loadingMoreCategory || !hasMore) return;
      const nextOffset = mergedPosts.length;
      fetchMoreCategory({
        variables: {
          input: { category: trimmedCategory, limit: pageSize, offset: nextOffset },
        },
      }).then((res) => {
        const c = res.data?.postsByCategory;
        if (!c) return;
        const more = mapPosts(c.posts);
        if (more.length) setMergedPosts((prev) => appendPostsUnique(prev, more));
        setTotal(c.total ?? 0);
        setFeedMeta({ hasMore: c.hasMore });
      });
      return;
    }

    if (isRankedFeed) {
      if (recommendedLoadingMore || !hasMore || !nextCursor) return;

      // C1: when the FOR_YOU tab degraded to the chronological fallback, page
      // it via the `feed` query (carrying the active fallback type + cursor)
      // rather than the ranked query, which has nothing left to return.
      if (fallbackActive && fallbackTypeRef.current) {
        setRecommendedLoadingMore(true);
        apolloClient
          .query<GetFeedData>({
            query: GET_FEED,
            variables: {
              input: {
                type: fallbackTypeRef.current,
                limit: pageSize,
                cursor: nextCursor,
              } as GetFeedInput,
            },
            fetchPolicy: 'network-only',
            errorPolicy: 'all',
          })
          .then((res) => {
            const f = res.data?.feed;
            if (!f) return;
            const more = mapPosts(f.posts);
            if (more.length) setMergedPosts((prev) => appendPostsUnique(prev, more));
            setNextCursor(f.nextCursor ?? null);
            setFeedMeta({
              hasMore: Boolean(f.hasMore ?? f.nextCursor),
              isChronoFallback: true,
              nextCursor: f.nextCursor ?? null,
            });
          })
          .catch(() => {
            // Non-fatal — keep existing posts visible.
          })
          .finally(() => setRecommendedLoadingMore(false));
        return;
      }

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
    fetchMoreCategory,
    feedInputBase,
    fallbackActive,
    hasMore,
    hydrateRankedItems,
    isHashtagFeed,
    isCategoryFeed,
    isRecommendedFeed,
    isRankedFeed,
    loadingMoreFeed,
    loadingMoreHashtag,
    loadingMoreCategory,
    mergedPosts.length,
    nextCursor,
    pageSize,
    recommendedLoadingMore,
    trimmedHashtag,
    trimmedCategory,
  ]);

  const loading = isHashtagFeed
    ? hashtagLoading
    : isCategoryFeed
      ? categoryLoading
      : isRankedFeed
        ? recommendedLoading
        : feedLoading;
  const error = isHashtagFeed
    ? hashtagError
    : isCategoryFeed
      ? categoryError
      : isRankedFeed
        ? recommendedError
        : feedError;
  const loadingMore = isHashtagFeed
    ? loadingMoreHashtag
    : isCategoryFeed
      ? loadingMoreCategory
      : isRankedFeed
        ? recommendedLoadingMore
        : loadingMoreFeed;

  const refetch = useCallback(() => {
    if (isHashtagFeed) {
      refetchHashtagQuery();
      return;
    }
    if (isCategoryFeed) {
      refetchCategoryQuery();
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
    isCategoryFeed,
    isRankedFeed,
    refetchFeedQuery,
    refetchHashtagQuery,
    refetchCategoryQuery,
  ]);

  // Infinite scroll is now driven by Virtuoso's `endReached` callback from
  // the home page. The manual scroll-listener that used to live here would
  // double-fire `loadMore` alongside Virtuoso's signal — the guard in
  // `loadMore` made it safe but wasteful. The `feedContainerRef` is kept
  // in the return shape for back-compat with any caller that may still
  // attach to it.

  const removePost = useCallback((postId: string) => {
    setMergedPosts(prev => prev.filter(p => p.id !== postId));
    // The just-created post may still live only in `pendingPrepend` (before the
    // backend feed surfaces it), so remove it there too.
    setPendingPrepend(prev => (prev && prev.id === postId ? null : prev));
  }, []);

  const updatePostCounts = useCallback((
    postId: string,
    delta: Partial<{ likes: number; comments: number; shares: number; saves: number; hasLiked: boolean; hasSaved: boolean }>,
  ) => {
    const applyDelta = (p: Post): Post => {
      const updated: Post = {
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
    };
    setMergedPosts(prev => prev.map(p => (p.id === postId ? applyDelta(p) : p)));
    // Keep the pinned-only just-created post in sync too.
    setPendingPrepend(prev => (prev && prev.id === postId ? applyDelta(prev) : prev));
  }, []);

  // The just-created post is prepended here (not inside the fetch effects) so it
  // works uniformly across all feed types and never races a stale effect closure.
  // Gated off for hashtag/category feeds so a new post isn't force-pinned onto a
  // filtered view. `dedupePostsById` keeps the first occurrence, so the pinned
  // post stays strictly first even once the backend feed also includes it.
  const posts = useMemo(() => {
    if (!pendingPrepend || isHashtagFeed || isCategoryFeed) return mergedPosts;
    return dedupePostsById([pendingPrepend, ...mergedPosts]);
  }, [pendingPrepend, mergedPosts, isHashtagFeed, isCategoryFeed]);

  // Clear the staged prepend only once the real feed already contains it (the
  // backend `own_recent` pin surfaces it on a later refresh). Clearing early
  // would drop the post; clearing here is flicker-free because the memo already
  // shows it via `mergedPosts` at that point.
  useEffect(() => {
    if (!pendingPrepend) return;
    if (mergedPosts.some(p => p.id === pendingPrepend.id)) setPendingPrepend(null);
  }, [pendingPrepend, mergedPosts]);

  return {
    posts,
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
