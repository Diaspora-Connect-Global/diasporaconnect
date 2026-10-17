import { formatMoney, toMajorUnits } from '@/types/money';

/**
 * Opportunity compensation arrives as INTEGER MINOR UNITS (x100), like every other
 * amount on the GraphQL boundary (see `src/types/money.ts`). `formatMoney` is the
 * single minor -> major division; never divide again before calling it.
 */
export type CompensationParts =
  | { kind: 'range'; min: string; max: string }
  | { kind: 'from'; min: string }
  | { kind: 'upTo'; max: string };

const positive = (n?: number | null): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

export function compensationParts(
  min?: number | null,
  max?: number | null,
  currency?: string | null,
  locale?: string,
): CompensationParts | null {
  const hasMin = positive(min);
  const hasMax = positive(max);
  const f = (n: number) => formatMoney(n, currency ?? undefined, locale);
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
