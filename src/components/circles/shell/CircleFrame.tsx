'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { usePathname } from '@/i18n/navigation';

import { CircleCompactHeader } from './CircleCompactHeader';

/**
 * The page shell shared by every screen of a circle: Discover's scroll area and
 * content measure (`80vw` on a desktop), one header and one navigation.
 *
 * `(home)/layout.tsx` gives non-list pages a 60vw column. Circles are laid out
 * like Discover, so the frame steps out of that column (`-10vw` either side)
 * rather than changing the shared layout. Below `lg` there is no column and
 * nothing to step out of.
 *
 * Because this lives in the segment layout it stays mounted while you move
 * between screens, and so would the scroll position; each navigation starts at
 * the top.
 */
export function CircleFrame({ circleId, children }: { circleId: string; children: ReactNode }) {
  const pathname = usePathname();
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div
      ref={scroller}
      data-testid="circle-frame"
      className="h-app-inner overflow-y-auto scrollbar-hide bg-background lg:ml-[-10vw] lg:w-[80vw]"
    >
      <div className="mx-auto w-full space-y-5 px-4 py-4 pb-10 lg:px-0 lg:py-6">
        <CircleCompactHeader circleId={circleId} />
        {children}
      </div>
    </div>
  );
}
