/**
 * @fileoverview Circles feature type definitions for GraphQL operations.
 * Mirrors the api-gateway `circle` module exposed at
 * services/api-gateway/src/circle/dto/*.
 * @module services/gql/types/circles
 *
 * Hand-written — this repo has no graphql-codegen. Keep these in step with the
 * gateway DTOs by hand; the gateway is code-first, so its `dto/*.type.ts`
 * classes ARE the schema.
 *
 * ── CONVENTIONS ─────────────────────────────────────────────────────────────
 *
 * 1. Every circle GraphQL type is `Circle`-prefixed (`CircleMotion`,
 *    `CirclePlan`, `CircleMemberRole`, …). The gateway schema is one flat
 *    namespace and bare names like `MemberRole` are already taken by the group
 *    module, so the prefix is load-bearing on the wire, not decoration.
 *
 * 2. Enums travel as SCREAMING_SNAKE strings, modelled here as string unions.
 *
 * 3. Timestamps are ISO-8601 strings (the gateway normalises proto
 *    `{seconds, nanos}` before returning them). Plain calendar dates
 *    (`startsOn`, `dueOn`) are `YYYY-MM-DD` strings. Both are typed `string`.
 *
 * 4. Several fields are int64 on the proto and therefore exposed as GraphQL
 *    `Float` (GraphQL `Int` caps at 2^31). They are still INTEGERS —
 *    `motionNumber`, `seq`, `points`, `sizeBytes`, `amountMinor`. Typed
 *    `number`; never format one as a decimal because of its GraphQL type.
 *
 * ── MONEY ───────────────────────────────────────────────────────────────────
 * `amountMinor` is the ONLY monetary field in this feature. It is an INTEGER in
 * the currency's lowest denomination (pesewas for GHS, cents for USD). Convert
 * exactly once, at the render boundary, with `formatMoney` from `@/types/money`.
 * No ÷100 belongs in this layer.
 *
 * ── NOT MONEY ───────────────────────────────────────────────────────────────
 * `targetValue` / `currentValue` / `value` / `claimValue` are decimal METRIC
 * strings — "42.195" km, "1500" push-ups. They cross the wire as strings so an
 * append-only ledger sums exactly. Running one through a money formatter is a
 * bug; they carry a `unit`, not a currency.
 */

// ============================================================================
// ENUMS (string unions — values are verbatim from dto/enums.ts)
// ============================================================================

/** Owner kind for a circle subscription. Only CIRCLE in v1. */
export type CircleOwnerType = 'CIRCLE';

/**
 * Circle lifecycle. DORMANT means fewer than two active members: reads still
 * work, motions cannot open, and it reactivates on the next join. A circle is
 * never deleted for being small.
 */
export type CircleStatus =
  | 'ACTIVE'
  | 'DORMANT'
  | 'SUSPENDED'
  | 'ARCHIVED'
  | 'DISSOLVED';

/** How someone gets in. Independent of `discoverable` — two separate axes. */
export type CircleJoinMode = 'INVITE_ONLY' | 'REQUEST';

/** A LEAD is a facilitator, not a boss — they hold only what the circle left them. */
export type CircleMemberRole = 'MEMBER' | 'LEAD';

/** MEMBERSHIP_REMOVED always carries a `removedByMotionId` — a motion removes people, not the platform. */
export type CircleMembershipStatus =
  | 'MEMBERSHIP_ACTIVE'
  | 'MEMBERSHIP_LEFT'
  | 'MEMBERSHIP_REMOVED'
  | 'MEMBERSHIP_SUSPENDED';

export type CircleInvitationStatus =
  | 'INVITATION_PENDING'
  | 'INVITATION_ACCEPTED'
  | 'INVITATION_DECLINED'
  | 'INVITATION_REVOKED'
  | 'INVITATION_EXPIRED';

export type CircleJoinRequestStatus =
  | 'JOIN_REQUEST_PENDING'
  | 'JOIN_REQUEST_ADMITTED'
  | 'JOIN_REQUEST_DECLINED'
  | 'JOIN_REQUEST_WITHDRAWN';

/** Governance rules are configured PER KIND — unanimity to expel, simple majority to start a project. */
export type CircleMotionKind =
  | 'ADMIT_MEMBER'
  | 'REMOVE_MEMBER'
  | 'APPOINT_LEAD'
  | 'REMOVE_LEAD'
  | 'AMEND_RULES'
  | 'CHANGE_JOIN_MODE'
  | 'SET_DISCOVERABLE'
  | 'CREATE_PROJECT'
  | 'CLOSE_PROJECT'
  | 'CREATE_CHALLENGE'
  | 'VERIFY_CHALLENGE_ENTRY'
  | 'CHANGE_PLAN'
  | 'DISSOLVE_CIRCLE'
  | 'CUSTOM';

/**
 * Motion lifecycle. EXPIRED means the window closed without quorum and NOTHING
 * happens — silence is never consent. ENACTMENT_FAILED means it passed but
 * could not be applied; `enactmentError` says why, and it must be surfaced.
 */
