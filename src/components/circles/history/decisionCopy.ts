import { majorityKey, normaliseFraction } from '@/components/circles/governance/governanceCopy';
import { requiredVotes } from '@/components/circles/motion/quorum';
import type { StatusPillVariant } from '@/components/circles/primitives';
import type {
  CircleMotion,
  CircleMotionKind,
  CircleMotionStatus,
} from '@/services/gql/types/circles';

/**
 * How a settled motion is presented in the decision table.
 *
 * Pure and JSX-free, like `auditEventCopy.ts` beside it, so the two judgement
 * calls it encodes — what each terminal state MEANS, and where the thresholds
 * on screen come from — are readable in one place instead of scattered through
 * render code.
 */

// ---------------------------------------------------------------------------
// Outcomes
// ---------------------------------------------------------------------------

/** Key under `circles.history.outcome`. */
export type DecisionOutcomeKey =
  | 'passed'
  | 'enacted'
  | 'enactmentFailed'
  | 'rejected'
  | 'expired'
  | 'withdrawn'
  | 'open'
  | 'unknown';

export interface DecisionOutcomeSpec {
  labelKey: DecisionOutcomeKey;
  variant: StatusPillVariant;
}

/**
 * Seven states, seven labels — deliberately NOT the five that
 * `MotionStatusPill` collapses them into.
 *
 * That component labels a live motion, where "did this pass?" is the only
 * question and PASSED/ENACTED are usefully the same answer. This is a HISTORY,
 * read after the fact by someone asking what actually happened, and three
 * distinctions it must never lose:
 *
 *  - `EXPIRED` is not a rejection. The window closed without quorum and NOTHING
 *    happened — silence is never consent. Rendering it as "Failed" would say
 *    the members turned something down when they never decided at all, which
 *    is exactly the misreading a circle would resent most.
 *  - `ENACTMENT_FAILED` is not a rejection either. The circle DID decide; only
 *    applying the decision failed (over an entitlement cap, the member had
 *    already left). The label says so in as many words, in warning tone rather
 *    than danger, because the vote itself stands.
 *  - `PASSED` and `ENACTED` differ by whether the decision was actually
 *    applied. On a live card that distinction is noise; in a record of what
 *    was done to whom, it is the record.
 *
 * `OPEN` is listed for completeness — an open motion is filtered out of this
 * screen by `isDecided`, but a status must never render blank if it slips
 * through.
 */
const OUTCOME_SPEC: Record<CircleMotionStatus, DecisionOutcomeSpec> = {
  PASSED: { labelKey: 'passed', variant: 'success' },
  ENACTED: { labelKey: 'enacted', variant: 'success' },
  ENACTMENT_FAILED: { labelKey: 'enactmentFailed', variant: 'warning' },
  REJECTED: { labelKey: 'rejected', variant: 'danger' },
  EXPIRED: { labelKey: 'expired', variant: 'neutral' },
  WITHDRAWN: { labelKey: 'withdrawn', variant: 'neutral' },
  OPEN: { labelKey: 'open', variant: 'info' },
};

/**
 * The spec for a status, tolerating one this build has never heard of.
 *
 * A newer gateway can add a terminal state at any time. An unrecognised row
 * still belongs in the record — dropping it would silently under-report the
 * circle's own history — so it renders neutrally and claims nothing.
 */
export function outcomeSpecFor(status: string): DecisionOutcomeSpec {
  return (
    OUTCOME_SPEC[status as CircleMotionStatus] ?? {
      labelKey: 'unknown' as const,
      variant: 'neutral' as const,
    }
  );
}

/**
 * Whether a motion belongs in a DECISION history at all.
 *
 * Only `OPEN` is excluded, and only because it has no outcome and no decision
 * date — it is a vote in progress, which the motion screens already show. Every
 * other state, including one from a newer gateway, is a settled fact about this
 * circle and is listed.
 */
