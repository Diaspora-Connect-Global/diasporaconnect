'use client';

import { useEffect, useState } from 'react';

/** Injectable time source: the harness runs a clock that starts at a chosen moment. */
export type Clock = () => number;

/**
 * The current time from `clock`, refreshed every `intervalMs` while `intervalMs` is a number.
 * `null` freezes it (nothing is scheduled), so an idle card costs no timers.
 */
export function useClockNow(clock: Clock, intervalMs: number | null): number {
  const [now, setNow] = useState(() => clock());
  useEffect(() => {
    setNow(clock());
    if (intervalMs === null) return;
    const id = setInterval(() => setNow(clock()), intervalMs);
    return () => clearInterval(id);
  }, [clock, intervalMs]);
  return now;
}
