'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useRecordInteraction } from '@/hooks/useRecordInteraction';
import type {
  RecommendationItemType,
  RecommendationSource,
} from '@/services/gql/types/recommendation';

/**
 * Min visible ratio (intersection) at which we consider the card "visible".
 * 0.5 = at least half the card must be on screen.
 */
const VISIBILITY_RATIO = 0.5;

/**
 * Continuous-visible duration (ms) after which a DWELL is fired.
 */
const DWELL_THRESHOLD_MS = 2000;

export interface ImpressionTrackerProps {
  itemId: string;
  itemType?: RecommendationItemType | string;
  /** Source retriever that surfaced this item (e.g. "trending", "vector-similar"). */
  source?: RecommendationSource | string;
  /** Ranking score the recommender assigned. Sent through as part of `sourceSurface` context. */
  score?: number | null;
  /** Surface label used to identify the calling UI (default: "home:for_you"). */
  surface?: string;
  /** Disable tracking — useful for tests or when feed is not the recommended arm. */
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

function buildSourceSurface(
  surface: string,
  source?: string,
  score?: number | null
): string {
  const parts: string[] = [surface];
  if (source) parts.push(source);
  // Score is included as a coarse context tag (rounded to 2 decimals to keep cardinality low).
  if (typeof score === 'number' && Number.isFinite(score)) {
    parts.push(`score:${score.toFixed(2)}`);
  }
  return parts.join(':');
}

/**
 * Wrapper that fires `recordInteraction(kind: 'VIEW')` when the child becomes visible,
 * and `recordInteraction(kind: 'DWELL', durationMs)` after `DWELL_THRESHOLD_MS` (2s) of
 * continuous visibility.
 *
 * DWELL timer logic: on entry we capture an entry timestamp and schedule a setTimeout
 * for DWELL_THRESHOLD_MS. On exit (before the timer fires) we clear the timer; if the
 * timer survives, it fires DWELL with the precise elapsed durationMs and is then cleared.
 * The timer is re-armed on each fresh entry — so a card that goes off-screen at 1.5s and
 * back on at 1.8s does NOT instantly fire DWELL; the 2s clock starts over.
 *
 * All instrumentation calls are best-effort — failures never propagate.
 */
export function ImpressionTracker({
  itemId,
  itemType = 'POST',
  source,
  score,
  surface = 'home:for_you',
  disabled = false,
  children,
  className,
}: ImpressionTrackerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const recordInteraction = useRecordInteraction();

  const hasFiredViewRef = useRef(false);
  const hasFiredDwellRef = useRef(false);
  const entryTimestampRef = useRef<number | null>(null);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (disabled) return;
    if (typeof window === 'undefined') return;
    if (typeof IntersectionObserver === 'undefined') return;

    const el = containerRef.current;
    if (!el) return;

    const sourceSurface = buildSourceSurface(surface, source, score ?? null);

    const clearDwellTimer = () => {
      if (dwellTimerRef.current !== null) {
        clearTimeout(dwellTimerRef.current);
        dwellTimerRef.current = null;
      }
    };

    const onVisible = () => {
      // Fire VIEW once per mount (useRecordInteraction additionally dedupes globally).
      if (!hasFiredViewRef.current) {
        hasFiredViewRef.current = true;
        recordInteraction({
          itemId,
          itemType,
          kind: 'VIEW',
          sourceSurface,
        });
      }

      // Arm / re-arm the DWELL timer.
      entryTimestampRef.current = Date.now();
      clearDwellTimer();

      if (!hasFiredDwellRef.current) {
        dwellTimerRef.current = setTimeout(() => {
          if (hasFiredDwellRef.current) return;
          hasFiredDwellRef.current = true;
          const start = entryTimestampRef.current ?? Date.now();
          const durationMs = Date.now() - start;
          recordInteraction({
            itemId,
            itemType,
            kind: 'DWELL',
            durationMs,
            sourceSurface,
          });
          dwellTimerRef.current = null;
        }, DWELL_THRESHOLD_MS);
      }
    };

    const onHidden = () => {
      // Card scrolled out before the dwell threshold — cancel the pending DWELL.
      // (We don't fire a partial DWELL on early exit; the 2s gate exists precisely
      // to filter low-quality impressions.)
      clearDwellTimer();
      entryTimestampRef.current = null;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= VISIBILITY_RATIO) {
            onVisible();
          } else {
            onHidden();
          }
        }
      },
      { threshold: [0, VISIBILITY_RATIO, 1] }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      clearDwellTimer();
    };
  }, [itemId, itemType, source, score, surface, disabled, recordInteraction]);

  return (
    <div ref={containerRef} className={className} data-impression-item={itemId}>
      {children}
    </div>
  );
}

export default ImpressionTracker;
