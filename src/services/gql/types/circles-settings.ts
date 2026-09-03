/**
 * @fileoverview Types for the Circle settings screen's own GraphQL operations.
 * @module services/gql/types/circles-settings
 *
 * A companion to `./circles`, not a replacement. The shared entity types
 * (`Circle`, `CircleJoinMode`, …) live there and are imported here read-only;
 * this file adds ONLY the operation shapes the settings screen introduced, so
 * the two can be edited independently.
 *
 * `UpdateCircleProfileInput` / `UpdateCircleProfileData` are deliberately NOT
 * redefined here — `./circles` already carries them, and a second declaration
 * of the same operation would give the app two spellings of one contract.
 *
 * ── ENUM VOCABULARY: WHICH SPELLING DOES `joinMode` USE? ─────────────────────
 * `./circles`' header documents two vocabularies that genuinely differ on the
 * wire: statuses are read back BARE (`ACTIVE`) but a `status:` FILTER argument
 * is typed as a registered GraphQL enum and so needs the proto's prefixed name
 * (`MEMBERSHIP_ACTIVE`).
 *
 * `setCircleJoinMode`'s `joinMode` argument is one of those registered enums —
 * `@Args('joinMode', { type: () => CircleJoinMode })` in the gateway resolver —
 * so it is subject to that rule. It happens to be exempt in practice, and the
 * reason is worth stating so nobody "corrects" it later: `CircleJoinMode` had
 * no name collision to disambiguate, so the gateway registered its members as
 * `INVITE_ONLY` / `REQUEST` — character-for-character the domain values
 * circle-service emits and compares against. The two vocabularies COINCIDE for
 * this enum. There is no `JOIN_MODE_INVITE_ONLY` spelling anywhere, and adding
 * one would be the bug, not the fix.
 *
 * So `CircleJoinMode` from `./circles` is correct in both directions here, and
 * needs no `*Filter` twin.
 *
 * ── WHY THESE MUTATIONS TAKE LOOSE ARGUMENTS, NOT AN INPUT OBJECT ───────────
 * `setCircleDiscoverable`, `setCircleJoinMode` and `archiveCircle` are declared
 * on the gateway with positional `@Args`, not an `@InputType`. The variable
 * shapes below mirror that exactly; wrapping them in an `input:` object would
 * be rejected by the schema.
 */

import type { Circle, CircleJoinMode } from './circles';

// ============================================================================
// MUTATION RESULTS
// ============================================================================
//
// All three return the full `Circle` aggregate, which is what makes the screen
// self-healing: the server's post-write truth replaces local state rather than
// the UI predicting it. That matters most for `archiveCircle`, where `status`
// and `archivedAt` both change and neither is derivable client-side.

/** `setCircleDiscoverable` — findability only. Never touches `joinMode`. */
export interface SetCircleDiscoverableData {
  setCircleDiscoverable: Circle;
}

/** `setCircleJoinMode` — how people get in. Never touches `discoverable`. */
export interface SetCircleJoinModeData {
  setCircleJoinMode: Circle;
}

/**
 * `archiveCircle` — returns the circle with `status: 'ARCHIVED'` and an
 * `archivedAt` stamp. Nothing is deleted; the row and its history remain.
 */
export interface ArchiveCircleData {
  archiveCircle: Circle;
}

// ============================================================================
// MUTATION VARIABLES
// ============================================================================

export interface SetCircleDiscoverableVariables {
  circleId: string;
  discoverable: boolean;
}

export interface SetCircleJoinModeVariables {
  circleId: string;
  /** Sent as the bare domain value — see the enum note in the file header. */
  joinMode: CircleJoinMode;
}

export interface ArchiveCircleVariables {
  circleId: string;
}

// ============================================================================
// VIEW MODEL
// ============================================================================

