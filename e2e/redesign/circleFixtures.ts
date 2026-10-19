/** Shared mocked-GraphQL shapes for the Circles specs. */
export const circle = (i: number, name: string, over: Record<string, unknown> = {}) => ({
    __typename: 'Circle',
    id: `cir-${i}`,
    circleNumber: i,
    name,
    handle: `c${i}`,
    tagline: null,
    description: null,
    avatarUrl: null,
    bannerUrl: null,
    brandJson: null,
    discoverable: true,
    joinMode: 'REQUEST',
    status: 'ACTIVE',
    founderUserId: 'x',
    chatConversationId: null,
    memberCount: 12 + i,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    archivedAt: null,
    ...over,
});

export const card = (i: number, name: string, joinMode: 'OPEN' | 'REQUEST' | 'INVITE_ONLY') => ({
    __typename: 'CirclePublicCard',
    id: `cir-${i}`,
    name,
    handle: `c${i}`,
    tagline: null,
    avatarUrl: null,
    bannerUrl: null,
    memberCount: 20 + i,
    joinMode,
    discoverable: true,
    createdAt: '2026-01-01T00:00:00Z',
});

export const JOIN_REFUSALS: Array<[string, string]> = [
    ['CIRCLE_NOT_OPEN', 'This circle is no longer open to join.'],
    ['CIRCLE_FULL', 'This circle is full right now.'],
    ['CIRCLE_JOIN_NOT_ALLOWED', "You can't join this circle on your own."],
    ['CIRCLE_NOT_JOINABLE', "This circle can't take new members right now."],
    ['CIRCLE_NOT_FOUND', "We couldn't find this circle."],
    ['CIRCLE_UNAVAILABLE', "We can't reach this circle right now."],
    ['RATE_LIMITED', "You're doing that too fast."],
];

// ─── Full member-side data for the screen sweep ──────────────────────────────
const T = '2026-10-01T10:00:00Z';
const LATER = '2026-10-20T10:00:00Z';
const typed = <N extends string, O extends Record<string, unknown>>(__typename: N, o: O) => ({ __typename, ...o });

export const member = (i: number, over: Record<string, unknown> = {}) =>
    typed('CircleMember', { id: `mem-${i}`, circleId: 'cir-1', userId: `usr-${i}`, role: i === 1 ? 'LEAD' : 'MEMBER', status: 'ACTIVE', invitedBy: null, removedByMotionId: null, joinedAt: T, leftAt: null, ...over });

export const motion = (i: number, over: Record<string, unknown> = {}) =>
    typed('CircleMotion', { id: `mot-${i}`, circleId: 'cir-1', motionNumber: i, kind: 'GENERAL', title: `Motion ${i} title`, rationale: 'Because we should.', proposedBy: 'usr-1', subjectType: null, subjectId: null, payloadJson: null, status: 'OPEN', ruleId: 'rule-1', ruleVersion: 1, quorumNumerator: 1, quorumDenominator: 2, majorityNumerator: 1, majorityDenominator: 2, tieBreaksTo: 'REJECTED', electorateSize: 3, opensAt: T, closesAt: LATER, outcomeYes: 0, outcomeNo: 0, outcomeAbstain: 0, enactmentError: null, decidedAt: null, enactedAt: null, createdAt: T, ...over });

export const project = (i: number, over: Record<string, unknown> = {}) =>
    typed('CircleProject', { id: `prj-${i}`, circleId: 'cir-1', projectNumber: i, title: `Project ${i} title`, description: 'Do the thing together.', status: 'ACTIVE', coverUrl: null, createdBy: 'usr-1', createdByMotionId: null, startsOn: '2026-10-01', dueOn: '2026-12-01', completedAt: null, createdAt: T, updatedAt: T, ...over });

export const goal = (i: number) =>
    typed('CircleProjectGoal', { id: `gol-${i}`, projectId: 'prj-1', scope: 'COLLECTIVE', assigneeUserId: null, metricKind: 'COUNT', unit: 'km', targetValue: '100', status: 'OPEN', dueOn: '2026-12-01', createdAt: T });

export const challenge = (i: number, over: Record<string, unknown> = {}) =>
    typed('CircleChallenge', { id: `chl-${i}`, circleId: 'cir-1', challengeNumber: i, title: `Challenge ${i} title`, description: 'Every day.', status: 'ACTIVE', verificationMode: 'HONOUR', cadence: 'DAILY', pointsPerEntry: 5, maxEntriesPerPeriod: 1, createdBy: 'usr-1', createdByMotionId: null, startsAt: T, endsAt: LATER, createdAt: T, ...over });

const ent = (key: string, intValue: number | null, valueKind = 'INT') => typed('CircleEntitlement', { key, valueKind, intValue, hasIntValue: intValue !== null, boolValue: null });
const ENTS = [ent('MAX_MEMBERS', 20), ent('MAX_ACTIVE_PROJECTS', 3), ent('MAX_ACTIVE_CHALLENGES', 3)];

