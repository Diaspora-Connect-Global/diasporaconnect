import { CombinedGraphQLErrors } from '@apollo/client';

/**
 * Turning `redeemCircleInviteLink`'s refusals into words a person can act on.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  WHY THIS IS MESSAGE MATCHING, AND WHY THAT IS NOT LAZINESS
 * ═══════════════════════════════════════════════════════════════════════════
 * `redeemCircleInviteLink` does NOT return an envelope with `success: false`.
 * circle-service raises a typed error; its gRPC controller flattens that into
 * `{ success: false, message }`; the gateway's `assertOk` turns the flat
 * envelope back into a thrown `BadRequestException` carrying the SAME message.
 * By the time it reaches this file the type is gone and the message is all
 * that survived — there is no error code, no extension, and no discriminated
 * field anywhere on the path. Matching the message is not a shortcut past a
 * better signal; it is the only signal that exists.
 *
 * The matched fragments are the invariant halves of the server's own strings,
 * which live in:
 *   - `invite-link-status.ts::inviteLinkRefusalReason`  (revoked/expired/spent)
 *   - `membership/errors.ts::InviteLinkNotRedeemableError` (unknown token)
 *   - `circle.errors.ts::MembershipConflictError`       (already a member)
 *   - `entitlement.errors.ts::EntitlementLockError`     (circle full)
 *   - `circle.errors.ts::CircleNotActiveError`          (suspended/archived)
 *
 * Each pattern skips the interpolated ids and keeps only the fixed prose, so a
 * change in id format cannot break a match. A change in WORDING will, and the
 * failure is deliberately soft: an unrecognised refusal falls through to
 * `UNKNOWN`, which renders a generic "we couldn't use this link" with a retry
 * — wrong-but-harmless, never a wrong-and-confident claim that a live link
 * expired. If these strings move, this file moves with them.
 *
 * ── THE SERVER'S MESSAGE IS NEVER RENDERED ─────────────────────────────────
 * Every string here is matched against, never shown. The server's wording
 * carries raw ids (`Circle 0f3c…: membership conflict for 8ad1…`), is English
 * only, and is written for an operator. The UI answers from `circles.join.*`
 * in all five locales instead.
 */

/**
 * The distinct outcomes this screen can land on, refusals only.
 *
 * They are separate values because each one implies a DIFFERENT next action
 * for the person holding the link, and collapsing them into "invalid link"
 * would leave every one of them with nothing to do:
 *
 *   MISSING_TOKEN / MALFORMED  ask the sender to paste the link again
 *   INVALID                    same, and it may simply never have been a link
 *   EXPIRED / EXHAUSTED        ask for a NEW link — this one is spent
 *   REVOKED                    a lead took it down; asking again may be refused
 *   CIRCLE_FULL                a new link will NOT help; the circle has no room
 *   CIRCLE_UNAVAILABLE         nothing to do but wait; the circle is not open
 *   ALREADY_MEMBER             nothing went wrong at all — go in
 *   UNKNOWN                    retry, then ask
 */
export type CircleJoinRefusal =
  | 'MISSING_TOKEN'
  | 'MALFORMED_TOKEN'
  | 'INVALID'
  | 'EXPIRED'
  | 'REVOKED'
  | 'EXHAUSTED'
  | 'ALREADY_MEMBER'
  | 'CIRCLE_FULL'
  | 'CIRCLE_UNAVAILABLE'
  | 'UNKNOWN';

/** A classified refusal, plus whatever could be recovered from it. */
export interface CircleJoinFailure {
  refusal: CircleJoinRefusal;
  /**
   * Only ever set for `ALREADY_MEMBER`, and only when the id could be read out
   * of the server's message with confidence — see `classifyRedeemFailure`.
   */
  circleId?: string;
}

/**
 * The shape of a raw token: `randomBytes(32).toString('base64url')`, which is
 * 43 characters of `[A-Za-z0-9_-]` (see `create-circle-invite-link.handler.ts`).
 *
 * ── THE FLOOR IS 20, NOT 43, ON PURPOSE ────────────────────────────────────
 * This test exists to recognise a URL a chat app cut in half, not to
 * re-implement the server's validation. Pinning it to exactly 43 would turn
 * any future change in token length into a client-side wall that refuses valid
 * links before they are ever sent — the UI silently overriding the only
 * component that can actually judge a token. A generous floor still catches
 * every realistic truncation (a link broken across a line loses far more than
 * half) while leaving the server as the authority on everything else: a
 * 43-character token that is merely WRONG goes to the server and comes back
 * `INVALID`, which is correct, because only the server can know that.
 *
 * The charset half is the stronger signal anyway. Base64url has no `%`, `.`,
 * `…`, space or `"`, so a token carrying one has been mangled in transit —
 * trailing punctuation swallowed from a sentence, or an ellipsis from a
 * link preview.
 */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,}$/;