export type CircleMotionStatus =
  | 'OPEN'
  | 'PASSED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'EXPIRED'
  | 'ENACTED'
  | 'ENACTMENT_FAILED';

export type CircleVoteChoice = 'YES' | 'NO' | 'ABSTAIN';

/** How an exact tie resolves — pinned onto the motion at open time. */
export type CircleTieBreak = 'REJECT' | 'LEAD';

export type CircleProjectStatus =
  | 'PROJECT_DRAFT'
  | 'PROJECT_ACTIVE'
  | 'PROJECT_COMPLETED'
  | 'PROJECT_ABANDONED'
  | 'PROJECT_ARCHIVED';

/** SHARED goals belong to the circle; INDIVIDUAL goals carry an assignee. */
export type CircleGoalScope = 'SHARED' | 'INDIVIDUAL';

export type CircleMetricKind = 'COUNT' | 'AMOUNT' | 'BOOLEAN' | 'DURATION';

export type CircleGoalStatus =
  | 'GOAL_OPEN'
  | 'GOAL_MET'
  | 'GOAL_MISSED'
  | 'GOAL_CANCELLED';

export type CircleChallengeStatus =
  | 'CHALLENGE_DRAFT'
  | 'CHALLENGE_ACTIVE'
  | 'CHALLENGE_JUDGING'
  | 'CHALLENGE_CLOSED'
  | 'CHALLENGE_CANCELLED';

/**
 * Who confirms a challenge was actually completed. Chosen at creation and
 * IMMUTABLE once the challenge leaves DRAFT. The platform never adjudicates
 * whether someone really ran the ten kilometres.
 */
export type CircleVerificationMode = 'HONOUR' | 'LEAD_CONFIRMS' | 'CIRCLE_CONFIRMS';

export type CircleChallengeCadence = 'ONE_OFF' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export type CircleEntryVerificationState =
  | 'ENTRY_PENDING'
  | 'ENTRY_ACCEPTED'
  | 'ENTRY_REJECTED'
  | 'ENTRY_DISPUTED';

export type CircleScoreSource =
  | 'CHALLENGE_ENTRY'
  | 'GOAL_CONTRIBUTION'
  | 'PROJECT_COMPLETION'
  | 'MOTION_PARTICIPATION'
  | 'MANUAL_ADJUSTMENT';

/** The complete v1 entitlement vocabulary. Adding a key costs a backend migration. */
export type CircleEntitlementKey =
  | 'MAX_MEMBERS'
  | 'MAX_ACTIVE_PROJECTS'
  | 'MAX_ACTIVE_CHALLENGES'
  | 'CHAT_HISTORY_DAYS'
  | 'STORAGE_MB'
  | 'CUSTOM_BRANDING';

/** For INT, read `hasIntValue` FIRST: false means UNLIMITED, not zero. */
export type CircleEntitlementValueKind = 'INT' | 'BOOL';

export type CircleSubscriptionStatus =
  | 'SUBSCRIPTION_ACTIVE'
  | 'SUBSCRIPTION_PAST_DUE'
  | 'SUBSCRIPTION_CANCELLED'
  | 'SUBSCRIPTION_EXPIRED';

/** NONE is the free plan — priced at zero, not absent. */
export type CirclePriceInterval = 'MONTH' | 'YEAR' | 'ONE_TIME' | 'NONE';

// ============================================================================
// ENTITIES — circle, membership, chat
// ============================================================================

/**
 * The full member-visible circle aggregate. Non-members get `CirclePublicCard`
 * instead — a DISTINCT type, never a filtered `Circle`.
 */
export interface Circle {
  id: string;
  /** Gap-free and human-readable, e.g. "CIR-2026-0042". */
  circleNumber?: string | null;
  name: string;
  handle?: string | null;
  tagline?: string | null;
  description?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  /**
   * Custom colours etc. Suppressed by the backend when the plan lacks
   * CUSTOM_BRANDING — kept in storage and never nulled, so a re-upgrade
   * restores it. Treat an absent value as "not on this plan", not "unset".
   */
  brandJson?: string | null;
  /** Findability. Independent of `joinMode`. */
  discoverable: boolean;
  joinMode: CircleJoinMode;
  status: CircleStatus;
  founderUserId?: string | null;
  chatConversationId?: string | null;
  /** Computed at read time from active memberships — there is no stored counter to drift. */
  memberCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  archivedAt?: string | null;
}

/**
 * The public face of a circle. Everything a non-member may see is enumerated
 * here — never widen it by substituting a `Circle`.
 */
export interface CirclePublicCard {
  id: string;
  name: string;
  handle?: string | null;
  tagline?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  memberCount: number;
  /** Tells the viewer whether to request or wait for an invite. */
  joinMode: CircleJoinMode;
  discoverable: boolean;
  createdAt?: string | null;
}

