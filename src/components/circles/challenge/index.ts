export {
  ChallengeHeader,
  type ChallengeHeaderProps,
} from './ChallengeHeader';

export {
  VerificationModePanel,
  type VerificationModePanelProps,
} from './VerificationModePanel';

export {
  ChallengeProgress,
  type ChallengeProgressProps,
} from './ChallengeProgress';

export {
  ChallengeActivity,
  type ChallengeActivityProps,
} from './ChallengeActivity';

/**
 * The side panel: what the locked verification mode means, your own standing,
 * and the one action the screen has.
 */
export { ChallengeAside, type ChallengeAsideProps } from './ChallengeAside';

/**
 * The "I'm in!" CTA and the claim behind it.
 *
 * Replaces the former `JoinChallengeButton`, which had two defects that could
 * not be fixed without changing its shape: it reported a successful join for
 * every refusal (its `catch` was dead code under the app's global
 * `errorPolicy: 'all'`), and its `joined: boolean` prop could only ask "has
 * this member ever entered?" — so a WEEKLY challenge showed "already joined"
 * for ever after the first week instead of inviting the next entry.
 */
export { SubmitEntryForm, type SubmitEntryFormProps } from './SubmitEntryForm';

export {
  CreateChallengeForm,
  type CreateChallengeFormProps,
} from './CreateChallengeForm';

export { periodKeyFor } from './periodKey';

/**
 * Both wire spellings of `verificationMode`, resolved to the bare domain value.
 * Read `verificationMode.ts` before comparing this enum against a literal.
 */
export {
  normalizeVerificationMode,
  verificationModePresentation,
  VERIFICATION_MODE_PRESENTATION,
  type VerificationModePresentation,
} from './verificationMode';

export {
  acceptsEntries,
  challengeStatePresentation,
  normalizeChallengeStatus,
  CHALLENGE_STATE_PRESENTATION,
  type ChallengeStatePresentation,
} from './challengeState';

export { deriveMyProgress, type MyChallengeProgress } from './myProgress';
