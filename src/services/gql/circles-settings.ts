import { gql } from '@apollo/client';

import { CIRCLE_SUMMARY_FRAGMENT } from './circles';

/**
 * @fileoverview GraphQL operations introduced by the Circle settings screen.
 * @module services/gql/circles-settings
 *
 * A companion to `./circles`, which already carries every circle read plus
 * `UPDATE_CIRCLE_PROFILE`. Only the three operations that had no document yet
 * live here:
 *
 *   setCircleDiscoverable · setCircleJoinMode · archiveCircle
 *
 * ── WHY `UPDATE_CIRCLE_PROFILE` IS NOT RE-DECLARED HERE ─────────────────────
 * The settings screen's profile form uses it heavily, but it already exists in
 * `./circles` and the screen imports it from there. Two `gql` documents naming
 * one operation (`mutation UpdateCircleProfile`) is not a compile error and not
 * a runtime error either — it is a slow one: the two would drift, and Apollo's
 * cache would normalise writes from whichever the caller happened to import.
 * One operation, one document.
 *
 * Every mutation here returns the full `Circle` via `CircleSummaryFields`, so a
 * write refreshes the screen from the server's post-write truth instead of the
 * UI predicting the new state. `archiveCircle` is the case that proves the
 * rule: it changes `status` AND stamps `archivedAt`, and a client guessing at
 * either would eventually guess wrong.
 */

/**
 * Findability — whether this circle can be found in search and discovery.
 *
 * INDEPENDENT OF `joinMode`, and the pair must never be collapsed into one
 * public/private switch. Both real combinations are in use: a hidden circle
 * that still accepts requests from anyone holding its link, and a listed circle
 * nobody can ask to join. One toggle cannot express either, and the aggregate
 * stores them as two columns because they answer two questions.
 *
 * ── LEAD-GATED, EVEN THOUGH THE RESOLVER SAYS MEMBER ────────────────────────
 * The gateway checks only `assertCircleMember` here, because it gates IDENTITY
 * and leaves governance to circle-service. What circle-service then does is
 * `requireLead(circle, actorUserId, 'change discoverability')` in
 * `SetDiscoverableHandler` — unconditionally. So the effective permission is
 * LEAD, and a UI that trusts the resolver's gate offers every member a control
 * that always fails.
 *
 * The refusal is a redirection rather than a wall: `SET_DISCOVERABLE` is a
 * `CircleMotionKind`, so a member who wants the circle listed opens a motion
 * through `openCircleMotion`. Nothing in this handler consults a motion or a
 * pinned rule — that is a separate path, not a fallback inside this one.
 */
export const SET_CIRCLE_DISCOVERABLE = gql`
  mutation SetCircleDiscoverable($circleId: ID!, $discoverable: Boolean!) {
    setCircleDiscoverable(circleId: $circleId, discoverable: $discoverable) {
      ...CircleSummaryFields
    }
  }
  ${CIRCLE_SUMMARY_FRAGMENT}
`;

/**
 * How someone gets in: `INVITE_ONLY` or `REQUEST`. Independent of
 * `discoverable` — see the note above.
 *
 * `$joinMode` is declared as the registered GraphQL enum `CircleJoinMode`, so
 * the schema validates the value before any resolver runs. This is the one
 * enum where the gateway's registered spelling and circle-service's domain
 * value are identical (`INVITE_ONLY` / `REQUEST`), because `CircleJoinMode` had
 * no name collision to disambiguate in the proto. There is no prefixed
 * `JOIN_MODE_*` variant, and inventing one would break the mutation, not fix
 * it. See the header of `types/circles-settings.ts`.
 *
 * There are only ever TWO modes. A third "anyone can apply, auto-admitted" mode
 * does not exist: `requestToJoinCircle` only ever creates a PENDING row and
 * admission is an `ADMIT_MEMBER` motion, so offering it would advertise
 * behaviour the service has no command for.
 *
 * LEAD-gated exactly as discoverability is: `assertCircleMember` at the
 * gateway, then `requireLead` inside `SetJoinModeHandler`. `CHANGE_JOIN_MODE`
 * is likewise a `CircleMotionKind`, so a member's route is `openCircleMotion`.
 */
export const SET_CIRCLE_JOIN_MODE = gql`
  mutation SetCircleJoinMode($circleId: ID!, $joinMode: CircleJoinMode!) {
    setCircleJoinMode(circleId: $circleId, joinMode: $joinMode) {
      ...CircleSummaryFields
    }
  }
  ${CIRCLE_SUMMARY_FRAGMENT}
`;

/**
 * Archive a circle: `status` becomes `ARCHIVED` and `archivedAt` is stamped.
 *
 * ── THIS IS NOT A DELETE, AND THE COPY MUST NOT SUGGEST IT IS ───────────────
 * Nothing is destroyed. The circle, its members, its motions, projects,
 * challenges and audit trail all remain exactly as they were; the circle simply
 * stops being an active place. `DISSOLVED` is a separate terminal status this
 * mutation never reaches, and there is no `deleteCircle` anywhere on the
 * surface — by design, because a circle's history is the record of decisions
 * its members made together and deleting it would erase their evidence, not
 * just their room.
 *
 * LEAD-gated: `assertCircleMember` at the gateway, then `requireLead(circle,
 * actorUserId, 'archive the circle')` in `ArchiveCircleHandler`. A member's
 * route is a `DISSOLVE_CIRCLE` motion via `openCircleMotion`.
 *
 * ── THE ONE MUTATION HERE THAT DOES NOT REQUIRE A LIVE CIRCLE ───────────────
 * `Circle.archive()` is alone in skipping `assertUsable`; it consults the
 * status transition table, which permits `SUSPENDED → ARCHIVED`. So a suspended
 * circle can still be archived, while its profile and discovery settings cannot
 * be touched. `DISSOLVED` has no outbound transitions and is the real end.
 *
 * There is deliberately no `unarchiveCircle` on the gateway today. The status
 * is reversible in principle — the aggregate models `ARCHIVED` as a state, not
 * a tombstone — but no client-facing mutation restores it yet, so the
 * confirmation copy promises reversibility in spirit and does not claim a
 * one-click undo that does not exist.
 */
export const ARCHIVE_CIRCLE = gql`
  mutation ArchiveCircle($circleId: ID!) {
    archiveCircle(circleId: $circleId) {
      ...CircleSummaryFields
    }
  }
  ${CIRCLE_SUMMARY_FRAGMENT}
`;