export interface CircleMember {
  id: string;
  circleId: string;
  userId: string;
  role: CircleMemberRole;
  status: CircleMembershipStatus;
  invitedBy?: string | null;
  /** Present whenever status is MEMBERSHIP_REMOVED — the receipt for the motion that did it. */
  removedByMotionId?: string | null;
  joinedAt?: string | null;
  leftAt?: string | null;
}

export interface CircleInvitation {
  id: string;
  circleId: string;
  inviteeUserId?: string | null;
  /** Email / phone for someone who is not yet a platform user. */
  inviteeContact?: string | null;
  invitedBy?: string | null;
  status: CircleInvitationStatus;
  expiresAt?: string | null;
  createdAt?: string | null;
}

export interface CircleJoinRequest {
  id: string;
  circleId: string;
  userId: string;
  note?: string | null;
  status: CircleJoinRequestStatus;
  decidedByUserId?: string | null;
  /** Set when the admission came from an ADMIT_MEMBER motion rather than a lead. */
  decidedByMotionId?: string | null;
  createdAt?: string | null;
  decidedAt?: string | null;
}

/**
 * The caller's own standing. Advisory for the UI (hide actions that would be
 * refused) and authoritative for the gateway. Fail-closed: an unreachable
 * circle-service reads as "not a member".
 */
export interface CircleMembershipCheck {
  isMember: boolean;
  /** Empty/absent when not a member. */
  status?: CircleMembershipStatus | null;
  role?: CircleMemberRole | null;
  isLead: boolean;
  /** Decided by circle-service against the circle's pinned rule — never recompute it. */
  canPropose: boolean;
}

export interface CircleChat {
  circleId: string;
  conversationId?: string | null;
  /** False when circle chat is disabled platform-wide. */
  available: boolean;
  /**
   * From the CHAT_HISTORY_DAYS entitlement. A READ FILTER, not a deletion —
   * nothing is destroyed by a plan change and a re-upgrade restores the view.
   */
  historyDays: number;
  historyLimited: boolean;
}

// ============================================================================
// ENTITIES — governance
// ============================================================================

/**
 * A governance rule, versioned and never updated in place. Amending supersedes,
 * so the rule a past motion ran under stays readable forever.
 *
 * This is TODAY's rule. To render an existing motion's thresholds, read the
 * pinned fields on `CircleMotion` instead — see the note there.
 */
export interface CircleGovernanceRule {
  id: string;
  circleId: string;
  version: number;
  motionKind: CircleMotionKind;
  quorumNumerator: number;
  quorumDenominator: number;
  majorityNumerator: number;
  majorityDenominator: number;
  votingWindowHours: number;
  /** Who may open a motion of this kind. Enforced inside circle-service, not by the client. */
  proposerRole?: CircleMemberRole | null;
  tieBreaksTo?: CircleTieBreak | null;
  /** The AMEND_RULES motion that introduced this version, if any. */
  createdByMotionId?: string | null;
  effectiveFrom?: string | null;
  /** Null on the one live row for this motion kind. */
  supersededAt?: string | null;
}

/**
 * A motion, carrying its own PINNED governance rule.
 *
 * ── WHY THE PINNED BLOCK EXISTS (do not "simplify" it away) ─────────────────
 * `ruleId`, `ruleVersion`, `quorumNumerator/Denominator`,
 * `majorityNumerator/Denominator`, `tieBreaksTo`, `electorateSize`, `opensAt`
 * and `closesAt` are a SNAPSHOT taken when the motion opened. They are
 * DELIBERATELY not the circle's current rule.
 *
 * Without them, passing a motion that lowered the majority would retroactively
 * flip every other vote in progress, and the audit trail would show a
 * legitimate-looking result. `electorateSize` is pinned for the same reason:
 * quorum is a fraction OF something, and three people joining mid-window must
 * not silently raise the bar on a vote already under way.
 *
 * So: render this motion's thresholds from THESE fields. Reading
 * `circleGovernanceRules` to "simplify" the query would silently show the wrong
 * numbers on any motion opened before the last rule amendment.
 */
export interface CircleMotion {
  id: string;
  circleId: string;
  /** int64 — per-circle, gap-free. Still an integer. */
  motionNumber: number;
  kind: CircleMotionKind;
  title?: string | null;
  rationale?: string | null;
  proposedBy?: string | null;
  /** What the motion acts on — e.g. MEMBER / PROJECT / CHALLENGE_ENTRY / PLAN. */
  subjectType?: string | null;
  subjectId?: string | null;
  /** Kind-specific arguments as a JSON string; applied by circle-service's enactment dispatcher. */
  payloadJson?: string | null;
  status: CircleMotionStatus;

  // ── PINNED AT OPEN. Never updated. See the block comment above. ───────────
  ruleId?: string | null;
  ruleVersion: number;
  quorumNumerator: number;
  quorumDenominator: number;
  majorityNumerator: number;
  majorityDenominator: number;
  tieBreaksTo?: CircleTieBreak | null;
  electorateSize: number;
  opensAt?: string | null;
  closesAt?: string | null;

