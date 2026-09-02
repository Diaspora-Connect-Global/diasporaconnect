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
import { GET_CONVERSATIONS } from '@/services/gql/messaging';
import type {
  CircleChallengesData,
  CircleGoalProgressData,
  CircleMotionsData,
  CircleProjectGoalsData,
  CircleProjectGoal,
  CircleProjectsData,
} from '@/services/gql/types/circles';
import type { GetConversationsData } from '@/services/gql/types/messaging';

/**
 * Live state behind the status pills on a "My Circles" card.
 *
 * The pills are the point of the index screen — they answer "does anything need
 * me?" without opening anything — so each one is real state read from the
 * gateway, never a placeholder.
 *
 * ## Why this is N+1, and why that is acceptable here
 *
 * There is no aggregate field on the gateway: `circleMotions`, `circleProjects`
 * and `circleChallenges` are each scoped to ONE circle, and goal progress is a
 * third hop (project -> goals -> progress). So a card costs 3 queries, plus 2
 * more only when the circle actually has an active project.
 *
 * That is bounded the same way `useCircleUsers` is bounded: a person belongs to
 * a handful of circles, not an unbounded list. It is still the obvious thing to
 * collapse later — one `circleSignals(circleIds: [ID!]!)` field on the gateway
 * would turn the whole screen into a single round trip. **Do not reuse this
 * hook for an unbounded list.**
 *
 * ## Failure is an absent pill, never a broken card
 *
 * Every query runs with `errorPolicy: 'all'`, and a missing/failed signal
 * simply yields `null` / `false`. A circle whose motions cannot be loaded shows
 * no vote pill rather than an error — the card's own identity (name, banner,
 * member count) comes from `myCircles` and is already on screen.
 *
 * `cache-and-network` (the global default is `network-only`) so returning to
 * the index paints the pills from cache immediately and corrects them behind
 * the scenes.
 */
export interface CircleSignals {
  /**
   * ISO deadline of the OPEN motion closing soonest, or null when nothing is
   * open. Deliberately NOT compared against `Date.now()` here: this value is
   * rendered server-side too, and any now-dependent branch taken during render
   * is a hydration mismatch. Urgency is decided after mount, in the pill.
   */
  voteClosesAt: string | null;
  /** How many motions are open. > 0 with a null `voteClosesAt` means an open motion carries no deadline. */
  openVoteCount: number;
  hasLiveChallenge: boolean;
  /** 0-100 for the circle's headline shared goal, or null when it has none. */
  goalPercent: number | null;
  /**
   * True only until the motions query has answered for the first time.
   *
   * Deliberately not "is anything in flight": `cache-and-network` reports
   * `loading` on every background refresh, so gating on that would replace a
   * populated pill row with skeletons on each revisit. What matters is whether
   * we may yet make the factual claim "No open votes" — everything else on the
   * row is additive, and an unanswered goal or challenge is simply an absent
   * pill.
   */
  votesPending: boolean;
}

/** Motions are cheap to over-fetch and we only need the soonest deadline. */
const OPEN_MOTION_PAGE = 10;

const SIGNAL_QUERY_OPTIONS = {
  fetchPolicy: 'cache-and-network',
  errorPolicy: 'all',
  notifyOnNetworkStatusChange: false,
} as const;

/**
 * The goal whose progress represents the circle.
 *
 * A SHARED goal belongs to the circle; an INDIVIDUAL one belongs to its
 * assignee, and putting somebody else's personal target on the circle's card
 * would misattribute it. Only an open goal is worth a pill — a met or cancelled
 * goal is history, not something that needs you.
 */
function headlineGoal(
  goals: CircleProjectGoal[] | undefined,
): CircleProjectGoal | null {
  if (!goals?.length) return null;
  return (
    goals.find((g) => g.scope === 'SHARED' && g.status === 'GOAL_OPEN') ?? null
  );
}

