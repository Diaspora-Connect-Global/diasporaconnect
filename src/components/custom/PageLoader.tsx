"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Spinner } from '@/components/ui/spinner';

/**
 * THE page loader — the one loading state every screen uses once the app shell
 * (header, sidebar, bottom nav) is on screen.
 *
 * Same look as the boot `LoadingScreen` (logo over the brand spinner) but it
 * fills only the CONTENT area, so the shell never gets covered or re-drawn.
 * Route `loading.tsx` files and in-page `if (loading && !data)` branches both
 * render this, in the same place, so a navigation shows one continuous loader
 * and then the whole page at once.
 *
 * `delayMs` keeps fast navigations from flashing a loader at all.
 */
export default function PageLoader({ delayMs = 150 }: { delayMs?: number }) {
  const t = useTranslations('common');
  const [visible, setVisible] = useState(delayMs <= 0);

  useEffect(() => {
    if (delayMs <= 0) return;
    const id = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(id);
  }, [delayMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex w-full flex-1 items-center justify-center min-h-[60svh]"
    >
      <span className="sr-only">{t('loading')}</span>
      {visible && (
        <div className="flex flex-col items-center gap-6" aria-hidden>
          <div className="relative h-24 w-24">
            <Image src="/LOGO.svg" alt="" fill className="object-contain" priority />
          </div>
          <Spinner className="size-6 text-text-brand" />
        </div>
      )}
    </div>
  );
}
