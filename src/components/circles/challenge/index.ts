export {
  VerificationModePanel,
  type VerificationModePanelProps,
} from './VerificationModePanel';

export {
  ChallengeProgress,
  type ChallengeProgressProps,
} from './ChallengeProgress';

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
