'use client';

import { useParams } from 'next/navigation';

import { CircleHome } from '@/components/circles/home';

/**
 * Circle home — screen 3 of the Circles feature.
 *
 * Deliberately thin: it reads the route param and hands off. Everything the
 * screen does (bridging circle-service to the message-service chat surface,
 * interleaving projects/motions/challenges into the conversation, the composer)
 * lives in `components/circles/home/CircleHome.tsx`, so the route file stays a
 * route.
 *
 * `useParams` rather than the `params` prop, matching `(home)/post/[id]` — the
 * established shape for a client-rendered dynamic route in this app.
 */
export default function CircleHomePage() {
  const params = useParams();
  const circleId = typeof params.id === 'string' ? params.id : '';

  return <CircleHome circleId={circleId} />;
}
