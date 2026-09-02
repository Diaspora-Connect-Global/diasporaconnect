'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Hammer } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AvatarGroup, ProgressWithLabel } from '@/components/circles/primitives';
import { circleUserDisplayName, useCircleUsers } from '@/hooks/useCircleUsers';
import { CIRCLE_CONTRIBUTIONS, CIRCLE_GOAL_PROGRESS, CIRCLE_PROJECT_GOALS } from '@/services/gql/circles';
import type {
  CircleContribution,
  CircleGoalProgress,
  CircleProject,
  CircleProjectGoal,
} from '@/services/gql/types/circles';

import { InlineCard } from './InlineCard';

/**
 * How many ledger rows are read to count contributions.
 *
 * `CircleGoalProgress` exposes a summed value and a per-member breakdown but no
 * row count, so the count comes from one page of the ledger itself. Sized well
 * above what a circle capped at 12 members plausibly writes; see the follow-up
 * note in the report about adding a real count to the gateway.
 */
const CONTRIBUTION_PAGE_SIZE = 200;

interface ProjectCardProps {
  circleId: string;
  project: CircleProject;
  /** Display name of `project.createdBy`, already resolved and fallback-filled. */
  proposerName: string;
}

interface ProjectGoalsData {
  circleProjectGoals?: CircleProjectGoal[] | null;
}
interface GoalProgressData {
  circleGoalProgress?: CircleGoalProgress | null;
}
interface ContributionsData {
  circleContributions?: CircleContribution[] | null;
}

/**
 * The goal whose progress represents the project.
 *
 * A SHARED goal belongs to the circle; an INDIVIDUAL goal is one member's
 * slice. Leading with an individual goal would show one person's progress under
 * the project's name, so shared wins — and an open shared goal wins over a met
 * or cancelled one, because that is the one still being worked on.
 */
function pickHeadlineGoal(goals: CircleProjectGoal[]): CircleProjectGoal | null {
  return (
    goals.find((g) => g.scope === 'SHARED' && g.status === 'GOAL_OPEN') ??
    goals.find((g) => g.scope === 'SHARED') ??
    goals[0] ??
    null
  );
}

/**
 * A project, rendered where it was proposed.
 *
 * ── WHY THREE QUERIES ───────────────────────────────────────────────────────
 * Progress does not live on a project; it lives on its goals, and the ledger
 * that feeds it lives a level below that. Reaching the headline number is
 * therefore goals → progress → contributions. That is affordable *here
 * specifically* because a Circle is small by design — the member cap is an
 * entitlement, not an unbounded list — and Apollo dedupes across cards. The
 * conversation caps how many of these mount at once (see `INLINE_CARD_LIMIT`).
 *
 * Every one of the three degrades on its own: a card with no goals still shows
 * its title, description and link, which is the part that makes it navigable.
 */
export function ProjectCard({ circleId, project, proposerName }: ProjectCardProps) {
  const t = useTranslations('circles');
  // The circles catalogue has no name for a person whose profile failed to
  // load; chat already ships one, and this screen is a chat.
  const tChat = useTranslations('chat.direct');

  const { data: goalsData } = useQuery<ProjectGoalsData>(CIRCLE_PROJECT_GOALS, {
    variables: { circleId, projectId: project.id },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const headlineGoal = useMemo(
    () => pickHeadlineGoal(goalsData?.circleProjectGoals ?? []),
    [goalsData],
  );

  const { data: progressData } = useQuery<GoalProgressData>(CIRCLE_GOAL_PROGRESS, {
    variables: { circleId, goalId: headlineGoal?.id ?? '' },
    skip: !headlineGoal,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const { data: contributionsData } = useQuery<ContributionsData>(CIRCLE_CONTRIBUTIONS, {
    variables: { circleId, goalId: headlineGoal?.id ?? '', limit: CONTRIBUTION_PAGE_SIZE },
    skip: !headlineGoal,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const progress = progressData?.circleGoalProgress ?? null;

  const contributorIds = useMemo(
    () => (progress?.byMember ?? []).map((m) => m.userId).filter(Boolean),
    [progress],
  );
  const { usersById } = useCircleUsers(contributorIds);

  const unknownName = tChat('unknownUser');
  const contributors = useMemo(
    () =>
      contributorIds.map((userId) => ({
        id: userId,
        name: circleUserDisplayName(usersById[userId], unknownName),
        avatarUrl: usersById[userId]?.avatarUrl ?? null,
      })),
    [contributorIds, usersById, unknownName],
  );

  /*
   * A correction is a NEGATIVE row linked by `correctsContributionId` — the
   * ledger only ever grows, so counting raw rows would report a corrected
   * contribution twice. Only original rows are contributions.
   */
  const contributionCount = (contributionsData?.circleContributions ?? []).filter(
    (row) => !row.correctsContributionId,
  ).length;

  return (
    <InlineCard
      icon={<Hammer aria-hidden="true" />}
      typeLabel={t('home.cards.projectLabel', { name: proposerName })}
      title={project.title}
      href={`/circles/${circleId}/projects/${project.id}`}
      actionLabel={t('home.cards.viewProject')}
    >
      {project.description?.trim() && (
        <p className="body-small mt-1 line-clamp-1 text-text-secondary">{project.description}</p>
      )}

      {progress && (
        <ProgressWithLabel className="mt-3" value={progress.percentComplete} tone="brand" />
      )}

      {(contributors.length > 0 || contributionCount > 0) && (
        <div className="mt-3 flex items-center gap-2">
          <AvatarGroup users={contributors} max={4} size="sm" />
          <span className="caption-small text-text-secondary">
            {t('home.cards.contributions', { count: contributionCount })}
          </span>
        </div>
      )}
    </InlineCard>
  );
}
