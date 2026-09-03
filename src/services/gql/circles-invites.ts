import { gql } from '@apollo/client';

import { CIRCLE_MEMBER_FRAGMENT, CIRCLE_SUMMARY_FRAGMENT } from './circles';

/**
 * @fileoverview GraphQL operations for circle INVITE LINKS and FORMER MEMBERS.
 * @module services/gql/circles-invites
 *
 * A companion to `circles.ts`. Field names are spelled exactly as
 * `services/api-gateway/src/circle/circle.resolver.ts` registers them.
 *
 * `CIRCLE_MEMBER_FRAGMENT` is imported rather than redeclared: two fragment
 * definitions sharing the name `CircleMemberFields` inside one document is a
 * parse error, and two that DRIFT are worse — the past-member rows would
 * quietly stop selecting `removedByMotionId` and the receipt would vanish from
 * the UI with nothing failing.
 *
 * ── ACCESS TIERS (enforced by the gateway; mirrored by the UI) ──────────────
 *   MEMBER  `circleMembers` — any member may read the roster, past included.
 *   LEAD    `circleInviteLinks`, `mintCircleInviteLink`,
 *           `revokeCircleInviteLink`.
 *
 * The link operations are a step stricter than `circleInvitations` (MEMBER) on
 * purpose: who has been invited is information the roster shares, but which
 * credentials are live and how much of each budget is left is management
 * information — and a link list is the single most useful thing for a member
 * on their way out to screenshot. Query these only when the viewer is a lead;
 * the gateway refuses otherwise, and an unskipped query would put a permission
 * error on every ordinary member's screen.
 */

// ─── Fragments ────────────────────────────────────────────────────────────────

/**
 * Every field the gateway exposes on a link.
 *
 * There is no `token` here and there must never be one. The raw token is
 * returned only by `mintCircleInviteLink`, on a separate type
 * (`CircleInviteLinkMint`) built so that no list, read or mapper can carry it.
 * A `token` selected here would not merely be unused — it would fail to
 * validate against the schema, which is the containment working as designed.
 *
 * `status` arrives already resolved four ways (REVOKED > EXPIRED > EXHAUSTED >
 * ACTIVE) as of the instant the server answered. The UI re-derives it from
 * `expiresAt` / `useCount` so a tab left open does not go on showing ACTIVE for
 * a link that lapsed ten minutes ago — see `inviteLinkStatus.ts`.
 */
export const CIRCLE_INVITE_LINK_FRAGMENT = gql`
  fragment CircleInviteLinkFields on CircleInviteLink {
    id
    circleId
    createdBy
    status
    maxUses
    useCount
    remainingUses
    expiresAt
    createdAt
    revokedAt
    revokedBy
  }
`;

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Former members, in one round trip.
 *
 * ── WHY THE STATUS IS A LITERAL AND NOT A VARIABLE ─────────────────────────
 * `circleMembers(status:)` is typed with the gateway's REGISTERED GraphQL enum,
 * whose members carry the proto's disambiguating prefix (`MEMBERSHIP_LEFT`),
 * while every status READ BACK is the bare domain value (`LEFT`). Sending the
 * bare spelling is a hard validation error; sending the prefixed one used to
 * match nothing in circle-service and returned an empty list with no error
 * anywhere — which is how this screen once reported "0 members" to a circle's
 * own members. The gateway now translates (`membershipStatusToWire`), but
 * writing the three values as literals in the document keeps the decision in
 * one reviewable place instead of at every call site.
 *
 * `MEMBERSHIP_SUSPENDED` is a platform action against the person's account, not
 * a decision this circle made. It is queried alongside the other two because a
 * roster that silently omitted those people would be lying about who is gone —
 * but it must never be LABELLED as though the circle did it.
 *
 * `limit` / `offset` apply to each alias independently. Past members accumulate
 * for the life of the circle while active membership is entitlement-capped, so
 * this list is the one part of the screen that grows without bound; callers
 * should pass a real limit and treat the result as "the most recent", not "all".
 */
export const CIRCLE_PAST_MEMBERS = gql`
  query CirclePastMembers($circleId: ID!, $limit: Int, $offset: Int) {
    left: circleMembers(
      circleId: $circleId
      status: MEMBERSHIP_LEFT
      limit: $limit
      offset: $offset
    ) {
      ...CircleMemberFields
    }
    removed: circleMembers(
      circleId: $circleId
      status: MEMBERSHIP_REMOVED
      limit: $limit
      offset: $offset
    ) {
      ...CircleMemberFields
    }
    suspended: circleMembers(
      circleId: $circleId
      status: MEMBERSHIP_SUSPENDED
      limit: $limit
      offset: $offset
    ) {
      ...CircleMemberFields
    }
  }
  ${CIRCLE_MEMBER_FRAGMENT}
`;

/**
 * A circle's links — the lead's inventory of which doors are open. LEAD-gated.
 *
 * Returns EVERY state, not just the live ones, because "revoked on Tuesday" and
 * "never existed" must not look the same to a lead asking what happened to the
 * link they posted last week. Filtering the dead ones out client-side would
 * throw away the only record of a deliberate act.
 */
