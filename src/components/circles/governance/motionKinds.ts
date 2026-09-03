import type { CircleMotionKind } from '@/services/gql/types/circles';

/**
 * The motion-kind vocabulary, and the order the governance screen reads it in.
 *
 * ── ORDER IS EDITORIAL, NOT ALPHABETICAL ────────────────────────────────────
 * This screen is the circle's constitution in plain language, and a
 * constitution opens with who belongs and who leads — the decisions that change
 * someone's standing — before it gets to project admin. Sorting by enum value
 * or by label would bury `REMOVE_MEMBER`, the single rule a member most needs
 * to have read before it is used on them.
 *
 * A circle configures a rule PER KIND, so this list is also the checklist of
 * what can be decided at all. Anything absent from it cannot be voted on.
 */
export const MOTION_KIND_ORDER: readonly CircleMotionKind[] = [
  // Who is in the circle, and who leads it
  'ADMIT_MEMBER',
  'REMOVE_MEMBER',
  'APPOINT_LEAD',
  'REMOVE_LEAD',
  // The rules themselves, and how the circle is reached
  'AMEND_RULES',
  'CHANGE_JOIN_MODE',
  'SET_DISCOVERABLE',
  // What the circle does together
  'CREATE_PROJECT',
  'CLOSE_PROJECT',
  'CREATE_CHALLENGE',
  'VERIFY_CHALLENGE_ENTRY',
  // Money and the end of the circle
  'CHANGE_PLAN',
  'DISSOLVE_CIRCLE',
  'CUSTOM',
] as const;

const KNOWN = new Set<string>(MOTION_KIND_ORDER);

/**
 * Whether a free-form string is a motion kind this build has a label for.
 *
 * Needed because two sources are NOT typed: `subjectType`/`payloadJson` on an
 * audit event are opaque strings, and a newer circle-service can add a kind at
 * any time. Translating an unknown key would throw in development and print a
 * raw key in production; both are worse than showing the bare value.
 */
export function isKnownMotionKind(value: string | null | undefined): value is CircleMotionKind {
  return !!value && KNOWN.has(value);
}

/**
 * Sort rules into constitution order, unknown kinds last in stable order.
 *
 * `MOTION_KIND_ORDER.indexOf` returns -1 for a kind added by a newer
 * circle-service; mapping that to `Infinity` puts it at the end rather than at
 * the front, which is what a raw -1 sort would do.
 */
export function motionKindRank(kind: string): number {
  const index = MOTION_KIND_ORDER.indexOf(kind as CircleMotionKind);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}
