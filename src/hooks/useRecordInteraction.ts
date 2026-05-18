'use client';

import { useCallback, useRef } from 'react';
import { useMutation } from '@apollo/client/react';
import { RECORD_INTERACTION } from '@/services/gql/postsFeed';
import type {
  InteractionKind,
  RecordInteractionData,
  RecordInteractionInput,
} from '@/services/gql/types/recommendation';

/**
 * Window (ms) within which a VIEW for the same item is treated as a duplicate
 * and silently dropped. Prevents flicker scrolls (card in → out → in within a
 * couple seconds) from firing two separate signals.
 */
const VIEW_DEDUPE_WINDOW_MS = 5000;

export type RecordInteractionFn = (input: RecordInteractionInput) => void;

/**
 * Fire-and-forget interaction recorder. Errors are swallowed — recommendation-service
 * failures must never block the UI or post-feed-service writes.
 *
 * Dedupe strategy: consecutive VIEWs for the same `itemId` within
 * VIEW_DEDUPE_WINDOW_MS (5s) are dropped silently. All other kinds (LIKE, SAVE,
 * SHARE, COMMENT, DWELL, ...) always pass through — the server is the dedupe
 * authority for those.
 */
export function useRecordInteraction(): RecordInteractionFn {
  const [recordInteractionMutation] = useMutation<RecordInteractionData>(
    RECORD_INTERACTION,
    {
      // Apollo: don't bubble GraphQL errors up as React errors — recommendation
      // failures are non-fatal.
      errorPolicy: 'ignore',
      onError: () => {
        /* swallow — best-effort */
      },
    }
  );

  // Per-mount cache of last VIEW timestamp keyed by itemId.
  const lastViewAtRef = useRef<Map<string, number>>(new Map());

  return useCallback<RecordInteractionFn>(
    (input) => {
      try {
        if (input.kind === ('VIEW' satisfies InteractionKind)) {
          const now = Date.now();
          const last = lastViewAtRef.current.get(input.itemId);
          if (last !== undefined && now - last < VIEW_DEDUPE_WINDOW_MS) {
            return; // dedupe — same item viewed too recently
          }
          lastViewAtRef.current.set(input.itemId, now);
        }

        // Fire-and-forget; never await.
        void recordInteractionMutation({
          variables: { input },
        }).catch(() => {
          /* swallow — Apollo errorPolicy:ignore + onError already cover this,
             but defensive .catch keeps the unhandled-rejection log clean. */
        });
      } catch {
        /* never throw from instrumentation */
      }
    },
    [recordInteractionMutation]
  );
}
