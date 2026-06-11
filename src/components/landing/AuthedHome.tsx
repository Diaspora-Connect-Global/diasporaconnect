'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Client island mounted on the PUBLIC landing page (`/[locale]`).
 *
 * The landing page is a server component so crawlers (which carry no
 * localStorage session) receive fully-rendered, indexable marketing HTML —
 * that marketing markup is passed in as `children` and is what we render by
 * default (during SSR, before hydration, and for every logged-out visitor).
 *
 * Authenticated humans, however, should see their feed at `/` — the same
 * content as `/home` — without a redirect or URL change. Once the auth store
 * rehydrates from localStorage and confirms a session, we swap the marketing
 * markup for the real feed. The feed is loaded lazily so its (large) bundle is
 * only fetched for signed-in users, keeping the public landing lean.
 */
const AuthedHomeFeed = dynamic(() => import('./AuthedHomeFeed'), { ssr: false });

export default function AuthedHome({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsubscribe;
  }, []);

  if (hydrated && isAuthenticated) {
    return <AuthedHomeFeed />;
  }

  return <>{children}</>;
}
