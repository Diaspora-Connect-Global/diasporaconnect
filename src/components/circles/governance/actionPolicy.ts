import type {
  CircleEntitlementKey,
  CircleEntitlements,
  CircleGovernanceRule,
  CircleMotionKind,
  CircleStatus,
} from '@/services/gql/types/circles';
import type {
  CircleActionPolicy,
  CircleActionPolicyInput,
  CircleAllowance,
} from '@/services/gql/types/circles-actions';

/**
 * @fileoverview May this member start a project — or must the circle vote?
 * @module components/circles/governance/actionPolicy
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  GOVERNANCE IS DATA, NOT A CONSTANT
 * ═══════════════════════════════════════════════════════════════════════════
 * Every creation flow in this feature is a GOVERNED action: `CREATE_PROJECT`,
 * `CREATE_CHALLENGE`, `CLOSE_PROJECT` and `VERIFY_CHALLENGE_ENTRY` are all
 * `CircleMotionKind`s, and each circle configures a rule PER KIND. So "who may
 * start a project here" is a row in `circleGovernanceRules`, and it differs
 * between two circles running the same build.
 *
 * Hard-coding "leads only" would be wrong for the shipped defaults, which set
 * `proposerRole: 'MEMBER'` on both CREATE_PROJECT and CREATE_CHALLENGE — only
 * CHANGE_PLAN is reserved to leads out of the box. It would also be
 * unfixable-by-the-circle: a circle that amends its rules would find the UI
 * still enforcing the old ones.
 *
 * ── THE TWO ROUTES ARE A CHOICE, NOT A FALLBACK ─────────────────────────────
 * `createCircleProject` and `openCircleMotion(kind: CREATE_PROJECT)` are both
 * real, both supported, and they mean different things:
 *
 *   DIRECT   `createCircleProject` is MEMBER-gated at the gateway, and
 *            `CreateProjectHandler` consults the circle status and the
 *            entitlement slot — never a governance rule. Any active member of a
 *            LIVE circle can start a project immediately.
 *   MOTION   `openCircleMotion` puts the same act to the circle, bound by the
 *            rule: a quorum, a majority, a voting window, a tie-break. When it
 *            passes, the enactment dispatcher creates the project.
 *
 * This helper reports BOTH rather than picking one, because which to use is a
 * social decision the circle makes, not a technical one the code can infer.
 * Collapsing them would quietly remove the ability to say "let's decide this
 * together" — the thing the whole feature is for.
 *
 * ── HOW `proposerRole` IS APPLIED ───────────────────────────────────────────
 * Mirrors `GovernanceRule.permitsProposalBy` in circle-service exactly:
 *
 *     return this.props.proposerRole.isLead() ? role.isLead() : true;
 *
 * A ONE-WAY BAR, not an equality test. A rule set to LEAD admits only leads; a
 * rule set to MEMBER admits everyone INCLUDING leads. Reading it as equality
 * would lock leads out of every MEMBER-level motion — a bug that looks correct
 * in review because the comparison reads naturally.
 *
 * This is advisory. circle-service enforces the same check against the rule it
 * pins at open time, so a stale client is refused there rather than granted
 * anything here.
 *
 * ── WHY DORMANT SPLITS THE TWO ROUTES ───────────────────────────────────────
 * `CircleStatus.canOpenMotions()` returns true for ACTIVE only, and the comment
 * on it is explicit: *"DORMANT reads fine — this is the single behaviour
 * DORMANT withholds."* Meanwhile `CreateProjectHandler` checks `isLive()`,
 * which includes DORMANT, and says so: *"A DORMANT circle CAN start a project…
 * a circle that has quietly dipped below two members is not supposed to lose
 * the ability to do the things it exists for."*
 *
 * So a circle with one active member can start a project and cannot hold a
 * vote, and the UI has to say that rather than greying out both.
 */

/** Motions may be opened only on an ACTIVE circle. DORMANT is not enough. */
export function circleCanOpenMotions(status: CircleStatus | null | undefined): boolean {
  return status === 'ACTIVE';
}

/**
 * A LIVE circle accepts new work: ACTIVE or DORMANT.
 *
 * SUSPENDED, ARCHIVED and DISSOLVED do not. Mirrors `CircleStatus.isLive()`,
 * which is what `CreateProjectHandler` and `CreateChallengeHandler` both call
 * before doing anything else.
 */
export function circleIsLive(status: CircleStatus | null | undefined): boolean {
  return status === 'ACTIVE' || status === 'DORMANT';
}

/** The live rule for one kind, or null. Superseded versions are never returned. */
export function ruleForKind(
  rules: CircleGovernanceRule[] | null | undefined,
  kind: CircleMotionKind,
): CircleGovernanceRule | null {
  if (!rules?.length) return null;
  // `circleGovernanceRules` already returns only live rows (one per kind), but
  // the `supersededAt` guard costs nothing and makes this safe to point at
  // `circleGovernanceRuleHistory`, which returns every version ever.
  return rules.find((r) => r.motionKind === kind && !r.supersededAt) ?? null;
}

/**
 * Does this rule let this member propose?
 *
 * See the header — a one-way bar. A rule with no `proposerRole` at all is
 * treated as MEMBER, matching the column default (`proposer_role VARCHAR(16)
 * NOT NULL DEFAULT 'MEMBER'`); refusing on absence would be a client-side wall
 * in front of a permission the server grants.
 */
