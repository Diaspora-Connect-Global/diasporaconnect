// Canonical money helpers for the GraphQL boundary.
//
// === CANONICAL MONEY CONTRACT (locked) ===
// Every monetary amount on every GraphQL boundary (mutation inputs AND query
// responses) is an INTEGER in the lowest denomination (minor units: pesewas for
// GHS, ×100 of the major unit). Base currency GHS.
//
// Rules:
// - Convert major→minor (toMinorUnits) EXACTLY ONCE, at the UI input boundary
//   (when a user types a price like "19.99").
// - Convert minor→major (toMajorUnits / formatMoney) EXACTLY ONCE, at the UI
//   display/format boundary.
// - Send integer minor units in all GraphQL variables; treat all amount fields
//   in responses as integer minor units.
//
// Co-located with `membership.ts`, which documents the `amountInCents` field on
// the shared `Money` envelope.

export const DEFAULT_CURRENCY = 'GHS';

/**
 * Platform-supported SETTLEMENT currencies (the listing/charge currency the
 * platform actually settles in — no FX). Shared across every settlement-currency
 * picker (events create, product create, service create, community/association
 * access settings). Labels are plain strings, mirroring the non-i18n events
 * `create/page.tsx` pattern intentionally (no new i18n keys).
 */
export const CURRENCIES = [
  { value: 'GHS', label: 'GHS — Ghana Cedi' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'NGN', label: 'NGN — Nigerian Naira' },
  { value: 'KES', label: 'KES — Kenyan Shilling' },
] as const;

/** The set of supported settlement currency codes, derived from `CURRENCIES`. */
export const SUPPORTED_SETTLEMENT_CURRENCIES = CURRENCIES.map((c) => c.value);

/**
 * Mobile money (Paystack/Hubtel) is GHS-only. Any non-GHS listing must NOT
 * offer the mobile-money rail — the backend now REJECTS a non-GHS charge on a
 * GHS-only rail, so the UI must hide/disable it. Card/Stripe handles every
 * supported currency.
 */
export function isMobileMoneySupported(currency?: string | null): boolean {
  return (currency ?? DEFAULT_CURRENCY).toUpperCase() === 'GHS';
}

/**
 * Which provider settles CARD payments for a given currency. Must mirror the
 * payment-service `PROVIDER_CURRENCIES_*` guard (which rejects mismatches):
 *   - USD / EUR / GBP → Stripe (and PayPal)
 *   - GHS            → Stripe (the existing GHS-card flow)
 *   - NGN / KES      → Paystack (Stripe cannot settle these; Paystack can)
 * This is the routing that makes the platform work for currencies beyond USD/GHS.
 */
export function cardProviderForCurrency(currency?: string | null): 'STRIPE' | 'PAYSTACK' {
  const code = (currency ?? DEFAULT_CURRENCY).toUpperCase();
  return code === 'NGN' || code === 'KES' ? 'PAYSTACK' : 'STRIPE';
}

/** True when the card rail for this currency is the Paystack inline popup (vs Stripe saved-card). */
export function usesPaystackCard(currency?: string | null): boolean {
  return cardProviderForCurrency(currency) === 'PAYSTACK';
}

/**
 * Convert a major-unit value (what a user types, e.g. 19.99) into integer minor
 * units (e.g. 1999). Use this EXACTLY ONCE, at the UI input boundary, before
 * placing the value into a GraphQL variable.
 */
export function toMinorUnits(major: number): number {
  if (!Number.isFinite(major)) return 0;
  return Math.round(major * 100);
}

/**
 * Convert integer minor units (as received from the API, e.g. 1999) back into a
 * major-unit number (e.g. 19.99). Use this EXACTLY ONCE, at the UI
 * display/format boundary.
 */
export function toMajorUnits(minorUnits: number): number {
  if (!Number.isFinite(minorUnits)) return 0;
  return minorUnits / 100;
}

/**
 * Format integer minor units (as received from the API) into a localized
 * currency string. This is the single minor→major division at the display
 * boundary.
 *
 * @param minorUnits Integer amount in the lowest denomination (pesewas for GHS).
 * @param currency   ISO 4217 code, defaults to 'GHS'.
 * @param locale     Optional BCP-47 locale for `Intl.NumberFormat`.
 */
export function formatMoney(
  minorUnits: number,
  currency: string = DEFAULT_CURRENCY,
  locale?: string,
): string {
  const value = toMajorUnits(minorUnits);
  const code = (currency || DEFAULT_CURRENCY).toUpperCase();
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${code} ${new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)}`;
  }
}
