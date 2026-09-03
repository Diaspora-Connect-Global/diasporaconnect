/**
 * @fileoverview Types for circle INVITE LINKS and FORMER MEMBERS.
 * @module services/gql/types/circles-invites
 *
 * A companion to `types/circles.ts`, not a replacement: everything general to
 * the feature (`CircleMember`, `CircleMembershipStatus`, the enum-vocabulary
 * rules) still lives there and is imported here read-only. This file holds the
 * shapes the members screen added on top — the invite-link surface, which
 * shipped after that file was written, and the small view-model vocabulary for
 * memberships that have ended.
 *
 * Hand-written; this repo has no graphql-codegen. The gateway is code-first,
 * so `services/api-gateway/src/circle/dto/circle.type.ts` IS the schema.
 *
 * ── THE TOKEN IS NOT A FIELD ON A LINK, AND MUST NEVER BECOME ONE ───────────
 * `CircleInviteLink` has no `token` and no `tokenHash`, deliberately, and the
 * gateway type it mirrors has neither either. The raw token exists at exactly
 * one point on the whole GraphQL surface — `CircleInviteLinkMint.token`, the
 * reply to `mintCircleInviteLink` — so that no list, read or cache entry can
 * carry a working credential. Adding the field here would not make the server
 * send one, but it would invite UI that expects to refetch a token, and there
 * is nothing that can ever return it a second time.
 *
 * ── ENUM VOCABULARY ────────────────────────────────────────────────────────
 * Same rule as `types/circles.ts`, and it is worth restating because this file
 * has one of each:
 *
 *   read back        → BARE domain value      (`ACTIVE`, `LEFT`, `EXHAUSTED`)
 *   sent as a filter → PREFIXED enum name     (`MEMBERSHIP_LEFT`)
 *
 * `CircleInviteLinkStatus` is only ever read, never sent, and the gateway
 * types it as a GraphQL `String` rather than a registered enum precisely so a
 * prefixed second spelling of these four words cannot come into existence. See
 * the note on `CircleInviteLinkStatus` below.
 */

import type { Circle, CircleMember, CircleMembershipStatus } from './circles';

// ============================================================================
// INVITE LINKS
// ============================================================================

/**
 * The state of a shareable invite link — TWO STORED, TWO DERIVED.
 *
 * `ACTIVE` and `REVOKED` are columns in `circle_invite_link`: they record a
 * decision a person made. `EXPIRED` (`expiresAt <= now`) and `EXHAUSTED`
 * (`useCount >= maxUses`) are computed at read time and are not storable — the
 * migration constrains the column to the first two — so there is no window in
 * which a stored copy could disagree with the row it describes.
 *
 * A link can satisfy several at once, so the PRECEDENCE is part of the
 * contract rather than an implementation detail:
 *
 *     REVOKED  >  EXPIRED  >  EXHAUSTED  >  ACTIVE
 *
 * It runs from the most deliberate cause to the most incidental, because that
 * is the order the person reading it cares about: "a lead took this down" is a
 * different fact from "it ran out", and reporting the second when the first is
 * also true misattributes the refusal. `resolveInviteLinkStatus` in
 * `components/circles/members/inviteLinkStatus.ts` applies it client-side.
 *
 * These are BARE values. The gateway declares `CircleInviteLink.status` as a
 * GraphQL `String`, not a registered enum, so that no prefixed variant
 * (`INVITE_LINK_ACTIVE`) exists anywhere for a comparison to be written
 * against — the same class of mismatch that once made this very screen report
 * "0 members" to a circle's own members.
 */
export type CircleInviteLinkStatus =
  | 'ACTIVE'
  | 'REVOKED'
  | 'EXPIRED'
  | 'EXHAUSTED';

/**
 * One shareable link: a URL that admits up to `maxUses` people until
 * `expiresAt`. Distinct from `CircleInvitation`, which addresses exactly one
 * person and lands in their inbox — a link is a bearer credential that whoever
 * holds it can use, that the circle cannot see the holders of, and that
 * survives being forwarded. That is why minting is lead-only while inviting a
 * named person is not.
 */
