import { CombinedGraphQLErrors } from '@apollo/client';

import type { CircleWriteOutcome } from '@/services/gql/types/circles-actions';

/**
 * @fileoverview Reading whether a circle write actually happened.
 * @module components/circles/governance/mutationOutcome
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE TRAP THIS FILE EXISTS TO CLOSE
 * ═══════════════════════════════════════════════════════════════════════════
 * `lib/graph-client.ts` sets, globally:
 *
 *     defaultOptions: { mutate: { fetchPolicy: 'network-only', errorPolicy: 'all' } }
 *
 * Under `errorPolicy: 'all'` a FAILED mutation **resolves**. It does not
 * reject. The promise hands back `{ data: null, error }` and execution
 * continues straight past the `await`. So this — the shape used by
 * `ContributeForm`, `JoinChallengeButton` and `CircleDiscoverySection` — is
 * not defensive code, it is a bug that reports success on failure:
 *
 *     try {
 *       await createProject({ variables });
 *       toast.success('done');      // ← ALSO RUNS WHEN THE SERVER REFUSED
 *     } catch {
 *       toast.error('failed');      // ← DEAD CODE. Never reached.
 *     }
 *
 * The member is told their project was created, the list does not contain it,
 * and there is nothing on screen to explain the gap. The only reliable signal
 * is whether `data` came back non-null, which is what `readOutcome` checks.
 *
 * The `try/catch` is still kept around calls that use this helper, because a
 * few failures genuinely do reject — a link-level throw, an aborted request,
 * `CombinedProtocolErrors`. Both paths converge on the same outcome shape.
 *
 * ── WHY REFUSALS ARE CLASSIFIED AND NOT RENDERED ────────────────────────────
 * circle-service raises typed errors; its gRPC controller flattens them to
 * `{ success: false, message }`; the gateway's `assertOk` rethrows that same
 * message as a `BadRequestException`. By the time it arrives the TYPE is gone
 * and only the sentence survives — there is no code, no extension, no
 * discriminated field. Matching the message is the only signal available, the
 * same conclusion `components/circles/join/redeemOutcome.ts` reached.
 *
 * And the sentence is not shown. It is operator English carrying raw UUIDs
 * (`Circle 0f3c…: cannot create a project while status is ARCHIVED`), in a
 * product that ships in five locales. Each pattern below is matched to a
 * `CircleWriteRefusal`, and the screen answers from its own translated copy —
 * which can be MORE specific than the server's, not less, because the client
 * already holds the entitlement numbers and the governance rule.
 *
 * Patterns keep only the invariant prose and skip every interpolated id, so a
 * change in id format cannot break a match. A change in WORDING will, and the
 * failure is deliberately soft: an unrecognised refusal falls through to
 * `UNKNOWN` and renders a generic "that didn't go through", which is
 * wrong-but-harmless rather than a confident wrong claim.
 */

/**
 * Why a circle write was refused.
 *
 * These are separate values because each implies a different next action, and
 * collapsing them into "failed" leaves the member with nothing to do:
 *
 *   ENTITLEMENT_LOCKED   close something, or change the plan. Retrying cannot help.
 *   CIRCLE_NOT_ACTIVE    the circle is suspended/archived — nothing to do but wait.
 *   NOT_A_MEMBER         standing was lost while the tab was open. Reload.
 *   PROPOSER_ROLE        this kind is a lead's to propose; ask one.
 *   NO_GOVERNANCE_RULE   the circle has no rule for this kind; it cannot be voted on.
 *   DORMANT_NO_ELECTORATE  too few members for a vote to mean anything.
 *   DUPLICATE_MOTION     one is already open about this — go and vote on it.
 *   SUBJECT_REQUIRED     the kind needs a subject the form did not collect.
 *   GOAL_SCOPE           SHARED/INDIVIDUAL and the assignee disagree.
 *   ASSIGNEE_NOT_MEMBER  the assignee is not in the circle; pick someone else.
 *   TARGET_VALUE         the target is missing, zero, or rounds away at 4 dp.
 *   VERIFICATION_MODE    the chosen mode is not one circle-service accepts.
 *                        Not the member's fault — see `types/circles-actions`.
 *   CHALLENGE_STATE      already activated, closed, or outside its window.
 *   IDEMPOTENCY_KEY      a required key never arrived. A client bug.
 *   PERIOD_MISMATCH      the page's idea of "this week" is behind the server's.
 *   UNKNOWN              retry, then ask.
 */
