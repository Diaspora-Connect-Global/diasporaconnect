import { gql } from '@apollo/client';
import type {
  CircleEntitlement,
  CircleEntitlementKey,
  CircleEntitlementUsage,
  CircleIntLimit,
} from './types/circles';

/**
 * @fileoverview GraphQL operations for the Circles feature.
 * @module services/gql/circles
 *
 * Mirrors the api-gateway `circle` module (code-first GraphQL):
 *   services/api-gateway/src/circle/{circle,circle-governance,circle-plan}.resolver.ts
 *
 * ── NAMING ──────────────────────────────────────────────────────────────────
 * Every circle GraphQL type is `Circle`-prefixed (`CircleMotion`, `CirclePlan`,
 * `CircleMemberRole`, …) because the gateway schema is one flat namespace and
 * bare names like `MemberRole` were already taken by the group module. The root
 * FIELD names are not uniformly prefixed, so they are spelled here exactly as
 * the resolvers register them — note `circleMotion` / `circleProject` /
 * `circleChallenge` / `logCircleContribution` rather than the shorter names the
 * UI mockups use.
 *
 * ── ENUMS TRAVEL AS STRINGS ─────────────────────────────────────────────────
 * The gateway registers each enum with `registerEnumType`, so a variable is
 * declared with its GraphQL enum name (e.g. `$status: CircleMotionStatus`) and
 * the value sent is the SCREAMING_SNAKE string.
 *
 * ── MONEY ───────────────────────────────────────────────────────────────────
 * `amountMinor` (CirclePlanPrice / CircleSubscription) is an INTEGER in the
 * currency's minor units. Format it with `formatMoney` from `@/types/money` at
 * the render boundary — never divide here.
 *
 * NOT money: `targetValue` / `currentValue` / `value` on goals and
 * contributions are decimal METRIC strings ("42.195" km, "1500" push-ups).
 * They are strings to keep an append-only ledger summing exactly. Never run
 * them through a money formatter.
 */

// ─── Fragments ────────────────────────────────────────────────────────────────

/**
 * The full member-visible circle aggregate. Reused by `myCircles`, `circle` and
 * `createCircle`, which all return `Circle`.
 *
 * `memberCount` is computed at read time from active memberships — there is no
 * stored counter to drift.
 */
export const CIRCLE_SUMMARY_FRAGMENT = gql`
  fragment CircleSummaryFields on Circle {
    id
    circleNumber
    name
    handle
    tagline
    description
    avatarUrl
    bannerUrl
    brandJson
    discoverable
    joinMode
    status
    founderUserId
    chatConversationId
    memberCount
    createdAt
    updatedAt
    archivedAt
  }
`;

/**
 * The public face of a circle, for discovery. `CirclePublicCard` is a DISTINCT
 * gateway type rather than a filtered `Circle` — everything a non-member may
 * see is enumerated on it — so never substitute one for the other.
 */
export const CIRCLE_PUBLIC_CARD_FRAGMENT = gql`
  fragment CirclePublicCardFields on CirclePublicCard {
    id
    name
    handle
    tagline
    avatarUrl
    bannerUrl
    memberCount
    joinMode
    discoverable
    createdAt
  }
`;

export const CIRCLE_MEMBER_FRAGMENT = gql`
  fragment CircleMemberFields on CircleMember {
    id
    circleId
    userId
    role
    status
    invitedBy
    removedByMotionId
    joinedAt
    leftAt
  }
`;

export const CIRCLE_INVITATION_FRAGMENT = gql`
  fragment CircleInvitationFields on CircleInvitation {
    id
    circleId
    inviteeUserId
    inviteeContact
    invitedBy
    status
    expiresAt
    createdAt
  }
`;

export const CIRCLE_JOIN_REQUEST_FRAGMENT = gql`
  fragment CircleJoinRequestFields on CircleJoinRequest {
    id
    circleId
    userId
    note
    status
    decidedByUserId
    decidedByMotionId
    createdAt
    decidedAt
  }
`;

/**
 * A motion, INCLUDING the block of fields pinned when it opened.
 *
 * `ruleId` / `ruleVersion` / `quorum*` / `majority*` / `tieBreaksTo` /
 * `electorateSize` / `opensAt` / `closesAt` are a SNAPSHOT taken at open time.
 * They are deliberately NOT today's governance rule: if a motion were rendered
 * against the live rule, then passing a motion that lowered the majority would
 * retroactively flip every other vote in progress and the audit trail would
 * show a legitimate-looking result.
 *
 * So: render a motion's thresholds from THESE fields. Do not "simplify" this by
 * reading `circleGovernanceRules` — that query answers a different question
 * (what a NEW motion would be opened under).
 */
