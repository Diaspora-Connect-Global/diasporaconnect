import type {
  CircleAuditEvent,
  CircleAuditEventKind,
  CircleAuditTrailPage,
} from '@/services/gql/types/circles-governance';

import type { StatusPillVariant } from '@/components/circles/primitives';

/**
 * How each audit event type is presented in the decision log.
 *
 * This module is deliberately pure and free of JSX so the two judgement calls
 * it encodes — what a missing actor MEANS, and what may be published about a
 * ballot — are readable in one place rather than scattered through render code.
 */

// ---------------------------------------------------------------------------
// Actors
// ---------------------------------------------------------------------------

/**
 * What a NULL `actorUserId` means, per event type. Getting this wrong is not a
 * cosmetic bug — it either invents a data-protection erasure that never
 * happened, or hides one that did.
 *
 * `actorUserId` sits outside the hash preimage precisely so a GDPR erasure can
 * null it without breaking the chain. But circle-service also writes null where
 * NOBODY ACTED, and the two are indistinguishable from the column alone:
 *
 *  - `'erased'`   — a human acted here (proposed, voted, withdrew, minted a
 *                   link, suspended the circle). Null therefore means the actor
 *                   has since exercised their right to erasure. Say so plainly.
 *  - `'none'`     — nobody acted, by design. A tally is arithmetic over ballots
 *                   already cast; an expiry is a clock; an enactment applies a
 *                   decision the circle already made; a rule amendment is
 *                   authored by the motion, which is already the subject.
 *                   Naming an actor here would suggest the platform decided
 *                   something, which is the one claim this trail exists to
 *                   refute.
 *  - `'optional'` — the actor is genuinely optional upstream, so an absence is
 *                   not evidence of anything. Print no actor line at all rather
 *                   than guessing between the two meanings above.
 */
type ActorRule = 'erased' | 'none' | 'optional';

/** Tone of the entry marker. Never `success`/`danger` for a merely-recorded fact. */
type EntryTone = Extract<StatusPillVariant, 'neutral' | 'brand' | 'warning' | 'danger'>;

export interface AuditEventSpec {
  /** Key under `circles.history.events`. */
  labelKey: string;
  tone: EntryTone;
  actor: ActorRule;
  /**
   * Whether the PLATFORM wrote this row about the circle, rather than the
   * circle writing about itself. The whole vocabulary is designed so this is
   * answerable by filtering `eventType` alone — do not infer it any other way.
   */
  platform?: true;
  /**
   * Suppress the actor and every payload detail, whatever the row contains.
   *
   * Only `MOTION_VOTE_CAST` sets this, and it is the most important line in the
   * file. The row DOES carry `actorUserId` (the voter) and a `choice` in its
   * payload — the hash chain needs a complete record, so circle-service writes
   * one. But individual ballots are NOT PUBLISHED: the product exposes an
   * aggregate tally and offers no query for who voted which way, deliberately.
   * Rendering the voter and their choice here would rebuild that roster through
   * a side door and quietly break the secret ballot.
   *
   * The row itself is still shown, with its seq and its timestamp. Hiding it
   * would open a visible gap in a gap-free sequence, and a decision log that
   * silently omits links is worth less than one that says "recorded, not
   * published".
   */
  redacted?: true;
}

export const AUDIT_EVENT_SPEC: Record<CircleAuditEventKind, AuditEventSpec> = {
  MOTION_OPENED: { labelKey: 'motionOpened', tone: 'brand', actor: 'erased' },
  MOTION_VOTE_CAST: {
    labelKey: 'voteCast',
    tone: 'neutral',
    actor: 'erased',
    redacted: true,
  },
  MOTION_TALLIED: { labelKey: 'motionTallied', tone: 'brand', actor: 'none' },
  MOTION_WITHDRAWN: { labelKey: 'motionWithdrawn', tone: 'neutral', actor: 'erased' },
  MOTION_EXPIRED: { labelKey: 'motionExpired', tone: 'neutral', actor: 'none' },
  MOTION_ENACTED: { labelKey: 'motionEnacted', tone: 'brand', actor: 'none' },
  MOTION_ENACTMENT_FAILED: {
    labelKey: 'motionEnactmentFailed',
    tone: 'warning',
    actor: 'none',
  },
  GOVERNANCE_RULE_AMENDED: { labelKey: 'ruleAmended', tone: 'brand', actor: 'none' },
  ENTITLEMENT_LOCK_HIT: { labelKey: 'limitReached', tone: 'warning', actor: 'optional' },

  INVITE_LINK_MINTED: { labelKey: 'inviteLinkMinted', tone: 'neutral', actor: 'erased' },
  INVITE_LINK_REVOKED: { labelKey: 'inviteLinkRevoked', tone: 'neutral', actor: 'erased' },
  INVITE_LINK_REDEEMED: { labelKey: 'inviteLinkRedeemed', tone: 'neutral', actor: 'erased' },

  CIRCLE_SUSPENDED: {
    labelKey: 'circleSuspended',
    tone: 'warning',
    actor: 'erased',
    platform: true,
  },
  CIRCLE_UNSUSPENDED: {
    labelKey: 'circleUnsuspended',
    tone: 'neutral',
    actor: 'erased',
    platform: true,
  },
  CIRCLE_DISSOLVED_BY_PLATFORM: {
    labelKey: 'circleDissolved',
    tone: 'danger',
    actor: 'erased',
    platform: true,
  },
};

