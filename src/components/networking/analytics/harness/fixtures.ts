import type {
  AnalyticsFilterOptions,
  AnalyticsFilters,
  InsightGroup,
  InsightKind,
  NetworkingAnalytics,
  NetworkingRate,
  NetworkingStat,
} from '@/services/gql/networkingAnalytics';
import type { AnalyticsApi } from '../useAnalytics';

export type AnalyticsFixtureState = 'empty' | 'small' | 'full' | 'error';

/** A count the way the SERVER sends it: below 5 the number is withheld. */
const stat = (n: number): NetworkingStat => (n < 5 ? { value: null, suppressed: true } : { value: n, suppressed: false });
const rate = (num: number, den: number): NetworkingRate => ({
  numerator: stat(num),
  denominator: stat(den),
  noDenominator: den === 0,
  suppressed: den !== 0 && (num < 5 || den < 5),
});

export const OPTIONS: AnalyticsFilterOptions = {
  circles: [
    { key: 'c-founders', name: 'Founders Roundtable' },
    { key: 'c-fintech', name: 'Diaspora Fintech' },
    { key: 'c-wellness', name: 'Health & Wellness' },
  ],
  industries: [
    { code: 'TECHNOLOGY', label: 'Technology' },
    { code: 'FINANCE', label: 'Finance' },
    { code: 'HEALTH', label: 'Health' },
    { code: 'EDUCATION', label: 'Education' },
  ],
};

const GENERATED_AT = '2030-11-24T09:30:00.000Z';

function insightGroup(kind: InsightKind, base: Array<[string, string, number]>, scale: number): InsightGroup {
  return {
    kind,
    // The server leaves out every code under 5: no "other" cell, no "fewer than 5" row.
    items: base.flatMap(([code, label, n]) => {
      const v = Math.round(n * scale);
      return v >= 5 ? [{ code, label, count: stat(v) }] : [];
    }),
  };
}

/** The full dataset, scaled: `scale` < 1 imitates a filtered (smaller) cohort. */
export function buildFull(scale = 1): NetworkingAnalytics {
  const n = (v: number) => Math.round(v * scale);
  const participants = n(132);
  const growthDen = n(127);
  return {
    generatedAt: GENERATED_AT,
    registeredAttendees: stat(n(214)),
    participants: stat(participants),
    currentlyActive: stat(n(118)),
    peopleConnected: stat(n(64)),
    connectionRate: rate(n(64), participants),
    confirmedMeetings: stat(n(46)),
    scheduledCircleSessions: stat(n(6)),
    meetings: {
      population: stat(n(40)),
      both: stat(n(14)),
      one: stat(n(7)),
      nonAttendance: stat(n(5)),
      noResponse: stat(n(8)),
      rescheduledOrCancelled: stat(n(6)),
      other: stat(0),
      reportedHeld: stat(n(21)),
    },
    usefulContacts: rate(n(19), n(37)),
    circleParticipants: stat(n(58)),
    circleMemberships: stat(n(91)),
    circles: [
      { key: 'c-founders', name: 'Founders Roundtable', participants: stat(n(24)), memberships: stat(n(31)) },
      { key: 'c-fintech', name: 'Diaspora Fintech', participants: stat(n(19)), memberships: stat(n(28)) },
      { key: 'c-wellness', name: 'Health & Wellness', participants: stat(n(15)), memberships: stat(n(32)) },
    ],
    insightsDenominator: stat(n(118)),
    insights: [
      insightGroup('INDUSTRIES', [['TECHNOLOGY', 'Technology', 41], ['FINANCE', 'Finance', 27], ['HEALTH', 'Health', 19], ['EDUCATION', 'Education', 12], ['AGRICULTURE', 'Agriculture', 7]], scale),
      insightGroup('NEEDS', [['FUNDING', 'Funding', 38], ['MENTORSHIP', 'Mentorship', 33], ['PARTNERS', 'Partners', 29], ['CUSTOMERS', 'Customers', 21], ['HIRING', 'Hiring', 11]], scale),
      insightGroup('OFFERS', [['MENTORSHIP', 'Mentorship', 36], ['INTRODUCTIONS', 'Introductions', 31], ['EXPERTISE', 'Expertise', 25]], scale),
      insightGroup('MARKETS', [['GH', 'Ghana', 52], ['GB', 'United Kingdom', 33], ['NG', 'Nigeria', 27], ['DE', 'Germany', 14]], scale),
      insightGroup('CIRCLE_TOPICS', [['FINTECH', 'Fintech', 31], ['WELLNESS', 'Wellness', 22], ['FOUNDERS', 'Founders', 20]], scale),
    ],
    growth: {
      applicable: true,
      existingMembers: stat(n(87)),
      newApproved: stat(n(23)),
      pending: stat(n(9)),
      notJoined: stat(n(41)),
      joinRate: rate(n(23), growthDen),
      bySource: [
        { source: 'EVENT_PAGE', count: stat(n(12)) },
        { source: 'EVENT_PROMPT', count: stat(n(6)) },
        { source: 'EVENT_FOLLOWUP', count: stat(n(5)) },
      ],
    },
  };
}

