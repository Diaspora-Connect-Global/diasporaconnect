import type { NetworkingRate, NetworkingStat } from '../../../services/gql/networkingAnalytics';

/**
 * The display rules for organiser analytics (backend docs/event-networking/analytics.md,
 * "Display rules"). Pure and framework-free so the specs can import it.
 *
 * The server already suppresses small cells; this is the second lock. Whatever the
 * server sends, a number below K is never returned as a value from here.
 */
export const K = 5;

export type Cell = { kind: 'value'; n: number } | { kind: 'suppressed' } | { kind: 'none' };
export type RateCell =
  | { kind: 'rate'; numerator: number; denominator: number; ratio: number }
  | { kind: 'suppressed' }
  | { kind: 'none' };

/** A count: absent -> none ("—"); suppressed, missing or below K -> suppressed; else the value. */
export function cellOf(stat: NetworkingStat | null | undefined): Cell {
  if (!stat) return { kind: 'none' };
  const n = stat.value;
  if (stat.suppressed || typeof n !== 'number' || !Number.isFinite(n) || n < K) return { kind: 'suppressed' };
  return { kind: 'value', n: Math.round(n) };
}

/** A ratio: an empty group is "—" (checked FIRST, never 0%); a small numerator or denominator hides the ratio. */
export function rateOf(rate: NetworkingRate | null | undefined): RateCell {
  if (!rate) return { kind: 'none' };
  if (rate.noDenominator || rate.denominator?.value === 0) return { kind: 'none' };
  const num = cellOf(rate.numerator);
  const den = cellOf(rate.denominator);
  if (rate.suppressed || num.kind !== 'value' || den.kind !== 'value') return { kind: 'suppressed' };
  return { kind: 'rate', numerator: num.n, denominator: den.n, ratio: num.n / den.n };
}
