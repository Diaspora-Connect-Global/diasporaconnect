import { gql } from '@apollo/client';

/**
 * Event networking ORGANISER ANALYTICS (M8) documents and types.
 *
 * Contract: `docs/event-networking/m8-contract.graphql` (the SDL the backend is asked to
 * build). The gateway operations do NOT exist yet, so these documents are never sent
 * while `ANALYTICS_UI_ENABLED` is false (`lib/networkingFeatures.ts`) and
 * `npm run validate:graphql` is expected to list them as unknown.
 *
 * AGGREGATES ONLY. No user id, name, decision, message or location appears in any
 * field: the only identifiers are opaque filter keys (circle) that are sent back, never
 * shown. Every count is a `NetworkingStat`: the server decides suppression (k = 5) and
 * the UI ALSO refuses to print any number below 5 (`analytics/stats.ts`).
 */

/** A count. `value` is null when `suppressed` (the server must not send the number at all). */
export interface NetworkingStat {
  value: number | null;
  suppressed: boolean;
}

/** A ratio. `numerator`/`denominator` are always shown together; the percentage is derived client-side. */
export interface NetworkingRate {
  numerator: NetworkingStat;
  denominator: NetworkingStat;
  /** True when the denominator is exactly 0: shown as "—", never 0%. */
  noDenominator: boolean;
  suppressed: boolean;
}

export interface MeetingBuckets {
  /** Meetings in the feedback population (completed, or cancelled after confirmation). */
  population: NetworkingStat;
  both: NetworkingStat;
  one: NetworkingStat;
  nonAttendance: NetworkingStat;
  /** Nobody answered. Never counted as non-attendance. */
  noResponse: NetworkingStat;
  rescheduledOrCancelled: NetworkingStat;
  /** Only OTHER answers; the UI shows it only when non-zero. */
  other: NetworkingStat;
  /** both + one, computed by the server. */
  reportedHeld: NetworkingStat;
}

export interface CircleRow {
  /** Opaque key; sent back as the circle filter, never rendered. */
  key: string;
  name: string;
  participants: NetworkingStat;
  memberships: NetworkingStat;
}

export type InsightKind = 'INDUSTRIES' | 'NEEDS' | 'OFFERS' | 'MARKETS' | 'CIRCLE_TOPICS';

export interface InsightItem {
  code: string;
  label: string;
  /** Items below 5 are left out by the server (no "other" cell). */
  count: NetworkingStat;
}

export interface InsightGroup {
  kind: InsightKind;
  items: InsightItem[];
}

export type GrowthSource = 'EVENT_PAGE' | 'EVENT_PROMPT' | 'EVENT_FOLLOWUP';

export interface GrowthSourceRow {
  source: GrowthSource;
  count: NetworkingStat;
}

export interface CommunityGrowth {
  /** False for events not owned by a community or association: the tile is hidden. */
  applicable: boolean;
  existingMembers: NetworkingStat | null;
  newApproved: NetworkingStat | null;
  pending: NetworkingStat | null;
  notJoined: NetworkingStat | null;
  /** New approved members / registered attendees who were not members. */
  joinRate: NetworkingRate | null;
  bySource: GrowthSourceRow[];
}

export interface NetworkingAnalytics {
  generatedAt: string;
  registeredAttendees: NetworkingStat;
  participants: NetworkingStat;
  currentlyActive: NetworkingStat;
  peopleConnected: NetworkingStat;
  connectionRate: NetworkingRate;
  confirmedMeetings: NetworkingStat;
  scheduledCircleSessions: NetworkingStat;
  meetings: MeetingBuckets;
  /** Useful contacts over feedback respondents. */
  usefulContacts: NetworkingRate;
  circleParticipants: NetworkingStat;
  circleMemberships: NetworkingStat;
  circles: CircleRow[];
  /** Participants with a non-draft networking profile: the denominator of every insight. */
  insightsDenominator: NetworkingStat;
  insights: InsightGroup[];
  growth: CommunityGrowth;
}

export type AnalyticsNetworkingStatus = 'ACTIVE' | 'PAUSED' | 'WITHDRAWN' | 'REVOKED';
export type AnalyticsMeetingStatus = 'CONFIRMED' | 'RESCHEDULE_PROPOSED' | 'COMPLETED' | 'CANCELLED';
export type AnalyticsFormat = 'IN_PERSON' | 'ONLINE';

export const ANALYTICS_NETWORKING_STATUSES: AnalyticsNetworkingStatus[] = ['ACTIVE', 'PAUSED', 'WITHDRAWN', 'REVOKED'];
export const ANALYTICS_MEETING_STATUSES: AnalyticsMeetingStatus[] = ['CONFIRMED', 'RESCHEDULE_PROPOSED', 'COMPLETED', 'CANCELLED'];
export const ANALYTICS_FORMATS: AnalyticsFormat[] = ['IN_PERSON', 'ONLINE'];

/** Empty string / undefined = no filter. Dates are `YYYY-MM-DD` in the event's timezone. */
export interface AnalyticsFilters {
  from?: string;
  to?: string;
  networkingStatus?: AnalyticsNetworkingStatus | '';
  circleKey?: string;
  meetingStatus?: AnalyticsMeetingStatus | '';
  industry?: string;
  attendanceFormat?: AnalyticsFormat | '';
}

export interface AnalyticsFilterOptions {
  circles: Array<{ key: string; name: string }>;
  industries: Array<{ code: string; label: string }>;
}

const STAT = 'value suppressed';
const RATE = `numerator { ${STAT} } denominator { ${STAT} } noDenominator suppressed`;

export const NETWORKING_ANALYTICS = gql`
  query EventNetworkingAnalytics($eventId: ID!, $filters: NetworkingAnalyticsFilterInput) {
    eventNetworkingAnalytics(eventId: $eventId, filters: $filters) {
      generatedAt
      registeredAttendees { ${STAT} }
      participants { ${STAT} }
      currentlyActive { ${STAT} }
      peopleConnected { ${STAT} }
      connectionRate { ${RATE} }
      confirmedMeetings { ${STAT} }
      scheduledCircleSessions { ${STAT} }
      meetings {
        population { ${STAT} }
        both { ${STAT} }
        one { ${STAT} }
        nonAttendance { ${STAT} }
        noResponse { ${STAT} }
        rescheduledOrCancelled { ${STAT} }
        other { ${STAT} }
        reportedHeld { ${STAT} }
      }
      usefulContacts { ${RATE} }
      circleParticipants { ${STAT} }
      circleMemberships { ${STAT} }
      circles { key name participants { ${STAT} } memberships { ${STAT} } }
      insightsDenominator { ${STAT} }
      insights { kind items { code label count { ${STAT} } } }
      growth {
        applicable
        existingMembers { ${STAT} }
        newApproved { ${STAT} }
        pending { ${STAT} }
        notJoined { ${STAT} }
        joinRate { ${RATE} }
        bySource { source count { ${STAT} } }
      }
    }
  }
`;

export const NETWORKING_ANALYTICS_OPTIONS = gql`
  query EventNetworkingAnalyticsFilterOptions($eventId: ID!) {
    eventNetworkingAnalyticsFilterOptions(eventId: $eventId) {
      circles { key name }
      industries { code label }
    }
  }
`;

/** Variables for the query: empty filters are dropped so an unfiltered view sends `{}`. */
export function filtersToVariables(f: AnalyticsFilters): Record<string, string> {
  const out: Record<string, string> = {};
  (Object.keys(f) as Array<keyof AnalyticsFilters>).forEach((k) => {
    const v = f[k];
    if (typeof v === 'string' && v !== '') out[k] = v;
  });
  return out;
}
