'use client';

import { useEffect, useState } from 'react';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole days until `iso`, or null before hydration and for an unusable date.
 *
 * Withheld until mount for the same reason the `Countdown` primitive withholds
 * its relative line: anything derived from `Date.now()` differs between the
 * server render and the first client render, and React would flag the
 * mismatch. Returning null (rather than 0) keeps "no answer yet" distinct from
 * "the challenge ends today".
 *
 * Shared by the inline `ChallengeCard` and the "What's live" panel, which show
 * the same countdown for the same challenge side by side.
 */
export function useDaysUntil(iso?: string | null): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    // A day boundary is far too coarse to warrant a ticking timer; the caller
    // re-renders whenever the conversation moves, which is often enough.
  }, []);

  if (now === null || !iso) return null;
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - now) / DAY_MS);
}
