'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { USER_EVENTS, type Event, type UserEventsData } from '@/services/gql/events';

const SILENT = { context: { silentErrors: true } } as const;

/**
 * The events the viewer is registered for that have not ended yet, soonest first.
 * Never null-unsafe: with Apollo's `errorPolicy: 'all'` a partial backend error
 * leaves `userEvents` null, and that must read as "none", not crash the page.
 */
export function useUpcomingRegistrations(limit = 3): { events: Event[]; loading: boolean } {
  const { data, loading } = useQuery<UserEventsData>(USER_EVENTS, { fetchPolicy: 'cache-and-network', ...SILENT });
  const events = useMemo(() => {
    const now = Date.now();
    return (data?.userEvents?.attending ?? [])
      .filter((e) => e && e.id && e.startAt && String(e.status).toLowerCase() !== 'cancelled')
      .filter((e) => new Date(e.endAt || e.startAt).getTime() > now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, limit);
  }, [data, limit]);
  return { events, loading: loading && !data };
}
