/**
 * @fileoverview Types for the Circle CREATION flows — start a project, add a
 * goal, run a challenge, submit an entry, propose a motion.
 * @module services/gql/types/circles-actions
 *
 * A companion to `./circles`, not a replacement. Every entity type
 * (`CircleProject`, `CircleChallenge`, `CircleMotion`, `CircleEntitlements`, …)
 * and every operation shape those flows send is ALREADY declared there and is
 * imported here read-only. This file adds only what creation introduced and
 * `./circles` does not have.
 *
 * Nothing here re-declares an operation. `./circles` already carries
 * `CreateCircleProjectData`, `AddCircleProjectGoalData`,
 * `CreateCircleChallengeData`, `ActivateCircleChallengeData`,
 * `SubmitCircleChallengeEntryData` and `OpenCircleMotionData` with their
 * `*Variables` twins — a second spelling of one contract is how the two drift.
 *
 * ── WHAT IS ACTUALLY NEW HERE ───────────────────────────────────────────────
 *
 *  1. `CircleVerificationModeInput` — the SEND-direction spelling of the
 *     verification mode, which is not the read-back spelling. See below; this
 *     is the one contract `./circles` gets wrong for writes.
 *  2. `CreateCircleChallengeActionInput` / `…Variables` — the create-challenge
 *     input retyped with (1), because `./circles`' version cannot be sent.
 *  3. `CircleGoalDraft` / `CircleChallengeDraft` / `CircleMotionDraft` — the
 *     in-form state shapes, which are not wire shapes: every field is a string
 *     because it came out of an `<input>`, and validation turns them into the
 *     wire input.
 *  4. `CircleActionRoute` / `CircleActionPolicy` — the direct-or-motion verdict
 *     that `circleGovernanceRules` plus `circleEntitlements` produce together.
 *
 * ── VERIFICATION MODE TRAVELS UNDER TWO DIFFERENT NAMES ─────────────────────
 * `./circles` declares `CircleVerificationMode = 'HONOUR' | 'LEAD' | 'CIRCLE'`,
 * and for READING a challenge back that is correct — circle-service serialises
 * its `VerificationModeValue` domain enum, whose members are those bare words.
 *
 * It is NOT what a write may send. `createCircleChallenge` takes an
 * `@InputType` whose `verificationMode` field is declared
 * `@Field(() => CircleVerificationMode)` — a REGISTERED GraphQL enum, and the
 * gateway registered it from `circle.proto`, where the members are prefixed:
 *
 *     enum VerificationMode { HONOUR = 1; LEAD_CONFIRMS = 2; CIRCLE_CONFIRMS = 3; }
 *
 * GraphQL validates an enum argument against the registered members before any
 * resolver runs, so sending the bare `'LEAD'` is rejected outright as "Value
 * 'LEAD' does not exist in 'CircleVerificationMode' enum". The prefixed name is
 * the only spelling that reaches the gateway at all.
 *
 * This is EXACTLY the asymmetry `./circles`' ENUMS header documents for status
 * filters — read back bare, send prefixed — and the `*StatusFilter` types are
 * its precedent. `CircleVerificationModeInput` is the same idea for the one
 * enum that is an INPUT rather than a filter, and it is why this type is a
 * separate name instead of a "fix" to `CircleVerificationMode`: the read type
 * is right for reads and must not move.
 *
 * ⚠ KNOWN BACKEND DEFECT — TWO OF THE THREE MODES CANNOT SUCCEED TODAY.
 * The prefixed name passes GraphQL validation and is then forwarded to
 * circle-service VERBATIM (`verification_mode: String(input.verificationMode)`
 * in `circle.resolver.ts`), where `VerificationMode.create()` accepts only
 * `HONOUR | LEAD | CIRCLE` and `circle_challenge.verification_mode` has
 * `CHECK (verification_mode IN ('HONOUR','LEAD','CIRCLE'))`. So:
 *
 *     HONOUR           → identical in both vocabularies. Works.
 *     LEAD_CONFIRMS    → refused by circle-service ("unknown value").
 *     CIRCLE_CONFIRMS  → refused by circle-service ("unknown value").
 *
 * The client cannot route around it: the bare word the domain wants is not a
 * member of the GraphQL enum, and the prefixed word the schema wants is not a
 * member of the domain enum. The fix is a wire map in the gateway's
 * `dto/enum-wire.ts` — which today lists `CircleVerificationMode` among the
 * enums that "need no translation", the assumption this defect disproves. Until
 * that lands, the creation form still OFFERS all three (the product decision is
 * the circle's to make and hiding two modes would silently redefine it) and
 * reports the refusal in circle-service's own words.
 */

