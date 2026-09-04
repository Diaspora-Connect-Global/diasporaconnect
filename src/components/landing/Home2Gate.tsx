'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import LoadingScreen from '@/components/custom/LoadingScreen';

/**
 * App-gate for `/[locale]/home2`, the independent clone of the root feed.
 *
 * Behaviourally identical to `RootGate`, and kept as a separate file for the
 * same reason the feed is: so `/home2` can be changed without touching the gate
 * the live root URL depends on. Auth lives in localStorage, so the decision can
 * only be made client-side once the store rehydrates.
 *
 * - hydrated + authenticated → render the cloned feed in place
 * - hydrated + logged-out     → redirect to `/signin`
 * - not yet hydrated          → loading screen
 *
 * The feed is loaded lazily so its (large) bundle is only fetched once we know
 * the visitor is authenticated — a crawler or logged-out visitor never pays for
 * it.
 */
const Home2Feed = dynamic(() => import('./Home2Feed'), { ssr: false });

export default function Home2Gate() {
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
    return <Home2Feed />;
  }

  return <LoadingScreen />;
}
