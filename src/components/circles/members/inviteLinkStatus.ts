import type { StatusPillVariant } from '@/components/circles/primitives';
import type {
  CircleInviteLink,
  CircleInviteLinkStatus,
} from '@/services/gql/types/circles-invites';

/**
 * Client-side derivation of an invite link's state.
 *
 * ## Why derive at all when the server already answered
 *
 * circle-service resolves `status` at read time, which is correct — but "at
 * read time" is the instant the query returned. A links panel is a screen
 * people leave open, and a link that lapsed ten minutes ago would go on
 * claiming ACTIVE, with a live countdown reading "0m left" beside it, until
 * something happened to refetch. Re-deriving from `expiresAt` and the use
 * counters costs two comparisons and removes the window.
 *
 * The two STORED states cannot be derived and are taken from the server
 * verbatim: only a person can revoke a link, so `REVOKED` is a fact this file
 * has no way to compute and no business second-guessing.
 *
 * ## Precedence: REVOKED > EXPIRED > EXHAUSTED > ACTIVE
 *
 * A link can be several of these at once — revoked yesterday, expired today,
 * and fully spent — and the reader gets exactly one answer, so the order is
 * part of the contract rather than an implementation detail. It runs from the
 * most deliberate cause to the most incidental, because that is the order the
 * person reading it cares about: "a lead took this down" is a different fact
 * from "it ran out", and showing the second when the first is also true
 * misattributes the refusal.
 *
 * Deliberately identical to `resolveInviteLinkStatus` in
 * `circle-service/src/domain/value-objects/invite-link-status.ts`. Two copies
 * of a rule is a drift risk; the alternative here was a UI that contradicts the
 * server about why a link is dead, which is worse.
 */
export function resolveInviteLinkStatus(
  link: Pick<
    CircleInviteLink,
    'status' | 'expiresAt' | 'maxUses' | 'useCount'
  >,
  now: number = Date.now(),
): CircleInviteLinkStatus {
  if (link.status === 'REVOKED') return 'REVOKED';

  // An unparseable or absent expiry is treated as "not expired" rather than
  // "expired": the server would not have returned ACTIVE for a lapsed link, so
  // a missing timestamp is a serialisation gap, and inventing an expiry from it
  // would retire a link that still works.
  const expiresAt = link.expiresAt ? new Date(link.expiresAt).getTime() : NaN;
  if (!Number.isNaN(expiresAt) && expiresAt <= now) return 'EXPIRED';

  if (Number(link.useCount) >= Number(link.maxUses)) return 'EXHAUSTED';
  return 'ACTIVE';
}

/**
 * How many redemptions are left — 0 for any link that cannot be redeemed at
 * all, whatever its budget says, because "no uses left" is the honest answer
 * for a revoked or expired link.
 *
 * Computed rather than read from `CircleInviteLink.remainingUses` for the same
 * reason the status is: the server's copy was correct when it was sent, and
 * this one stays correct while the tab is open.
 */
export function inviteLinkRemainingUses(
  link: Pick<
    CircleInviteLink,
    'status' | 'expiresAt' | 'maxUses' | 'useCount'
  >,
  now?: number,
): number {
  if (resolveInviteLinkStatus(link, now) !== 'ACTIVE') return 0;
  return Math.max(0, Number(link.maxUses) - Number(link.useCount));
}

/** Redeemable right now. The single definition every caller shares. */
export function isInviteLinkRedeemable(
  link: Pick<
    CircleInviteLink,
    'status' | 'expiresAt' | 'maxUses' | 'useCount'
  >,
  now?: number,
): boolean {
  return resolveInviteLinkStatus(link, now) === 'ACTIVE';
}