import type {
  CircleChallengeCadence,
  CircleEntitlementKey,
  CircleEntitlements,
  CircleGoalScope,
  CircleGovernanceRule,
  CircleMemberRole,
  CircleMetricKind,
  CircleMotionKind,
} from './circles';

// ============================================================================
// ENUMS — send direction
// ============================================================================

/**
 * The spelling `createCircleChallenge`'s `verificationMode` argument requires.
 *
 * Prefixed, because it is a registered GraphQL enum argument. See the file
 * header — this is the write twin of `CircleVerificationMode`, which stays
 * bare for reads, and the pair must not be collapsed.
 */
export type CircleVerificationModeInput =
  | 'HONOUR'
  | 'LEAD_CONFIRMS'
  | 'CIRCLE_CONFIRMS';

/**
 * The three modes in creation order, safest first.
 *
 * HONOUR leads because it is the only mode that both works end-to-end today
 * (see the header) and needs nobody else to act before an entry counts. The
 * order is editorial and load-bearing for the form's default.
 */
export const CIRCLE_VERIFICATION_MODE_ORDER: readonly CircleVerificationModeInput[] =
  ['HONOUR', 'LEAD_CONFIRMS', 'CIRCLE_CONFIRMS'] as const;

/**
 * Cadence options in creation order.
 *
 * ONE_OFF first: it is the only cadence with no recurring period key, so it is
 * the one a member picking without reading gets right by accident.
 */
export const CIRCLE_CHALLENGE_CADENCE_ORDER: readonly CircleChallengeCadence[] = [
  'ONE_OFF',
  'DAILY',
  'WEEKLY',
  'MONTHLY',
] as const;

/**
 * Metric kinds offered when adding a goal.
 *
 * BOOLEAN is deliberately absent. `addCircleProjectGoal` requires a positive
 * `targetValue` (circle-service runs `assertStorableMetric(Number(targetValue))`
 * and the column carries `CHECK (target_value > 0)`), so a done/not-done goal
 * has no target to ask for and would only produce a refusal after the form was
 * filled in. A COUNT goal with a target of 1 expresses the same thing and works.
 */
export const CIRCLE_GOAL_METRIC_ORDER: readonly CircleMetricKind[] = [
  'COUNT',
  'AMOUNT',
  'DURATION',
] as const;

// ============================================================================
// OPERATION SHAPES — create challenge, retyped for the send direction
// ============================================================================

/**
 * `createCircleChallenge`'s input, with `verificationMode` in the spelling the
 * schema accepts.
 *
 * Identical to `./circles`' `CreateCircleChallengeInput` in every other field.
 * It exists only because that one has `verificationMode?: CircleVerificationMode`
 * — the read spelling — which GraphQL rejects on the way in.
 */
export interface CreateCircleChallengeActionInput {
  circleId: string;
  title: string;
  description?: string | null;
  /**
   * IMMUTABLE once the challenge leaves DRAFT — `activateCircleChallenge` is
   * what freezes it, so this is the last moment it can be chosen.
   */
  verificationMode?: CircleVerificationModeInput | null;
  cadence?: CircleChallengeCadence | null;
  pointsPerEntry?: number | null;
  maxEntriesPerPeriod?: number | null;
  /** ISO-8601. */
  startsAt?: string | null;
  endsAt?: string | null;
  /**
   * ADVISORY ONLY on this operation. Unlike challenge entries, contributions
   * and motions, `circle_challenge` has no unique index behind the key, so a
   * retry creates a SECOND DRAFT rather than collapsing into the first
   * (`create-challenge.handler.ts`: "do not describe it to clients as
   * idempotent"). Sent anyway so the audit trail can correlate the attempts.
   */
  idempotencyKey?: string | null;
}

