/**
 * @fileoverview Types for the two READ-ONLY governance screens: the decision
 * history (audit trail) and the governance rules view.
 * @module services/gql/types/circles-governance
 *
 * Split out of `types/circles.ts` rather than appended to it. That file is the
 * shared surface for the whole Circles feature and several screens are built
 * against it concurrently; these two screens add a vocabulary (the audit event
 * types, the chain verdict) that nothing else reads.
 *
 * The conventions of `types/circles.ts` apply here unchanged and are not
 * repeated — read its header first. The three that bite on these screens:
 *
 *   1. Enum values travel as BARE domain strings (`ACTIVE`, `OPEN`), NOT the
 *      prefixed proto enum names. Neither query here takes a status filter, so
 *      the `*StatusFilter` exception documented there does not arise.
 *   2. `seq` is int64 on the proto and therefore GraphQL `Float`. It is still
 *      an INTEGER — a gap-free counter from 1. Never format it as a decimal.
 *   3. Timestamps are ISO-8601 strings, already normalised by the gateway.
 */

import type { CircleGovernanceRule } from './circles';

// ============================================================================
// AUDIT EVENT VOCABULARY
// ============================================================================

/**
 * The `event_type` vocabulary written to `circle_audit_event`, mirrored from
 * circle-service's frozen `CircleAuditEventType` map
 * (infrastructure/database/repositories/audit-trail.repository.ts).
 *
 * Modelled as a closed union for the usual reason — a `Record<CircleAuditEventKind, …>`
 * lookup then fails to compile when a value is added rather than silently
 * rendering a blank row. Renderers must STILL fall back at runtime for a value
 * from a newer circle-service; see `auditEventCopy.ts`.
 *
 * ── THE PLATFORM/CIRCLE SPLIT IS THE POINT OF THE VOCABULARY ────────────────
 * The last three are the only events the PLATFORM writes about a circle rather
 * than the circle writing about itself. `CIRCLE_DISSOLVED_BY_PLATFORM` in
 * particular is NOT a circle voting to dissolve itself — that appears as
 * `MOTION_ENACTED` carrying a DISSOLVE_CIRCLE motion. Reading "did this circle
 * govern itself, or was it interfered with?" off this field alone is the
 * question the whole trail exists to answer, so never collapse the two.
 */
export type CircleAuditEventKind =
  // Governance — the circle acting on itself
  | 'MOTION_OPENED'
  | 'MOTION_VOTE_CAST'
  | 'MOTION_TALLIED'
  | 'MOTION_WITHDRAWN'
  | 'MOTION_EXPIRED'
  | 'MOTION_ENACTED'
  | 'MOTION_ENACTMENT_FAILED'
  | 'GOVERNANCE_RULE_AMENDED'
  | 'ENTITLEMENT_LOCK_HIT'
  // Shareable invite links — a door the circle cannot watch, so all three are recorded
  | 'INVITE_LINK_MINTED'
  | 'INVITE_LINK_REVOKED'
  | 'INVITE_LINK_REDEEMED'
  // Platform oversight — the only events the platform writes about a circle
  | 'CIRCLE_SUSPENDED'
  | 'CIRCLE_UNSUSPENDED'
  | 'CIRCLE_DISSOLVED_BY_PLATFORM';

/**
 * Known `subjectType` values. Deliberately NOT the type of the field.
 *
 * `subjectType` is a free string on both the proto and the gateway DTO, and
 * `openCircleMotion` forwards whatever the client sent, so circle-service can
 * legitimately store a value this list does not know. It is exported for
 * comparisons, not for typing the column.
 */
export const CIRCLE_AUDIT_SUBJECT_TYPE = {
  MOTION: 'MOTION',
  CIRCLE: 'CIRCLE',
  MEMBER: 'MEMBER',
  PROJECT: 'PROJECT',
  CHALLENGE: 'CHALLENGE',
  CHALLENGE_ENTRY: 'CHALLENGE_ENTRY',
  INVITATION: 'INVITATION',
  INVITE_LINK: 'INVITE_LINK',
  STORAGE_OBJECT: 'STORAGE_OBJECT',
} as const;