export function isDecided(status: string): boolean {
  return status !== 'OPEN';
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

/**
 * The motion kinds that change who is in the circle, or who leads it.
 *
 * A membership change in a circle is not an administrative action someone
 * takes; it is a decision the circle votes on, and it reaches the record as a
 * motion of one of these kinds. That is why the "Membership changes" tab is a
 * filter over the same decisions rather than a separate roster feed — the
 * answer to "why was I removed?" is a vote and its terms, not a log line.
 *
 * Two membership events are NOT motions and therefore NOT here: joining
 * through an invite link, and leaving of your own accord. Neither is a decision
 * the circle took, and neither carries a rule that could be shown beside it.
 */
export const MEMBERSHIP_MOTION_KINDS: readonly CircleMotionKind[] = [
  'ADMIT_MEMBER',
  'REMOVE_MEMBER',
  'APPOINT_LEAD',
  'REMOVE_LEAD',
];

const MEMBERSHIP_KIND_SET = new Set<string>(MEMBERSHIP_MOTION_KINDS);

export function isMembershipMotion(kind: string): boolean {
  return MEMBERSHIP_KIND_SET.has(kind);
}

// ---------------------------------------------------------------------------
// The rules a motion was decided under
// ---------------------------------------------------------------------------

/** Key under `circles.history.rules.majority`. */
export type PinnedMajorityKey = 'unanimous' | 'simple' | 'fraction';

export interface PinnedRuleParts {
  /** Null when the stored fraction is not a usable rule; say so rather than guessing. */
  majority: { key: PinnedMajorityKey; n: number; d: number } | null;
  /** Ballots that had to be cast, out of the electorate pinned at open time. */
  quorum: { required: number; total: number } | null;
}

/**
 * The thresholds this motion was ACTUALLY decided under.
 *
 * ── EVERY VALUE COMES OFF THE MOTION. THIS IS THE POINT OF THE COLUMN ───────
 * `quorumNumerator/Denominator`, `majorityNumerator/Denominator` and
 * `electorateSize` are a snapshot written into the motion's opening INSERT and
 * never updated. This function takes a `CircleMotion` and nothing else — no
 * rule id, no circle, no repository — so it *cannot* reach the live rule even
 * by accident.
 *
 * Reading `circleGovernanceRules` here instead would be the single worst bug
 * this screen can have. A circle that amends its majority would see every past
 * decision restated under the new threshold: a legitimate-looking history that
 * is false, implying the platform rewrote what the circle decided. The pinning
 * exists precisely so that cannot happen; rendering the live rule would throw
 * the guarantee away at the one surface built to display it.
 *
 * The fraction is reduced first, so a rule stored as 2/4 and one stored as 1/2
 * read identically — they are the same rule, and printing them differently
 * would suggest a decision was taken under terms it was not.
 */
export function pinnedRuleParts(
  motion: Pick<
    CircleMotion,
    | 'majorityNumerator'
    | 'majorityDenominator'
    | 'quorumNumerator'
    | 'quorumDenominator'
    | 'electorateSize'
  >,
): PinnedRuleParts {
  const reduced = normaliseFraction(motion.majorityNumerator, motion.majorityDenominator);
  const key = majorityKey(motion.majorityNumerator, motion.majorityDenominator);

  /*
   * A zero or negative denominator is not a rule anybody could have voted
   * under — it is missing data. The cell says "not recorded" rather than
   * printing "0/0 majority", which would look like a threshold and be one more
   * false claim about a settled decision.
   */
  const majority =
    reduced.d > 0 && reduced.n > 0
      ? {
          key:
            key === 'unanimous'
              ? ('unanimous' as const)
              : key === 'simple'
                ? ('simple' as const)
                : ('fraction' as const),
          n: reduced.n,
          d: reduced.d,
        }
      : null;

  /*
   * `requiredVotes` is imported rather than re-derived: it rounds UP with
   * integer arithmetic (a 2/3 quorum over 7 electors needs 5, not 4), and it is
   * the same helper the motion screens use. A second copy of that rounding
   * would eventually disagree with the count a member was actually held to.
   */
  const total = Math.trunc(Number(motion.electorateSize) || 0);
  const quorum = total > 0 ? { required: requiredVotes(motion), total } : null;

  return { majority, quorum };
}
