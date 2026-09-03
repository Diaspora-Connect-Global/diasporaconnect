import type { CircleStatus } from '@/services/gql/types/circles';

/**
 * Whether a circle's status admits writes at all.
 *
 * Mirrors `CircleStatus.isLive()` in `circle-service`'s value object, which is
 * what the aggregate's `assertUsable` calls before EVERY mutation this screen
 * can reach — profile edits, discoverability, join mode and archive all throw
 * `CircleNotActiveError` when it is false.
 *
 * ── ONE SPELLING, DELIBERATELY ──────────────────────────────────────────────
 * This lives in its own module rather than being inlined at the two call sites
 * that need it. The `types/circles.ts` enum note records two production bugs
 * caused by the same status compared two different ways in two places; a
 * predicate that decides whether a whole screen is editable is exactly the kind
 * that must not acquire a second, subtly different copy.
 *
 * DORMANT is LIVE. It means only that the circle has fewer than two active
 * members — reads work, it reactivates on the next join, and its settings stay
 * editable. Treating it as frozen would lock a circle out of its own settings
 * for being small, which is the opposite of what the status is for.
 */
export function isCircleLive(status: CircleStatus | undefined | null): boolean {
  return status === 'ACTIVE' || status === 'DORMANT';
}