export interface CreateCircleChallengeActionVariables {
  input: CreateCircleChallengeActionInput;
}

// ============================================================================
// FORM DRAFTS — what the inputs hold, before validation
// ============================================================================

/**
 * The new-project form's state.
 *
 * `startsOn` / `dueOn` are `YYYY-MM-DD` straight from `<input type="date">`,
 * which is already the calendar-date shape the wire wants — no parsing, no
 * timezone. An empty string means "not set" and is dropped rather than sent.
 */
export interface CircleProjectDraft {
  title: string;
  description: string;
  startsOn: string;
  dueOn: string;
}

/**
 * The add-goal form's state.
 *
 * `targetValue` is the RAW string the member typed, in MAJOR units for an
 * AMOUNT goal. The major→minor ×100 happens exactly once, at submit, through
 * `parseGoalTargetValue` — the same single-conversion rule
 * `components/circles/project/metric.ts` already applies to contributions.
 *
 * `unit` carries two different things depending on `metricKind`, which is the
 * whole reason the two are captured together: for AMOUNT it is the ISO-4217
 * currency code, for COUNT / DURATION it is a plain word ("km", "books").
 */
export interface CircleGoalDraft {
  scope: CircleGoalScope;
  /** Required if and only if `scope` is INDIVIDUAL; must be blank when SHARED. */
  assigneeUserId: string;
  metricKind: CircleMetricKind;
  /** ISO-4217 code when `metricKind` is AMOUNT, otherwise a free-text unit. */
  unit: string;
  /** Major units for AMOUNT; a decimal metric string otherwise. */
  targetValue: string;
  dueOn: string;
}

/**
 * The new-challenge form's state.
 *
 * `pointsPerEntry` and `maxEntriesPerPeriod` are strings because they come from
 * `<input type="number">`, whose `value` is a string and is `''` — not `0` —
 * when the field is empty. Reading them as numbers directly is how an empty
 * field becomes a challenge worth zero points.
 */
export interface CircleChallengeDraft {
  title: string;
  description: string;
  verificationMode: CircleVerificationModeInput;
  cadence: CircleChallengeCadence;
  pointsPerEntry: string;
  maxEntriesPerPeriod: string;
  /** `YYYY-MM-DD`; widened to an ISO-8601 instant at submit. */
  startsAt: string;
  endsAt: string;
}

/** The propose-a-motion form's state. */
export interface CircleMotionDraft {
  kind: CircleMotionKind;
  title: string;
  rationale: string;
}

/** The submit-an-entry form's state. */
export interface CircleEntryDraft {
  claimValue: string;
  note: string;
  evidenceUrl: string;
}

// ============================================================================
// POLICY — direct, or a motion?
// ============================================================================

/**
 * How a member may perform one governed action right now.
 *
 *   `direct`  perform it immediately — `createCircleProject` and friends are
 *             MEMBER-gated at the gateway and circle-service does not consult a
 *             governance rule on the direct path.
 *   `motion`  put it to the circle with `openCircleMotion`, bound by the rule.
 *   `blocked` neither is available, and `reason` says which wall was hit.
 */
export type CircleActionRoute = 'direct' | 'motion' | 'blocked';

/** Why an action is unavailable. Ordered from most to least recoverable. */
export type CircleActionBlockReason =
  /** At the entitlement cap. New ones refused; running ones untouched. */
  | 'ENTITLEMENT_LOCKED'
  /** The rule for this kind reserves proposing to LEADs and the viewer is not one. */
  | 'PROPOSER_ROLE'
  /** Motions need an ACTIVE circle — DORMANT withholds exactly this. */
  | 'CIRCLE_NOT_ACTIVE'
  /** Not an active member of this circle. */
  | 'NOT_A_MEMBER'
  /** No live governance rule for this kind, so no motion can be opened. */
  | 'NO_RULE';

/**
 * The verdict for one `CircleMotionKind`, assembled from the circle's live
 * governance rule, the viewer's standing and the entitlement usage.
 *
 * Both routes are reported rather than one being chosen, because they are a
 * genuine choice a member makes — "start it now" and "put it to the circle" are
 * different acts with different weight, and collapsing them into whichever the
 * code prefers would take that decision away from the circle. The rule is
 * carried through so the motion option can state what a vote would require
 * before it is picked.
 */
