'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';

import {
  CIRCLE_CHALLENGES,
  CIRCLE_GOAL_PROGRESS,
  CIRCLE_MOTIONS,
  CIRCLE_PROJECTS,
  CIRCLE_PROJECT_GOALS,
} from '@/services/gql/circles';
import type {
  CircleChallenge,
  CircleChallengesData,
  CircleChallengesVariables,
  CircleGoalProgressData,
  CircleGoalProgressVariables,
  CircleMotion,
  CircleMotionsData,
  CircleMotionsVariables,
  CircleProject,
  CircleProjectGoalsData,
  CircleProjectGoalsVariables,
  CircleProjectsData,
  CircleProjectsVariables,
} from '@/services/gql/types/circles';

import { pickHeadlineGoal } from './headlineGoal';

/**
 * What is running in this circle right now.
 *
 * ── WHY THIS DOES NOT REUSE THE CONVERSATION'S QUERIES ───────────────────────
 * `CircleHome` already reads motions / projects / challenges — but UNFILTERED
 * and capped at `INLINE_CARD_LIMIT`, because the conversation is a record and
 * a motion that passed last month still belongs in it. Filtering that page
 * client-side would make "Nothing running right now." a claim about the ten
 * most recent artefacts rather than about the circle, and a circle with eleven
 * closed motions and one open one would be told nothing was live. So the panel
 * asks the server the question it is actually answering, with `status` filters.
 *
 * ── COST ────────────────────────────────────────────────────────────────────
 * Three queries, plus two more only when the circle has an active project (the
 * goal chain: project → goals → progress). Same shape and same bound as
 * `index/useCircleSignals`, which pays this per CARD on the index; here it is
 * paid once for one circle. Every query is best-effort: a failed read yields an
 * absent row, never an error — the conversation beside it is the screen.
 *
 * ── ENUM VOCABULARY ─────────────────────────────────────────────────────────
 * `status` here is a FILTER argument, so projects and challenges take the
 * PREFIXED spelling (`PROJECT_ACTIVE` / `CHALLENGE_ACTIVE`) while the values
 * read back off the objects are bare (`ACTIVE`). Motions have only the one
 * vocabulary. Getting this wrong returns an empty list rather than an error.
 */
export interface CircleLiveState {
  /** Motions still open for votes, soonest deadline first. */
  openMotions: CircleMotion[];
  /** The open motion closing soonest, or null when none carries a deadline. */
  nextClosingMotion: CircleMotion | null;
  activeProjects: CircleProject[];
  activeChallenges: CircleChallenge[];
  /**
   * 0–100 for the FIRST active project's headline goal, or null.
   *
   * Only the first is resolved: each percentage costs two more round trips, and
   * a sidebar is a summary. A project without a resolved percentage renders as
   * a project, never as one at 0% — the two are not the same statement.
   */
  headlineProjectId: string | null;
  headlineProjectPercent: number | null;
  /**
   * True until all three lists have answered once.
   *
   * Deliberately not "is anything in flight": `cache-and-network` reports
   * `loading` on every background refresh, so gating on that would blank a
   * populated panel on each revisit. What this guards is the factual claim
   * "Nothing running right now." — everything else is additive.
   */
  pending: boolean;
}

/** Small pages: this is a summary panel, not an index. */
const MOTION_PAGE = 10;
const ARTEFACT_PAGE = 5;

const LIVE_QUERY_OPTIONS = {
  fetchPolicy: 'cache-and-network',
  errorPolicy: 'all',
  notifyOnNetworkStatusChange: false,
} as const;

/** Epoch ms, or null for an absent or unparseable timestamp. */
function toEpoch(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function useCircleLive(circleId: string): CircleLiveState {
  const motions = useQuery<CircleMotionsData, CircleMotionsVariables>(CIRCLE_MOTIONS, {
    variables: { circleId, status: 'OPEN', limit: MOTION_PAGE, offset: 0 },
    skip: !circleId,
    ...LIVE_QUERY_OPTIONS,
  });

  const projects = useQuery<CircleProjectsData, CircleProjectsVariables>(CIRCLE_PROJECTS, {
    variables: { circleId, status: 'PROJECT_ACTIVE', limit: ARTEFACT_PAGE, offset: 0 },
    skip: !circleId,
    ...LIVE_QUERY_OPTIONS,
  });

  const challenges = useQuery<CircleChallengesData, CircleChallengesVariables>(
    CIRCLE_CHALLENGES,
    {
      variables: { circleId, status: 'CHALLENGE_ACTIVE', limit: ARTEFACT_PAGE, offset: 0 },
      skip: !circleId,
      ...LIVE_QUERY_OPTIONS,
    },
  );

  const headlineProjectId = projects.data?.circleProjects?.[0]?.id ?? null;

  const goals = useQuery<CircleProjectGoalsData, CircleProjectGoalsVariables>(
    CIRCLE_PROJECT_GOALS,
    {
      variables: { circleId, projectId: headlineProjectId ?? '' },
      skip: !circleId || !headlineProjectId,
      ...LIVE_QUERY_OPTIONS,
    },
  );

  const goalId = pickHeadlineGoal(goals.data?.circleProjectGoals ?? [])?.id ?? null;

  const progress = useQuery<CircleGoalProgressData, CircleGoalProgressVariables>(
    CIRCLE_GOAL_PROGRESS,
    {
      variables: { circleId, goalId: goalId ?? '' },
      skip: !circleId || !goalId,
      ...LIVE_QUERY_OPTIONS,
    },
  );

  const openMotions = useMemo(() => {
    const rows = motions.data?.circleMotions ?? [];
    // Soonest first, so "the next thing that needs you" is row one. Motions
    // with no parseable deadline keep their server order at the end rather
    // than being dropped — an open vote must never vanish from this panel.
    return [...rows].sort((a, b) => {
      const at = toEpoch(a.closesAt);
      const bt = toEpoch(b.closesAt);
      if (at === null && bt === null) return 0;
      if (at === null) return 1;
      if (bt === null) return -1;
      return at - bt;
    });
  }, [motions.data]);

  return useMemo(() => {
    const percent = progress.data?.circleGoalProgress?.percentComplete;

    return {
      openMotions,
      nextClosingMotion: openMotions.find((m) => toEpoch(m.closesAt) !== null) ?? null,
      activeProjects: projects.data?.circleProjects ?? [],
      activeChallenges: challenges.data?.circleChallenges ?? [],
      headlineProjectId,
      // `percentComplete` is an Int 0–100 clamped by circle-service. Guard the
      // absent case explicitly: `0` is a real, meaningful percentage.
      headlineProjectPercent: typeof percent === 'number' ? percent : null,
      pending:
        (motions.data === undefined && motions.error === undefined) ||
        (projects.data === undefined && projects.error === undefined) ||
        (challenges.data === undefined && challenges.error === undefined),
    };
  }, [
    openMotions,
    projects.data,
    projects.error,
    challenges.data,
    challenges.error,
    motions.data,
    motions.error,
    progress.data,
    headlineProjectId,
  ]);
}
