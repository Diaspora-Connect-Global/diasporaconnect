'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import Header from '@/components/custom/header';
import LoadingScreen from '@/components/custom/LoadingScreen';
import { useAuthStore } from '@/store/useAuthStore';
import { useTranslations } from 'next-intl';

/**
 * Chrome for PUBLIC, indexable detail pages (events, opportunities, communities,
 * associations) that live OUTSIDE the `(protected)` group — so search-engine
 * crawlers receive a real 200 page instead of being redirected to /signin.
 *
 * - Logged-out visitors / crawlers get a lightweight public top bar (logo +
 *   sign-in / sign-up). This is what Googlebot renders.
 * - Authenticated visitors get the full in-app Header so navigation is intact.
 *
 * Auth state lives in localStorage, so the shell is decided ONCE, after
 * hydration. Before that, the public page is still rendered (so the server HTML
 * carries the real content for crawlers) but kept invisible under the boot
 * LoadingScreen. Previously a signed-in visitor saw the public top bar, which
 * was then swapped for the whole app Header — a full-shell layout shift. The
 * public tree keeps the same element position in both states, so logged-out
 * visitors do not remount the page when the loader goes away.
 */
export default function PublicShell({ children }: { children: React.ReactNode }) {
  const tCommon = useTranslations('common');
  const [hydrated, setHydrated] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsubscribe;
  }, []);

  if (hydrated && isAuthenticated) {
    return <Header>{children}</Header>;
  }

  return (
    <>
      {!hydrated && <LoadingScreen />}
    <div
      className={`min-h-screen bg-surface-default${hydrated ? '' : ' invisible'}`}
      aria-hidden={hydrated ? undefined : true}
    >
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-default/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" prefetch={false} aria-label="DiaspoPlug home">
            <Image
              src="/LOGO.svg"
              alt="DiaspoPlug"
              width={160}
              height={40}
              className="h-9 w-auto object-contain"
              priority
            />
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/signin"
              className="rounded-full px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-subtle"
            >
              {tCommon('signIn')}
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-text-brand px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              {tCommon('signUp')}
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
    </>
  );
}