/**
 * What the settings screen is allowed to offer this viewer.
 *
 * Derived from `myCircleMembership`, which is advisory for the client and
 * authoritative for the gateway — the same rpc backs `assertCircleMember` /
 * `assertCircleLead`. It is fail-closed: an unreachable circle-service reads as
 * "not a member", so a transport failure hides controls rather than showing
 * ones the server will refuse.
 *
 * ── EVERY CONTROL ON THIS SCREEN IS LEAD-GATED. READ THIS BEFORE WIDENING IT ─
 * The gateway's resolver gates suggest otherwise, and they are the trap:
 *
 *   updateCircleProfile   → assertCircleLead
 *   setCircleDiscoverable → assertCircleMember   ← looks member-level
 *   setCircleJoinMode     → assertCircleMember   ← looks member-level
 *   archiveCircle         → assertCircleMember   ← looks member-level
 *
 * Those three are only the OUTER gate. Each command handler in circle-service
 * then calls `requireLead(circle, actorUserId, …)` unconditionally —
 * `SetDiscoverableHandler`, `SetJoinModeHandler` and `ArchiveCircleHandler`
 * all do — so the effective permission for all four is LEAD.
 *
 * The gateway's own comment explains the asymmetry rather than contradicting
 * it: `circle-access.service.ts` has the gateway gate IDENTITY and leave
 * GOVERNANCE to circle-service, so anything a circle's rules *might* route
 * through a motion is checked at MEMBER on the way in and decided properly
 * further down. What "decided properly" means today is simply `requireLead`.
 *
 * Gating the UI at MEMBER because the resolver does would therefore show every
 * member three controls that always fail — the failure landing only after the
 * click, as a raw service error.
 *
 * ── THE REFUSAL IS A REDIRECTION, AND THE UI SHOULD SAY SO ──────────────────
 * `SetDiscoverableHandler`'s docstring: "A member who wants the circle listed
 * opens a SET_DISCOVERABLE motion — that route stays open, which is what makes
 * this refusal a redirection rather than a wall."
 *
 * So a non-lead member is not simply locked out. `SET_DISCOVERABLE`,
 * `CHANGE_JOIN_MODE` and `DISSOLVE_CIRCLE` are all `CircleMotionKind`s reachable
 * through `openCircleMotion`, and `myCircleMembership.canPropose` says whether
 * this member may open one. That is why `canPropose` is carried here: read-only
 * is the correct state for a member, but "ask the circle instead" is the
 * correct thing to tell them, and it is a fact the server already computed.
 */
export interface CircleSettingsPermissions {
  /** Any active member may open the screen. Non-members get a refusal state. */
  isMember: boolean;
  /**
   * Whether the circle's `status` admits writes at all: `ACTIVE` or `DORMANT`.
   *
   * This is the SECOND precondition, and it is invisible in the membership
   * check. Every mutation on this screen routes through the aggregate's
   * `assertUsable`, which throws `CircleNotActiveError` unless
   * `CircleStatus.isLive()` — so on a `SUSPENDED`, `ARCHIVED` or `DISSOLVED`
   * circle a LEAD is still a LEAD and `myCircleMembership` still says so, while
   * every control on the page would 400. Folding liveness into the two flags
   * below is what stops the screen offering a form that cannot save.
   *
   * DORMANT counts as live: it only means the circle has fewer than two active
   * members, it reactivates on the next join, and its settings stay editable.
   */
  isLive: boolean;
  /** LEAD **and** live: name, tagline, description, handle, avatar, banner. */
  canEditProfile: boolean;
  /** LEAD **and** live: discoverability and join mode. */
  canChangeDiscovery: boolean;
  /**
   * LEAD, and the circle in a status that can still reach ARCHIVED.
   *
   * Deliberately NOT `isLive`, and this is the one place the two come apart.
   * `Circle.archive()` is the only mutation on this screen that does not go
   * through `assertUsable` — it consults the status transition table instead,
   * and that table allows `SUSPENDED → ARCHIVED`. So a lead CAN archive a
   * suspended circle, and folding archive into `isLive` would hide a control
   * the server would honour. Only `ARCHIVED` (a no-op) and `DISSOLVED` (which
   * has no outbound transitions at all) are excluded.
   */
  canArchive: boolean;
  /**
   * Whether this member may open a motion, straight from `myCircleMembership`.
   *
   * Decided by circle-service against the circle's own pinned rule — never
   * recompute it. Used only to decide whether to tell a non-lead member that
   * proposing the change is open to them.
   */
  canPropose: boolean;
}