export function rulePermitsProposal(
  rule: CircleGovernanceRule | null,
  isLead: boolean,
): boolean {
  if (!rule) return false;
  return rule.proposerRole === 'LEAD' ? isLead : true;
}

/**
 * Remaining headroom under one entitlement cap.
 *
 * ── `hasLimit: false` MEANS UNLIMITED, AND `limit` IS STILL `0` ─────────────
 * That pairing is the trap. The gateway passes the flag through exactly and
 * "never 'helpfully' collapses an absent limit into a 0", so an unlimited
 * entitlement arrives as `{ hasLimit: false, limit: 0 }`. Any code that reads
 * `limit` before the flag turns the most generous plan into the one that can
 * do nothing — and it fails silently, as a form that refuses to open.
 *
 * `remaining` is therefore `null` for unlimited and never `0`, so the
 * distinction survives into the caller.
 *
 * Returns null when the circle has no row for this key: entitlements are a
 * snapshot taken at purchase, and an older subscription may predate a key. An
 * absent cap is not a zero cap — the server is the one that decides, and it
 * will simply not refuse.
 */
export function allowanceFor(
  entitlements: CircleEntitlements | null | undefined,
  key: CircleEntitlementKey,
): CircleAllowance | null {
  const usage = entitlements?.usage?.find((u) => u.key === key);
  if (!usage) return null;

  if (!usage.hasLimit) {
    return {
      key,
      current: usage.current,
      limit: null,
      remaining: null,
      locked: false,
    };
  }

  return {
    key,
    current: usage.current,
    limit: usage.limit,
    // Clamped at zero: a plan downgrade can leave usage ABOVE the cap (nothing
    // is ever evicted for a downgrade), and a negative "remaining" would render
    // as "-2 left" instead of "none left".
    remaining: Math.max(0, usage.limit - usage.current),
    // The server's own verdict is preferred over recomputing `current >= limit`
    // — it is the value the refusal will actually be based on.
    locked: usage.locked,
  };
}

/**
 * The full verdict for one governed action.
 *
 * ── WHY `blockedBy` IS ONLY SET WHEN BOTH ROUTES ARE SHUT ───────────────────
 * A member at the project cap can still OPEN a motion — the cap binds at
 * enactment, not at proposal, and a motion that passes and then hits the cap
 * lands in `ENACTMENT_FAILED` rather than being refused up front. Reporting
 * "blocked" the moment the direct route closed would hide the route that is
 * still open. So `blockedBy` answers "why can I do nothing at all", and the
 * two booleans answer "which of these may I do".
 */
export function buildCircleActionPolicy(
  input: CircleActionPolicyInput,
): CircleActionPolicy {
  const {
    kind,
    rules,
    entitlements,
    entitlementKey,
    isMember,
    isLead,
    canPropose,
    circleIsActive,
    circleIsLive: isLiveCircle,
  } = input;

  const rule = ruleForKind(rules, kind);
  const allowance = entitlementKey ? allowanceFor(entitlements, entitlementKey) : null;

  // ── The direct route ─────────────────────────────────────────────────────
  // Membership, a live circle, and a free slot. The cap is checked here purely
  // so the form can say so BEFORE it is filled in; circle-service checks it
  // again under a row lock, which is the check that actually binds.
  const canActDirectly = isMember && isLiveCircle && !(allowance?.locked ?? false);

  // ── The motion route ─────────────────────────────────────────────────────
  // `canPropose` is circle-service's own advisory verdict and is ANDed rather
  // than trusted alone: it is a single boolean for the whole circle, while
  // `proposerRole` is configured per kind, so it cannot answer this question by
  // itself. Both must agree.
  const canOpenMotion =
    isMember && circleIsActive && canPropose && rulePermitsProposal(rule, isLead);

  let blockedBy: CircleActionPolicy['blockedBy'] = null;
  if (!canActDirectly && !canOpenMotion) {
    // Ordered most-specific first, so the reason shown is the one the member
    // can actually act on. "You are not a member" outranks everything because
    // nothing else matters if it is true.
    if (!isMember) blockedBy = 'NOT_A_MEMBER';
    else if (allowance?.locked) blockedBy = 'ENTITLEMENT_LOCKED';
    else if (!rule) blockedBy = 'NO_RULE';
    else if (!circleIsActive) blockedBy = 'CIRCLE_NOT_ACTIVE';
    else blockedBy = 'PROPOSER_ROLE';
  }

  return { kind, canActDirectly, canOpenMotion, blockedBy, rule, allowance };
}

/**
 * The entitlement each creation action consumes.
 *
 * Only the two capped kinds appear. Mapping every kind to a key would invent
 * caps the platform does not have — the v1 vocabulary is frozen at six keys and
 * adding one costs a migration.
 */
export const ACTION_ENTITLEMENT_KEY: Partial<
  Record<CircleMotionKind, CircleEntitlementKey>
> = {
  CREATE_PROJECT: 'MAX_ACTIVE_PROJECTS',
  CREATE_CHALLENGE: 'MAX_ACTIVE_CHALLENGES',
};
