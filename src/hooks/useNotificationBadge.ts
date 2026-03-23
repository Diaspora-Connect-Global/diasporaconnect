'use client';

import { useQuery } from '@apollo/client/react';
import { useEffect } from 'react';
import { GET_UNREAD_COUNT, type UnreadCountResponse } from '@/services/gql/notification';

const POLL_INTERVAL_MS = 45_000; // 30–60s recommended

/**
 * Lightweight poll for unread notification count (badge).
 * Refetches when the window regains focus or becomes visible (tab switch).
 * Use on app load and after mark-as-read; polls every ~45s when `poll` is true.
 */
export function useNotificationBadge(poll = true) {
  const { data, refetch } = useQuery<UnreadCountResponse>(GET_UNREAD_COUNT, {
    pollInterval: poll ? POLL_INTERVAL_MS : 0,
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    if (!poll) return;

    const refetchOnVisible = () => {
      void refetch();
    };

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

  const count = data?.getUnreadNotificationCount?.count ?? 0;

  return { count, refetch };
}