export interface CircleActionPolicy {
  kind: CircleMotionKind;
  /** True when the direct mutation is available to this viewer. */
  canActDirectly: boolean;
  /** True when this viewer may open a motion of this kind. */
  canOpenMotion: boolean;
  /** Set when NEITHER route is open. */
  blockedBy: CircleActionBlockReason | null;
  /** The live rule, for previewing what a vote would be bound by. Null if absent. */
  rule: CircleGovernanceRule | null;
  /** Remaining allowance for the cap this action consumes, when it has one. */
  allowance: CircleAllowance | null;
}

/**
 * Remaining headroom under one entitlement cap, read BEFORE a form is filled in.
 *
 * ── `hasLimit: false` MEANS UNLIMITED, NOT ZERO ─────────────────────────────
 * That is the platform-wide rule on both `CircleEntitlement.hasIntValue` and
 * `CircleEntitlementUsage.hasLimit`, and it has a trap behind it: when the flag
 * is false the numeric field still arrives as `0` on the wire. Code that reads
 * `limit` first therefore turns the most generous plan into the one that can do
 * nothing. `remaining` is null — never 0 — for the unlimited case so the
 * distinction cannot be lost downstream.
 */
export interface CircleAllowance {
  key: CircleEntitlementKey;
  /** Live COUNT of what is in use. */
  current: number;
  /** Null when unlimited. */
  limit: number | null;
  /** Null when unlimited. Zero means the next attempt is refused. */
  remaining: number | null;
  /** Server's own verdict: usage is at or over the cap. */
  locked: boolean;
}

/** What `buildCircleActionPolicy` needs to reach a verdict. */
export interface CircleActionPolicyInput {
  kind: CircleMotionKind;
  rules: CircleGovernanceRule[] | null | undefined;
  entitlements: CircleEntitlements | null | undefined;
  /** The cap this action consumes, if any. */
  entitlementKey?: CircleEntitlementKey | null;
  isMember: boolean;
  isLead: boolean;
  /** circle-service's own advisory verdict from `myCircleMembership`. */
  canPropose: boolean;
  /** Motions require ACTIVE specifically — DORMANT is not enough. */
  circleIsActive: boolean;
  /** Direct creation needs a LIVE circle: ACTIVE or DORMANT. */
  circleIsLive: boolean;
}

/** Roles a rule may reserve proposing to. Re-exported for the policy helper. */
export type CircleProposerRole = CircleMemberRole;

// ============================================================================
// WRITE OUTCOMES
// ============================================================================

/**
 * The result of one mutation, after the check that this app's Apollo defaults
 * make mandatory.
 *
 * ── WHY THIS TYPE EXISTS AT ALL ─────────────────────────────────────────────
 * `lib/graph-client.ts` sets `defaultOptions.mutate.errorPolicy = 'all'`. Under
 * that policy a FAILED mutation RESOLVES — it does not reject — handing back
 * `{ data: null, error }`. So `try { await mutate() } catch { … }` never runs
 * its catch, and any `toast.success` after the await fires on failure too. The
 * only reliable signal is whether `data` came back non-null.
 *
 * ── A DISCRIMINATED UNION, NOT A STRUCT WITH A BOOLEAN ──────────────────────
 * `{ ok: boolean; data: T | null }` would compile and then force every caller
 * to re-check `data` after already checking `ok` — or, far more likely, to
 * silence the null with `!` and reintroduce the exact crash this type exists to
 * prevent. Discriminating on `ok` makes `if (!outcome.ok) return;` narrow
 * `data` to `T`, so the happy path cannot be written without the guard.
 */
export type CircleWriteOutcome<T> =
  | {
      ok: true;
      data: T;
      message: null;
      entitlementLocked: false;
    }
  | {
      ok: false;
      data: null;
      /**
       * circle-service's own sentence when there is one. The gateway's
       * `assertOk` rethrows `res.message` intact. Kept for logging — it is
       * operator English carrying raw UUIDs, so the UI answers from its own
       * translated copy instead. See `governance/mutationOutcome.ts`.
       */
      message: string | null;
      /** True when the refusal was an entitlement cap rather than a real error. */
      entitlementLocked: boolean;
    };
