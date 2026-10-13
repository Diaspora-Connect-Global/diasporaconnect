'use client';

import { usePathname } from '@/i18n/navigation';

/**
 * Shell for the `(home)` pages (home feed, events, circles, opportunities…).
 *
 * There is no left sidebar any more (its contents moved to the Community and
 * More pages). Most pages here were laid out for the 60vw content column that sat
 * beside the 20vw sidebar inside the header's 80vw frame, so that column is kept
 * at exactly the same width and centred under the header: every page keeps its
 * proportions, and nothing slides when a page swaps its loader for content.
 *
 * Home (`/home`) is the exception: its redesign is a main column plus a right
 * rail, so it takes a wider frame (92vw, at most 1400px) that the header matches on that page, so the main column has room for three activity cards and four listing cards.
 */
export default function HomeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const wide = pathname === '/home' || pathname === '/';
  // The redesigned events and circles lists (grid + rail) use the header's 80vw frame, like Discover and Groups.
  const frame = pathname === '/events' || pathname === '/circles' ? 'lg:w-[80vw]' : 'lg:w-[60vw]';
  return <div className={`h-app-inner min-w-0 lg:mx-auto ${wide ? 'lg:w-[min(92vw,1400px)]' : frame}`}>{children}</div>;
}
