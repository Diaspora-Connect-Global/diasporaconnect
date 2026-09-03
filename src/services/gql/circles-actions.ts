/**
 * @fileoverview The GraphQL operation surface for the Circle CREATION flows —
 * start a project, add a goal, run a challenge, submit an entry, propose a
 * motion.
 * @module services/gql/circles-actions
 *
 * ── THIS FILE DECLARES NO NEW DOCUMENTS, AND THAT IS THE POINT ──────────────
 * Every operation the creation flows need was already written in `./circles`
 * when the read-only screens shipped — the mutations existed with nobody
 * calling them, which is exactly why the feature looked read-only. This module
 * re-exports that set under one import so a creation screen pulls its whole
 * surface from one place, and so the next contributor reaching for
 * `CREATE_CIRCLE_PROJECT` finds it here instead of writing a second copy.
 *
 * A duplicate `gql` document is not a harmless duplicate. Two documents with
 * the same operation name break Apollo's `refetchQueries: ['CircleProjects']`
 * addressing, and two selection sets that drift produce cache entries that
 * overwrite each other with different fields present — a class of bug that
 * shows up as a field going undefined long after the edit that caused it.
 *
 * ── WHAT LIVES WHERE ────────────────────────────────────────────────────────
 *   `./circles`               the documents (unchanged, read-only to this work)
 *   `./types/circles-actions` the types creation introduced — the send-direction
 *                             verification mode, form drafts, the direct-or-
 *                             motion policy verdict, and the write-outcome
 *                             shape this app's `errorPolicy: 'all'` makes
 *                             mandatory
 *   this file                 the operation surface, assembled
 *
 * ── THE READS EACH FLOW NEEDS BEFORE IT WRITES ──────────────────────────────
 * A creation form is not just its mutation. Two reads gate every one of them
 * and are re-exported alongside:
 *
 *   `CIRCLE_GOVERNANCE_RULES`  whether this action is the member's to take or
 *                              the circle's to vote on — per kind, per circle,
 *                              never a constant
 *   `CIRCLE_ENTITLEMENTS`      how much allowance is left, surfaced BEFORE the
 *                              form rather than as a refusal after it
 */

export {
  // ── Reads that gate a creation form ──────────────────────────────────────
  /**
   * The live rule per motion kind. Read to decide whether an action is offered
   * directly, as a motion, or not at all — and to state what a vote would
   * require before the member commits to one.
   *
   * Use ONLY for a motion about to be OPENED. An existing motion carries its
   * own pinned thresholds; these rows are today's rule and may already have
   * superseded the one that motion opened under.
   */
  CIRCLE_GOVERNANCE_RULES,
  /**
   * What the circle may do and what it is using. `MAX_ACTIVE_PROJECTS` and
   * `MAX_ACTIVE_CHALLENGES` are enforced server-side under a row lock, so this
   * is the only way to tell someone their allowance before they type a title.
   *
   * On both `entitlements` and `usage`, a false `hasIntValue` / `hasLimit`
   * means UNLIMITED — and the numeric field still arrives as `0`, so reading
   * the number first turns the most generous plan into the most restricted one.
   */
  CIRCLE_ENTITLEMENTS,
  /** The viewer's own standing: member, lead, and may-propose. */
  MY_CIRCLE_MEMBERSHIP,
  /** The circle itself — creation needs its `status` (motions need ACTIVE). */
  CIRCLE,
  /** Members, for the assignee picker on an INDIVIDUAL goal. */
  CIRCLE_MEMBERS,

  // ── Projects ─────────────────────────────────────────────────────────────
  /**
   * Create a project. Note it does NOT come back as a draft: circle-service
   * calls `activate()` in the same handler, because `logContribution` refuses a
   * non-ACTIVE project and there is no rpc that activates one — a DRAFT project
   * would be permanently inert. The `circle.project.created` Kafka payload
   * still says DRAFT; the row it announces is ACTIVE.
   */
  CREATE_CIRCLE_PROJECT,
  /**
   * Add a goal. `scope` and `assigneeUserId` are paired by a CHECK constraint —
   * SHARED must have no assignee, INDIVIDUAL must have one — and `targetValue`
   * is required in practice despite being nullable on the schema, because
   * circle-service runs `Number(targetValue)` through `assertStorableMetric`
   * and `undefined` becomes NaN.
   */
  ADD_CIRCLE_PROJECT_GOAL,

  // ── Challenges ───────────────────────────────────────────────────────────
  /**
   * Create a challenge. Born DRAFT — this is the ONLY moment `verificationMode`
   * and `cadence` can be chosen, because activation freezes both.
   */
  CREATE_CIRCLE_CHALLENGE,
  /**
   * DRAFT → ACTIVE, and the authoritative `MAX_ACTIVE_CHALLENGES` gate: a draft
   * occupies no slot, so a create can succeed and the activate that follows it
   * still be refused. Also the moment `verificationMode` becomes immutable.
   */
  ACTIVATE_CIRCLE_CHALLENGE,
  /**
   * Join / submit an entry. `idempotencyKey` is REQUIRED in practice —
   * circle-service throws `idempotencyKey is required` even though the schema
   * marks it nullable — and it is load-bearing: the entry id is derived from
   * `(challenge, user, period, key)`, which is what makes a retry address the
   * row it already wrote instead of creating a second one.
   */
  SUBMIT_CIRCLE_CHALLENGE_ENTRY,

  // ── Governance ───────────────────────────────────────────────────────────
  /**
   * Propose anything. The general entry point: removing a member, appointing a
   * lead, amending the rules and starting a project all reach circle-service
   * through this one mutation with a different `kind`, because each is the
   * ENACTMENT of a passed motion and there is no direct rpc for any of them.
   *
   * `payloadJson` carries the kind-specific arguments and is NOT validated at
   * open time by anything — not the gateway, not circle-service. A missing key
   * surfaces much later as a motion that passes and then lands in
   * `ENACTMENT_FAILED`, so build it from `motionPayload` in
   * `components/circles/governance/motionPayload.ts` rather than by hand.
   */
  OPEN_CIRCLE_MOTION,
} from './circles';