export const CIRCLE_MOTION_FRAGMENT = gql`
  fragment CircleMotionFields on CircleMotion {
    id
    circleId
    motionNumber
    kind
    title
    rationale
    proposedBy
    subjectType
    subjectId
    payloadJson
    status
    ruleId
    ruleVersion
    quorumNumerator
    quorumDenominator
    majorityNumerator
    majorityDenominator
    tieBreaksTo
    electorateSize
    opensAt
    closesAt
    outcomeYes
    outcomeNo
    outcomeAbstain
    enactmentError
    decidedAt
    enactedAt
    createdAt
  }
`;

/**
 * The live tally, computed by circle-service against the motion's PINNED
 * quorum / majority / electorate size. `provisionalOutcome` is provisional by
 * name and nature — votes stay changeable until the window closes.
 */
export const CIRCLE_MOTION_TALLY_FRAGMENT = gql`
  fragment CircleMotionTallyFields on CircleMotionTally {
    motionId
    yes
    no
    abstain
    notVoted
    electorateSize
    quorumMet
    majorityMet
    provisionalOutcome
    closesAt
  }
`;

export const CIRCLE_PROJECT_FRAGMENT = gql`
  fragment CircleProjectFields on CircleProject {
    id
    circleId
    projectNumber
    title
    description
    status
    coverUrl
    createdBy
    createdByMotionId
    startsOn
    dueOn
    completedAt
    createdAt
    updatedAt
  }
`;

/** `targetValue` is a decimal METRIC string, not money. */
export const CIRCLE_PROJECT_GOAL_FRAGMENT = gql`
  fragment CircleProjectGoalFields on CircleProjectGoal {
    id
    projectId
    scope
    assigneeUserId
    metricKind
    unit
    targetValue
    status
    dueOn
    createdAt
  }
`;

/**
 * `currentValue` is a SUM over the append-only contribution ledger, never a
 * stored counter. `byMember` keeps a shared goal's progress attributable.
 */
export const CIRCLE_GOAL_PROGRESS_FRAGMENT = gql`
  fragment CircleGoalProgressFields on CircleGoalProgress {
    goalId
    targetValue
    currentValue
    percentComplete
    byMember {
      userId
      value
      percentOfTotal
    }
  }
`;

/** `value` is a SIGNED decimal metric string; a correction is a negative row. */
export const CIRCLE_CONTRIBUTION_FRAGMENT = gql`
  fragment CircleContributionFields on CircleContribution {
    id
    circleId
    projectId
    goalId
    contributorUserId
    value
    note
    evidenceUrl
    correctsContributionId
    createdAt
  }
`;

export const CIRCLE_CHALLENGE_FRAGMENT = gql`
  fragment CircleChallengeFields on CircleChallenge {
    id
    circleId
    challengeNumber
    title
    description
    status
    verificationMode
    cadence
    pointsPerEntry
    maxEntriesPerPeriod
    createdBy
    createdByMotionId
    startsAt
    endsAt
    createdAt
  }
`;

export const CIRCLE_CHALLENGE_ENTRY_FRAGMENT = gql`
  fragment CircleChallengeEntryFields on CircleChallengeEntry {
    id
    challengeId
    circleId
    userId
    periodKey
    claimValue
    note
    evidenceUrl
    verificationState
    verifiedByUserId
    verifiedByMotionId
    submittedAt
    verifiedAt
  }
`;

/**
 * One capability.
 *
 * READ `hasIntValue` BEFORE `intValue`. When `valueKind` is INT and
 * `hasIntValue` is false the entitlement is UNLIMITED, not zero — always select
 * both fields together.
 */
export const CIRCLE_ENTITLEMENT_FRAGMENT = gql`
  fragment CircleEntitlementFields on CircleEntitlement {
    key
    valueKind
    intValue
    hasIntValue
    boolValue
  }
`;

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Circles index — the caller's own circles. */
export const MY_CIRCLES = gql`
  query MyCircles($limit: Int, $offset: Int) {
    myCircles(limit: $limit, offset: $offset) {
      ...CircleSummaryFields
    }
  }
  ${CIRCLE_SUMMARY_FRAGMENT}
`;