  // ── Outcome. Written once at tally, never touched again. ──────────────────
  outcomeYes: number;
  outcomeNo: number;
  outcomeAbstain: number;
  /**
   * Why a PASSED motion could not be applied (over cap, member already left,
   * project already closed). Surface it — the motion did pass, and the circle
   * needs to see why applying it did not work.
   */
  enactmentError?: string | null;
  decidedAt?: string | null;
  enactedAt?: string | null;
  createdAt?: string | null;
}

/**
 * Live tally of an open motion, computed against the motion's PINNED fields.
 * `provisionalOutcome` is provisional by name and nature — votes stay
 * changeable until the window closes.
 */
export interface CircleMotionTally {
  motionId: string;
  yes: number;
  no: number;
  abstain: number;
  notVoted: number;
  electorateSize: number;
  quorumMet: boolean;
  majorityMet: boolean;
  provisionalOutcome?: CircleMotionStatus | string | null;
  closesAt?: string | null;
}

export interface CircleVote {
  id: string;
  motionId: string;
  voterUserId: string;
  choice: CircleVoteChoice;
  castAt?: string | null;
  /** Set when a member changed their mind before the motion closed; also audited. */
  changedAt?: string | null;
}

// ============================================================================
// ENTITIES — projects, goals, contributions
// ============================================================================

