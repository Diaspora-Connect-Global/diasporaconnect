import { DEFAULT_CURRENCY, toMajorUnits } from '@/types/money';

/**
 * Opportunity compensation arrives as INTEGER MINOR UNITS (x100), like every other
 * amount on the GraphQL boundary (see `src/types/money.ts`). `formatMinorExact` below is
 * the single minor -> major conversion for display; never divide again before calling it.
 *
 * The fields are 64-bit on the backend (bigint / int64) and a GraphQL `Float` (Int is
 * 32-bit, too small for e.g. a GHS 500,000,000 investment = 5e10 minor units). Only a
 * positive SAFE integer is an amount; anything else (a fraction, > 2^53-1) is not shown.
 */
export type CompensationParts =
  | { kind: 'range'; min: string; max: string }
  | { kind: 'from'; min: string }
  | { kind: 'upTo'; max: string };

const positive = (n?: number | null): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n > 0;

/**
 * Same output as `formatMoney` (currency style, 2 decimals, `CODE 1,234.00` fallback for an
 * unknown code), but the division by 100 is done on the integer, not in floating point:
 * `minor / 100` is inexact past ~2^46 minor units (90071992547409.91 would print .90).
 * The major amount goes to Intl as an exact decimal STRING (Intl.NumberFormat v3); an
 * engine without string support coerces it to a number, i.e. no worse than before.
 */
export function formatMinorExact(minor: number, currency?: string | null, locale?: string): string {
  const cents = minor % 100;
  const major = (minor - cents) / 100; // exact: an integer <= 2^53 / 100
  const decimal = `${major}.${String(cents).padStart(2, '0')}` as unknown as number;
  const code = (currency || DEFAULT_CURRENCY).toUpperCase();
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(decimal);
  } catch {
    return `${code} ${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(decimal)}`;
  }
}

export function compensationParts(
  min?: number | null,
  max?: number | null,
  currency?: string | null,
  locale?: string,
): CompensationParts | null {
  const hasMin = positive(min);
  const hasMax = positive(max);
  const f = (n: number) => formatMinorExact(n, currency, locale);
  if (hasMin && hasMax) return { kind: 'range', min: f(min), max: f(max) };
  if (hasMin) return { kind: 'from', min: f(min) };
  if (hasMax) return { kind: 'upTo', max: f(max) };
  return null;
}

/** Plain-text summary (English connectors) for places that are not translated. */
export function compensationText(
  min?: number | null,
  max?: number | null,
  currency?: string | null,
  locale?: string,
): string | null {
  const p = compensationParts(min, max, currency, locale);
  if (!p) return null;
  if (p.kind === 'range') return `${p.min} – ${p.max}`;
  if (p.kind === 'from') return `${p.min}+`;
  return `Up to ${p.max}`;
}

/** Major-unit number for structured data (schema.org wants the real salary, not cents). */
export function compensationMajor(minor?: number | null): number | undefined {
  return positive(minor) ? toMajorUnits(minor) : undefined;
}