/**
 * Circles index — discover. Only `discoverable = true` circles are indexed at
 * all, so this can never surface a private circle.
 */
export const SEARCH_CIRCLES = gql`
  query SearchCircles($query: String, $limit: Int, $offset: Int) {
    searchCircles(query: $query, limit: $limit, offset: $offset) {
      ...CirclePublicCardFields
    }
  }
  ${CIRCLE_PUBLIC_CARD_FRAGMENT}
`;

/** The public card for one circle — what a non-member sees before joining. */
export const CIRCLE_PUBLIC_CARD = gql`
  query CirclePublicCard($circleId: ID!) {
    circlePublicCard(circleId: $circleId) {
      ...CirclePublicCardFields
    }
  }
  ${CIRCLE_PUBLIC_CARD_FRAGMENT}
`;

/** The caller's invitation inbox. */
export const MY_CIRCLE_INVITATIONS = gql`
  query MyCircleInvitations($limit: Int, $offset: Int) {
    myCircleInvitations(limit: $limit, offset: $offset) {
      ...CircleInvitationFields
    }
  }
  ${CIRCLE_INVITATION_FRAGMENT}
`;

/** Circle home — the member-visible aggregate. Null when not a member. */
export const CIRCLE = gql`
  query Circle($circleId: ID!) {
    circle(circleId: $circleId) {
      ...CircleSummaryFields
    }
  }
  ${CIRCLE_SUMMARY_FRAGMENT}
`;

/**
 * The caller's own standing, so the UI can hide actions it knows will be
 * refused. Advisory for the client and authoritative for the gateway — the same
 * rpc backs its member/lead gates. Fail-closed: an unreachable circle-service
 * renders as "not a member" rather than erroring the page.
 *
 * `canPropose` is decided by circle-service against the circle's own pinned
 * rule; never recompute it client-side.
 */
export const MY_CIRCLE_MEMBERSHIP = gql`
  query MyCircleMembership($circleId: ID!) {
    myCircleMembership(circleId: $circleId) {
      isMember
      status
      role
      isLead
      canPropose
    }
  }
`;

/** Members list. */
export const CIRCLE_MEMBERS = gql`
  query CircleMembers(
    $circleId: ID!
    $status: CircleMembershipStatus
    $limit: Int
    $offset: Int
  ) {
    circleMembers(
      circleId: $circleId
      status: $status
      limit: $limit
      offset: $offset
    ) {
      ...CircleMemberFields
    }
  }
  ${CIRCLE_MEMBER_FRAGMENT}
`;

/** Members list — pending invitations sent by the circle (LEAD-gated). */
export const CIRCLE_INVITATIONS = gql`
  query CircleInvitations($circleId: ID!, $limit: Int, $offset: Int) {
    circleInvitations(circleId: $circleId, limit: $limit, offset: $offset) {
      ...CircleInvitationFields
    }
  }
  ${CIRCLE_INVITATION_FRAGMENT}
`;

/** Members list — inbound join requests. */
export const CIRCLE_JOIN_REQUESTS = gql`
  query CircleJoinRequests(
    $circleId: ID!
    $status: CircleJoinRequestStatus
    $limit: Int
    $offset: Int
  ) {
    circleJoinRequests(
      circleId: $circleId
      status: $status
      limit: $limit
      offset: $offset
    ) {
      ...CircleJoinRequestFields
    }
  }
  ${CIRCLE_JOIN_REQUEST_FRAGMENT}
`;

/**
 * Circle home chat handle. `historyDays` comes from the CHAT_HISTORY_DAYS
 * entitlement and is a READ FILTER, not a deletion — a plan change hides older
 * messages and a re-upgrade brings them straight back.
 */
export const CIRCLE_CHAT = gql`
  query CircleChat($circleId: ID!) {
    circleChat(circleId: $circleId) {
      circleId
      conversationId
      available
      historyDays
      historyLimited
    }
  }
`;

/** Circle home — inline motion cards. */
export const CIRCLE_MOTIONS = gql`
  query CircleMotions(
    $circleId: ID!
    $status: CircleMotionStatus
    $kind: CircleMotionKind
    $limit: Int
    $offset: Int
  ) {
    circleMotions(
      circleId: $circleId
      status: $status
      kind: $kind
      limit: $limit
      offset: $offset
    ) {
      ...CircleMotionFields
    }
  }
  ${CIRCLE_MOTION_FRAGMENT}
`;

