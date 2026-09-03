'use client';

import { useApolloClient } from '@apollo/client/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { UNSEEN_FEED_COUNT } from '@/services/gql/postsFeed';

interface UnseenFeedCountData {
  unseenFeedCount: {
    count: number;
    lastSeenAt?: string | null;
  };
}

interface UseUnseenFeedCountResult {
  count: number;
  lastSeenAt: string | null;
  reset: () => void;
}

/**
 * Polls `unseenFeedCount` on a fixed cadence while the page is visible,
 * powering the "X new posts available" banner at the top of the feed.
 *
 * Behavior:
 *  - Polls every `intervalMs` (default 60s) while `document.visibilityState === 'visible'`.
 *  - Pauses when the tab is hidden and resumes immediately on visibility change.
 *  - `reset()` clears the local count (caller invokes it after pulling to refresh).
 *  - All calls are fail-soft on the backend → 0 on errors. The hook never throws.
 *
 * The backend SQL caps count at 99 already; this hook returns it as-is.
 */
export function useUnseenFeedCount(
  options: { intervalMs?: number; surface?: string; enabled?: boolean } = {},
): UseUnseenFeedCountResult {
  const apolloClient = useApolloClient();
  const intervalMs = options.intervalMs ?? 60_000;
  const surface = options.surface ?? 'home';
  const enabled = options.enabled ?? true;

  const [count, setCount] = useState(0);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const fetchOnce = useCallback(async () => {
    try {
      const { data } = await apolloClient.query<UnseenFeedCountData>({
        query: UNSEEN_FEED_COUNT,
        variables: { surface },
        fetchPolicy: 'network-only',
        errorPolicy: 'ignore',
      });
      if (cancelledRef.current) return;
      const raw = data?.unseenFeedCount;
      if (raw) {
        setCount(Math.max(0, Math.min(99, Number(raw.count) || 0)));
        setLastSeenAt(raw.lastSeenAt ?? null);
      }
    } catch {
      // Fail-soft — banner just stays at the current count.
    }
  }, [apolloClient, surface]);

  const reset = useCallback(() => {
    setCount(0);
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    if (!enabled) return;
    if (typeof window === 'undefined') return;

    const stopPolling = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const startPolling = () => {
      stopPolling();
      // Fire once immediately so the banner can appear without waiting a
      // full interval after page load / tab focus.
      void fetchOnce();
      timerRef.current = setInterval(() => {
        void fetchOnce();
      }, intervalMs);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === 'visible') {
      startPolling();
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelledRef.current = true;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, intervalMs, fetchOnce]);

  return { count, lastSeenAt, reset };
}
