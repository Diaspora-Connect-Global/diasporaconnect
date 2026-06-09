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