export interface CircleProject {
  id: string;
  circleId: string;
  /** int64 — per-circle, gap-free. */
  projectNumber: number;
  title: string;
  description?: string | null;
  status: CircleProjectStatus;
  coverUrl?: string | null;
  createdBy?: string | null;
  /** Set when the project was created by enacting a CREATE_PROJECT motion. */
  createdByMotionId?: string | null;
  /** Plain calendar date (YYYY-MM-DD), not a timestamp. */
  startsOn?: string | null;
  dueOn?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CircleProjectGoal {
  id: string;
  projectId: string;
  scope: CircleGoalScope;
  /** Set if and only if `scope` is INDIVIDUAL. */
  assigneeUserId?: string | null;
  metricKind?: CircleMetricKind | null;
  unit?: string | null;
  /** Decimal METRIC string — not money. Pair it with `unit`, never a currency. */
  targetValue?: string | null;
  status: CircleGoalStatus;
  dueOn?: string | null;
  createdAt?: string | null;
}

/** One member's share of a shared goal. */
export interface CircleMemberContribution {
  userId: string;
  /** Decimal metric string. */
  value: string;
  percentOfTotal: number;
}

/**
 * Goal progress. `currentValue` is a SUM over the append-only contribution
 * ledger, never a stored counter — a drifted counter quietly lies about
 * progress, which is worse than showing nothing.
 */
export interface CircleGoalProgress {
  goalId: string;
  /** Decimal metric strings — not money. */
  targetValue?: string | null;
  currentValue?: string | null;
  percentComplete: number;
  byMember: CircleMemberContribution[];
}

/**
 * One row of the append-only contribution ledger. Values are SIGNED and a
 * correction is a NEGATIVE row linked by `correctsContributionId`, never an
 * UPDATE — the ledger only ever grows.
 */
export interface CircleContribution {
  id: string;
  circleId: string;
  projectId: string;
  goalId: string;
  contributorUserId: string;
  /** Signed decimal METRIC string — not money. */
  value: string;
  note?: string | null;
  evidenceUrl?: string | null;
  correctsContributionId?: string | null;
  createdAt?: string | null;
}

/** A contribution write, returned with the goal's recomputed progress. */
export interface CircleContributionResult {
  contribution: CircleContribution;
  progress?: CircleGoalProgress | null;
}

// ============================================================================
// ENTITIES — challenges and score
// ============================================================================

export interface CircleChallenge {
  id: string;
  circleId: string;
  /** int64 — per-circle, gap-free. */
  challengeNumber: number;
  title: string;
  description?: string | null;
  status: CircleChallengeStatus;
  /** IMMUTABLE once the challenge leaves DRAFT — activating is what freezes it. */
  verificationMode?: CircleVerificationMode | null;
  cadence?: CircleChallengeCadence | null;
  pointsPerEntry: number;
  maxEntriesPerPeriod: number;
  createdBy?: string | null;
  createdByMotionId?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt?: string | null;
}

export interface CircleChallengeEntry {
  id: string;
  challengeId: string;
  circleId: string;
  userId: string;
  /**
   * "2026-W09" / "2026-03-14" / "ONE_OFF" — makes recurring cadence work
   * without a scheduler minting rows in advance. Derived client-side from the
   * challenge's `cadence`.
   */
  periodKey?: string | null;
  /** Decimal metric string — not money. */
  claimValue?: string | null;
  note?: string | null;
  evidenceUrl?: string | null;
  verificationState: CircleEntryVerificationState;
  verifiedByUserId?: string | null;
  /** Present when the challenge's verification mode is CIRCLE_CONFIRMS. */
  verifiedByMotionId?: string | null;
  submittedAt?: string | null;
  verifiedAt?: string | null;
}

/**
 * One row of the append-only score ledger. `scoreRuleVersion` is pinned per
 * entry, so amending the scoring rule never retroactively rewrites the
 * leaderboard — the same invariant as motions, applied to scoring.
 */
export interface CircleScoreEntry {
  id: string;
  circleId: string;
  userId: string;
  source: CircleScoreSource;
  sourceRefType?: string | null;
  sourceRefId?: string | null;
  /** Signed — a reversal is a negative row, never a delete. */
  points: number;
  scoreRuleVersion: number;
  seasonKey?: string | null;
  reversesEntryId?: string | null;
  awardedAt?: string | null;
}

export interface CircleLeaderboardRow {
  userId: string;
  /** int64 — still an integer. */
  points: number;
  rank: number;
  entries: number;
}

/**
 * A SUM ... GROUP BY over the score ledger, cached in Redis, never a table.
 *
 * When `rankingEnabled` is false the circle has switched individual ranking off
 * — render ONLY `collectiveTotal`, not `rows`. Among friends, a permanent
 * visible list of who is last sours the thing the product is for.
 */
export interface CircleLeaderboard {
  circleId: string;
  seasonKey?: string | null;
  rankingEnabled: boolean;
  /** int64 — the whole circle's score, meaningful even with ranking off. */
  collectiveTotal: number;
  rows: CircleLeaderboardRow[];
}

// ============================================================================
// ENTITIES — entitlements, plans, subscription
// ============================================================================

/**
 * A normalised integer limit where `null` means UNLIMITED — never zero.
 *
 * The wire shape splits this into `intValue` + `hasIntValue` because proto3 has
 * no nullable scalar. Normalise with `circleEntitlementLimit()` /
 * `circleUsageLimit()` from `@/services/gql/circles` and pass THIS around
 * instead of the raw pair.
 */
export type CircleIntLimit = number | null;

/**
 * A single capability.
 *
 * ── READ `hasIntValue` BEFORE `intValue`. ──────────────────────────────────
 * When `valueKind` is 'INT' and `hasIntValue` is false, the entitlement is
 * UNLIMITED — NOT zero. `intValue` is meaningless in that case (the wire
 * carries 0 there, because proto3 has no null int). Treating that 0 as a limit
 * turns an unlimited plan into one that permits nothing, and it fails silently:
 * the UI simply refuses actions that should have been allowed.
 *
 * Never write `if (e.intValue > 0)`. Write
 * `const limit = circleEntitlementLimit(e); if (limit !== null && used >= limit)`.
 */
export interface CircleEntitlement {
  key: CircleEntitlementKey;
  valueKind: CircleEntitlementValueKind;
  /** int64. MEANINGLESS unless `hasIntValue` is true. */
  intValue: number;
  /** false ⇒ `intValue` is UNLIMITED, not zero. */
  hasIntValue: boolean;
  boolValue: boolean;
}

/**
 * Current usage against one limit. Same null-means-unlimited rule as
 * `CircleEntitlement`, spelled `hasLimit` here.
 *
 * `locked` is true when usage is at or over the limit — normally after a plan
 * change that lowered a cap. Existing members / projects are KEPT; only new
 * ones are refused. Nothing is ever evicted for a downgrade.
 */
export interface CircleEntitlementUsage {
  key: CircleEntitlementKey;
  /** int64. */
  current: number;
  /** int64. MEANINGLESS unless `hasLimit` is true. */
  limit: number;
  /** false ⇒ UNLIMITED, not zero. */
  hasLimit: boolean;
  locked: boolean;
}

/** What a circle may do, plus what it is using. Carries no tier name, by design. */
export interface CircleEntitlements {
  ownerType: CircleOwnerType;
  ownerId: string;
  entitlements: CircleEntitlement[];
  usage: CircleEntitlementUsage[];
}

export interface CirclePlanPrice {
  id: string;
  planId: string;
  /** ISO-4217, e.g. GHS / USD / EUR / GBP / NGN / KES. */
  currency: string;
  interval: CirclePriceInterval;
  /**
   * INTEGER minor units (pesewas/cents). Format with `formatMoney` from
   * `@/types/money` at render time — no ÷100 in this layer. A yearly price is
   * its own number, not 12× the monthly one.
   */
  amountMinor: number;
}

export interface CirclePlan {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  ownerKind?: CircleOwnerType | null;
  /** Exactly one default per owner kind — "free is a plan" is structurally true. */
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  version: number;
  prices: CirclePlanPrice[];
  entitlements: CircleEntitlement[];
}

/**
 * A circle's subscription. Exactly one ACTIVE row always exists (the free
 * subscription is created with the circle), so never branch on "has a
 * subscription or not".
 */
export interface CircleSubscription {
  id: string;
  ownerType: CircleOwnerType;
  ownerId: string;
  planId: string;
  /** For DISPLAY only. Never branch on this — read `entitlements`. */
  planCode?: string | null;
  planVersion: number;
  currency?: string | null;
  /** INTEGER minor units. See `CirclePlanPrice.amountMinor`. */
  amountMinor: number;
  interval?: CirclePriceInterval | null;
  status: CircleSubscriptionStatus;
  /** Recorded, and grants nothing. Paying the bill buys zero governance rights. */
  purchasedByUserId?: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  createdAt?: string | null;
  /**
   * The entitlements as they were AT PURCHASE — snapshotted, not resolved live
   * from the plan, so editing a tier cannot silently reduce what a circle has.
   */
  entitlements: CircleEntitlement[];
}

// ============================================================================
// INPUTS (mutation variables)
// ============================================================================

/**
 * `actorUserId` is never an input anywhere in this module — the gateway derives
 * the actor from the JWT. Do not add one.
 */
export interface CreateCircleInput {
  name: string;
  tagline?: string | null;
  description?: string | null;
  /** circle-service allocates one when omitted. */
  handle?: string | null;
  /** Findability — independent of `joinMode`. Defaults to false (private). */
  discoverable?: boolean | null;
  joinMode?: CircleJoinMode | null;
  idempotencyKey?: string | null;
}

/**
 * LEAD-only profile edit, and the only carrier for `avatarUrl` / `bannerUrl` —
 * `CreateCircleInput` has neither, because `CreateCircleRequest` in the frozen
 * proto has neither.
 *
 * Every field except `circleId` is omitted-means-unchanged, so a caller that
 * only has a banner sends only a banner.
 */
export interface UpdateCircleProfileInput {
  circleId: string;
  name?: string | null;
  tagline?: string | null;
  description?: string | null;
  handle?: string | null;
  /** Public URL from `getUploadUrl`, category `community_avatar`. */
  avatarUrl?: string | null;
  /** Public URL from `getUploadUrl`, category `cover`. */
  bannerUrl?: string | null;
  /**
   * Requires the CUSTOM_BRANDING entitlement, enforced by circle-service. On a
   * plan without it the value is kept and suppressed on read, never nulled.
   */
  brandJson?: string | null;
}

export interface InviteToCircleInput {
  circleId: string;
  /** For an existing platform user. */
  inviteeUserId?: string | null;
  /** Email / phone, for someone not on the platform yet. */
  inviteeContact?: string | null;
}

export interface OpenCircleMotionInput {
  circleId: string;
  kind: CircleMotionKind;
  title: string;
  rationale?: string | null;
  subjectType?: string | null;
  subjectId?: string | null;
  /**
   * Kind-specific arguments as a JSON string. The gateway does not parse or
   * validate it — what a kind requires is a governance question owned by
   * circle-service.
   */
  payloadJson?: string | null;
  idempotencyKey?: string | null;
}

export interface CastCircleVoteInput {
  motionId: string;
  choice: CircleVoteChoice;
}

export interface CreateCircleProjectInput {
  circleId: string;
  title: string;
  description?: string | null;
  /** Calendar date, YYYY-MM-DD. */
  startsOn?: string | null;
  dueOn?: string | null;
  idempotencyKey?: string | null;
}

export interface AddCircleProjectGoalInput {
  projectId: string;
  scope: CircleGoalScope;
  /** Required if and only if `scope` is INDIVIDUAL. */
  assigneeUserId?: string | null;
  metricKind?: CircleMetricKind | null;
  unit?: string | null;
  /** Decimal METRIC string — not money. */
  targetValue?: string | null;
  dueOn?: string | null;
}

export interface LogCircleContributionInput {
  goalId: string;
  /**
   * Signed decimal METRIC string — not money. A correction is a NEGATIVE row
   * referencing `correctsContributionId`, never an edit.
   */
  value: string;
  note?: string | null;
  evidenceUrl?: string | null;
  correctsContributionId?: string | null;
  /**
   * REQUIRED. The ledger is append-only: a flaky client retrying "log 5km"
   * would otherwise log 10km, and there is no UPDATE to un-double-count it.
   * Mint the key once per user action, not once per attempt.
   */
  idempotencyKey: string;
}

export interface CreateCircleChallengeInput {
  circleId: string;
  title: string;
  description?: string | null;
  /** IMMUTABLE once the challenge leaves DRAFT. */
  verificationMode?: CircleVerificationMode | null;
  cadence?: CircleChallengeCadence | null;
  pointsPerEntry?: number | null;
  maxEntriesPerPeriod?: number | null;
  /** ISO-8601. */
  startsAt?: string | null;
  endsAt?: string | null;
  idempotencyKey?: string | null;
}

export interface SubmitCircleChallengeEntryInput {
  challengeId: string;
  /** "2026-W09" / "2026-03-14" / "ONE_OFF" — derived by the client from cadence. */
  periodKey?: string | null;
  claimValue?: string | null;
  note?: string | null;
  evidenceUrl?: string | null;
  idempotencyKey?: string | null;
}

export interface VerifyCircleChallengeEntryInput {
  entryId: string;
  accept: boolean;
  note?: string | null;
}

// ============================================================================
// OPERATION RESULT WRAPPERS
// One `<RootField>Data` per operation — this is the `useQuery` / `useMutation`
// data generic. Nullable root fields are typed `| null` because the gateway
// declares them nullable (a non-member reading `circle` gets null, not an error).
// ============================================================================

// ── Queries ──────────────────────────────────────────────────────────────────

export interface MyCirclesData {
  myCircles: Circle[];
}

export interface SearchCirclesData {
  searchCircles: CirclePublicCard[];
}

export interface CirclePublicCardData {
  circlePublicCard: CirclePublicCard | null;
}

export interface MyCircleInvitationsData {
  myCircleInvitations: CircleInvitation[];
}

export interface CircleData {
  circle: Circle | null;
}

export interface MyCircleMembershipData {
  myCircleMembership: CircleMembershipCheck;
}

export interface CircleMembersData {
  circleMembers: CircleMember[];
}

export interface CircleInvitationsData {
  circleInvitations: CircleInvitation[];
}

export interface CircleJoinRequestsData {
  circleJoinRequests: CircleJoinRequest[];
}

export interface CircleChatData {
  circleChat: CircleChat | null;
}

export interface CircleMotionsData {
  circleMotions: CircleMotion[];
}

export interface CircleMotionData {
  circleMotion: CircleMotion | null;
}

export interface CircleMotionTallyData {
  circleMotionTally: CircleMotionTally | null;
}

export interface CircleGovernanceRulesData {
  circleGovernanceRules: CircleGovernanceRule[];
}

export interface CircleProjectsData {
  circleProjects: CircleProject[];
}

export interface CircleProjectData {
  circleProject: CircleProject | null;
}

export interface CircleProjectGoalsData {
  circleProjectGoals: CircleProjectGoal[];
}

export interface CircleGoalProgressData {
  circleGoalProgress: CircleGoalProgress | null;
}

export interface CircleContributionsData {
  circleContributions: CircleContribution[];
}

export interface CircleChallengesData {
  circleChallenges: CircleChallenge[];
}

export interface CircleChallengeData {
  circleChallenge: CircleChallenge | null;
}

export interface CircleChallengeEntriesData {
  circleChallengeEntries: CircleChallengeEntry[];
}

export interface CircleLeaderboardData {
  circleLeaderboard: CircleLeaderboard | null;
}

export interface CircleMemberScoreData {
  circleMemberScore: CircleLeaderboardRow | null;
}

export interface CircleEntitlementsData {
  circleEntitlements: CircleEntitlements | null;
}

export interface CirclePlansData {
  circlePlans: CirclePlan[];
}

export interface CircleSubscriptionData {
  circleSubscription: CircleSubscription | null;
}

// ── Mutations ────────────────────────────────────────────────────────────────

export interface CreateCircleData {
  createCircle: Circle;
}

export interface UpdateCircleProfileData {
  updateCircleProfile: Circle;
}

export interface RequestToJoinCircleData {
  requestToJoinCircle: CircleJoinRequest;
}

export interface WithdrawJoinRequestData {
  withdrawJoinRequest: CircleJoinRequest;
}

export interface RespondToCircleInvitationData {
  respondToCircleInvitation: CircleInvitation;
}

export interface InviteToCircleData {
  inviteToCircle: CircleInvitation;
}

export interface LeaveCircleData {
  leaveCircle: CircleMember;
}

export interface OpenCircleMotionData {
  openCircleMotion: CircleMotion;
}

export interface CastCircleVoteData {
  castCircleVote: CircleVote;
}

export interface CastCircleVoteAndTallyData {
  castCircleVoteAndTally: CircleMotionTally;
}

export interface WithdrawCircleMotionData {
  withdrawCircleMotion: CircleMotion;
}

export interface EnactCircleMotionData {
  enactCircleMotion: CircleMotion;
}

export interface CreateCircleProjectData {
  createCircleProject: CircleProject;
}

export interface CloseCircleProjectData {
  closeCircleProject: CircleProject;
}

export interface AddCircleProjectGoalData {
  addCircleProjectGoal: CircleProjectGoal;
}

export interface LogCircleContributionData {
  logCircleContribution: CircleContributionResult;
}

export interface CreateCircleChallengeData {
  createCircleChallenge: CircleChallenge;
}

export interface ActivateCircleChallengeData {
  activateCircleChallenge: CircleChallenge;
}

export interface CloseCircleChallengeData {
  closeCircleChallenge: CircleChallenge;
}

export interface SubmitCircleChallengeEntryData {
  submitCircleChallengeEntry: CircleChallengeEntry;
}

export interface VerifyCircleChallengeEntryData {
  verifyCircleChallengeEntry: CircleChallengeEntry;
}

// ============================================================================
// OPERATION VARIABLES
// ============================================================================

export interface PaginationVariables {
  limit?: number | null;
  offset?: number | null;
}

export type MyCirclesVariables = PaginationVariables;

export interface SearchCirclesVariables extends PaginationVariables {
  query?: string | null;
}

export type MyCircleInvitationsVariables = PaginationVariables;

export interface CircleIdVariables {
  circleId: string;
}

export type CirclePublicCardVariables = CircleIdVariables;
export type CircleVariables = CircleIdVariables;
export type MyCircleMembershipVariables = CircleIdVariables;
export type CircleChatVariables = CircleIdVariables;
export type CircleGovernanceRulesVariables = CircleIdVariables;
export type CircleEntitlementsVariables = CircleIdVariables;
export type CircleSubscriptionVariables = CircleIdVariables;
export type LeaveCircleVariables = CircleIdVariables;

export interface CircleMembersVariables extends PaginationVariables {
  circleId: string;
  status?: CircleMembershipStatus | null;
}

export interface CircleInvitationsVariables extends PaginationVariables {
  circleId: string;
}

export interface CircleJoinRequestsVariables extends PaginationVariables {
  circleId: string;
  status?: CircleJoinRequestStatus | null;
}

export interface CircleMotionsVariables extends PaginationVariables {
  circleId: string;
  status?: CircleMotionStatus | null;
  kind?: CircleMotionKind | null;
}

/**
 * `circleId` accompanies `motionId` so the gateway's membership gate has
 * something to check before fetching the motion. circle-service re-validates
 * the pair, so a mismatch is refused rather than granting anything.
 */
export interface CircleMotionVariables {
  circleId: string;
  motionId: string;
}

export type CircleMotionTallyVariables = CircleMotionVariables;
export type WithdrawCircleMotionVariables = CircleMotionVariables;
export type EnactCircleMotionVariables = CircleMotionVariables;

export interface CircleProjectsVariables extends PaginationVariables {
  circleId: string;
  status?: CircleProjectStatus | null;
}

export interface CircleProjectVariables {
  circleId: string;
  projectId: string;
}

export type CircleProjectGoalsVariables = CircleProjectVariables;
export type CloseCircleProjectVariables = CircleProjectVariables;

export interface CircleGoalProgressVariables {
  circleId: string;
  goalId: string;
}

export interface CircleContributionsVariables extends PaginationVariables {
  circleId: string;
  goalId: string;
  contributorUserId?: string | null;
}

export interface CircleChallengesVariables extends PaginationVariables {
  circleId: string;
  status?: CircleChallengeStatus | null;
}

export interface CircleChallengeVariables {
  circleId: string;
  challengeId: string;
}

export type ActivateCircleChallengeVariables = CircleChallengeVariables;
export type CloseCircleChallengeVariables = CircleChallengeVariables;

export interface CircleChallengeEntriesVariables extends PaginationVariables {
  circleId: string;
  challengeId: string;
  userId?: string | null;
  verificationState?: CircleEntryVerificationState | null;
}

export interface CircleLeaderboardVariables {
  circleId: string;
  seasonKey?: string | null;
  limit?: number | null;
}

export interface CircleMemberScoreVariables {
  circleId: string;
  userId: string;
  seasonKey?: string | null;
}

export interface CirclePlansVariables {
  ownerKind?: CircleOwnerType | null;
}

export interface CreateCircleVariables {
  input: CreateCircleInput;
}

export interface UpdateCircleProfileVariables {
  input: UpdateCircleProfileInput;
}

export interface RequestToJoinCircleVariables {
  circleId: string;
  note?: string | null;
}

export interface WithdrawJoinRequestVariables {
  joinRequestId: string;
}

export interface RespondToCircleInvitationVariables {
  invitationId: string;
  accept: boolean;
}

export interface InviteToCircleVariables {
  input: InviteToCircleInput;
}

export interface OpenCircleMotionVariables {
  input: OpenCircleMotionInput;
}

export interface CastCircleVoteVariables {
  circleId: string;
  input: CastCircleVoteInput;
}

export type CastCircleVoteAndTallyVariables = CastCircleVoteVariables;

export interface CreateCircleProjectVariables {
  input: CreateCircleProjectInput;
}

export interface AddCircleProjectGoalVariables {
  circleId: string;
  input: AddCircleProjectGoalInput;
}

export interface LogCircleContributionVariables {
  circleId: string;
  input: LogCircleContributionInput;
}

export interface CreateCircleChallengeVariables {
  input: CreateCircleChallengeInput;
}

export interface SubmitCircleChallengeEntryVariables {
  circleId: string;
  input: SubmitCircleChallengeEntryInput;
}

export interface VerifyCircleChallengeEntryVariables {
  circleId: string;
  input: VerifyCircleChallengeEntryInput;
}