export interface CircleInviteLink {
  id: string;
  circleId: string;
  /** The lead who minted it. */
  createdBy?: string | null;
  /** Resolved four ways by circle-service. Re-derive locally — see the type. */
  status: CircleInviteLinkStatus;
  /** 1..100. There is deliberately no "unlimited". */
  maxUses: number;
  useCount: number;
  /**
   * `maxUses - useCount`, reported as 0 for ANY link that cannot be redeemed —
   * revoked and expired links included, whatever their budget says. Honest for
   * display, but it means this field cannot be used to reason about a link's
   * remaining budget independently of its status.
   */
  remainingUses: number;
  expiresAt?: string | null;
  createdAt?: string | null;
  revokedAt?: string | null;
  revokedBy?: string | null;
}

/**
 * The reply to `mintCircleInviteLink`, and THE ONLY PLACE A RAW TOKEN IS EVER
 * RETURNED — by design, not by omission elsewhere.
 *
 * Treat `token` as write-once: show it, let the person copy it, and never
 * expect to read it again. It must not be persisted to a store, written to a
 * URL of our own, or logged.
 */
export interface CircleInviteLinkMint {
  link: CircleInviteLink;
  /** The raw token for the shareable URL. Returned once and never again. */
  token: string;
}

export interface MintCircleInviteLinkInput {
  circleId: string;
  /** 1..`CIRCLE_INVITE_LINK_MAX_USES`; circle-service refuses anything else. */
  maxUses: number;
  /**
   * Absolute expiry, ISO-8601. Absent or already past falls back to +7 days;
   * anything beyond +14 days is CLAMPED to +14 rather than refused, so a
   * request for a longer life succeeds and quietly returns a shorter one —
   * send a value inside the ceiling if the UI shows the user what they asked
   * for.
   */
  expiresAt?: string | null;
}

// ── Contract bounds, mirrored from circle-service ───────────────────────────
//
// These are validated server-side; they are duplicated here only so the UI can
// refuse or warn BEFORE a round trip, never as the authority. If circle-service
// changes one, this is wrong until it is updated — which is why each names the
// constant it mirrors.

/** `MAX_INVITE_LINK_USES` — the ceiling on one link's budget. */
export const CIRCLE_INVITE_LINK_MAX_USES = 100;

/** One use is the smallest meaningful link. */
export const CIRCLE_INVITE_LINK_MIN_USES = 1;

/**
 * `MAX_LIVE_INVITE_LINKS` — how many links one circle may have live at once.
 *
 * Not an entitlement (the plan catalogue says nothing about links) and not a
 * cap on how many can EXIST — revoked and expired links stay listed forever so
 * that "revoked on Tuesday" and "never existed" do not look the same. It
 * bounds only what is outstanding, which is what a compromised lead session
 * could leave behind.
 */
export const CIRCLE_MAX_LIVE_INVITE_LINKS = 10;

/** `DEFAULT_INVITE_LINK_TTL_HOURS` — what an absent `expiresAt` becomes. */
export const CIRCLE_INVITE_LINK_DEFAULT_TTL_HOURS = 24 * 7;

/** `MAX_INVITE_LINK_TTL_HOURS` — the ceiling a longer request is clamped to. */
export const CIRCLE_INVITE_LINK_MAX_TTL_HOURS = 24 * 14;

// ============================================================================
// FORMER MEMBERS
// ============================================================================

/**
 * Why a membership ended. The complement of `ACTIVE` over the four values
 * `circle_membership.status` accepts — written as an `Exclude` so that adding
 * a fifth membership status to `types/circles.ts` widens this automatically
 * and the exhaustive `Record` lookups keyed on it stop compiling, rather than
 * silently rendering a blank label for the new state.
 *
 * There is no BANNED. If banning should read differently from REMOVED that is
 * a schema change, not a label.
 */
export type CirclePastMemberReason = Exclude<CircleMembershipStatus, 'ACTIVE'>;

