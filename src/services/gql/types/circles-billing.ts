/**
 * @fileoverview Types for the circle plan & subscription screen.
 * @module services/gql/types/circles-billing
 *
 * A companion to `./circles`, kept in a separate file so the plan screen can be
 * built without touching the shared circles module. Everything here either
 * describes an operation that `./circles` does not carry (`changeCirclePlan`,
 * `cancelCircleSubscription`, the combined screen read) or re-shapes entities
 * that ARE defined there. The entities themselves — `CirclePlan`,
 * `CircleSubscription`, `CircleEntitlements` — are imported, never redeclared:
 * two hand-written copies of one gateway DTO drift, and the drift is invisible
 * because both compile.
 *
 * ── MONEY ───────────────────────────────────────────────────────────────────
 * `amountMinor` is an INTEGER in the currency's lowest denomination (pesewas
 * for GHS, cents for USD). It stays an integer through this entire layer.
 * Divide exactly once, at render, with `formatMoney` from `@/types/money`.
 *
 * A plan is priced deliberately PER CURRENCY and never FX-converted, so a GHS
 * price says nothing about the USD one, and a YEAR price is its own number
 * rather than 12× the MONTH price. Never derive one from another.
 *
 * ── ENUM SPELLING ───────────────────────────────────────────────────────────
 * Values read BACK are bare domain strings (`ACTIVE`, `PAST_DUE`) — see the
 * ENUMS banner in `./circles`. The one value this module SENDS is
 * `ChangeCirclePlanInput.interval`, typed by the gateway as the registered
 * GraphQL enum `CirclePriceInterval`, whose members (`MONTH` / `YEAR` /
 * `ONE_TIME` / `NONE`) happen to be spelled identically to the domain values.
 * So no prefixed variant exists here, and none should be invented: the prefix
 * problem is confined to the `*StatusFilter` types in `./circles`.
 *
 * ── BILLING REALITY ─────────────────────────────────────────────────────────
 * A circle CANNOT be charged today. payment-service has no subscription model
 * and circle-service's billing port is a Noop, so the only routes onto a paid
 * plan are a platform-admin grant and a plan whose price is zero.
 * `changeCirclePlan` against a priced plan fails with a message rather than
 * starting a checkout — there is no checkout to start. The UI must not offer
 * one.
 */

import type {
  CircleEntitlements,
  CircleMembershipCheck,
  CirclePlan,
  CirclePriceInterval,
  CircleSubscription,
} from './circles';

// ============================================================================
// INPUTS
// ============================================================================

/**
 * The one mutation input for moving a circle between plans.
 *
 * There is NO upgrade and NO downgrade. With admin-defined entitlements a
 * costlier tier is not guaranteed to be a superset of a cheaper one — a plan
 * could raise the member cap and drop custom branding — so "direction" is a
 * fiction and no label in this feature may imply one. The operation is
 * `changeCirclePlan`, and every string that describes it says "change".
 *
 * Increases apply immediately. Decreases LOCK rather than evict: a circle over
 * a new cap keeps every member, project and challenge it already has and
 * simply gains no new ones until it is back under. There is deliberately no
 * eviction path in the backend for this to call by accident.
 */
export interface ChangeCirclePlanInput {
  circleId: string;
  planId: string;
  /**
   * ISO-4217. Selects WHICH of the plan's prices applies; it does not convert
   * anything. Omit to let circle-service resolve the plan's own default.
   */
  currency?: string | null;
  /** Omit to let circle-service resolve the plan's own default interval. */
  interval?: CirclePriceInterval | null;
  /**
   * De-duplicates a retried submit. Generate one per user-confirmed attempt —
   * not per render, or a genuine second change would be swallowed as a repeat.
   */
  idempotencyKey?: string | null;
}

// ============================================================================
// QUERY DATA / VARIABLES
// ============================================================================

/**
 * Everything the plan screen reads, in one round trip.
 *
 * The four roots answer four different questions and none substitutes for
 * another:
 *  - `circleSubscription` — what the circle is ON (name, price, status, payer).
 *  - `circleEntitlements` — what that ALLOWS, and what is currently USED. This
 *    is the authority for capability; `subscription.planCode` is display only.
 *  - `circlePlans` — the catalogue, so a member can see the alternatives.
 *  - `myCircleMembership` — whether the viewer is a LEAD, which is the gate on
 *    `changeCirclePlan` / `cancelCircleSubscription` at the gateway.
 *
 * ── NULLABILITY, PRECISELY ──────────────────────────────────────────────────
 * `circleSubscription` and `circleEntitlements` are NULLABLE on the schema and
 * MEMBER-gated: `assertCircleMember` throws for a non-member, which under
 * GraphQL's null propagation nulls just those two fields while the rest of the
 * response survives. `circlePlans` and `myCircleMembership` are NON-NULL, so if
 * either ever throws the whole `data` object is nulled — `myCircleMembership`
 * is documented fail-closed and returns "not a member" rather than throwing, so
 * in practice that means circle-service being unreachable, which is a
 * whole-screen failure anyway.
 *
 * A null subscription therefore NEVER means "this circle has no plan". Every
 * circle is created with an ACTIVE free subscription in the same transaction,
 * so null here means "not visible to you" or "the read failed", and the screen
 * must say which instead of rendering an absence-of-plan empty state.
 *
 * Every field is typed optional-or-null because `errorPolicy: 'all'` can hand
 * back a partially-populated `data` object; the non-null ones are a promise
 * about a COMPLETE response, not about every response.
 */
export interface CirclePlanScreenData {
  circleSubscription: CircleSubscription | null;
  circleEntitlements: CircleEntitlements | null;
  circlePlans: CirclePlan[];
  myCircleMembership: CircleMembershipCheck | null;
}

export interface CirclePlanScreenVariables {
  circleId: string;
}

// ============================================================================
// MUTATION DATA / VARIABLES
// ============================================================================

export interface ChangeCirclePlanData {
  changeCirclePlan: CircleSubscription;
}

export interface ChangeCirclePlanVariables {
  input: ChangeCirclePlanInput;
}

export interface CancelCircleSubscriptionData {
  cancelCircleSubscription: CircleSubscription;
}

export interface CancelCircleSubscriptionVariables {
  circleId: string;
  /**
   * `true` keeps the current plan until the period ends; `false`/omitted drops
   * to the free plan now. Either way the circle lands ON the default plan —
   * cancelling never leaves it with none.
   */
  atPeriodEnd?: boolean | null;
}
