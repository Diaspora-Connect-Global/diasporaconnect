import type { CircleGovernanceRule } from '@/services/gql/types/circles';

import { motionKindRank } from './motionKinds';

/**
 * Turning stored fractions into language a member can act on.
 *
 * ── THE ARITHMETIC THIS COPY DESCRIBES ──────────────────────────────────────
 * Read from `Motion.tally()` in circle-service, because a governance screen
 * that describes the rule inaccurately is worse than one that shows raw
 * fractions — it tells someone what will happen and is wrong.
 *
 *   quorum   turnout * quorumDenominator >= quorumNumerator * electorateSize
 *            Turnout is EVERY ballot cast, abstentions included. Quorum is
 *            about participation, not agreement.
 *
 *   majority yes * majorityDenominator >= majorityNumerator * (yes + no)
 *            AND yes > no.
 *            The base is YES+NO — abstentions are excluded here, so abstaining
 *            helps a motion reach quorum without counting against it.
 *            `yes > no` is a separate condition, which is why an exact tie
 *            never passes on the fraction alone.
 *
 *   tie      resolved by `tieBreaksTo`: REJECT drops it, LEAD passes it only if
 *            the lead voted Yes.
 *
 * Both comparisons are `>=`, so a threshold is "at least", never "more than".
 * The one exception in the copy is a 1/2 majority, where `yes > no` is the
 * binding condition and "more Yes than No" is the accurate phrasing.
 */

// ---------------------------------------------------------------------------
// Fractions
// ---------------------------------------------------------------------------

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

/** Reduce a stored fraction so 2/4 and 1/2 produce the same wording. */
export function normaliseFraction(
  numerator: number,
  denominator: number,
): { n: number; d: number } {
  const n = Math.trunc(Number(numerator) || 0);
  const d = Math.trunc(Number(denominator) || 0);
  if (d <= 0 || n <= 0) return { n, d };
  const divisor = gcd(n, d);
  return { n: n / divisor, d: d / divisor };
}

/**
 * Key under `circles.governance.majority` for a pass threshold.
 *
 * `custom` carries the raw reduced fraction, so an unusual rule (3/5, say) is
 * stated exactly rather than rounded into the nearest familiar phrase — a
 * circle that chose an odd threshold chose it on purpose.
 */
export type MajorityKey = 'unanimous' | 'twoThirds' | 'threeQuarters' | 'simple' | 'custom';

export function majorityKey(numerator: number, denominator: number): MajorityKey {
  const { n, d } = normaliseFraction(numerator, denominator);
  if (d <= 0 || n <= 0) return 'custom';
  if (n >= d) return 'unanimous';
  if (n === 1 && d === 2) return 'simple';
  if (n === 2 && d === 3) return 'twoThirds';
  if (n === 3 && d === 4) return 'threeQuarters';
  return 'custom';
}

/** Key under `circles.governance.quorum`. Same families, different sentence. */
export type QuorumKey = 'everyone' | 'twoThirds' | 'threeQuarters' | 'half' | 'custom';

export function quorumKey(numerator: number, denominator: number): QuorumKey {
  const { n, d } = normaliseFraction(numerator, denominator);
  if (d <= 0 || n <= 0) return 'custom';
  if (n >= d) return 'everyone';
  if (n === 1 && d === 2) return 'half';
  if (n === 2 && d === 3) return 'twoThirds';
  if (n === 3 && d === 4) return 'threeQuarters';
  return 'custom';
}

// ---------------------------------------------------------------------------
// The voting window
// ---------------------------------------------------------------------------

export interface WindowParts {
  /** Key under `circles.governance.window`. */
  unit: 'hours' | 'days' | 'weeks';
  count: number;
}

/**
 * Spell a window in the largest unit that divides it EXACTLY.
 *
 * Exactly, never approximately: "about 3 days" for 72 hours is fine, but the
 * same rounding turns 80 hours into "about 3 days" too, and a member planning
 * around a deadline would be a third of a day out. An inexact value stays in
 * hours, where it is at least true.
 */
export function windowParts(votingWindowHours: number): WindowParts {
  const hours = Math.max(0, Math.trunc(Number(votingWindowHours) || 0));
  if (hours > 0 && hours % 168 === 0) return { unit: 'weeks', count: hours / 168 };
  if (hours > 0 && hours % 24 === 0) return { unit: 'days', count: hours / 24 };
  return { unit: 'hours', count: hours };
}

// ---------------------------------------------------------------------------
// Slicing the rule set
// ---------------------------------------------------------------------------

/**
 * Today's rules: the one live row per motion kind, in constitution order.
 *
 * `supersededAt === null` IS the liveness test — rules are versioned and never
 * updated in place, so `circleGovernanceRuleHistory` returns every version ever
 * and the live one is simply the row nothing has replaced. Taking "the highest
 * version" instead would be a guess that happens to agree most of the time.
 *
 * Kinds are deduplicated defensively: the data model permits exactly one live
 * row per kind, and if that ever stops being true this screen must show one
 * rule per kind rather than silently rendering two contradictory ones.
 */
export function liveRules(
  rules: readonly CircleGovernanceRule[],
): CircleGovernanceRule[] {
  const seen = new Set<string>();
  const out: CircleGovernanceRule[] = [];

  for (const rule of rules) {
    if (rule.supersededAt) continue;
    if (seen.has(rule.motionKind)) continue;
    seen.add(rule.motionKind);
    out.push(rule);
  }

  return out.sort((a, b) => motionKindRank(a.motionKind) - motionKindRank(b.motionKind));
}

/**
 * Every version of one kind's rule, newest version first.
 *
 * Superseded rows are history, not stale data: a motion pins `ruleId` +
 * `ruleVersion` when it opens, so the version that governed a past decision is
 * looked up here. Deleting or hiding them would make old decisions
 * unverifiable.
 */
export function versionsForKind(
  rules: readonly CircleGovernanceRule[],
  motionKind: string,
): CircleGovernanceRule[] {
  return rules
    .filter((rule) => rule.motionKind === motionKind)
    .sort((a, b) => b.version - a.version);
}
