import { gql } from '@apollo/client';

import { CIRCLE_ENTITLEMENT_FRAGMENT } from './circles';
import type {
  CirclePlan,
  CirclePlanPrice,
  CirclePriceInterval,
} from './types/circles';

/**
 * @fileoverview GraphQL operations for the circle plan & subscription screen.
 * @module services/gql/circles-billing
 *
 * Mirrors `services/api-gateway/src/circle/circle-plan.resolver.ts` — the
 * MEMBER and LEAD tiers of it. The `admin*` half of that resolver belongs to
 * the admin console and has no place in this app.
 *
 * Kept apart from `./circles` so this screen can ship without editing the
 * shared circles module. The entitlement fragment is IMPORTED from there
 * rather than copied: two definitions of `CircleEntitlementFields` in one
 * Apollo client is a runtime warning at best and a silently different
 * selection set at worst.
 *
 * ── WHAT THE GATEWAY ENFORCES ───────────────────────────────────────────────
 *   circleSubscription / circleEntitlements → MEMBER (assertCircleMember)
 *   changeCirclePlan / cancelCircleSubscription → LEAD (assertCircleLead)
 *   circlePlans → any authenticated user; the catalogue is not secret
 *
 * A LEAD gate is not the last word on `changeCirclePlan` either: CHANGE_PLAN is
 * also a MotionKind, so a circle whose own rules demand a vote for it will have
 * the direct call refused by circle-service no matter who makes it. Treat a
 * refusal as a legitimate answer to surface, not an error to suppress.
 *
 * ── MONEY ───────────────────────────────────────────────────────────────────
 * `amountMinor` is INTEGER minor units. Format with `formatMoney` from
 * `@/types/money` at the render boundary; there is no ÷100 in this file and
 * there must never be one. Prices are per-currency by intent and never
 * FX-derived, and a YEAR price is its own number rather than 12× MONTH.
 *
 * ── BILLING IS NOT WIRED ────────────────────────────────────────────────────
 * Circles cannot be charged yet: payment-service has no subscription model and
 * circle-service's billing port is a Noop. The only routes onto a paid plan are
 * a platform-admin grant and a zero-priced plan. `changeCirclePlan` aimed at a
 * priced plan fails with a clear message — it does not open a checkout, because
 * there is none. Render the catalogue honestly; never a payment button that
 * cannot complete. `circlePlanIsFree()` below is what the UI branches on.
 */

// ─── Fragments ────────────────────────────────────────────────────────────────

/**
 * One catalogue plan.
 *
 * `entitlements` here is the plan's CURRENT definition. It is NOT what a circle
 * already on that plan has: the subscription snapshots its entitlements at
 * purchase (`CircleSubscriptionFields.entitlements`), so an admin editing a
 * tier cannot silently reduce a circle that is already on it. Compare against
 * `circleEntitlements`, never against another plan's list.
 */
export const CIRCLE_PLAN_FRAGMENT = gql`
  fragment CirclePlanFields on CirclePlan {
    id
    code
    name
    description
    ownerKind
    isDefault
    isActive
    sortOrder
    version
    prices {
      id
      planId
      currency
      interval
      amountMinor
    }
    entitlements {
      ...CircleEntitlementFields
    }
  }
  ${CIRCLE_ENTITLEMENT_FRAGMENT}
`;

/**
 * A circle's subscription. Selected identically by the read and by both
 * mutations, so the Apollo cache normalises the mutation result straight over
 * the query's copy and the screen updates without a second round trip for this
 * object.
 *
 * `planCode` is DISPLAY only — never branch on it. What a circle may do is
 * `circleEntitlements`, which is a different question with a different answer.
 */
export const CIRCLE_SUBSCRIPTION_FRAGMENT = gql`
  fragment CircleSubscriptionFields on CircleSubscription {
    id
    ownerType
    ownerId
    planId
    planCode
    planVersion
    currency
    amountMinor
    interval
    status
    purchasedByUserId
    cancelAtPeriodEnd
    currentPeriodStart
    currentPeriodEnd
    createdAt
    entitlements {
      ...CircleEntitlementFields
    }
  }
  ${CIRCLE_ENTITLEMENT_FRAGMENT}
`;

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * The whole plan screen in one round trip: what the circle is on, what that
 * allows, what it is using, what else exists, and whether the viewer may change
 * any of it.
 *
 * `circlePlans` is deliberately called WITHOUT `ownerKind`. The argument would
 * be `CIRCLE` — the only member of the enum in v1 — so it filters nothing
 * today, while a catalogue row stored with a null `ownerKind` would be dropped
 * by it. An empty catalogue is a far worse failure than an unfiltered one.
 *
 * Pair with `errorPolicy: 'all'`. The two member-gated roots are nullable, so a
 * gate refusal nulls just those and the catalogue plus the membership check
 * still arrive — which is exactly the shape the "members only" state needs.
 * `circlePlans` and `myCircleMembership` are non-null, so a throw from either
 * nulls the whole `data` by GraphQL's own propagation rule; that only happens
 * when circle-service is unreachable, which is a whole-screen failure in any
 * case. Note the client's global error link still toasts once per GraphQL
 * error, so a non-member sees a generic toast behind the correct screen — the
 * same behaviour every other member-gated circle screen already has.
 */
