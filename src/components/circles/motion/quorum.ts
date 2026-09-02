import type { CircleMotion } from '@/services/gql/types/circles';

/**
 * How many of the pinned electorate must vote for the motion to count at all.
 *
 * Quorum is stored as a fraction (`quorumNumerator`/`quorumDenominator`) OF the
 * electorate size, all three of which are pinned onto the motion when it opens.
 * Rounding is UP: a 2/3 quorum over 7 electors needs 5, not 4.66 rounded to 4 —
 * rounding down would let a motion pass on less support than its own rule
 * demands.
 *
 * Computed with integer arithmetic rather than `Math.ceil(size * n / d)`, whose
 * float division can land a hair above an exact result (4.000000001) and demand
 * one more vote than the rule does.
 */
export function requiredVotes(motion: {
  electorateSize: number;
  quorumNumerator: number;
  quorumDenominator: number;
}): number {
  const { electorateSize, quorumNumerator, quorumDenominator } = motion;

  if (!Number.isFinite(electorateSize) || electorateSize <= 0) return 0;
  // A zero denominator is not a real rule; treating it as "everyone" is the
  // safe direction — it can only ever make quorum harder to reach.
  if (!quorumDenominator) return electorateSize;

  const required = Math.floor(
    (electorateSize * quorumNumerator + quorumDenominator - 1) /
      quorumDenominator,
  );

  return Math.min(Math.max(required, 0), electorateSize);
}

/** Ballots cast so far, from the live tally. */
export function votesCast(tally: {
  yes: number;
  no: number;
  abstain: number;
}): number {
  return tally.yes + tally.no + tally.abstain;
}

/**
 * Whether a motion is still accepting votes according to the SERVER's view
 * alone. The viewer's clock is applied separately, and only after mount — see
 * `useIsPastDeadline` in `VotePanel`.
 */
export function isMotionOpen(motion: Pick<CircleMotion, 'status'>): boolean {
  return motion.status === 'OPEN';
}
