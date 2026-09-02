'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@apollo/client/react';

import { CIRCLE_GOAL_PROGRESS } from '@/services/gql/circles';
import type {
  CircleGoalProgressData,
  CircleGoalProgressVariables,
  CircleProjectGoal,
} from '@/services/gql/types/circles';
import { Skeleton } from '@/components/ui/skeleton';

import { ProgressWithLabel } from '../primitives';
import { formatGoalValue } from './metric';

export interface GoalProgressPanelProps {
  circleId: string;
  goal: CircleProjectGoal;
  /** Header text. Only the project's primary goal is labelled "Overall progress". */
  label?: string;
}

/**
 * Progress for ONE goal, read from `circleGoalProgress`.
 *
 * ## Why the query lives in here and not in the page
 *
 * Two reasons, and both matter.
 *
 * 1. `currentValue` is a SUM over the append-only contribution ledger computed
 *    server-side. It is deliberately NOT derived from the contributions list
 *    this page also renders: that list is PAGED, so summing it client-side
 *    would silently under-report progress the moment a project outgrows one
 *    page — a bar that is quietly wrong is worse than no bar.
 * 2. A project may carry several goals, and hooks cannot be called in a loop.
 *    Owning the query per-goal lets the page `.map()` over goals without
 *    breaking the rules of hooks when a goal is added.
 *
 * When progress cannot be read, the bar is omitted rather than drawn at 0% —
 * "no progress yet" and "we could not load progress" are different claims and
 * only one of them is true.
 */
export function GoalProgressPanel({
  circleId,
  goal,
  label,
}: GoalProgressPanelProps) {
  const t = useTranslations('circles');
  const locale = useLocale();

  const { data, loading } = useQuery<
    CircleGoalProgressData,
    CircleGoalProgressVariables
  >(CIRCLE_GOAL_PROGRESS, {
    variables: { circleId, goalId: goal.id },
    errorPolicy: 'all',
  });

  const progress = data?.circleGoalProgress ?? null;

  if (loading && !progress) {
    return (
      <div className="w-full">
        {label && <Skeleton className="mb-2 h-4 w-32" />}
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="mt-2 h-3 w-40" />
      </div>
    );
  }

  // The goal's own `targetValue` is still trustworthy when progress is not, so
  // the target is shown alone rather than paired with an invented current value.
  if (!progress) {
    const target = formatGoalValue(goal.targetValue, goal, locale);
    return (
      <div className="w-full">
        {label && (
          <p className="label-small text-text-primary">{label}</p>
        )}
        {target && (
          <p className="caption-small mt-1 text-text-secondary">{target}</p>
        )}
      </div>
    );
  }

  const current = formatGoalValue(progress.currentValue, goal, locale);
  const target = formatGoalValue(progress.targetValue ?? goal.targetValue, goal, locale);

  return (
    <ProgressWithLabel
      value={progress.percentComplete}
      label={label}
      caption={
        current && target
          ? t('project.progressAmount', { current, target })
          : undefined
      }
    />
  );
}
