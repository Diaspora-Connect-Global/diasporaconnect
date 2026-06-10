'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Client island mounted on the PUBLIC landing page (`/[locale]`).
 *
 * The landing page itself is a server component so crawlers (which carry no
 * localStorage session) receive fully-rendered, indexable marketing HTML.
 * Authenticated humans, however, should land on their feed — not the marketing
 * page — so once the auth store rehydrates from localStorage we bounce them to
 * `/home`. Mirrors the hydration-gate idiom in MainLayout.
 *
 * Renders nothing.
 */
export default function AuthedRedirect() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      router.replace('/home');
    }
  }, [hydrated, isAuthenticated, router]);

  return null;
}
