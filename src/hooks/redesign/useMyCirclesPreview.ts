'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { MY_CIRCLES } from '@/services/gql/circles';

export type CirclePreview = { id: string; name: string; avatarUrl?: string | null; bannerUrl?: string | null; memberCount?: number | null; status?: string | null };

const SILENT = { context: { silentErrors: true } } as const;

/** The circles the viewer belongs to (active ones), for the Home rail. */
export function useMyCirclesPreview(limit = 3): { circles: CirclePreview[]; loading: boolean } {
  const { data, loading } = useQuery<{ myCircles: CirclePreview[] | null }>(MY_CIRCLES, {
    variables: { limit: 12, offset: 0 },
    fetchPolicy: 'cache-and-network',
    ...SILENT,
  });
  const circles = useMemo(
    () => (data?.myCircles ?? []).filter((c) => c && c.id && c.name && (!c.status || c.status === 'ACTIVE')).slice(0, limit),
    [data, limit],
  );
  return { circles, loading: loading && !data };
}
