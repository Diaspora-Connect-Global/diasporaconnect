'use client';

import { useQuery } from '@apollo/client/react';
import { useEffect } from 'react';
import { GET_UNREAD_COUNT, type UnreadCountResponse } from '@/services/gql/notification';
import { useNotificationStore } from '@/store/useNotificationStore';

const POLL_INTERVAL_MS = 45_000; // 30–60s recommended

/**
 * Lightweight poll for unread notification count (badge).
 * The WebSocket store is the primary source for live increments; Apollo polling
 * acts as a periodic sync to correct any drift.
 */
export function useNotificationBadge(poll = true) {
  const { data, refetch } = useQuery<UnreadCountResponse>(GET_UNREAD_COUNT, {
    pollInterval: poll ? POLL_INTERVAL_MS : 0,
    fetchPolicy: 'cache-and-network',
  });

  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const liveCount = useNotificationStore((s) => s.unreadCount);

  // Sync Apollo result into the store whenever it arrives (keeps store honest)
  useEffect(() => {
    const polled = data?.getUnreadNotificationCount?.count;
    if (typeof polled === 'number') {
      // Only update store if the polled value is higher — don't overwrite a live increment
      setUnreadCount(Math.max(polled, liveCount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    if (!poll) return;

    const refetchOnVisible = () => { void refetch(); };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refetchOnVisible();
    };

    window.addEventListener('focus', refetchOnVisible);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', refetchOnVisible);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [poll, refetch]);

  return { count: liveCount, refetch };
}
