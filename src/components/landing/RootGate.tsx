'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import LoadingScreen from '@/components/custom/LoadingScreen';

/**
 * App-gate for the root URL (`/[locale]`).
 *
 * The root is no longer a public marketing page (that now lives at `/welcome`):
 * it surfaces the authenticated feed for signed-in users and bounces everyone
 * else to sign-in. Auth lives in localStorage, so the decision can only be made
 * client-side once the store rehydrates — until then we show a loading screen.
 *
 * - hydrated + authenticated → render the feed in place (same content as `/home`)
 * - hydrated + logged-out     → redirect to `/signin`
 * - not yet hydrated          → loading screen
 *
 * The feed is loaded lazily so its (large) bundle is only fetched once we know
 * the visitor is authenticated.
 */
// `loading` renders the SAME LoadingScreen while the chunk downloads, so the
// gate's loader, this one and MainLayout's boot loader read as one continuous
// loader — previously there was a blank frame between them. The gate is the
// only hydration check that decides anything here: MainLayout re-checks in its
// first effect (the store is already hydrated) behind the identical screen.
const AuthedHomeFeed = dynamic(() => import('./AuthedHomeFeed'), {
  ssr: false,
  loading: () => <LoadingScreen />,
});

export default function RootGate() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace('/signin');
    }
  }, [hydrated, isAuthenticated, router]);

  if (hydrated && isAuthenticated) {
    return <AuthedHomeFeed />;
  }

  return <LoadingScreen />;
}
