'use client';

import { useTranslations } from 'next-intl';

/**
 * Refusals that only the motion screen can provoke.
 *
 * `governance/mutationOutcome.ts` classifies the writes the governance FORMS
 * make — opening a motion, creating a project, joining a challenge. Casting a
 * ballot, withdrawing a motion and applying a passed one are reachable from
 * nowhere else, so circle-service's refusals for them are unknown to that
 * classifier and land on `UNKNOWN` — "That didn't go through. Try again." —
 * which is the one answer that helps nobody here. "Only the proposer may
 * withdraw" and "you are not one of this motion's voters" are settled facts,
 * and telling a member to retry them is worse than saying nothing.
 *
 * ── WHY THE SERVER'S SENTENCE IS MATCHED AND NOT SHOWN ──────────────────────
 * Same reasoning, and the same constraint, as the shared classifier: by the
 * time circle-service's typed error has been flattened by its gRPC controller
 * and rethrown by the gateway's `assertOk`, the TYPE is gone and only the
 * sentence is left — there is no code and no extension to switch on. And the
 * sentence is operator English carrying raw ids and em dashes, in a product
 * that ships in five locales.
 *
 * Each pattern keeps only the invariant prose and skips every interpolated
 * value, so a change in id or number format cannot break a match. A change in
 * WORDING will, and the failure is deliberately soft: an unmatched refusal
 * returns `null` and the caller falls back to the shared circles vocabulary,
 * which is wrong-but-harmless rather than a confident wrong claim.
 */
export type MotionRefusal =
  /** `Motion.withdraw: only the proposer may withdraw a motion` */
  | 'NOT_PROPOSER'
  /** `Invalid motion status transition: PASSED -> WITHDRAWN` */
  | 'NOT_OPEN'
  /** `motion is OPEN — only a PASSED motion can be enacted` */
  | 'NOT_ENACTABLE'
  /** `MAX_MEMBERS_LIMIT_REACHED (limit=25, usage=25)` — enactment over a cap. */
  | 'ENTITLEMENT_LOCKED'
  /** `NotAnElectorError` — the viewer is outside the motion's pinned electorate. */
  | 'NOT_ELECTOR'
  /** `MotionClosedError` — the window shut under the viewer. */
  | 'VOTING_CLOSED';

export function classifyMotionRefusal(
  raw: string | null | undefined,
): MotionRefusal | null {
  if (!raw) return null;

  // Narrow before broad. `only a PASSED motion can be enacted` and
  // `only the proposer may withdraw` share no prose, but both would be caught
  // by a lazier /only .* may/ pattern, so each is matched on its own verb.
  if (/only the proposer may withdraw/i.test(raw)) return 'NOT_PROPOSER';
  if (/only a passed motion can be enacted/i.test(raw)) return 'NOT_ENACTABLE';

  /*
   * The transition error is generic (`Invalid motion status transition: X -> Y`)
   * and the only transition this screen ever attempts through it is
   * `-> WITHDRAWN`; enactment reports its own refusal above and never reaches
   * `assertTransition` from a bad status. Anchoring on WITHDRAWN keeps this
   * honest if that ever changes — a future transition refusal will fall
   * through to the generic copy rather than being mislabelled "can't be
   * withdrawn".
   */
  if (/invalid motion status transition.*withdrawn/i.test(raw)) return 'NOT_OPEN';

  /*
   * Enactment over an entitlement cap. The shared classifier looks for
   * "entitlement" AND "reached"; the enactment handler formats this one as
   * `${key}_LIMIT_REACHED (limit=…, usage=…)`, which has the second word and
   * not the first, so it would otherwise be UNKNOWN.
   */
  if (/_LIMIT_REACHED/i.test(raw)) return 'ENTITLEMENT_LOCKED';

  if (/pinned electorate|not an elector/i.test(raw)) return 'NOT_ELECTOR';
  if (/voting is closed|no longer open/i.test(raw)) return 'VOTING_CLOSED';

  return null;
}

/**
 * Translated copy for a motion-specific refusal, or `null` when this refusal is
 * not one of them.
 *
 * Returning `null` rather than a generic sentence is what lets every caller
 * keep the shared circles vocabulary as its fallback — the two classifiers
 * compose instead of one shadowing the other.
 */
export function useMotionRefusalMessage(): (
  raw: string | null | undefined,
) => string | null {
  const t = useTranslations('circles.motion');
  const tErrors = useTranslations('circles.errors');
  const tActions = useTranslations('circles.actions');

  return (raw) => {
    switch (classifyMotionRefusal(raw)) {
      case 'NOT_PROPOSER':
        return t('writeErrors.notProposer');
      case 'NOT_OPEN':
        return t('writeErrors.notOpen');
      case 'NOT_ENACTABLE':
        return t('writeErrors.notEnactable');
      // Reuses the shared copy rather than restating it: the remedy for a cap
      // is identical wherever it is hit, and two wordings for one fact is how
      // they drift apart.
      case 'ENTITLEMENT_LOCKED':
        return tActions('writeErrors.entitlementLocked');
      case 'NOT_ELECTOR':
        return t('notElector');
      case 'VOTING_CLOSED':
        return tErrors('votingClosed');
      default:
        return null;
    }
  };
}