/**
 * Does this link occupy one of the circle's `CIRCLE_MAX_LIVE_INVITE_LINKS`
 * slots?
 *
 * ── EXHAUSTED COUNTS, AND THAT IS NOT AN OVERSIGHT ──────────────────────────
 * circle-service enforces the cap with
 *
 *     WHERE status = 'ACTIVE' AND expires_at > now
 *
 * — no clause on `use_count`. So a link whose budget is fully spent still holds
 * its slot until it expires or someone revokes it. Counting only the redeemable
 * ones here would under-count, tell a lead they had room, and let them press
 * Mint into a server-side refusal: exactly the "surface the limit after the
 * failure" behaviour the panel exists to avoid.
 *
 * The mapping back from the DERIVED status is exact, which is why this can be
 * written as a two-value test rather than by re-reading the columns:
 *   ACTIVE    ⇒ stored ACTIVE, not expired            → occupies a slot
 *   EXHAUSTED ⇒ stored ACTIVE, not expired, spent     → occupies a slot
 *   EXPIRED   ⇒ `expires_at <= now`                   → frees its slot
 *   REVOKED   ⇒ stored REVOKED                        → frees its slot
 */
export function occupiesLiveSlot(status: CircleInviteLinkStatus): boolean {
  return status === 'ACTIVE' || status === 'EXHAUSTED';
}

/**
 * The status to actually RENDER, given a clock that may not exist yet.
 *
 * `now` is `null` until the component has mounted, and during that window the
 * server's own `status` is used verbatim. Two reasons, and the second is the
 * real one:
 *
 *  1. `Date.now()` differs between the server render and the first client
 *     render, so deriving during SSR risks a hydration mismatch on the pill.
 *  2. The server's answer is not a guess. It was correct at the instant the
 *     query returned, which is the best available account of the link until
 *     this tab has a clock of its own — strictly better than pretending not to
 *     know.
 *
 * After mount, `now` ticks and the derivation takes over, so a panel left open
 * stops claiming ACTIVE for a link that lapsed while nobody was looking.
 */
export function effectiveInviteLinkStatus(
  link: CircleInviteLink,
  now: number | null,
): CircleInviteLinkStatus {
  return now === null ? link.status : resolveInviteLinkStatus(link, now);
}

/**
 * How many of the circle's live-link slots are currently taken.
 *
 * Takes the same nullable clock as `effectiveInviteLinkStatus`, so the count
 * behind the cap warning and the statuses beside each row can never disagree
 * about which links are live.
 */
export function countLiveInviteLinks(
  links: readonly CircleInviteLink[],
  now: number | null,
): number {
  return links.reduce(
    (total, link) =>
      occupiesLiveSlot(effectiveInviteLinkStatus(link, now)) ? total + 1 : total,
    0,
  );
}

/**
 * Pill colour per state.
 *
 * `danger` is reserved for REVOKED — the one state a person chose. A link that
 * simply lapsed or was fully used is not a problem and is not coloured like
 * one; the two share `neutral` and are told apart by their label, which is the
 * channel that survives being colour-blind anyway.
 */
export const INVITE_LINK_STATUS_VARIANT: Record<
  CircleInviteLinkStatus,
  StatusPillVariant
> = {
  ACTIVE: 'success',
  REVOKED: 'danger',
  EXPIRED: 'neutral',
  EXHAUSTED: 'neutral',
};

/**
 * The shareable URL for a freshly minted token — the one place its shape is
 * decided.
 *
 * ⚠ THE REDEEM SCREEN DOES NOT EXIST IN THIS REPO YET. Nothing under
 * `app/[locale]/(protected)/(main)/(home)/circles/` handles `join`, so a copied
 * URL currently reaches a 404. The backend half shipped (`redeemCircleInviteLink`
 * — auth-guarded but deliberately NOT circle-gated, since the caller is by
 * definition not a member yet); the screen that reads `?token=` and calls it is
 * outstanding work, tracked outside this file. Building the URL in one exported
 * function means that screen only has to agree with this line.
 *
 * The locale is baked in because this app has no next-intl middleware: routes
 * live under `[locale]` and an unprefixed path is not redirected, so a URL
 * without one would 404 even once the screen exists. The consequence is that a
 * recipient opens the page in the MINTER's language rather than their own —
 * accepted here as the cost of a link that resolves at all.
 *
 * The token is passed as a query parameter rather than a path segment so it
 * never lands in a route param that could be echoed into a page title or a
 * breadcrumb. It is still a bearer credential: do not log this URL, do not
 * push it through our own router, and do not persist it.
 */
export function buildCircleInviteUrl(
  origin: string,
  locale: string,
  token: string,
): string {
  return `${origin}/${locale}/circles/join?token=${encodeURIComponent(token)}`;
}
