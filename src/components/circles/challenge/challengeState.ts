import type { StatusPillVariant } from '@/components/circles/primitives';
import type { CircleChallengeStatus } from '@/services/gql/types/circles';

/**
 * @fileoverview A challenge's lifecycle state, in either vocabulary.
 * @module components/circles/challenge/challengeState
 *
 * The same two-vocabulary asymmetry that bites `verificationMode` bites this
 * enum too, and it is documented in the ENUMS header of
 * `services/gql/types/circles.ts`:
 *
 *   READ back from a challenge   DRAFT | ACTIVE | JUDGING | CLOSED | CANCELLED
 *   SEND as a `$status` filter   CHALLENGE_DRAFT | CHALLENGE_ACTIVE | …
 *
 * Reads come back bare today, so `status !== 'ACTIVE'` works. It fails CLOSED —
 * a prefixed `CHALLENGE_ACTIVE` would compare unequal to `'ACTIVE'` and the
 * "I'm in!" button would vanish from a live challenge with no error and no
 * explanation, which reads to the member as "I am not allowed". Normalising
 * first makes that impossible, and an unrecognised value still resolves to
 * `null` rather than being guessed into ACTIVE.
 */

const WIRE_SPELLINGS: Readonly<Record<string, CircleChallengeStatus>> = {
  DRAFT: 'DRAFT',
  CHALLENGE_DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  CHALLENGE_ACTIVE: 'ACTIVE',
  JUDGING: 'JUDGING',
  CHALLENGE_JUDGING: 'JUDGING',
  CLOSED: 'CLOSED',
  CHALLENGE_CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
  CHALLENGE_CANCELLED: 'CANCELLED',
};

export function normalizeChallengeStatus(
  raw: string | null | undefined,
): CircleChallengeStatus | null {
  if (!raw) return null;
  return WIRE_SPELLINGS[raw.trim().toUpperCase()] ?? null;
}

/** Is this challenge taking entries right now? */
export function acceptsEntries(raw: string | null | undefined): boolean {
  return normalizeChallengeStatus(raw) === 'ACTIVE';
}

export interface ChallengeStatePresentation {
  variant: StatusPillVariant;
  /** Message key under `circles.challenge`. */
  label: string;
  /** Message key under `circles.challenge` — why the CTA is not on screen. */
  note: string;
}

/**
 * Copy for the states that are NOT taking entries.
 *
 * ACTIVE is deliberately absent: the "Challenge" pill and a live "I'm in!"
 * button already say it, and a second pill reading "Active" beside them is
 * noise. Every other state, though, has to explain itself — the CTA is hidden
 * in all four, and a screen that simply omits the button leaves the member
 * reading a missing permission where there is only a lifecycle.
 */
export const CHALLENGE_STATE_PRESENTATION: Readonly<
  Partial<Record<CircleChallengeStatus, ChallengeStatePresentation>>
> = {
  DRAFT: {
    variant: 'neutral',
    label: 'state.draft.label',
    note: 'state.draft.note',
  },
  JUDGING: {
    variant: 'warning',
    label: 'state.judging.label',
    note: 'state.judging.note',
  },
  CLOSED: {
    variant: 'neutral',
    label: 'state.closed.label',
    note: 'state.closed.note',
  },
  CANCELLED: {
    variant: 'danger',
    label: 'state.cancelled.label',
    note: 'state.cancelled.note',
  },
};

export function challengeStatePresentation(
  raw: string | null | undefined,
): ChallengeStatePresentation | null {
  const status = normalizeChallengeStatus(raw);
  if (!status) return null;
  return CHALLENGE_STATE_PRESENTATION[status] ?? null;
}