export function memberScreens(myRole: 'LEAD' | 'MEMBER' = 'LEAD') {
    const c = circle(1, 'Accra Tech Hub', { chatConversationId: null });
    return {
        MyCircles: { myCircles: [c] },
        SearchCircles: { searchCircles: [] },
        Circle: { circle: c },
        CirclePublicCard: { circlePublicCard: null },
        MyCircleMembership: { myCircleMembership: typed('CircleMembershipCheck', { isMember: true, status: 'ACTIVE', role: myRole, isLead: myRole === 'LEAD', canPropose: true }) },
        MyCircleInvitations: { myCircleInvitations: [] },
        CircleChat: { circleChat: typed('CircleChat', { circleId: 'cir-1', conversationId: null, available: false, historyDays: null, historyLimited: false }) },
        CircleMembers: { circleMembers: [member(1), member(2), member(3)] },
        CirclePastMembers: { left: [], removed: [], suspended: [] },
        CircleInvitations: { circleInvitations: [] },
        CircleJoinRequests: { circleJoinRequests: [] },
        CircleInviteLinks: { circleInviteLinks: [] },
        CircleMotions: { circleMotions: [motion(1), motion(2, { status: 'PASSED', outcomeYes: 2, outcomeNo: 1, decidedAt: T })] },
        CircleMotion: { circleMotion: motion(1) },
        CircleMotionTally: { circleMotionTally: typed('CircleMotionTally', { motionId: 'mot-1', yes: 1, no: 0, abstain: 0, notVoted: 2, electorateSize: 3, quorumMet: false, majorityMet: true, provisionalOutcome: 'PENDING', closesAt: LATER }) },
        CircleGovernanceRules: { circleGovernanceRules: [typed('CircleGovernanceRule', { id: 'rule-1', circleId: 'cir-1', version: 1, motionKind: 'GENERAL', quorumNumerator: 1, quorumDenominator: 2, majorityNumerator: 1, majorityDenominator: 2, votingWindowHours: 72, proposerRole: 'MEMBER', tieBreaksTo: 'REJECTED', createdByMotionId: null, effectiveFrom: T, supersededAt: null })] },
        CircleGovernanceRuleHistory: { circleGovernanceRuleHistory: [] },
        CircleAuditTrail: { circleAuditTrail: typed('CircleAuditPage', { events: [], chainVerified: true }) },
        CircleProjects: { circleProjects: [project(1)] },
        CircleProject: { circleProject: project(1) },
        CircleProjectGoals: { circleProjectGoals: [goal(1)] },
        CircleGoalProgress: { circleGoalProgress: typed('CircleGoalProgress', { goalId: 'gol-1', targetValue: '100', currentValue: '40', percentComplete: 40, byMember: [typed('CircleMemberProgress', { userId: 'usr-1', value: '40', percentOfTotal: 100 })] }) },
        CircleContributions: { circleContributions: [] },
        CircleChallenges: { circleChallenges: [challenge(1)] },
        CircleChallenge: { circleChallenge: challenge(1) },
        CircleChallengeEntries: { circleChallengeEntries: [] },
        CircleLeaderboard: { circleLeaderboard: typed('CircleLeaderboard', { circleId: 'cir-1', seasonKey: '2026', rankingEnabled: true, collectiveTotal: 15, rows: [typed('CircleLeaderboardRow', { userId: 'usr-1', points: 10, rank: 1, entries: 2 }), typed('CircleLeaderboardRow', { userId: 'usr-2', points: 5, rank: 2, entries: 1 })] }) },
        CircleMemberScore: { circleMemberScore: typed('CircleLeaderboardRow', { userId: 'usr-1', points: 10, rank: 1, entries: 2 }) },
        CircleEntitlements: { circleEntitlements: typed('CircleEntitlements', { ownerType: 'CIRCLE', ownerId: 'cir-1', entitlements: ENTS, usage: [typed('CircleEntitlementUsage', { key: 'MAX_MEMBERS', current: 3, limit: 20, hasLimit: true, locked: false })] }) },
        CirclePlans: { circlePlans: [] },
        CircleSubscription: { circleSubscription: null },
        CirclePlanScreen: {
            circleSubscription: typed('CircleSubscription', { id: 'sub-1', ownerType: 'CIRCLE', ownerId: 'cir-1', planId: 'pl-1', planCode: 'FREE', planVersion: 1, currency: 'GHS', amountMinor: 0, interval: 'MONTH', status: 'ACTIVE', purchasedByUserId: 'usr-1', cancelAtPeriodEnd: false, currentPeriodStart: T, currentPeriodEnd: LATER, createdAt: T, entitlements: ENTS }),
            circleEntitlements: typed('CircleEntitlements', { ownerType: 'CIRCLE', ownerId: 'cir-1', entitlements: ENTS, usage: [typed('CircleEntitlementUsage', { key: 'MAX_MEMBERS', current: 3, limit: 20, hasLimit: true, locked: false })] }),
            circlePlans: [typed('CirclePlan', { id: 'pl-1', code: 'FREE', name: 'Free', description: 'Start here', ownerKind: 'CIRCLE', isDefault: true, isActive: true, sortOrder: 1, version: 1, prices: [], entitlements: ENTS })],
            myCircleMembership: typed('CircleMembershipCheck', { isMember: true, status: 'ACTIVE', role: myRole, isLead: myRole === 'LEAD', canPropose: true }),
        },
    };
}
