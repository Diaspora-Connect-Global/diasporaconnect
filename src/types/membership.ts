// Single source of truth for membership access semantics across
// Community and Association. Imported by AccessBadges, MembershipPaymentModal,
// filter UIs, and owner/admin config forms.

export type Visibility = 'PUBLIC' | 'PRIVATE';

/**
 * Join policy as exposed by the BE GraphQL gateway.
 *
 * NOTE: Existing FE union in community.tsx/associations.tsx uses
 * 'OPEN' | 'REQUEST' | 'INVITE_ONLY'. The BE plan also defines 'PAID' and
 * 'APPROVAL'. We standardize on the BE values here. The Frontend lead must
 * widen the existing FE unions to match (REQUEST → APPROVAL alias kept for
 * backward-compat in a mapper helper, not in the shared type).
 */
export type JoinPolicy = 'OPEN' | 'APPROVAL' | 'INVITE_ONLY' | 'PAID';

export type PaymentType = 'NONE' | 'ONE_TIME' | 'SUBSCRIPTION';

export type SubscriptionPeriod = 'monthly' | 'yearly';

export interface Money {
  /** Smallest unit (cents for USD/EUR, pesewas for GHS). Always integer. */
  amountInCents: number;
  /** ISO 4217 code, uppercase (e.g. 'USD', 'GHS', 'EUR'). */
  currency: string;
}

export interface AccessProfile {
  visibility: Visibility;
  joinPolicy: JoinPolicy;
  paymentType: PaymentType;
  /** Required iff paymentType !== 'NONE'. */
  price?: Money;
  /** Optional period(s) offered when paymentType === 'SUBSCRIPTION'. */
  subscriptionPeriods?: SubscriptionPeriod[];
}

export type MembershipKind = 'community' | 'association';

export interface MembershipEntity {
  kind: MembershipKind;
  id: string;
  name: string;
  access: AccessProfile;
}

/**
 * Envelope returned by REQUEST_MEMBERSHIP_{COMMUNITY,ASSOCIATION}.
 * Single shape across both entities — payments coder consumes this only.
 */
export interface RequestMembershipResult {
  membershipId: string;
  status: 'ACTIVE' | 'PENDING' | 'PENDING_PAYMENT';
  requiresPayment: boolean;
  /** Stripe-flow only. Presence implies Stripe Elements path. */
  clientSecret?: string;
  /** Backend-decided provider. Frontend never picks. */
  provider?: 'stripe' | 'paystack';
  /** Stable handle for CONFIRM_PAYMENT_INTENT. */
  paymentIntentId?: string;
  /** Set on SUBSCRIPTION flows. */
  subscriptionId?: string;
  /** Optional human-readable message for toasts. */
  message?: string;
}

/**
 * Maps raw join policy strings (which may include the legacy 'REQUEST' value
 * still emitted by the backend) into the canonical UI-layer JoinPolicy union.
 */
export function toJoinPolicy(
  raw: string | null | undefined,
): JoinPolicy {
  if (!raw) return 'OPEN';
  const upper = raw.toUpperCase();
  if (upper === 'REQUEST') return 'APPROVAL';
  if (
    upper === 'OPEN' ||
    upper === 'APPROVAL' ||
    upper === 'INVITE_ONLY' ||
    upper === 'PAID'
  ) {
    return upper;
  }
  return 'OPEN';
}