export type CircleWriteRefusal =
  | 'ENTITLEMENT_LOCKED'
  | 'CIRCLE_NOT_ACTIVE'
  | 'NOT_A_MEMBER'
  | 'PROPOSER_ROLE'
  | 'NO_GOVERNANCE_RULE'
  | 'DORMANT_NO_ELECTORATE'
  | 'DUPLICATE_MOTION'
  | 'SUBJECT_REQUIRED'
  | 'GOAL_SCOPE'
  | 'ASSIGNEE_NOT_MEMBER'
  | 'TARGET_VALUE'
  | 'VERIFICATION_MODE'
  | 'CHALLENGE_STATE'
  | 'IDEMPOTENCY_KEY'
  | 'PERIOD_MISMATCH'
  | 'UNKNOWN';

/** A refused write, classified, with the server's own words kept for logging. */
export interface CircleWriteFailure {
  refusal: CircleWriteRefusal;
  /** Never rendered — see the file header. Useful in a console breadcrumb. */
  rawMessage: string;
}

/**
 * Flatten whatever came back into matchable text.
 *
 * Apollo 4 wraps GraphQL errors in `CombinedGraphQLErrors`, whose own
 * `message` SUMMARISES rather than carrying every entry — and the refusal is
 * in the entries. Mirrors `errorText` in `join/redeemOutcome.ts` and
 * `motion/VotePanel.tsx`, both of which learned this the same way.
 */
export function circleErrorText(error: unknown): string {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors.map((e) => e.message).join(' ');
  }
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '';
}

/**
 * Classify a refusal from the server's sentence.
 *
 * ── ORDER MATTERS ──────────────────────────────────────────────────────────
 * Narrow patterns are tested before broad ones, because several server strings
 * are substrings of each other. `AddProjectGoal: … is not an active member of
 * circle …` contains "is not a member"-adjacent prose, and
 * `NotACircleMemberError` says `Circle <id>: <user> is not a member`; testing
 * the generic membership pattern first would classify a bad ASSIGNEE as the
 * CALLER having been removed, and tell the wrong person to reload.
 */
