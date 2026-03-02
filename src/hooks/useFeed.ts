'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useLazyQuery } from '@apollo/client/react';
import { GET_FEED, type GetFeedData } from '@/services/gql/postsFeed';
import type { Post } from '@/services/gql/types/postsFeed';
import type { FeedType } from '@/services/gql/types/postsFeed';

const INITIAL_LIMIT = 12;
const PAGE_SIZE = 12;
const SCROLL_THRESHOLD_PX = 200;

export interface UseFeedOptions {
  type?: FeedType;
  hashtag?: string | null;
  initialLimit?: number;
  pageSize?: number;
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
}

export function useFeed(options: UseFeedOptions = {}): UseFeedResult {
  const {
    type = 'all',
    hashtag = null,
    initialLimit = INITIAL_LIMIT,
    pageSize = PAGE_SIZE,
  } = options;

  const [mergedPosts, setMergedPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const feedContainerRef = useRef<HTMLDivElement | null>(null);

  const input = {
    limit: initialLimit,
    offset: 0,
    type,
    ...(hashtag != null && hashtag !== '' ? { hashtag } : {}),
  };

  const { data, loading, error, refetch: refetchInitial } = useQuery<GetFeedData>(GET_FEED, {
    variables: { input },
    notifyOnNetworkStatusChange: true,
  });

  const [fetchMore, { loading: loadingMore }] = useLazyQuery<GetFeedData>(GET_FEED, {
    fetchPolicy: 'network-only',
  });

  // Sync first page into merged list and total
  useEffect(() => {
    if (!data?.feed) return;
    setMergedPosts(data.feed.posts ?? []);
    setTotal(data.feed.total ?? 0);
  }, [data?.feed?.posts, data?.feed?.total]);

  const hasMore = mergedPosts.length < total;

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextOffset = mergedPosts.length;
    fetchMore({
      variables: {
        input: {
          limit: pageSize,
          offset: nextOffset,
          type,
          ...(hashtag != null && hashtag !== '' ? { hashtag } : {}),
        },
      },
    }).then((result) => {
      const next = result.data?.feed?.posts ?? [];
      if (next.length > 0) {
        setMergedPosts((prev) => [...prev, ...next]);
      }
      if (result.data?.feed?.total != null) {
        setTotal(result.data.feed.total);
      }
    });
  }, [fetchMore, loadingMore, hasMore, mergedPosts.length, pageSize, type, hashtag]);

  // Scroll listener: when user scrolls near bottom, load more
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
  }, [hasMore, loading, loadingMore, loadMore]);

  const refetch = useCallback(() => {
    refetchInitial();
  }, [refetchInitial]);

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
  };
}
