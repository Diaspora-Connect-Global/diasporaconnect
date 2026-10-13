'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { RECAP_MINE, type Recap } from '@/services/gql/networkingEventDay';
import { NETWORKING_CONTEXT } from '@/services/gql/networking';
import { hasFailure, networkingRefusal } from '@/lib/networkingRefusal';

/** My recap. Runs only while `enabled`; a refusal surfaces as a `networking.errors` key. */
export function useRecap(eventId: string, enabled: boolean) {
  const q = useQuery<{ eventNetworkingMyRecap: Recap | null }>(RECAP_MINE, { variables: { eventId }, skip: !enabled || !eventId, ...NETWORKING_CONTEXT });
  const recap = q.data?.eventNetworkingMyRecap ?? null;
  const failureKey = hasFailure(q) && !recap ? networkingRefusal(q).key : null;
  return { recap, loading: q.loading, failureKey, reload: () => void q.refetch() };
}

/**
 * True once `endAt` has passed. False during the server render and the first client render, so the
 * page never flips between the two; checked again once a minute.
 */
export function useEventEnded(endAt?: string | null): boolean {
  const [ended, setEnded] = useState(false);
  useEffect(() => {
    const end = endAt ? Date.parse(endAt) : NaN;
    if (!Number.isFinite(end)) {
      setEnded(false);
      return;
    }
    const check = () => setEnded(Date.now() >= end);
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [endAt]);
  return ended;
}