export const CIRCLE_PLAN_SCREEN = gql`
  query CirclePlanScreen($circleId: ID!) {
    circleSubscription(circleId: $circleId) {
      ...CircleSubscriptionFields
    }
    circleEntitlements(circleId: $circleId) {
      ownerType
      ownerId
      entitlements {
        ...CircleEntitlementFields
      }
      usage {
        key
        current
        limit
        hasLimit
        locked
      }
    }
    circlePlans {
      ...CirclePlanFields
    }
    myCircleMembership(circleId: $circleId) {
      isMember
      status
      role
      isLead
      canPropose
    }
  }
  ${CIRCLE_SUBSCRIPTION_FRAGMENT}
  ${CIRCLE_PLAN_FRAGMENT}
`;

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Move the circle to another plan. LEAD-gated.
 *
 * NOT an upgrade and NOT a downgrade — see `ChangeCirclePlanInput`. Increases
 * apply at once; decreases lock rather than evict, so this mutation can never
 * remove a member, a project or a challenge.
 *
 * Aimed at a PRICED plan it fails, because no payment rail exists to charge
 * through. That failure is the honest answer and should reach the user as text,
 * not as a retry loop.
 */
export const CHANGE_CIRCLE_PLAN = gql`
  mutation ChangeCirclePlan($input: ChangeCirclePlanInput!) {
    changeCirclePlan(input: $input) {
      ...CircleSubscriptionFields
    }
  }
  ${CIRCLE_SUBSCRIPTION_FRAGMENT}
`;

/**
 * Cancel — LEAD-gated, alongside its sibling.
 *
 * Cancelling drops the circle to the DEFAULT FREE PLAN; it does not leave it
 * without one. Copy must say so, because "cancel subscription" reads as "lose
 * the circle" to anyone who has cancelled anything else on the internet.
 *
 * Refetch `CIRCLE_PLAN_SCREEN` afterwards rather than trusting the returned
 * object alone: the subscription normalises into the cache by id, but
 * `circleEntitlements` is a separate root with its own caps and `locked` flags,
 * and those are exactly what a cancellation changes.
 */
export const CANCEL_CIRCLE_SUBSCRIPTION = gql`
  mutation CancelCircleSubscription($circleId: ID!, $atPeriodEnd: Boolean) {
    cancelCircleSubscription(circleId: $circleId, atPeriodEnd: $atPeriodEnd) {
      ...CircleSubscriptionFields
    }
  }
  ${CIRCLE_SUBSCRIPTION_FRAGMENT}
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Display order for price rows. Matches how people read a pricing table. */
const INTERVAL_ORDER: CirclePriceInterval[] = ['MONTH', 'YEAR', 'ONE_TIME', 'NONE'];

/**
 * Is this plan reachable without a payment?
 *
 * True when the plan carries no price above zero — either it has no price rows
 * at all, or every row is zero (the free plan is priced at zero, not absent).
 *
 * This is the ONLY thing the UI may branch on when deciding whether to offer a
 * change. It is not a "cheapness" test and not a tier test: it answers "can
 * `changeCirclePlan` actually succeed today", and today the answer is no for
 * anything with a price, because circles cannot be charged at all.
 *
 * A plan priced in one currency and free in another is treated as PRICED. That
 * is the conservative reading — offering a switch that the backend refuses for
 * the currency it picks is worse than not offering it — and it is not a case
 * the catalogue is expected to contain.
 */
export function circlePlanIsFree(plan: CirclePlan | null | undefined): boolean {
  if (!plan) return false;
  return !(plan.prices ?? []).some((price) => price.amountMinor > 0);
}

/**
 * The price rows to display, ordered MONTH → YEAR → ONE_TIME → NONE and, within
 * an interval, by currency code.
 *
 * Every row is rendered in ITS OWN currency. A plan priced at GHS 50 and USD 5
 * shows both; neither is derived from the other and no FX rate is involved
 * anywhere on the platform. The same goes across intervals — the YEAR row is
 * whatever the admin set, not twelve months of the MONTH row.
 *
 * Zero-amount rows are kept, not filtered: "GHS 0.00 / month" is a real,
 * deliberate statement that the plan is free in that currency.
 */
export function circlePlanPriceRows(
  plan: CirclePlan | null | undefined,
): CirclePlanPrice[] {
  return [...(plan?.prices ?? [])].sort((a, b) => {
    const byInterval =
      INTERVAL_ORDER.indexOf(a.interval) - INTERVAL_ORDER.indexOf(b.interval);
    if (byInterval !== 0) return byInterval;
    return a.currency.localeCompare(b.currency);
  });
}

/**
 * Which price row to name in a `changeCirclePlan` call.
 *
 * `currency` and `interval` on the input SELECT one of the plan's prices; they
 * convert nothing. Preferring the circle's current currency keeps a free-plan
 * move in the currency it was already using instead of silently re-denominating
 * it. When the plan has no price row at all, returning `undefined` is correct:
 * both fields are optional and circle-service resolves its own default, which
 * is a better answer than a guess made here.
 */
export function pickCirclePlanPrice(
  plan: CirclePlan | null | undefined,
  preferredCurrency?: string | null,
): CirclePlanPrice | undefined {
  const rows = circlePlanPriceRows(plan);
  if (rows.length === 0) return undefined;
  const wanted = preferredCurrency?.toUpperCase();
  return (
    (wanted && rows.find((row) => row.currency.toUpperCase() === wanted)) ||
    rows[0]
  );
}