/**
 * Motion detail. `circleId` is required alongside `motionId` so the gateway's
 * membership gate has something to check before fetching the motion.
 */
export const CIRCLE_MOTION = gql`
  query CircleMotion($circleId: ID!, $motionId: ID!) {
    circleMotion(circleId: $circleId, motionId: $motionId) {
      ...CircleMotionFields
    }
  }
  ${CIRCLE_MOTION_FRAGMENT}
`;

/** Motion detail — the live count, against the motion's pinned thresholds. */
export const CIRCLE_MOTION_TALLY = gql`
  query CircleMotionTally($circleId: ID!, $motionId: ID!) {
    circleMotionTally(circleId: $circleId, motionId: $motionId) {
      ...CircleMotionTallyFields
    }
  }
  ${CIRCLE_MOTION_TALLY_FRAGMENT}
`;

/**
 * The live rule for each motion kind — one row per kind.
 *
 * Use this ONLY to preview what a motion the user is about to OPEN would be
 * bound by. To render an existing motion, read the pinned fields on the motion
 * itself (see `CIRCLE_MOTION_FRAGMENT`); these rows are today's rule and may
 * already have superseded the one that motion opened under.
 */
export const CIRCLE_GOVERNANCE_RULES = gql`
  query CircleGovernanceRules($circleId: ID!) {
    circleGovernanceRules(circleId: $circleId) {
      id
      circleId
      version
      motionKind
      quorumNumerator
      quorumDenominator
      majorityNumerator
      majorityDenominator
      votingWindowHours
      proposerRole
      tieBreaksTo
      createdByMotionId
      effectiveFrom
      supersededAt
    }
  }
`;

/** Circle home — inline project cards. */
export const CIRCLE_PROJECTS = gql`
  query CircleProjects(
    $circleId: ID!
    $status: CircleProjectStatus
    $limit: Int
    $offset: Int
  ) {
    circleProjects(
      circleId: $circleId
      status: $status
      limit: $limit
      offset: $offset
    ) {
      ...CircleProjectFields
    }
  }
  ${CIRCLE_PROJECT_FRAGMENT}
`;

/** Project detail. */
export const CIRCLE_PROJECT = gql`
  query CircleProject($circleId: ID!, $projectId: ID!) {
    circleProject(circleId: $circleId, projectId: $projectId) {
      ...CircleProjectFields
    }
  }
  ${CIRCLE_PROJECT_FRAGMENT}
`;

/** Project detail — the project's goals. */
export const CIRCLE_PROJECT_GOALS = gql`
  query CircleProjectGoals($circleId: ID!, $projectId: ID!) {
    circleProjectGoals(circleId: $circleId, projectId: $projectId) {
      ...CircleProjectGoalFields
    }
  }
  ${CIRCLE_PROJECT_GOAL_FRAGMENT}
`;

/** Project detail — progress on one goal, with the per-member breakdown. */
export const CIRCLE_GOAL_PROGRESS = gql`
  query CircleGoalProgress($circleId: ID!, $goalId: ID!) {
    circleGoalProgress(circleId: $circleId, goalId: $goalId) {
      ...CircleGoalProgressFields
    }
  }
  ${CIRCLE_GOAL_PROGRESS_FRAGMENT}
`;

/** Project detail — the append-only contribution ledger for one goal. */
export const CIRCLE_CONTRIBUTIONS = gql`
  query CircleContributions(
    $circleId: ID!
    $goalId: ID!
    $contributorUserId: ID
    $limit: Int
    $offset: Int
  ) {
    circleContributions(
      circleId: $circleId
      goalId: $goalId
      contributorUserId: $contributorUserId
      limit: $limit
      offset: $offset
    ) {
      ...CircleContributionFields
    }
  }
  ${CIRCLE_CONTRIBUTION_FRAGMENT}
`;

/** Circle home — inline challenge cards. */
export const CIRCLE_CHALLENGES = gql`
  query CircleChallenges(
    $circleId: ID!
    $status: CircleChallengeStatus
    $limit: Int
    $offset: Int
  ) {
    circleChallenges(
      circleId: $circleId
      status: $status
      limit: $limit
      offset: $offset
    ) {
      ...CircleChallengeFields
    }
  }
  ${CIRCLE_CHALLENGE_FRAGMENT}
`;

