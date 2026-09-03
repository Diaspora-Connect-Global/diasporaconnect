import {
  circleEntitlementEnabled,
  circleEntitlementLimit,
  circleUsageLimit,
  findCircleEntitlement,
} from '@/services/gql/circles';
import type {
  CircleEntitlement,
  CircleEntitlementKey,
  CircleEntitlementUsage,
  CircleIntLimit,
} from '@/services/gql/types/circles';

/**
 * Turning `circleEntitlements` into rows a member can read.
 *
 * ── THE RULE THIS FILE EXISTS TO HOLD ───────────────────────────────────────
 * An INT entitlement with no value means UNLIMITED, never zero. The wire splits
 * it into `intValue` + `hasIntValue` (proto3 has no nullable scalar), so
 * `intValue` is 0 whenever `hasIntValue` is false — and reading that 0 as a cap
 * tells a circle on an unlimited plan that it may have nothing. It fails
 * silently, as a UI that simply refuses things, so nothing catches it. This
 * exact off-by-null has already caused a bug here.
 *
 * Every limit in this module is therefore a `CircleIntLimit` — `number | null`,
 * where `null` IS unlimited — normalised through `circleEntitlementLimit()` /
 * `circleUsageLimit()`, which each encode the rule once.
 */

/** How a key should be presented. Three genuinely different things share the INT wire shape. */
export type CircleAllowanceKind =
  /** A ceiling on a countable thing. Meter, and can lock. */
  | 'CAP'
  /** A read window in days. NOT a cap, NOT deletion — never metered. */
  | 'WINDOW'
  /** A capability that is on or off. */
  | 'FLAG';

export const CIRCLE_ALLOWANCE_KIND: Record<
  CircleEntitlementKey,
  CircleAllowanceKind
> = {
  MAX_MEMBERS: 'CAP',
  MAX_ACTIVE_PROJECTS: 'CAP',
  MAX_ACTIVE_CHALLENGES: 'CAP',
  STORAGE_MB: 'CAP',
  // CHAT_HISTORY_DAYS is an INT, and it is emphatically not a cap. It filters
  // how far back the chat is READ. Nothing is destroyed by lowering it and a
  // longer window brings every older message straight back, so metering it
  // ("28 of 30 days used") would describe a loss that does not happen.
  CHAT_HISTORY_DAYS: 'WINDOW',
  CUSTOM_BRANDING: 'FLAG',
};

/**
 * Display order. Fixed rather than derived from the response so the list does
 * not reshuffle between two circles on different plans, and so a key the plan
 * omits still holds its place — an omitted INT key is UNLIMITED, which is
 * information worth showing, not a row to drop.
 */
export const CIRCLE_ALLOWANCE_ORDER: readonly CircleEntitlementKey[] = [
  'MAX_MEMBERS',
  'MAX_ACTIVE_PROJECTS',
  'MAX_ACTIVE_CHALLENGES',
  'STORAGE_MB',
  'CHAT_HISTORY_DAYS',
  'CUSTOM_BRANDING',
] as const;

export interface CircleAllowance {
  key: CircleEntitlementKey;
  kind: CircleAllowanceKind;
  /** `null` means UNLIMITED — never zero. */
  limit: CircleIntLimit;
  /**
   * How much is in use. `null` means nothing counts this key, which is NOT the
   * same as zero: rendering an absent count as "0 of 20" would tell a circle of
   * forty that it has no members.
   */
  current: number | null;
  /** Server-computed: usage is at or over the cap, so NEW additions are refused. */
  locked: boolean;
  /** Meaningful for `FLAG` only. */
  enabled: boolean;
  /** 0–100 for a meter, or `null` when there is nothing to meter. */
  percent: number | null;
}

function meterPercent(limit: CircleIntLimit, current: number | null): number | null {
  if (limit === null || current === null) return null;
  // A cap of zero permits nothing, so the meter is full the moment the key
  // exists. Dividing by it would give Infinity or NaN.
  if (limit <= 0) return 100;
  return Math.min(100, Math.max(0, (current / limit) * 100));
}

/**
 * Build one row per known entitlement key.
 *
 * ── WHICH LIMIT WINS ────────────────────────────────────────────────────────
 * When a usage row exists its limit is preferred over the entitlement's, even
 * though they should agree. `locked` was computed server-side against the usage
 * row's own limit, so pairing `locked` with a different number on screen would
 * produce the one thing a usage list must never say: "3 of 20 — full".
 *
 * Where there is no usage row the entitlement still supplies the allowance, so
 * the row reads "Unlimited" or "20" with no count beside it rather than
 * disappearing.
 */
export function buildCircleAllowances(
  entitlements: CircleEntitlement[] | null | undefined,
  usage: CircleEntitlementUsage[] | null | undefined,
): CircleAllowance[] {
  const usageByKey = new Map<CircleEntitlementKey, CircleEntitlementUsage>(
    (usage ?? []).map((row) => [row.key, row]),
  );

  return CIRCLE_ALLOWANCE_ORDER.map((key) => {
    const kind = CIRCLE_ALLOWANCE_KIND[key];
    const usageRow = usageByKey.get(key);

    const limit = usageRow
      ? circleUsageLimit(usageRow)
      : circleEntitlementLimit(findCircleEntitlement(entitlements, key));

    const current = usageRow ? usageRow.current : null;

    return {
      key,
      kind,
      limit,
      current,
      locked: usageRow?.locked ?? false,
      enabled: circleEntitlementEnabled(entitlements, key),
      // A window is a read filter and a flag is a switch; neither is a quantity
      // being consumed, so neither gets a meter.
      percent: kind === 'CAP' ? meterPercent(limit, current) : null,
    };
  });
}

/**
 * Which CAPS would be full immediately on a different plan.
 *
 * Used to make the change-plan confirmation concrete: instead of a vague
 * warning, it can name "Members: 40 now, 20 covered". That honesty is the whole
 * point — a circle that can see exactly what locks is far less likely to read
 * lock-don't-evict as a threat.
 *
 * Compares the TARGET plan's entitlement list against CURRENT usage. A target
 * with no value for a key is unlimited and therefore never locks. A key nothing
 * counts (`current === null`) cannot be shown to lock either, because we would
 * be guessing.
 */
export function circleAllowancesLockedBy(
  targetEntitlements: CircleEntitlement[] | null | undefined,
  current: CircleAllowance[],
): Array<{ key: CircleEntitlementKey; current: number; limit: number }> {
  const locked: Array<{ key: CircleEntitlementKey; current: number; limit: number }> =
    [];

  for (const row of current) {
    if (row.kind !== 'CAP' || row.current === null) continue;
    const limit = circleEntitlementLimit(
      findCircleEntitlement(targetEntitlements, row.key),
    );
    if (limit === null) continue; // unlimited on the target plan
    if (row.current >= limit) {
      locked.push({ key: row.key, current: row.current, limit });
    }
  }

  return locked;
}