/**
 * One link in the circle's hash-chained, append-only trail.
 *
 * ── `actorUserId` IS NULLABLE AND THAT IS A FEATURE ─────────────────────────
 * It sits OUTSIDE the hash preimage — the chain covers (prevHash, circleId,
 * seq, eventType, subjectType, subjectId, payload, occurredAt) and nothing
 * else — so a GDPR erasure can `SET actor_user_id = NULL` and every downstream
 * hash still verifies. Include it in the preimage and "immutable audit" and
 * "right to erasure" become mutually exclusive.
 *
 * So a null actor is never an error, and it means one of two different things
 * depending on the event type. See `auditEventCopy.ts::ACTOR_RULE` — some
 * events (a tally, an expiry, an enactment, a rule amendment) have NO human
 * actor by design, and printing "erased" on those would invent a deletion that
 * never happened.
 */
export interface CircleAuditEvent {
  id: string;
  circleId: string;
  /** int64, gap-free from 1 per circle. A gap is itself evidence of tampering. */
  seq: number;
  eventType: CircleAuditEventKind;
  /** Null after a GDPR erasure, or where no human acted. The chain still verifies. */
  actorUserId?: string | null;
  /** Free string. `'MOTION'` on every governance row — see `CIRCLE_AUDIT_SUBJECT_TYPE`. */
  subjectType?: string | null;
  subjectId?: string | null;
  /**
   * The domain event payload, serialised. INSIDE the hash preimage, so it can
   * never be edited or removed — which is also why circle-service never writes
   * a credential into it.
   *
   * Untrusted-shaped from this layer's point of view: it is whichever domain
   * payload produced the row, and the set grows. Parse defensively
   * (`readAuditPayload`), never `JSON.parse` it inline.
   */
  payloadJson?: string | null;
  hash?: string | null;
  prevHash?: string | null;
  occurredAt?: string | null;
}

/**
 * A page of the trail plus the chain verdict.
 *
 * ── `chainVerified` IS THE LOAD-BEARING FIELD ───────────────────────────────
 * It is a verdict on the circle's WHOLE chain, not just the rows in `events`:
 * circle-service recomputes every hash from seq 1 and reports the first break,
 * checking both failure modes (a hash mismatch = a row's contents changed; a
 * sequence gap = a row is gone).
 *
 * `false` is ALSO what the gateway returns when circle-service is unreachable,
 * with `events: []` — an unverified empty page is honest, whereas `true` on a
 * page nobody checked would be a lie about the one thing the feature exists to
 * guarantee. The two cases are distinguishable and must be rendered
 * differently; see `chainVerdict()`.
 */
export interface CircleAuditTrailPage {
  events: CircleAuditEvent[];
  chainVerified: boolean;
}

// ============================================================================
// QUERY RESULTS
// ============================================================================

export interface CircleAuditTrailData {
  circleAuditTrail: CircleAuditTrailPage;
}

export interface CircleAuditTrailVariables {
  circleId: string;
  /**
   * KEYSET cursor, not an offset: "events BELOW this seq". Rows come back
   * `seq` DESC (newest first), so paging to older entries means passing the
   * LOWEST seq on the page you already have.
   *
   * GraphQL `Float` because `seq` is int64. Still an integer.
   */
  afterSeq?: number | null;
  /** circle-service defaults to 50 and clamps at 200. */
  limit?: number | null;
}

/**
 * EVERY version of every rule, superseded ones included — not just the live
 * row per motion kind that `circleGovernanceRules` returns.
 *
 * This is what makes a past decision re-checkable: a motion pins `ruleId` +
 * `ruleVersion` when it opens, and this is how that version is looked up
 * afterwards. Rules are versioned and never updated in place, so a superseded
 * row is a historical fact, not stale data.
 */
export interface CircleGovernanceRuleHistoryData {
  circleGovernanceRuleHistory: CircleGovernanceRule[];
}

export interface CircleGovernanceRuleHistoryVariables {
  circleId: string;
}