/**
 * Former members, split by reason.
 *
 * Three aliased calls to `circleMembers` in ONE document — one round trip, one
 * loading state, one error — rather than three hooks. The status is written as
 * a literal in the query rather than passed as a variable, which is also what
 * makes the prefixed spelling (`MEMBERSHIP_LEFT`) impossible to get wrong from
 * a call site.
 *
 * The three arrays are DISJOINT, and so is the active roster: a unique index on
 * `(circle_id, user_id)` means one membership row per person per circle. A
 * rejoin flips that row back to ACTIVE rather than adding a second one, so
 * nobody can appear twice and no de-duplication is needed here.
 */
export interface CirclePastMembersData {
  left: CircleMember[];
  removed: CircleMember[];
  suspended: CircleMember[];
}

export interface CirclePastMembersVariables {
  circleId: string;
  limit?: number | null;
  offset?: number | null;
}

// ============================================================================
// OPERATION DATA / VARIABLES — invite links
// ============================================================================

export interface CircleInviteLinksData {
  circleInviteLinks: CircleInviteLink[];
}

export interface CircleInviteLinksVariables {
  circleId: string;
  limit?: number | null;
  offset?: number | null;
}

export interface MintCircleInviteLinkData {
  mintCircleInviteLink: CircleInviteLinkMint;
}

export interface MintCircleInviteLinkVariables {
  input: MintCircleInviteLinkInput;
}

export interface RevokeCircleInviteLinkData {
  revokeCircleInviteLink: CircleInviteLink;
}

/**
 * `circleId` accompanies `inviteLinkId` so the gateway's lead gate has
 * something to check — the underlying request carries only the link id, and
 * the gateway will not fetch a link just to learn its circle. circle-service
 * re-validates that the two belong together before revoking anything.
 */
export interface RevokeCircleInviteLinkVariables {
  circleId: string;
  inviteLinkId: string;
}

// ============================================================================
// REDEMPTION — the other half of the mint
// ============================================================================

/**
 * What a redeemer gets back: the circle they are now in, and their membership.
 *
 * Note what this type does NOT model — a `success` flag. `redeemCircleInviteLink`
 * either resolves with a circle or REJECTS; the gateway runs `assertOk` on
 * circle-service's envelope and converts every refusal into a thrown GraphQL
 * error. So an expired link, a revoked link, a spent link, an unknown token, a
 * caller who is already a member and a circle at its member cap all arrive as
 * rejections, and telling them apart is `classifyRedeemFailure`'s job (see
 * `components/circles/join/redeemOutcome.ts`) rather than a field here.
 *
 * `circle` is non-null on the success path: the gateway asserts it is present
 * and raises a 404 if circle-service somehow answered without one, so a
 * resolved mutation always carries a circle to navigate to.
 */
export interface CircleInviteLinkRedemption {
  circle: Circle;
  /**
   * The membership row just written — MEMBER role always, since a link cannot
   * confer LEAD and there is no field in which to have asked for it.
   *
   * Exposed by the gateway but NOT selected by `REDEEM_CIRCLE_INVITE_LINK`:
   * `circle` is asserted present server-side, so the receipt proves nothing the
   * resolved mutation has not already established. Nullable on the wire in any
   * case, so a caller that does select it must treat absence as "admitted,
   * receipt not returned" rather than as failure.
   */
  member?: CircleMember | null;
  /**
   * The link with its use already spent. Also exposed and NOT selected — a
   * link's remaining budget is the lead's management information and the person
   * who just joined has no use for it.
   *
   * Both fields are typed here so a future caller knows they EXIST and can ask
   * for them, rather than assuming the gateway cannot supply them.
   */
  link?: CircleInviteLink | null;
}

export interface RedeemCircleInviteLinkData {
  redeemCircleInviteLink: CircleInviteLinkRedemption;
}

/**
 * Just the token, and deliberately no `circleId`.
 *
 * The gateway takes no circle id here and must not: it never learns which
 * circle a token belongs to, because a read keyed on a token would be an
 * oracle for "does this guessed token exist?" reachable from a read-shaped
 * call site. The token alone determines which circle is joined, so there is
 * nothing for a caller-supplied id to do but disagree with it.
 *
 * The value is a BEARER CREDENTIAL — `randomBytes(32).toString('base64url')`,
 * 43 URL-safe characters. It must not be logged, persisted, or pushed through
 * our own router.
 */
export interface RedeemCircleInviteLinkVariables {
  token: string;
}
