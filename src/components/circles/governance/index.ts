export { PinnedRuleNotice, type PinnedRuleNoticeProps } from './PinnedRuleNotice';
export { RuleCard, type RuleCardProps } from './RuleCard';
export { RuleHistory, type RuleHistoryProps } from './RuleHistory';
export {
  liveRules,
  majorityKey,
  normaliseFraction,
  quorumKey,
  versionsForKind,
  windowParts,
  type MajorityKey,
  type QuorumKey,
  type WindowParts,
} from './governanceCopy';
export { MOTION_KIND_ORDER, isKnownMotionKind, motionKindRank } from './motionKinds';

// ── Creation flows: the policy layer every governed action shares ───────────
// These live under `governance/` because both questions a creation form must
// answer first — "is this mine to do or the circle's to decide?" and "did the
// write actually happen?" — are governance questions, asked identically by the
// project, challenge and motion forms.
export {
  ProposeMotionForm,
  type ProposeMotionFormProps,
} from './ProposeMotionForm';

export {
  ActionBlockedNotice,
  ActionRouteChoice,
  AllowanceNotice,
  type ActionBlockedNoticeProps,
  type ActionRouteChoiceProps,
  type AllowanceNoticeProps,
  type ChosenRoute,
} from './ActionGate';

export {
  ACTION_ENTITLEMENT_KEY,
  allowanceFor,
  buildCircleActionPolicy,
  circleCanOpenMotions,
  circleIsLive,
  ruleForKind,
  rulePermitsProposal,
} from './actionPolicy';

export {
  MOTION_KINDS_NEEDING_STRUCTURED_PAYLOAD,
  MOTION_KINDS_REQUIRING_SUBJECT,
  createChallengeMotionPayload,
  createProjectMotionPayload,
  emptyMotionPayload,
  motionKindNeedsStructuredPayload,
  motionKindRequiresSubject,
  motionSubjectKind,
  motionSubjectType,
  type MotionSubjectKind,
} from './motionPayload';

export {
  circleErrorText,
  classifyCircleWriteFailure,
  isCircleWriteRetryable,
  readCircleWrite,
  readOutcome,
  refusalMessageKey,
  type CircleMutationResultLike,
  type CircleWriteFailure,
  type CircleWriteRefusal,
} from './mutationOutcome';