/**
 * Read the `?token=` parameter, refusing what is obviously not a token before
 * spending a round trip on it.
 *
 * Returns the token, or the refusal to show instead. `null` and `''` are the
 * same case (`useSearchParams().get()` gives `null` for an absent key and `''`
 * for `?token=`), and both mean the URL never carried a credential.
 */
export function readInviteToken(
  raw: string | null | undefined,
): { token: string } | { refusal: Extract<CircleJoinRefusal, 'MISSING_TOKEN' | 'MALFORMED_TOKEN'> } {
  const token = (raw ?? '').trim();
  if (!token) return { refusal: 'MISSING_TOKEN' };
  if (!TOKEN_PATTERN.test(token)) return { refusal: 'MALFORMED_TOKEN' };
  return { token };
}

/**
 * Flatten whatever the mutation rejected with into matchable text.
 *
 * Apollo 4 wraps GraphQL errors in `CombinedGraphQLErrors`, whose own
 * `message` summarises rather than carrying every entry — and the refusal we
 * need to recognise is in the entries. Mirrors `errorText` in
 * `components/circles/motion/VotePanel.tsx`, which learned the same lesson.
 */
function errorText(error: unknown): string {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors.map((e) => e.message).join(' ');
  }
  return error instanceof Error ? error.message : '';
}

/**
 * `Circle <uuid>: membership conflict for <uuid> — already an ACTIVE member`.
 *
 * Anchored at the start and matched against a UUID specifically, so a message
 * that no longer leads with the circle id yields NOTHING rather than a
 * plausible-looking wrong id. Routing someone into the wrong circle would be a
 * far worse outcome than routing them to their circle list, which is what the
 * caller falls back to.
 */
const ALREADY_MEMBER_CIRCLE =
  /^circle\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*:/i;

/**
 * Classify a rejected redemption.
 *
 * ── ORDER MATTERS ──────────────────────────────────────────────────────────
 * The specific link states are tested before the generic "not valid", because
 * the generic message is a SUBSTRING risk: `InviteLinkNotRedeemableError`
 * says "This invite link is not valid" while `InviteLinkStateError` says
 * "Invite link <id>: this invite link has expired". Testing the generic one
 * first would be fine today and fragile the moment either string is reworded,
 * so the narrow patterns get first refusal on principle.
 *
 * A network failure (server unreachable, timeout) is NOT a GraphQL error and
 * matches nothing here, so it lands on `UNKNOWN` and is offered a retry —
 * which is exactly right, since retrying is the one thing that might work.
 */
export function classifyRedeemFailure(error: unknown): CircleJoinFailure {
  const text = errorText(error).toLowerCase();

  // ── The link resolved to a real row, and that row said no ────────────────
  if (text.includes('has been revoked')) return { refusal: 'REVOKED' };
  if (text.includes('has expired')) return { refusal: 'EXPIRED' };
  if (text.includes('maximum number of times')) return { refusal: 'EXHAUSTED' };

  // ── Not the link's fault ─────────────────────────────────────────────────
  if (text.includes('already an active member')) {
    // The id is read from the ORIGINAL casing: UUIDs are hex and the pattern
    // is case-insensitive, but lower-casing first would still be a needless
    // transformation of a value we are about to navigate to.
    const match = ALREADY_MEMBER_CIRCLE.exec(errorText(error).trim());
    return match ? { refusal: 'ALREADY_MEMBER', circleId: match[1] } : { refusal: 'ALREADY_MEMBER' };
  }
  if (text.includes('max_members')) return { refusal: 'CIRCLE_FULL' };
  if (text.includes('while status is')) return { refusal: 'CIRCLE_UNAVAILABLE' };

  // ── The token matched nothing at all ─────────────────────────────────────
  // One fixed message for every unknown token, so that a probe cannot tell
  // "no such link" from "revoked" by the wording. We inherit that opacity:
  // this branch genuinely cannot know which it was, and the copy it selects
  // says so honestly rather than guessing.
  if (text.includes('is not valid')) return { refusal: 'INVALID' };
  if (text.includes('token is required')) return { refusal: 'MISSING_TOKEN' };

  return { refusal: 'UNKNOWN' };
}

/**
 * Is this refusal one the person can do nothing about by getting a new link?
 *
 * Drives whether the screen offers "ask for a new link" as the suggested next
 * step. A full circle and a suspended circle are the two where a fresh link
 * would fail in exactly the same way, and suggesting one would send the person
 * back to the lead for something that cannot help.
 */
export function isNewLinkPointless(refusal: CircleJoinRefusal): boolean {
  return refusal === 'CIRCLE_FULL' || refusal === 'CIRCLE_UNAVAILABLE';
}

/**
 * Should the screen offer a retry button?
 *
 * Only for `UNKNOWN` — the bucket that holds network failures and anything the
 * server said that this file did not recognise. Every other refusal is a
 * settled fact about the link or the circle, and a retry button beside one
 * would invite someone to hammer a request whose answer cannot change.
 */
export function isRetryable(refusal: CircleJoinRefusal): boolean {
  return refusal === 'UNKNOWN';
}
