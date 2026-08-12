'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';

interface FitTextProps {
  /** Text to fit. Kept as a string so the fitter can re-run when the copy changes. */
  children: string;
  /** Smallest font size to shrink to, in px. */
  minPx?: number;
  className?: string;
}

/**
 * Renders a single line of text that shrinks its font size until it fits the
 * available width, instead of truncating with an ellipsis.
 *
 * Starts from the inherited font size (so short labels keep the design's size)
 * and steps down only as far as needed, never below `minPx`. Used for localized
 * button labels, where one language can be twice as long as another.
 *
 * The container must have a width that does not depend on the text (e.g.
 * `w-full`, or a fixed width) — inside a shrink-to-fit box the measured width
 * would follow the font size we just changed and never settle.
 */
export function FitText({ children, minPx = 11, className = '' }: FitTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const lastWidthRef = useRef(-1);

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    // Reset to the inherited size so the fitter can grow back when the text
    // shortens or the container widens.
    el.style.fontSize = '';
    const max = parseFloat(getComputedStyle(el).fontSize) || 16;
    const available = el.clientWidth;
    if (!available) return;

    let size = max;
    if (el.scrollWidth > available) {
      // One proportional guess gets within a rounding error of the answer;
      // the loop absorbs kerning/hinting differences at the smaller size.
      size = Math.max(minPx, (max * available) / el.scrollWidth);
      el.style.fontSize = `${size}px`;
      while (el.scrollWidth > available && size > minPx) {
        size = Math.max(minPx, size - 0.25);
        el.style.fontSize = `${size}px`;
      }
    }
    lastWidthRef.current = available;
  }, [minPx]);

  useLayoutEffect(() => {
    fit();

    const el = ref.current;
    const parent = el?.parentElement;
    if (!parent) return;

    // Observe the parent, not the text itself: re-measuring an element whose
    // font size we mutate would feed the observer its own output.
    const observer = new ResizeObserver(() => {
      if (ref.current && ref.current.clientWidth !== lastWidthRef.current) {
        fit();
      }
    });
    observer.observe(parent);

    // Web fonts settling after first paint change the metrics we measured.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) fit();
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [children, fit]);

  return (
    <span
      ref={ref}
      className={`block w-full overflow-hidden whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  );
}