export const CIRCLE_INVITE_LINKS = gql`
  query CircleInviteLinks($circleId: ID!, $limit: Int, $offset: Int) {
    circleInviteLinks(circleId: $circleId, limit: $limit, offset: $offset) {
      ...CircleInviteLinkFields
    }
  }
  ${CIRCLE_INVITE_LINK_FRAGMENT}
`;

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Mint a shareable link. LEAD-gated.
 *
 * ── THE REPLY CARRIES THE RAW TOKEN AND NOTHING ELSE EVER WILL ─────────────
 * `token` is selected here because this is the one operation that returns it.
 * Show it, let the person copy the URL, and do not expect to refetch it:
 * `circleInviteLinks` returns the same link WITHOUT it, by construction. A UI
 * that loses it has to revoke and mint again.
 *
 * Do not write the result into a persisted cache, a store, a URL of our own, or
 * a log line. Apollo's normalised cache keys on the returned `CircleInviteLink`
 * — the token rides the mint payload itself, not the entity, so nothing about
 * refetching a link can surface it.
 *
 * Minting does NOT invalidate earlier links; they coexist up to
 * `CIRCLE_MAX_LIVE_INVITE_LINKS`. Killing one is an explicit, attributable act.
 */
export const MINT_CIRCLE_INVITE_LINK = gql`
  mutation MintCircleInviteLink($input: MintCircleInviteLinkInput!) {
    mintCircleInviteLink(input: $input) {
      link {
        ...CircleInviteLinkFields
      }
      token
    }
  }
  ${CIRCLE_INVITE_LINK_FRAGMENT}
`;

/**
 * Revoke a link. LEAD-gated, immediate and TERMINAL — there is no un-revoke,
 * so that a URL somebody screenshotted months ago cannot come back to life.
 *
 * Revoking does not remove anyone who already joined through it. Their
 * membership is a row the circle agreed to at admission time, and removing a
 * member is a motion.
 */
export const REVOKE_CIRCLE_INVITE_LINK = gql`
  mutation RevokeCircleInviteLink($circleId: ID!, $inviteLinkId: ID!) {
    revokeCircleInviteLink(circleId: $circleId, inviteLinkId: $inviteLinkId) {
      ...CircleInviteLinkFields
    }
  }
  ${CIRCLE_INVITE_LINK_FRAGMENT}
`;

/**
 * Redeem a shareable link and join the circle. THE OTHER HALF OF THE MINT.
 *
 * ── NOT LEAD-GATED, AND NOT CIRCLE-GATED EITHER ────────────────────────────
 * Every other operation in this file is LEAD-only. This one is open to any
 * signed-in person, and it has to be: the caller is by definition not a member
 * yet, so a circle gate would refuse every legitimate redemption and the link
 * would work for nobody. The TOKEN is the authorization; circle-service holds
 * the sha256, the expiry, the budget and the revocation, and is the only thing
 * that can judge it.
 *
 * There is deliberately no `circleId` argument. The gateway never learns which
 * circle a token belongs to and does not try — a read keyed on a token would
 * be an oracle for "does this guessed token exist?".
 *
 * ── WHAT IS SELECTED ───────────────────────────────────────────────────────
 * `circle` only, via the shared `CircleSummaryFields` rather than an ad-hoc
 * `{ id name }`: the screen needs the id to navigate and the name to say which
 * circle was joined, and reusing the fragment keeps one spelling of "what a
 * Circle looks like" so the normalised `Circle:<id>` entity this writes cannot
 * disagree with the one `myCircles` wrote. By the time this resolves the caller
 * IS a member, so nothing in the fragment is privileged to them.
 *
 * The gateway also offers `member` (the admission receipt) and `link` (the
 * budget, "3 of 10 uses left"). Neither is selected. Nothing on this screen
 * renders them; `circle`'s presence is already asserted server-side, so the
 * receipt proves nothing extra; and a link's remaining budget is the lead's
 * management information, which the person who just walked through the door
 * has no business being handed. Note the cache is PERSISTED to localStorage
 * (`persistCacheSync` in `lib/graph-client.ts`), so an unused selection here is
 * not free — it is written to disk on every redemption.
 *
 * ── THE TOKEN IS A BEARER CREDENTIAL ───────────────────────────────────────
 * It travels as a variable and nothing more: do not log it, do not put it in a
 * cache key of our own, and do not push it through the router. Apollo
 * normalises on the returned entities and does not persist mutation variables,
 * so the token never reaches that localStorage cache.
 *
 * REFUSALS ARRIVE AS THROWN GraphQL ERRORS, NOT AS AN ENVELOPE. The gateway
 * runs `assertOk`, so an expired / revoked / spent / unknown link, an
 * already-joined caller and a full circle all reject this promise rather than
 * resolving with a flag. `classifyRedeemFailure` in
 * `components/circles/join/redeemOutcome.ts` is what tells them apart.
 *
 * Joining changes `myCircles`, which is a root list this mutation cannot merge
 * into — callers should evict that field (see the join screen) or the new
 * circle is missing from the list until something else refetches it.
 */
export const REDEEM_CIRCLE_INVITE_LINK = gql`
  mutation RedeemCircleInviteLink($token: String!) {
    redeemCircleInviteLink(token: $token) {
      circle {
        ...CircleSummaryFields
      }
    }
  }
  ${CIRCLE_SUMMARY_FRAGMENT}
`;