/**
 * The spec for an event type, tolerating one this build has never heard of.
 *
 * A newer circle-service can add to the vocabulary at any time, and an
 * unrecognised row must still appear: dropping it would put a hole in a
 * gap-free sequence, which reads as tampering. The fallback is deliberately
 * conservative — neutral tone, no actor claim, nothing published — because we
 * cannot know whether the unknown event carries a ballot.
 */
export function specFor(eventType: string): AuditEventSpec {
  return (
    AUDIT_EVENT_SPEC[eventType as CircleAuditEventKind] ?? {
      labelKey: 'unknown',
      tone: 'neutral' as const,
      actor: 'optional' as const,
      redacted: true as const,
    }
  );
}

// ---------------------------------------------------------------------------
// The chain verdict
// ---------------------------------------------------------------------------

/**
 * Three states, and they are three for a reason.
 *
 *  - `VERIFIED`  — circle-service recomputed every hash from seq 1 and the
 *                  chain holds.
 *  - `BROKEN`    — it recomputed and found a break: either a row's contents
 *                  changed (hash mismatch) or a row is gone (sequence gap).
 *                  This is the finding the whole feature exists to surface, so
 *                  it is stated at the top of the screen, not tucked away.
 *  - `UNCHECKED` — nothing was verified. The gateway returns
 *                  `{ events: [], chainVerified: false }` when circle-service
 *                  is unreachable, on the principle that an unverified empty
 *                  page is honest and a `true` we never earned is a lie.
 *
 * The discrimination is sound rather than a guess: `verifyChain` over zero rows
 * returns valid, so a genuinely empty trail comes back `chainVerified: true`.
 * `false` with no events therefore only happens on the unreachable path.
 *
 * Collapsing `UNCHECKED` into `BROKEN` would cry tampering every time a service
 * restarts; collapsing it into `VERIFIED` would present an unchecked page as
 * proof. Neither is acceptable, so there are three.
 */
export type ChainVerdict = 'VERIFIED' | 'BROKEN' | 'UNCHECKED';

export function chainVerdict(page: CircleAuditTrailPage | null | undefined): ChainVerdict {
  if (!page) return 'UNCHECKED';
  if (page.chainVerified) return 'VERIFIED';
  return page.events.length > 0 ? 'BROKEN' : 'UNCHECKED';
}

// ---------------------------------------------------------------------------
// Payload
// ---------------------------------------------------------------------------

/**
 * The few scalars worth reading out of `payloadJson`.
 *
 * Not the whole payload: it is a serialised domain event whose shape differs
 * per event type and grows over time, and it is inside the hash preimage, so
 * anything it happens to contain is permanent. Read the handful of fields that
 * make a row legible and ignore the rest.
 */
export interface AuditPayloadFacts {
  /** `CircleMotionKind` of the motion this row concerns, where the payload carries one. */
  kind?: string;
  /** The motion's title, on `MOTION_OPENED`. */
  title?: string;
  /** Why a tally landed where it did, or why enactment failed. */
  reason?: string;
  /** Set on platform-written rows: the admin's stated reason. */
  error?: string;
  /** `'PLATFORM_ADMIN'` on oversight rows. */
  source?: string;
  /** The motion kind whose rule was amended, on `GOVERNANCE_RULE_AMENDED`. */
  motionKind?: string;
}

const STRING_FACTS = [
  'kind',
  'title',
  'reason',
  'error',
  'source',
  'motionKind',
] as const satisfies readonly (keyof AuditPayloadFacts)[];

/**
 * Parse `payloadJson` defensively.
 *
 * Never throws and never returns anything but trimmed strings: the value
 * crosses two service boundaries as an opaque string, and one malformed row
 * must not blank the whole log. Values are length-capped because a payload
 * field is not a UI string and has no length contract.
 */
export function readAuditPayload(
  payloadJson: string | null | undefined,
): AuditPayloadFacts {
  if (!payloadJson) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadJson);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

  const source = parsed as Record<string, unknown>;
  const out: AuditPayloadFacts = {};
  for (const key of STRING_FACTS) {
    const value = source[key];
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) out[key] = trimmed.slice(0, 160);
  }
  return out;
}

/**
 * The motion this entry belongs to, or null.
 *
 * Every governance row — including a membership change, which reaches the trail
 * as `MOTION_ENACTED` on a REMOVE_MEMBER motion — is written with
 * `subjectType: 'MOTION'` and the motion id as the subject. That is the link
 * back to the vote: "the circle decided this, and here is the count".
 *
 * Platform rows carry `subjectType: 'CIRCLE'` and an explicit `motionId: null`
 * in their payload, so they resolve to null here and correctly offer no link —
 * no vote authorised them, and implying one would be the exact
 * misrepresentation this screen is meant to prevent.
 */
export function motionIdFor(event: CircleAuditEvent): string | null {
  if (event.subjectType !== 'MOTION') return null;
  const id = (event.subjectId ?? '').trim();
  return id || null;
}

/**
 * The cursor for the next (older) page.
 *
 * `afterSeq` is a KEYSET — "events below this seq" — and rows arrive `seq`
 * DESC, so the cursor is the LOWEST seq held, not the number of rows held.
 * Passing a count would page positionally over a descending scan and silently
 * drop entries from the middle of the trail.
 */
export function nextCursor(events: readonly CircleAuditEvent[]): number | null {
  if (events.length === 0) return null;
  const lowest = events.reduce(
    (min, event) => (event.seq < min ? event.seq : min),
    events[0].seq,
  );
  return lowest > 1 ? lowest : null;
}
