import type { CircleMotionKind } from '@/services/gql/types/circles';
import type {
  CircleChallengeDraft,
  CircleProjectDraft,
  CircleVerificationModeInput,
} from '@/services/gql/types/circles-actions';

/**
 * @fileoverview Building the `payloadJson` a motion needs in order to be
 * ENACTABLE, not merely openable.
 * @module components/circles/governance/motionPayload
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  NOTHING VALIDATES THIS UNTIL IT IS TOO LATE TO FIX
 * ═══════════════════════════════════════════════════════════════════════════
 * `payloadJson` is a free-form JSON string. The gateway explicitly does not
 * parse it (*"what a given motion kind requires is a governance question, and
 * encoding it here would drift the moment circle-service changes an
 * enactment"*), and circle-service's `OpenMotion` only checks that it PARSES —
 * `parseJsonObject` rejects malformed JSON and non-objects, nothing more. No
 * kind-specific key is required at open time; an empty `{}` opens fine for
 * every kind.
 *
 * The keys are read for the first time by the ENACTMENT dispatcher, after the
 * motion has passed. A missing `title` on a CREATE_PROJECT motion therefore
 * produces: a motion that opens, a voting window the circle sits through, a
 * result that PASSES — and then `ENACTMENT_FAILED` with
 * `CREATE_PROJECT_PAYLOAD_MISSING_TITLE`. The vote is spent and cannot be
 * re-run; the circle has to open a second motion and vote again.
 *
 * That is why the payload is built here, from typed inputs, rather than by
 * hand at each call site.
 *
 * ── THE KEYS ARE EXACT ──────────────────────────────────────────────────────
 * `readString` / `readInt` / `readBool` / `readDate` in
 * `motion-enactment.service.ts` are exact-key lookups on `payload[key]`. There
 * is no camel/snake tolerance and no aliasing except where the service
 * explicitly tries two names. So `startsOn` and `starts_on` are not the same
 * key, and — the one that actually bites — a CREATE_PROJECT motion carries
 * `startsOn` while a CREATE_CHALLENGE motion carries `startsAt`. They are
 * different fields on different aggregates and the dispatcher reads exactly
 * the one named here.
 *
 * ── AND `verificationMode` GOES IN BARE ─────────────────────────────────────
 * This is the important asymmetry, and it runs the OPPOSITE way to the direct
 * mutation.
 *
 * `createCircleChallenge` types `verificationMode` as a registered GraphQL
 * enum, so it must be sent PREFIXED (`LEAD_CONFIRMS`) — and circle-service then
 * rejects that value, because its domain enum is bare (`LEAD`). Two of the
 * three modes are unreachable through the direct route. See the header of
 * `services/gql/types/circles-actions.ts`.
 *
 * `payloadJson` is a plain string. No GraphQL enum validates it, so the
 * enactment path can pass the BARE value straight into
 * `VerificationMode.create()` — which is the spelling it wants. The motion
 * route can express all three modes correctly today.
 *
 * `toDomainVerificationMode` is that translation, and it is deliberately NOT
 * exported for use on the direct mutation: sending `'LEAD'` there fails
 * GraphQL enum validation before a resolver ever runs, turning a server-side
 * refusal into a client-side one without fixing anything.
 */

/**
 * Motion kinds that will not OPEN without a `subjectId`.
 *
 * Enforced by `Motion.open` (`SUBJECT_REQUIRED`), so this refusal at least
 * arrives immediately rather than after a vote. Mirrored here so the form can
 * collect the subject instead of being refused.
 */
export const MOTION_KINDS_REQUIRING_SUBJECT: readonly CircleMotionKind[] = [
  'ADMIT_MEMBER',
  'REMOVE_MEMBER',
  'APPOINT_LEAD',
  'REMOVE_LEAD',
  'CLOSE_PROJECT',
  'VERIFY_CHALLENGE_ENTRY',
] as const;

export function motionKindRequiresSubject(kind: CircleMotionKind): boolean {
  return MOTION_KINDS_REQUIRING_SUBJECT.includes(kind);
}

/**
 * What KIND of thing a motion's subject is, so the form can pick the right
 * control — and label it correctly.
 *
 * `subjectType` is a free-form string on the wire and the enactment service
 * never reads it; only `subjectId` is load-bearing. It is still sent, because
 * it is what the audit trail and the motion list render, and a motion whose
 * subject shows as a bare UUID is unreadable months later.
 */
export type MotionSubjectKind = 'MEMBER' | 'PROJECT' | 'CHALLENGE_ENTRY' | null;

export function motionSubjectKind(kind: CircleMotionKind): MotionSubjectKind {
  switch (kind) {
    case 'ADMIT_MEMBER':
    case 'REMOVE_MEMBER':
    case 'APPOINT_LEAD':
    case 'REMOVE_LEAD':
      return 'MEMBER';
    case 'CLOSE_PROJECT':
      return 'PROJECT';
    case 'VERIFY_CHALLENGE_ENTRY':
      return 'CHALLENGE_ENTRY';
    default:
      return null;
  }
}

/** The `subjectType` string to send alongside a subject id. */
export function motionSubjectType(kind: CircleMotionKind): string | null {
  return motionSubjectKind(kind);
}

