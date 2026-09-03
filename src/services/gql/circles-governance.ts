import { gql } from '@apollo/client';

/**
 * @fileoverview GraphQL operations for the two read-only governance screens —
 * the decision history (audit trail) and the governance rules view.
 * @module services/gql/circles-governance
 *
 * Mirrors `services/api-gateway/src/circle/circle-governance.resolver.ts`.
 *
 * ── WHY A SEPARATE FILE FROM `circles.ts` ───────────────────────────────────
 * `circles.ts` is the shared operation set for the whole feature. These two
 * documents are read by exactly two screens, and `CIRCLE_GOVERNANCE_RULES`
 * already lives there and is deliberately NOT duplicated here — the history
 * screen imports it. Only the two operations that had no home are new.
 *
 * ── BOTH QUERIES ARE MEMBER-GATED, NOT LEAD-GATED ───────────────────────────
 * The gateway calls `assertCircleMember` on both. A circle's own record of how
 * it decided things belongs to everyone in it, and a non-member gets the same
 * quiet refusal they get for a motion — not a distinct "forbidden" that would
 * confirm the circle exists.
 */

/**
 * A governance rule, all versions sharing one shape.
 *
 * `supersededAt` is what separates history from the present: null on the ONE
 * live row per motion kind, set on every version it replaced. `version` and
 * `createdByMotionId` are how a past decision is re-checked — a motion pins
 * `ruleId` + `ruleVersion` at open time, and these fields are the other half of
 * that lookup.
 */
export const CIRCLE_GOVERNANCE_RULE_FRAGMENT = gql`
  fragment CircleGovernanceRuleFields on CircleGovernanceRule {
    id
    circleId
    version
    motionKind
    quorumNumerator
    quorumDenominator
    majorityNumerator
    majorityDenominator
    votingWindowHours
    proposerRole
    tieBreaksTo
    createdByMotionId
    effectiveFrom
    supersededAt
  }
`;

/**
 * Every version of every rule this circle has ever had, superseded rows
 * included.
 *
 * Distinct from `CIRCLE_GOVERNANCE_RULES` in `circles.ts`, which returns only
 * the live row per motion kind. Use that one to state what a NEW motion would
 * be bound by; use this one to show how the circle's own constitution changed.
 * Neither may be used to render a motion already in flight — that reads the
 * PINNED block on the motion itself.
 */
export const CIRCLE_GOVERNANCE_RULE_HISTORY = gql`
  query CircleGovernanceRuleHistory($circleId: ID!) {
    circleGovernanceRuleHistory(circleId: $circleId) {
      ...CircleGovernanceRuleFields
    }
  }
  ${CIRCLE_GOVERNANCE_RULE_FRAGMENT}
`;

/**
 * One link in the hash-chained trail.
 *
 * `hash` / `prevHash` are selected even though no screen prints them in full:
 * they are what a member can copy out to check the chain independently, and a
 * trail whose links cannot be exported is a trail you have to take on trust.
 *
 * `actorUserId` is nullable — GDPR erasure nulls it, and it is deliberately
 * outside the hash preimage so the chain survives that. Never treat null as an
 * error, and never treat it as "erased" without checking the event type first
 * (a tally has no actor because nobody acted).
 */
export const CIRCLE_AUDIT_EVENT_FRAGMENT = gql`
  fragment CircleAuditEventFields on CircleAuditEvent {
    id
    circleId
    seq
    eventType
    actorUserId
    subjectType
    subjectId
    payloadJson
    hash
    prevHash
    occurredAt
  }
`;

/**
 * The circle's decision history, plus the chain verdict for it.
 *
 * ── PAGING IS A KEYSET, NOT AN OFFSET ───────────────────────────────────────
 * `afterSeq` means "events BELOW this seq". Rows arrive `seq` DESC, so the next
 * page is fetched with the LOWEST seq currently held. Passing a row COUNT here
 * instead would silently drop events from the middle of the trail — the one
 * failure this surface must never have, because completeness is the whole
 * claim. `seq` is int64 and therefore `Float` in the schema; it is an integer.
 *
 * ── `chainVerified` IS NOT DECORATION ───────────────────────────────────────
 * It is a verdict on the entire chain, recomputed server-side from seq 1. It is
 * also `false` (with `events: []`) when circle-service is unreachable, because
 * the gateway will not assert a verification it did not perform. Render the two
 * cases differently — "we could not check" is not "this is broken", and neither
 * is "verified".
 */
export const CIRCLE_AUDIT_TRAIL = gql`
  query CircleAuditTrail($circleId: ID!, $afterSeq: Float, $limit: Int) {
    circleAuditTrail(circleId: $circleId, afterSeq: $afterSeq, limit: $limit) {
      events {
        ...CircleAuditEventFields
      }
      chainVerified
    }
  }
  ${CIRCLE_AUDIT_EVENT_FRAGMENT}
`;
