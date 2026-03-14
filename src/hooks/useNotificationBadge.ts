'use client';

import { useQuery } from '@apollo/client/react';
import { GET_UNREAD_COUNT, type UnreadCountResponse } from '@/services/gql/notification';

const POLL_INTERVAL_MS = 45_000; // 30–60s recommended

/**
 * Lightweight poll for unread notification count (badge).
 * Use on app load and after mark-as-read; optionally poll every 30–60s.
 */
export function useNotificationBadge(poll = true) {
  const { data, refetch } = useQuery<UnreadCountResponse>(GET_UNREAD_COUNT, {
    pollInterval: poll ? POLL_INTERVAL_MS : 0,
    fetchPolicy: 'cache-and-network',
  });

  const count = data?.getUnreadNotificationCount?.count ?? 0;

  return { count, refetch };
}