/** Challenge detail. */
export const CIRCLE_CHALLENGE = gql`
  query CircleChallenge($circleId: ID!, $challengeId: ID!) {
    circleChallenge(circleId: $circleId, challengeId: $challengeId) {
      ...CircleChallengeFields
    }
  }
  ${CIRCLE_CHALLENGE_FRAGMENT}
`;

/** Challenge detail — submitted entries. */
export const CIRCLE_CHALLENGE_ENTRIES = gql`
  query CircleChallengeEntries(
    $circleId: ID!
    $challengeId: ID!
    $userId: ID
    $verificationState: CircleEntryVerificationState
    $limit: Int
    $offset: Int
  ) {
    circleChallengeEntries(
      circleId: $circleId
      challengeId: $challengeId
      userId: $userId
      verificationState: $verificationState
      limit: $limit
      offset: $offset
    ) {
      ...CircleChallengeEntryFields
    }
  }
  ${CIRCLE_CHALLENGE_ENTRY_FRAGMENT}
`;

/**
 * Leaderboard — ranked AND collective modes come from this one query.
 *
 * When `rankingEnabled` is false the circle has switched individual ranking off
 * and the client must render ONLY `collectiveTotal`, not `rows`.
 */
export const CIRCLE_LEADERBOARD = gql`
  query CircleLeaderboard($circleId: ID!, $seasonKey: String, $limit: Int) {
    circleLeaderboard(circleId: $circleId, seasonKey: $seasonKey, limit: $limit) {
      circleId
      seasonKey
      rankingEnabled
      collectiveTotal
      rows {
        userId
        points
        rank
        entries
      }
    }
  }
`;

/** Leaderboard — one member's standing. */
export const CIRCLE_MEMBER_SCORE = gql`
  query CircleMemberScore($circleId: ID!, $userId: ID!, $seasonKey: String) {
    circleMemberScore(circleId: $circleId, userId: $userId, seasonKey: $seasonKey) {
      userId
      points
      rank
      entries
    }
  }
`;

/**
 * What this circle MAY DO, and what it is currently using. Gate UI affordances
 * on this — never on a tier name.
 *
 * On an INT entitlement, `hasIntValue: false` means UNLIMITED, not zero. In
 * `usage`, `hasLimit: false` means the same. `locked: true` means a cap is met
 * or exceeded (normally after a plan change that lowered it): existing members
 * and projects are KEPT, only new ones are refused.
 */
export const CIRCLE_ENTITLEMENTS = gql`
  query CircleEntitlements($circleId: ID!) {
    circleEntitlements(circleId: $circleId) {
      ownerType
      ownerId
      entitlements {
        ...CircleEntitlementFields
      }
      usage {
        key
        current
        limit
        hasLimit
        locked
      }
    }
  }
  ${CIRCLE_ENTITLEMENT_FRAGMENT}
`;

/**
 * The plan catalogue. `amountMinor` is INTEGER minor units — format with
 * `formatMoney` from `@/types/money`, never divide here. A yearly price is its
 * own number, not 12× the monthly one.
 */
export const CIRCLE_PLANS = gql`
  query CirclePlans($ownerKind: CircleOwnerType) {
    circlePlans(ownerKind: $ownerKind) {
      id
      code
      name
      description
      ownerKind
      isDefault
      isActive
      sortOrder
      version
      prices {
        id
        planId
        currency
        interval
        amountMinor
      }
      entitlements {
        ...CircleEntitlementFields
      }
    }
  }
  ${CIRCLE_ENTITLEMENT_FRAGMENT}
`;

/**
 * This circle's subscription. Exactly one always exists (the free plan is
 * priced at zero, not absent), so never branch on "has a subscription".
 * `planCode` is for DISPLAY only — read `entitlements` to decide capability.
 */
export const CIRCLE_SUBSCRIPTION = gql`
  query CircleSubscription($circleId: ID!) {
    circleSubscription(circleId: $circleId) {
      id
      ownerType
      ownerId
      planId
      planCode
      planVersion
      currency
      amountMinor
      interval
      status
      purchasedByUserId
      cancelAtPeriodEnd
      currentPeriodStart
      currentPeriodEnd
      createdAt
      entitlements {
        ...CircleEntitlementFields
      }
    }
  }
  ${CIRCLE_ENTITLEMENT_FRAGMENT}
`;

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Create a circle. `discoverable` and `joinMode` are independent axes. */
export const CREATE_CIRCLE = gql`
  mutation CreateCircle($input: CreateCircleInput!) {
    createCircle(input: $input) {
      ...CircleSummaryFields
    }
  }
  ${CIRCLE_SUMMARY_FRAGMENT}
`;

