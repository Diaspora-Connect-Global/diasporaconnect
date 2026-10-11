'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Mounts its children (and so starts their queries) only when the placeholder
 * nears the viewport, keeping below-the-fold sections off the first load. The
 * placeholder reserves `minHeight` so the page does not jump when it fills.
 * Without IntersectionObserver (old browsers) it mounts at once.
 */
export function LazyMount({ children, minHeight = 240, rootMargin = '600px 0px', root }: { children: ReactNode; minHeight?: number; rootMargin?: string; root?: Element | null }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { root: root ?? null, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, root, rootMargin]);

  if (shown) return <>{children}</>;
  return <div ref={ref} aria-hidden style={{ minHeight }} />;
}