/**
 * Small cohort: exercises suppression AND zero denominators. `peopleConnected` is a
 * deliberately BROKEN server answer (it leaks 3 while claiming not suppressed): the UI must
 * still never print it.
 */
export function buildSmall(): NetworkingAnalytics {
  return {
    ...buildFull(0.05),
    registeredAttendees: stat(12),
    participants: stat(6),
    currentlyActive: stat(5),
    peopleConnected: { value: 3, suppressed: false },
    connectionRate: rate(3, 6),
    confirmedMeetings: stat(4),
    scheduledCircleSessions: stat(0),
    meetings: {
      population: stat(0),
      both: stat(0),
      one: stat(0),
      nonAttendance: stat(0),
      noResponse: stat(0),
      rescheduledOrCancelled: stat(0),
      other: stat(0),
      reportedHeld: stat(0),
    },
    usefulContacts: rate(0, 0),
    circleParticipants: stat(3),
    circleMemberships: stat(4),
    circles: [{ key: 'c-founders', name: 'Founders Roundtable', participants: stat(3), memberships: stat(4) }],
    insightsDenominator: stat(6),
    insights: [insightGroup('INDUSTRIES', [['TECHNOLOGY', 'Technology', 5], ['FINANCE', 'Finance', 3]], 1)],
    growth: {
      applicable: true,
      existingMembers: stat(5),
      newApproved: stat(2),
      pending: stat(1),
      notJoined: stat(0),
      joinRate: rate(0, 0),
      bySource: [{ source: 'EVENT_PAGE', count: stat(2) }],
    },
  };
}

/** Nothing recorded yet: every count is under 5 and every ratio has an empty denominator. */
export function buildEmpty(): NetworkingAnalytics {
  const zero = stat(0);
  return {
    generatedAt: GENERATED_AT,
    registeredAttendees: zero,
    participants: zero,
    currentlyActive: zero,
    peopleConnected: zero,
    connectionRate: rate(0, 0),
    confirmedMeetings: zero,
    scheduledCircleSessions: zero,
    meetings: { population: zero, both: zero, one: zero, nonAttendance: zero, noResponse: zero, rescheduledOrCancelled: zero, other: zero, reportedHeld: zero },
    usefulContacts: rate(0, 0),
    circleParticipants: zero,
    circleMemberships: zero,
    circles: [],
    insightsDenominator: zero,
    insights: [],
    growth: { applicable: false, existingMembers: null, newApproved: null, pending: null, notJoined: null, joinRate: null, bySource: [] },
  };
}

export type AnalyticsCall = { name: 'load' | 'options'; filters?: AnalyticsFilters };

/** A fixture backend that records every call. Filters shrink the cohort so suppression shows up under filters too. */
export function fakeAnalyticsApi(state: AnalyticsFixtureState, onCall: (c: AnalyticsCall) => void): AnalyticsApi {
  return {
    async load(filters) {
      onCall({ name: 'load', filters });
      await new Promise((r) => setTimeout(r, 120));
      if (state === 'error') return { ok: false, code: 'EVENT_NETWORKING_UNAVAILABLE', key: 'unavailable' };
      if (state === 'empty') return { ok: true, data: buildEmpty() };
      if (state === 'small') return { ok: true, data: buildSmall() };
      // Industry narrows to a tiny cohort (everything suppressed); circle halves it; others trim it.
      const scale = filters.industry ? 0.03 : (filters.circleKey ? 0.5 : 1) * (filters.networkingStatus || filters.meetingStatus || filters.attendanceFormat || filters.from || filters.to ? 0.8 : 1);
      return { ok: true, data: buildFull(scale) };
    },
    async options() {
      onCall({ name: 'options' });
      return { ok: true, data: OPTIONS };
    },
  };
}