/**
 * Edit a circle's profile — LEAD only (`assertCircleLead` in the gateway).
 *
 * This is the ONLY way to attach an avatar or a banner. `CreateCircleInput`
 * carries neither, and cannot: `CreateCircleRequest` in the frozen
 * `circle.proto` has no `avatar_url` / `banner_url` field, so a value added to
 * the create mutation would be accepted by GraphQL and dropped by
 * circle-service. Creation and imagery are therefore two calls, in that order —
 * the circle id does not exist until the first one returns, and its founder is
 * a LEAD from that moment, so the gate passes immediately.
 *
 * Every field but `circleId` is optional and omitted-means-unchanged. Sending
 * `bannerUrl` alone leaves the avatar, name and handle exactly as they were.
 */
export const UPDATE_CIRCLE_PROFILE = gql`
  mutation UpdateCircleProfile($input: UpdateCircleProfileInput!) {
    updateCircleProfile(input: $input) {
      ...CircleSummaryFields
    }
  }
  ${CIRCLE_SUMMARY_FRAGMENT}
`;

/** Ask to join a REQUEST-mode circle. */
export const REQUEST_TO_JOIN_CIRCLE = gql`
  mutation RequestToJoinCircle($circleId: ID!, $note: String) {
    requestToJoinCircle(circleId: $circleId, note: $note) {
      ...CircleJoinRequestFields
    }
  }
  ${CIRCLE_JOIN_REQUEST_FRAGMENT}
`;

export const WITHDRAW_JOIN_REQUEST = gql`
  mutation WithdrawJoinRequest($joinRequestId: ID!) {
    withdrawJoinRequest(joinRequestId: $joinRequestId) {
      ...CircleJoinRequestFields
    }
  }
  ${CIRCLE_JOIN_REQUEST_FRAGMENT}
`;

/** Accept or decline an invitation. Accepting is where MAX_MEMBERS is enforced. */
export const RESPOND_TO_CIRCLE_INVITATION = gql`
  mutation RespondToCircleInvitation($invitationId: ID!, $accept: Boolean!) {
    respondToCircleInvitation(invitationId: $invitationId, accept: $accept) {
      ...CircleInvitationFields
    }
  }
  ${CIRCLE_INVITATION_FRAGMENT}
`;

/** Invite someone — by `inviteeUserId`, or by `inviteeContact` if they are not on the platform. */
export const INVITE_TO_CIRCLE = gql`
  mutation InviteToCircle($input: InviteToCircleInput!) {
    inviteToCircle(input: $input) {
      ...CircleInvitationFields
    }
  }
  ${CIRCLE_INVITATION_FRAGMENT}
`;

/** Leave a circle. Self-scoped; the ≥1-active-LEAD invariant is enforced service-side. */
export const LEAVE_CIRCLE = gql`
  mutation LeaveCircle($circleId: ID!) {
    leaveCircle(circleId: $circleId) {
      ...CircleMemberFields
    }
  }
  ${CIRCLE_MEMBER_FRAGMENT}
`;

/**
 * Open a motion. There is deliberately no mutation for removing a member,
 * appointing a lead or overriding a vote — every such change is the ENACTMENT
 * of a passed motion, so `openCircleMotion` with the matching `kind` is the
 * only way to express it.
 *
 * Who may propose which kind is `proposerRole` on the circle's pinned rule and
 * is enforced inside circle-service; do not gate on it client-side beyond the
 * advisory `canPropose` from `myCircleMembership`.
 */
export const OPEN_CIRCLE_MOTION = gql`
  mutation OpenCircleMotion($input: OpenCircleMotionInput!) {
    openCircleMotion(input: $input) {
      ...CircleMotionFields
    }
  }
  ${CIRCLE_MOTION_FRAGMENT}
`;

/** Cast or CHANGE a vote — changeable until the motion closes; every change is audited. */
export const CAST_CIRCLE_VOTE = gql`
  mutation CastCircleVote($circleId: ID!, $input: CastCircleVoteInput!) {
    castCircleVote(circleId: $circleId, input: $input) {
      id
      motionId
      voterUserId
      choice
      castAt
      changedAt
    }
  }
`;