/**
 * Prefixed GraphQL spelling → the bare value circle-service's domain enum
 * accepts. For `payloadJson` ONLY — see the header.
 */
function toDomainVerificationMode(mode: CircleVerificationModeInput): string {
  switch (mode) {
    case 'LEAD_CONFIRMS':
      return 'LEAD';
    case 'CIRCLE_CONFIRMS':
      return 'CIRCLE';
    case 'HONOUR':
    default:
      return 'HONOUR';
  }
}

/** Drop empty strings so an untouched optional field is absent, not `""`. */
function compact(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    out[key] = value;
  }
  return out;
}

/**
 * `payloadJson` for a CREATE_PROJECT motion.
 *
 * `title` is REQUIRED by the dispatcher. Dates are `YYYY-MM-DD` and go through
 * `readDate`, which returns null for anything it cannot parse RATHER than
 * failing — so a malformed date quietly becomes "no due date" instead of a
 * visible error. That is the argument for building this from a validated draft.
 */
export function createProjectMotionPayload(draft: CircleProjectDraft): string {
  return JSON.stringify(
    compact({
      title: draft.title.trim(),
      description: draft.description.trim(),
      startsOn: draft.startsOn,
      dueOn: draft.dueOn,
    }),
  );
}

/**
 * `payloadJson` for a CREATE_CHALLENGE motion.
 *
 * Note `startsAt` / `endsAt` — NOT `startsOn` / `dueOn`, which is what the
 * CREATE_PROJECT payload above uses. The dispatcher reads exactly these names.
 *
 * `pointsPerEntry` defaults to 1 server-side when absent (`?? 1`), so an empty
 * field is left out rather than sent as 0 — a challenge worth zero points is a
 * challenge that never moves the leaderboard.
 */
export function createChallengeMotionPayload(draft: CircleChallengeDraft): string {
  const points = draft.pointsPerEntry.trim();
  const maxEntries = draft.maxEntriesPerPeriod.trim();

  return JSON.stringify(
    compact({
      title: draft.title.trim(),
      description: draft.description.trim(),
      // BARE, not the prefixed GraphQL spelling. See the header.
      verificationMode: toDomainVerificationMode(draft.verificationMode),
      cadence: draft.cadence,
      startsAt: draft.startsAt,
      endsAt: draft.endsAt,
      pointsPerEntry: points === '' ? undefined : Number(points),
      maxEntriesPerPeriod: maxEntries === '' ? undefined : Number(maxEntries),
    }),
  );
}

/**
 * Motion kinds the enactment dispatcher CANNOT apply without structured
 * `payloadJson`, and which a kind/title/rationale form therefore must not open.
 *
 * ── WHY THIS LIST IS A GUARD AND NOT A HINT ─────────────────────────────────
 * Nothing refuses a missing payload at open time. A CHANGE_JOIN_MODE motion
 * with no `joinMode` key opens cleanly, runs its full voting window, PASSES —
 * and only then fails, because the dispatcher reads a key that is not there.
 * The circle has spent a real vote on a decision that cannot be applied, and
 * `enactCircleMotion` returns `ENACTMENT_FAILED` rather than an error, so
 * nothing about the path looked wrong until the end of it.
 *
 * Each of these is proposable — from the screen that collects its arguments.
 * `CREATE_PROJECT` and `CREATE_CHALLENGE` have dedicated creation forms that
 * build the payload; the rest belong to settings, governance and plan.
 *
 * The exact required keys, from `motion-enactment.service.ts`:
 *   AMEND_RULES       `motionKind` (or `targetKind`) + the threshold fields
 *   CHANGE_JOIN_MODE  `joinMode`
 *   SET_DISCOVERABLE  `discoverable` — and `readBool` yields `undefined` for
 *                     anything outside true/1/yes/false/0/no, which is a hard
 *                     enactment failure rather than a default
 *   CREATE_PROJECT    `title`
 *   CREATE_CHALLENGE  `title`
 *   CHANGE_PLAN       `planCode` (or `plan`) — a plan CODE, not a plan id
 *
 * `VERIFY_CHALLENGE_ENTRY` is listed too, for a different reason: its payload
 * is optional (`accept` defaults to true when absent) but its SUBJECT must be a
 * challenge ENTRY id — not a challenge id — which no general form can collect.
 */
export const MOTION_KINDS_NEEDING_STRUCTURED_PAYLOAD: readonly CircleMotionKind[] = [
  'AMEND_RULES',
  'CHANGE_JOIN_MODE',
  'SET_DISCOVERABLE',
  'CREATE_PROJECT',
  'CREATE_CHALLENGE',
  'CHANGE_PLAN',
  'VERIFY_CHALLENGE_ENTRY',
] as const;

export function motionKindNeedsStructuredPayload(kind: CircleMotionKind): boolean {
  return MOTION_KINDS_NEEDING_STRUCTURED_PAYLOAD.includes(kind);
}

/**
 * `payloadJson` for a motion that carries no kind-specific arguments.
 *
 * Returns `undefined`, not `'{}'`. Both are accepted, but an absent payload is
 * what the column means for a kind that has nothing to say, and an empty object
 * in the audit trail reads as "someone tried to configure this and sent
 * nothing".
 */
export function emptyMotionPayload(): string | undefined {
  return undefined;
}