/** The earliest future-or-past deadline among open motions. Pure — no clock read. */
function soonestDeadline(deadlines: (string | null | undefined)[]): string | null {
  const times = deadlines
    .filter((d): d is string => Boolean(d))
    .map((d) => ({ iso: d, ms: new Date(d).getTime() }))
    .filter((d) => Number.isFinite(d.ms))
    .sort((a, b) => a.ms - b.ms);
  return times[0]?.iso ?? null;
}

export function useCircleSignals(circleId: string): CircleSignals {
  const motions = useQuery<CircleMotionsData>(CIRCLE_MOTIONS, {
    variables: { circleId, status: 'OPEN', limit: OPEN_MOTION_PAGE, offset: 0 },
    skip: !circleId,
    ...SIGNAL_QUERY_OPTIONS,
  });

  const challenges = useQuery<CircleChallengesData>(CIRCLE_CHALLENGES, {
    variables: { circleId, status: 'CHALLENGE_ACTIVE', limit: 1, offset: 0 },
    skip: !circleId,
    ...SIGNAL_QUERY_OPTIONS,
  });

  const projects = useQuery<CircleProjectsData>(CIRCLE_PROJECTS, {
    variables: { circleId, status: 'PROJECT_ACTIVE', limit: 1, offset: 0 },
    skip: !circleId,
    ...SIGNAL_QUERY_OPTIONS,
  });

  // The goal chain is only paid for by circles that have an active project, so
  // a circle with nothing running costs three queries and stops there.
  const projectId = projects.data?.circleProjects?.[0]?.id ?? null;

  const goals = useQuery<CircleProjectGoalsData>(CIRCLE_PROJECT_GOALS, {
    variables: { circleId, projectId: projectId ?? '' },
    skip: !circleId || !projectId,
    ...SIGNAL_QUERY_OPTIONS,
  });

  const goalId = headlineGoal(goals.data?.circleProjectGoals)?.id ?? null;

  const progress = useQuery<CircleGoalProgressData>(CIRCLE_GOAL_PROGRESS, {
    variables: { circleId, goalId: goalId ?? '' },
    skip: !circleId || !goalId,
    ...SIGNAL_QUERY_OPTIONS,
  });

  const openMotions = useMemo(
    () => motions.data?.circleMotions ?? [],
    [motions.data],
  );

  return useMemo(() => {
    const percent = progress.data?.circleGoalProgress?.percentComplete;

    return {
      voteClosesAt: soonestDeadline(openMotions.map((m) => m.closesAt)),
      openVoteCount: openMotions.length,
      hasLiveChallenge: (challenges.data?.circleChallenges?.length ?? 0) > 0,
      // `percentComplete` is an Int 0-100 clamped by circle-service. Guard the
      // absent case explicitly: `0` is a real, meaningful percentage.
      goalPercent: typeof percent === 'number' ? percent : null,
      // A warm cache satisfies this on the first render, so returning to the
      // index never flashes skeletons over pills it already knows.
      votesPending: motions.data === undefined && motions.error === undefined,
    };
  }, [
    openMotions,
    challenges.data,
    motions.data,
    motions.error,
    progress.data,
  ]);
}

/**
 * Unread message counts for every circle chat, in ONE query.
 *
 * `Circle.chatConversationId` is already on the circle summary, and
 * `getConversations` returns `unreadCount` per conversation, so the whole
 * screen's unread state costs a single request rather than one per card. A
 * circle whose conversation is not in the list simply has no unread pill —
 * never a fabricated zero-or-more badge.
 */
export function useCircleUnreadCounts(): {
  unreadByConversationId: Record<string, number>;
  loading: boolean;
} {
  const { data, loading } = useQuery<GetConversationsData>(GET_CONVERSATIONS, {
    variables: { limit: 100, offset: 0 },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const unreadByConversationId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const conversation of data?.getConversations ?? []) {
      if (conversation?.id) map[conversation.id] = conversation.unreadCount ?? 0;
    }
    return map;
  }, [data]);

  return { unreadByConversationId, loading };
}