export function classifyCircleWriteFailure(error: unknown): CircleWriteFailure {
  const rawMessage = circleErrorText(error);
  const text = rawMessage.toLowerCase();

  // ── Entitlement caps ─────────────────────────────────────────────────────
  // `EntitlementLockError`: "Entitlement MAX_ACTIVE_PROJECTS reached: usage 3
  // of limit 3 for CIRCLE:<id>". Tested first: it is the single most likely
  // refusal on a creation form and the only one whose remedy is not "retry".
  if (text.includes('entitlement') && text.includes('reached')) {
    return { refusal: 'ENTITLEMENT_LOCKED', rawMessage };
  }

  // ── Goals: the narrow membership case, BEFORE the broad one ──────────────
  // `AddProjectGoal: <id> is not an active member of circle <id> — …`
  if (text.includes('is not an active member of circle')) {
    return { refusal: 'ASSIGNEE_NOT_MEMBER', rawMessage };
  }
  // `GoalScope: a SHARED goal must not carry an assignee`
  // `GoalScope: an INDIVIDUAL goal requires an assignee`
  // Caught here rather than at `chk_circle_project_goal_scope`, which would
  // surface as an opaque Postgres CHECK violation.
  if (text.includes('goalscope')) {
    return { refusal: 'GOAL_SCOPE', rawMessage };
  }
  // `targetValue must be a finite number` (an omitted target becomes NaN), and
  // `targetValue of 0.00004 rounds to 0 at 4 decimal places`.
  if (text.includes('targetvalue')) {
    return { refusal: 'TARGET_VALUE', rawMessage };
  }

  // ── Challenges ───────────────────────────────────────────────────────────
  // `VerificationMode: unknown value "LEAD_CONFIRMS" — allowed: HONOUR, LEAD,
  // CIRCLE`. The gateway/proto and the domain disagree on this vocabulary; see
  // `services/gql/types/circles-actions.ts`. Also catches the immutability
  // refusal, which says "verificationMode".
  if (text.includes('verificationmode') || text.includes('verification mode')) {
    return { refusal: 'VERIFICATION_MODE', rawMessage };
  }
  if (text.includes('period mismatch')) {
    return { refusal: 'PERIOD_MISMATCH', rawMessage };
  }
  if (text.includes('idempotencykey is required')) {
    return { refusal: 'IDEMPOTENCY_KEY', rawMessage };
  }

  // ── Governance ───────────────────────────────────────────────────────────
  // `Motion: CREATE_PROJECT may only be proposed by LEAD`
  if (text.includes('may only be proposed by')) {
    return { refusal: 'PROPOSER_ROLE', rawMessage };
  }
  // `OpenMotion: circle <id> has no live governance rule for <KIND>`
  if (text.includes('no live governance rule')) {
    return { refusal: 'NO_GOVERNANCE_RULE', rawMessage };
  }
  // `Motion: cannot open with an empty electorate`
  if (text.includes('empty electorate')) {
    return { refusal: 'DORMANT_NO_ELECTORATE', rawMessage };
  }
  // Unique-index translation: "already has an OPEN <kind> motion about <id>".
  if (text.includes('already has an open')) {
    return { refusal: 'DUPLICATE_MOTION', rawMessage };
  }
  // `Motion: <KIND> requires a subjectId`
  if (text.includes('requires a subjectid')) {
    return { refusal: 'SUBJECT_REQUIRED', rawMessage };
  }

  // ── Circle-level state ───────────────────────────────────────────────────
  // `CircleNotActiveError`: "Circle <id>: cannot create a project while status
  // is ARCHIVED". Also the refusal a DORMANT circle gives when opening a motion.
  if (text.includes('while status is')) {
    return { refusal: 'CIRCLE_NOT_ACTIVE', rawMessage };
  }
  // The BROAD membership pattern, last of its family on purpose (see above).
  if (text.includes('is not a member') || text.includes('not a circle member')) {
    return { refusal: 'NOT_A_MEMBER', rawMessage };
  }

  // ── Challenge lifecycle, broad and therefore late ────────────────────────
  if (text.includes('challenge') && (text.includes('status') || text.includes('closed'))) {
    return { refusal: 'CHALLENGE_STATE', rawMessage };
  }

  return { refusal: 'UNKNOWN', rawMessage };
}

/**
 * The result shape Apollo hands back for a mutation, narrowed to what this
 * helper reads.
 *
 * Declared structurally rather than imported because Apollo 4's own
 * `MutationResult` is generic over the cache and carries a dozen fields none
 * of this needs; a structural type keeps the helper callable from a `useMutation`
 * tuple, a `client.mutate`, and a test double alike.
 */
export interface CircleMutationResultLike<TData> {
  data?: TData | null;
  error?: unknown;
  /** Present on a raw `FetchResult`; `errorPolicy: 'all'` fills it. */
  errors?: readonly unknown[] | null;
}

