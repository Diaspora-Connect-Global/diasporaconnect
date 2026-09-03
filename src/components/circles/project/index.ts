export {
  GoalProgressPanel,
  type GoalProgressPanelProps,
} from './GoalProgressPanel';

export {
  ContributionList,
  type ContributionListProps,
} from './ContributionList';

export {
  ContributionsPanel,
  type ContributionsPanelProps,
} from './ContributionsPanel';

export { ProjectHeader, type ProjectHeaderProps } from './ProjectHeader';

export {
  ProjectDiscussion,
  type ProjectDiscussionProps,
} from './ProjectDiscussion';

export { ContributeForm, type ContributeFormProps } from './ContributeForm';

export {
  formatGoalValue,
  goalCurrency,
  isMoneyGoal,
  parseContributionValue,
  type GoalMetric,
} from './metric';

// ── Creation flows ─────────────────────────────────────────────────────────
export {
  CreateProjectForm,
  type CreateProjectFormProps,
} from './CreateProjectForm';

export { AddGoalForm, type AddGoalFormProps } from './AddGoalForm';

export {
  isMoneyDraft,
  normaliseGoalDraft,
  toAddGoalInput,
  validateGoalDraft,
  type GoalDraftError,
  type GoalDraftValidation,
} from './goalDraft';
