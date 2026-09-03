'use client';

import { useParams } from 'next/navigation';

import { CircleSettingsScreen } from '@/components/circles/settings';

/**
 * Circle settings.
 *
 * Deliberately thin, matching `circles/[id]/page.tsx` and the members screen:
 * it reads the route param and hands off. The queries, the permission split and
 * all three mutations live in `components/circles/settings/`, so the route file
 * stays a route.
 *
 * `useParams` rather than the `params` prop — the established shape for a
 * client-rendered dynamic route in this app, and this screen must be a client
 * component regardless, since every control is a mutation.
 */
export default function CircleSettingsPage() {
  const params = useParams();
  const circleId = typeof params.id === 'string' ? params.id : '';

  return <CircleSettingsScreen circleId={circleId} />;
}