/**
 * Did the write happen, and if not, why?
 *
 * @param result  What the mutation RESOLVED with. Under this app's global
 *                `errorPolicy: 'all'` a refusal arrives here, not in a catch.
 * @param pick    Reads the root field off `data`. Passed rather than inferred
 *                so `ok` reflects the field the caller actually needs — a
 *                mutation can resolve with `data` present and the root field
 *                null when a nullable field partially errored.
 */
export function readOutcome<TData, TPicked>(
  result: CircleMutationResultLike<TData> | null | undefined,
  pick: (data: TData) => TPicked | null | undefined,
): CircleWriteOutcome<TPicked> {
  const data = result?.data ? pick(result.data) ?? null : null;

  if (data) {
    return { ok: true, data, message: null, entitlementLocked: false };
  }

  // `error` is what `errorPolicy: 'all'` populates; `errors` covers a raw
  // `FetchResult`. Either may be the only one present depending on the call.
  const raw = result?.error ?? (result?.errors?.length ? result.errors : null);
  const failure = classifyCircleWriteFailure(raw ?? new Error(''));

  return {
    ok: false,
    data: null,
    message: failure.rawMessage || null,
    entitlementLocked: failure.refusal === 'ENTITLEMENT_LOCKED',
  };
}

/**
 * `readOutcome`, plus the classified reason.
 *
 * Preferred by every screen here — `CircleWriteOutcome` alone cannot say
 * WHICH refusal happened, and the whole point of the classification is to pick
 * different copy for "you are at your limit" and "you are no longer a member".
 */
export function readCircleWrite<TData, TPicked>(
  result: CircleMutationResultLike<TData> | null | undefined,
  pick: (data: TData) => TPicked | null | undefined,
): CircleWriteOutcome<TPicked> & { refusal: CircleWriteRefusal | null } {
  const outcome = readOutcome(result, pick);
  if (outcome.ok) return { ...outcome, refusal: null };

  const raw = result?.error ?? (result?.errors?.length ? result.errors : null);
  return { ...outcome, refusal: classifyCircleWriteFailure(raw ?? new Error('')).refusal };
}

/**
 * The i18n key under `circles.writeErrors` for a refusal.
 *
 * A plain lookup rather than a `Record<CircleWriteRefusal, string>` would be
 * one missing entry away from rendering a raw key; the union is exhaustive
 * here, so adding a refusal without copy is a COMPILE error.
 */
const REFUSAL_KEY: Record<CircleWriteRefusal, string> = {
  ENTITLEMENT_LOCKED: 'entitlementLocked',
  CIRCLE_NOT_ACTIVE: 'circleNotActive',
  NOT_A_MEMBER: 'notAMember',
  PROPOSER_ROLE: 'proposerRole',
  NO_GOVERNANCE_RULE: 'noGovernanceRule',
  DORMANT_NO_ELECTORATE: 'dormantNoElectorate',
  DUPLICATE_MOTION: 'duplicateMotion',
  SUBJECT_REQUIRED: 'subjectRequired',
  GOAL_SCOPE: 'goalScope',
  ASSIGNEE_NOT_MEMBER: 'assigneeNotMember',
  TARGET_VALUE: 'targetValue',
  VERIFICATION_MODE: 'verificationMode',
  CHALLENGE_STATE: 'challengeState',
  IDEMPOTENCY_KEY: 'idempotencyKey',
  PERIOD_MISMATCH: 'periodMismatch',
  UNKNOWN: 'unknown',
};

export function refusalMessageKey(refusal: CircleWriteRefusal | null): string {
  return REFUSAL_KEY[refusal ?? 'UNKNOWN'];
}

/**
 * Is retrying the same request worth offering?
 *
 * Only for `UNKNOWN`, which is where a network failure lands. Every other
 * refusal is a settled fact — a cap, a status, a role — and a retry button
 * beside one invites hammering a request whose answer cannot change.
 */
export function isCircleWriteRetryable(refusal: CircleWriteRefusal | null): boolean {
  return refusal === 'UNKNOWN' || refusal === null;
}
