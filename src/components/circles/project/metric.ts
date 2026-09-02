import { DEFAULT_CURRENCY, formatMoney, toMinorUnits } from '@/types/money';
import type { CircleProjectGoal } from '@/services/gql/types/circles';

/**
 * @fileoverview The money-vs-metric boundary for circle project goals.
 * @module components/circles/project/metric
 *
 * A goal carries a `metricKind` and a `unit`, and ONLY `AMOUNT` is money. The
 * two branches are formatted by completely different rules and mixing them is
 * silent and wrong in both directions:
 *
 *   AMOUNT  → `targetValue` / `currentValue` / contribution `value` are INTEGER
 *             MINOR UNITS (pesewas, cents) and `unit` is the ISO-4217 currency.
 *             Format with `formatMoney`, which is the single ÷100 at the
 *             display boundary.
 *   COUNT / DURATION / BOOLEAN
 *           → the same fields are DECIMAL METRIC strings ("42.195", "20") and
 *             `unit` is a plain word ("km", "books"). Putting one of these
 *             through `formatMoney` renders a marathon as "GHS 42.20".
 *
 * Everything here takes the goal rather than a loose `metricKind`, so a caller
 * cannot format a value without having decided which goal it belongs to.
 */

/** The goal fields these helpers read. Narrow so callers can pass partials. */
export type GoalMetric = Pick<CircleProjectGoal, 'metricKind' | 'unit'>;

/** True when this goal's values are money in minor units. */
export function isMoneyGoal(goal: GoalMetric | null | undefined): boolean {
  return goal?.metricKind === 'AMOUNT';
}

/**
 * The currency of an AMOUNT goal.
 *
 * `unit` is the only currency-bearing field on a goal, so for an AMOUNT goal it
 * IS the ISO-4217 code. Falls back to the platform base currency rather than
 * throwing — a goal that reached the client without a unit should still render
 * a number, and GHS is the documented default.
 */
export function goalCurrency(goal: GoalMetric | null | undefined): string {
  return goal?.unit?.trim().toUpperCase() || DEFAULT_CURRENCY;
}

/**
 * Format one value belonging to `goal` for display.
 *
 * @param value  Wire value — minor units for AMOUNT, a decimal metric string
 *               otherwise. Signed: a ledger correction is negative.
 * @returns The formatted string, or `''` when the value is absent or unparseable
 *          (never "NaN", never a bare "0" standing in for missing data).
 */
export function formatGoalValue(
  value: string | null | undefined,
  goal: GoalMetric | null | undefined,
  locale?: string,
): string {
  if (value === null || value === undefined || value.trim() === '') return '';

  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';

  if (isMoneyGoal(goal)) {
    return formatMoney(amount, goalCurrency(goal), locale);
  }

  // `maximumFractionDigits: 3` keeps "42.195" intact while leaving whole counts
  // ("20 books") unpadded — a money-style 2-digit minimum would render every
  // count as "20.00".
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 3,
  }).format(amount);

  const unit = goal?.unit?.trim();
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Turn what the user typed into the string the mutation expects.
 *
 * This is the major→minor conversion for AMOUNT goals, and it happens EXACTLY
 * here — the one UI input boundary on this screen. A metric goal is passed
 * through as typed so an exact decimal ("42.195") survives without a float
 * round-trip.
 *
 * @returns The wire value, or `null` when the input is not a usable number.
 *          Zero is rejected: an append-only ledger row worth nothing is noise
 *          that can never be deleted.
 */
export function parseContributionValue(
  raw: string,
  goal: GoalMetric | null | undefined,
): string | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed === 0) return null;

  if (isMoneyGoal(goal)) {
    return String(toMinorUnits(parsed));
  }

  return trimmed;
}