/** The same write, returning the refreshed tally instead — saves a round trip. */
export const CAST_CIRCLE_VOTE_AND_TALLY = gql`
  mutation CastCircleVoteAndTally($circleId: ID!, $input: CastCircleVoteInput!) {
    castCircleVoteAndTally(circleId: $circleId, input: $input) {
      ...CircleMotionTallyFields
    }
  }
  ${CIRCLE_MOTION_TALLY_FRAGMENT}
`;

export const WITHDRAW_CIRCLE_MOTION = gql`
  mutation WithdrawCircleMotion($circleId: ID!, $motionId: ID!) {
    withdrawCircleMotion(circleId: $circleId, motionId: $motionId) {
      ...CircleMotionFields
    }
  }
  ${CIRCLE_MOTION_FRAGMENT}
`;

/**
 * Apply a PASSED motion. Enactment can legitimately fail (over an entitlement
 * cap, member already left) — that returns normally with
 * `status: ENACTMENT_FAILED` and `enactmentError` set, NOT a GraphQL error.
 * Surface it; never swallow it.
 */
export const ENACT_CIRCLE_MOTION = gql`
  mutation EnactCircleMotion($circleId: ID!, $motionId: ID!) {
    enactCircleMotion(circleId: $circleId, motionId: $motionId) {
      ...CircleMotionFields
    }
  }
  ${CIRCLE_MOTION_FRAGMENT}
`;

/**
 * Create a project directly. CREATE_PROJECT is also a MotionKind, so a circle
 * whose rules require a motion will have this refused by circle-service with an
 * explanatory message — that refusal is the intended UX, not a bug.
 */
export const CREATE_CIRCLE_PROJECT = gql`
  mutation CreateCircleProject($input: CreateCircleProjectInput!) {
    createCircleProject(input: $input) {
      ...CircleProjectFields
    }
  }
  ${CIRCLE_PROJECT_FRAGMENT}
`;

export const CLOSE_CIRCLE_PROJECT = gql`
  mutation CloseCircleProject($circleId: ID!, $projectId: ID!) {
    closeCircleProject(circleId: $circleId, projectId: $projectId) {
      ...CircleProjectFields
    }
  }
  ${CIRCLE_PROJECT_FRAGMENT}
`;

/** `targetValue` is a decimal metric string; `assigneeUserId` is required iff scope is INDIVIDUAL. */
export const ADD_CIRCLE_PROJECT_GOAL = gql`
  mutation AddCircleProjectGoal($circleId: ID!, $input: AddCircleProjectGoalInput!) {
    addCircleProjectGoal(circleId: $circleId, input: $input) {
      ...CircleProjectGoalFields
    }
  }
  ${CIRCLE_PROJECT_GOAL_FRAGMENT}
`;

/**
 * Log a contribution, returned with the goal's recomputed progress.
 *
 * `input.idempotencyKey` is REQUIRED: the ledger is append-only, so a flaky
 * client retrying "log 5km" would otherwise log 10km and there is no UPDATE to
 * un-double-count it. Mint the key once per user action, not per attempt.
 */
export const LOG_CIRCLE_CONTRIBUTION = gql`
  mutation LogCircleContribution($circleId: ID!, $input: LogCircleContributionInput!) {
    logCircleContribution(circleId: $circleId, input: $input) {
      contribution {
        ...CircleContributionFields
      }
      progress {
        ...CircleGoalProgressFields
      }
    }
  }
  ${CIRCLE_CONTRIBUTION_FRAGMENT}
  ${CIRCLE_GOAL_PROGRESS_FRAGMENT}
`;

export const CREATE_CIRCLE_CHALLENGE = gql`
  mutation CreateCircleChallenge($input: CreateCircleChallengeInput!) {
    createCircleChallenge(input: $input) {
      ...CircleChallengeFields
    }
  }
  ${CIRCLE_CHALLENGE_FRAGMENT}
`;

/** Activating FREEZES `verificationMode` — it is immutable once out of DRAFT. */
export const ACTIVATE_CIRCLE_CHALLENGE = gql`
  mutation ActivateCircleChallenge($circleId: ID!, $challengeId: ID!) {
    activateCircleChallenge(circleId: $circleId, challengeId: $challengeId) {
      ...CircleChallengeFields
    }
  }
  ${CIRCLE_CHALLENGE_FRAGMENT}
`;

export const CLOSE_CIRCLE_CHALLENGE = gql`
  mutation CloseCircleChallenge($circleId: ID!, $challengeId: ID!) {
    closeCircleChallenge(circleId: $circleId, challengeId: $challengeId) {
      ...CircleChallengeFields
    }
  }
  ${CIRCLE_CHALLENGE_FRAGMENT}
`;

/** `input.periodKey` ("2026-W09" / "2026-03-14" / "ONE_OFF") is derived by the client from the challenge cadence. */
export const SUBMIT_CIRCLE_CHALLENGE_ENTRY = gql`
  mutation SubmitCircleChallengeEntry(
    $circleId: ID!
    $input: SubmitCircleChallengeEntryInput!
  ) {
    submitCircleChallengeEntry(circleId: $circleId, input: $input) {
      ...CircleChallengeEntryFields
    }
  }
  ${CIRCLE_CHALLENGE_ENTRY_FRAGMENT}
`;

/**
 * The DIRECT verification path, for challenges whose `verificationMode` is
 * LEAD_CONFIRMS. A CIRCLE_CONFIRMS challenge is not verified here at all — it
 * goes through a VERIFY_CHALLENGE_ENTRY motion, and circle-service refuses this
 * mutation for one.
 */
export const VERIFY_CIRCLE_CHALLENGE_ENTRY = gql`
  mutation VerifyCircleChallengeEntry(
    $circleId: ID!
    $input: VerifyCircleChallengeEntryInput!
  ) {
    verifyCircleChallengeEntry(circleId: $circleId, input: $input) {
      ...CircleChallengeEntryFields
    }
  }
  ${CIRCLE_CHALLENGE_ENTRY_FRAGMENT}
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Find one capability in an entitlement list by key.
 *
 * Returns `undefined` when the plan does not carry that key at all — which is
 * NOT the same as the key being present but unlimited. Pass the result straight
 * to `circleEntitlementLimit` / `circleEntitlementEnabled`, which each define
 * what a missing key means for their value kind.
 */
export function findCircleEntitlement(
  entitlements: CircleEntitlement[] | null | undefined,
  key: CircleEntitlementKey,
): CircleEntitlement | undefined {
  return (entitlements ?? []).find((e) => e.key === key);
}

/**
 * Normalise an INT entitlement to `number | null`, where **`null` means
 * UNLIMITED — never zero**.
 *
 * This is the whole point of the helper. The wire carries `intValue: 0` when
 * `hasIntValue` is false, because proto3 has no nullable int, so
 * `if (e.intValue > 0)` reads an unlimited plan as one that permits nothing —
 * and it fails SILENTLY, as a UI that just refuses actions it should allow.
 *
 * A missing key also yields `null` (unlimited) on purpose: this check is
 * advisory only, and circle-service enforces every cap under a row lock. Being
 * over-permissive here costs a server-side refusal with a readable message,
 * whereas being under-permissive locks the user out of a feature they paid for
 * with no error to explain it.
 *
 * @example
 * const limit = circleEntitlementLimit(findCircleEntitlement(ents, 'MAX_MEMBERS'));
 * const atCap = limit !== null && memberCount >= limit;
 */
export function circleEntitlementLimit(
  entitlement: CircleEntitlement | null | undefined,
): CircleIntLimit {
  if (!entitlement || !entitlement.hasIntValue) return null;
  return entitlement.intValue;
}

/** The same normalisation for a usage row, where the flag is spelled `hasLimit`. */
export function circleUsageLimit(
  usage: CircleEntitlementUsage | null | undefined,
): CircleIntLimit {
  if (!usage || !usage.hasLimit) return null;
  return usage.limit;
}

/**
 * Read a BOOL capability (e.g. CUSTOM_BRANDING). Defaults to `false` when the
 * key is absent — the inverse default to `circleEntitlementLimit`, and correct
 * for the same reason: an absent boolean capability is one the plan does not
 * grant, whereas an absent integer cap is one the plan does not impose.
 */
export function circleEntitlementEnabled(
  entitlements: CircleEntitlement[] | null | undefined,
  key: CircleEntitlementKey,
): boolean {
  return findCircleEntitlement(entitlements, key)?.boolValue ?? false;
}

/**
 * Whether a usage row is at or over its cap. `locked` is computed server-side;
 * this only normalises the absent-row case to "not locked".
 *
 * A locked cap refuses NEW members / projects. It never evicts existing ones —
 * there is deliberately no eviction path in the backend to call by accident.
 */
export function isCircleUsageLocked(
  usage: CircleEntitlementUsage[] | null | undefined,
  key: CircleEntitlementKey,
): boolean {
  return (usage ?? []).find((u) => u.key === key)?.locked ?? false;
}
