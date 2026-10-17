import { gql } from '@apollo/client';
import { eventCodeOf, retryAfterSecondsOf } from '@/lib/eventRefusal';

/**
 * Event networking, M7: event day, feedback and the post-event recap.
 *
 * PROPOSED contract: `docs/event-networking/m7-contract.graphql`. The gateway that
 * serves these operations does NOT exist yet, so nothing here runs while
 * `EVENT_DAY_UI_ENABLED` / `FEEDBACK_UI_ENABLED` (`lib/networkingFeatures.ts`) are
 * false, and `npm run validate:graphql` is expected to list them as unknown.
 *
 * Privacy rules the documents encode:
 *  - People are opaque `handle`s plus a display snapshot. No user id exists here.
 *  - Coordinates travel only in `eventNetworkingShareLocation` (mine) and the
 *    counterpart pin inside the event-day state; never logged, never cached
 *    (all operations use NETWORKING_CONTEXT = no-cache).
 *  - Refusals carry `extensions.code = EVENT_NETWORKING_*`, never FORBIDDEN.
 */

/* ------------------------------ Event day ------------------------------ */

export interface CounterpartPin {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  /** When the pin disappears (server TTL, 15 minutes from the share). */
  expiresAt: string;
}

export interface EventDayState {
  /** When I marked myself arrived (null = not yet). */
  myArrivedAt: string | null;
  counterpartArrivedAt: string | null;
  /** The last time the OTHER person pressed "I can't find you" (null = never / cleared by arrival). */
  counterpartCantFindAt: string | null;
  /** Earliest moment I may press "I can't find you" again (null = now). */
  cantFindAvailableAt: string | null;
  /** When my own location share ends (null = I am not sharing). */
  mySharingExpiresAt: string | null;
  /** The other person's pin, ONLY while they are sharing; otherwise null. */
  counterpartPin: CounterpartPin | null;
  /** A real street address for the venue, only when the organiser supplied one (drives "Open in Maps"). */
  venueAddress: string | null;
}

export interface ShareLocationInput {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
}

const DAY = `
  myArrivedAt counterpartArrivedAt counterpartCantFindAt cantFindAvailableAt mySharingExpiresAt venueAddress
  counterpartPin { latitude longitude accuracyMeters expiresAt }`;

export const EVENT_DAY_STATE = gql`
  query EventNetworkingMeetingEventDay($eventId: ID!, $meetingId: ID!) {
    eventNetworkingMeetingEventDay(eventId: $eventId, meetingId: $meetingId) { ${DAY} }
  }
`;

export const EVENT_DAY_ARRIVED = gql`
  mutation EventNetworkingMarkArrived($eventId: ID!, $meetingId: ID!) {
    eventNetworkingMarkArrived(eventId: $eventId, meetingId: $meetingId) { ${DAY} }
  }
`;

export const EVENT_DAY_CANT_FIND = gql`
  mutation EventNetworkingCantFindYou($eventId: ID!, $meetingId: ID!) {
    eventNetworkingCantFindYou(eventId: $eventId, meetingId: $meetingId) { ${DAY} }
  }
`;

export const EVENT_DAY_SHARE = gql`
  mutation EventNetworkingShareLocation($eventId: ID!, $meetingId: ID!, $input: EventNetworkingShareLocationInput!) {
    eventNetworkingShareLocation(eventId: $eventId, meetingId: $meetingId, input: $input) { ${DAY} }
  }
`;

export const EVENT_DAY_STOP = gql`
  mutation EventNetworkingStopSharingLocation($eventId: ID!, $meetingId: ID!) {
    eventNetworkingStopSharingLocation(eventId: $eventId, meetingId: $meetingId) { ${DAY} }
  }
`;

/* ------------------------------- Feedback ------------------------------- */

export type FeedbackSubjectType = 'MEETING' | 'CIRCLE';
export type MeetingAttendance = 'MET' | 'I_ATTENDED_THEY_DID_NOT' | 'THEY_ATTENDED_I_DID_NOT' | 'RESCHEDULED_OR_CANCELLED';
export type CircleAttendance = 'ATTENDED' | 'DID_NOT_ATTEND';
export type FeedbackAttendance = MeetingAttendance | CircleAttendance;
export type FeedbackOutcome =
  | 'EXCHANGED_CONTACTS' | 'POTENTIAL_COLLABORATION' | 'BUSINESS_LEAD' | 'JOB_OR_OPPORTUNITY'
  | 'MENTORSHIP' | 'INVESTMENT_CONVERSATION' | 'OTHER';

export const MEETING_ATTENDANCE: MeetingAttendance[] = ['MET', 'I_ATTENDED_THEY_DID_NOT', 'THEY_ATTENDED_I_DID_NOT', 'RESCHEDULED_OR_CANCELLED'];
export const CIRCLE_ATTENDANCE: CircleAttendance[] = ['ATTENDED', 'DID_NOT_ATTEND'];
export const FEEDBACK_OUTCOMES: FeedbackOutcome[] = [
  'EXCHANGED_CONTACTS', 'POTENTIAL_COLLABORATION', 'BUSINESS_LEAD', 'JOB_OR_OPPORTUNITY', 'MENTORSHIP', 'INVESTMENT_CONVERSATION', 'OTHER',
];
export const FEEDBACK_COMMENT_MAX = 1000;
export const USEFULNESS_VALUES = [1, 2, 3, 4, 5] as const;
/** Circle comments reach organisers (anonymously) only when at least this many people respond. */
export const CIRCLE_COMMENT_MIN_RESPONDENTS = 5;

/** Attendance values where the person was actually there (so usefulness and outcomes apply). */
export const ATTENDED_VALUES: FeedbackAttendance[] = ['MET', 'I_ATTENDED_THEY_DID_NOT', 'ATTENDED'];

export interface MyFeedback {
  subjectType: FeedbackSubjectType;
  attendance: FeedbackAttendance;
  usefulness: number | null;
  outcomes: FeedbackOutcome[];
  comment: string | null;
  submittedAt: string;
  updatedAt: string | null;
  /** The last moment the answer can still be changed. */
  editableUntil: string | null;
  editable: boolean;
}

export interface FeedbackInput {
  attendance: FeedbackAttendance;
  usefulness?: number | null;
  outcomes?: FeedbackOutcome[];
  comment?: string | null;
  /** Meetings only: the stored "stay connected" preference (the Connect call is separate). */
  stayConnected?: boolean;
}

const FEEDBACK = `subjectType attendance usefulness outcomes comment submittedAt updatedAt editableUntil editable`;

export const FEEDBACK_MINE = gql`
  query EventNetworkingMyFeedback($eventId: ID!, $subjectType: EventNetworkingFeedbackSubjectType!, $subjectId: ID!) {
    eventNetworkingMyFeedback(eventId: $eventId, subjectType: $subjectType, subjectId: $subjectId) { ${FEEDBACK} }
  }
`;

export const FEEDBACK_SUBMIT_MEETING = gql`
  mutation EventNetworkingSubmitMeetingFeedback($eventId: ID!, $meetingId: ID!, $input: EventNetworkingFeedbackInput!) {
    eventNetworkingSubmitMeetingFeedback(eventId: $eventId, meetingId: $meetingId, input: $input) { ${FEEDBACK} }
  }
`;

export const FEEDBACK_SUBMIT_CIRCLE = gql`
  mutation EventNetworkingSubmitCircleFeedback($eventId: ID!, $circleId: ID!, $input: EventNetworkingFeedbackInput!) {
    eventNetworkingSubmitCircleFeedback(eventId: $eventId, circleId: $circleId, input: $input) { ${FEEDBACK} }
  }
`;

/* -------------------------------- Recap -------------------------------- */

export type OrganiserMembership = 'MEMBER' | 'PENDING' | 'NOT_MEMBER' | 'UNAVAILABLE';

/** One meeting or circle still waiting for my feedback. `subjectId` is only ever sent back to the gateway. */
export interface FeedbackPrompt {
  subjectType: FeedbackSubjectType;
  subjectId: string;
  /** Circle title, or the other person's display name for a meeting. */
  title: string;
  counterpart?: { handle: string; displayName?: string | null; avatarUrl?: string | null; username?: string | null } | null;
  startAt: string | null;
  endAt: string | null;
  feedbackClosesAt: string | null;
}

export interface RecapOrganiser {
  kind: 'COMMUNITY' | 'ASSOCIATION';
  entityId: string;
  name: string;
  membership: OrganiserMembership;
}

export interface Recap {
  /** My matches at this event. */
  matchesCount: number;
  /** Meetings I reported I attended (my own answers only). */
  meetingsHeldCount: number;
  circlesJoinedCount: number;
  pendingFeedback: FeedbackPrompt[];
  pendingFeedbackTotal: number;
  organiser: RecapOrganiser | null;
  /** When networking closes for this event (access to matches, meetings and circles ends). */
  networkingEndsAt: string | null;
  networkingOpen: boolean;
  timezone: string | null;
}

export const RECAP_MINE = gql`
  query EventNetworkingMyRecap($eventId: ID!) {
    eventNetworkingMyRecap(eventId: $eventId) {
      matchesCount meetingsHeldCount circlesJoinedCount pendingFeedbackTotal networkingEndsAt networkingOpen timezone
      pendingFeedback { subjectType subjectId title startAt endAt feedbackClosesAt counterpart { handle displayName avatarUrl username } }
      organiser { kind entityId name membership }
    }
  }
`;

/* ------------------------------- Refusals ------------------------------- */

/** Key under `networkingEventDay.errors` for a refused M7 operation. Never the server's text. */
const KEY_BY_CODE: Readonly<Record<string, string>> = {
  EVENT_NETWORKING_FEATURE_UNAVAILABLE: 'featureUnavailable',
  EVENT_FEATURE_UNAVAILABLE: 'featureUnavailable',
  EVENT_NETWORKING_UNAVAILABLE: 'unavailable',
  EVENT_NETWORKING_NOT_OPEN: 'refused',
  EVENT_NETWORKING_CIRCLE_NOT_FOUND: 'refused',
  EVENT_NETWORKING_MEETING_NOT_FOUND: 'notFound',
  EVENT_NETWORKING_NOT_FOUND: 'notFound',
  EVENT_NETWORKING_NOT_PARTICIPANT: 'notParticipant',
  EVENT_NETWORKING_INVALID_ARGUMENT: 'invalid',
  EVENT_NETWORKING_RATE_LIMITED: 'rateLimited',
  EVENT_NETWORKING_CONFLICT: 'conflict',
  EVENT_NETWORKING_EVENT_DAY_WINDOW_CLOSED: 'windowClosed',
  EVENT_NETWORKING_CANT_FIND_COOLDOWN: 'cantFindCooldown',
  EVENT_NETWORKING_LOCATION_INVALID: 'locationInvalid',
  EVENT_NETWORKING_MEETING_NOT_CONFIRMED: 'notConfirmed',
  EVENT_NETWORKING_FEEDBACK_CLOSED: 'feedbackClosed',
  EVENT_NETWORKING_FEEDBACK_NOT_OPEN: 'feedbackNotOpen',
  EVENT_NETWORKING_CONNECT_COOLDOWN: 'connectCooldown',
  EVENT_NETWORKING_CONNECTION_LIMIT_REACHED: 'connectionLimit',
  EVENT_NETWORKING_CONNECT_REFUSED: 'connectRefused',
};

export interface EventDayFailure {
  ok: false;
  code: string;
  key: string;
  /** CANT_FIND_COOLDOWN only: seconds until the next press (0 = no presses left); null when the server did not say. */
  retryAfterSeconds?: number | null;
}

export function eventDayFailure(source: unknown): EventDayFailure {
  const code = eventCodeOf(source);
  const key = KEY_BY_CODE[code] ?? (code.startsWith('EVENT_NETWORKING_') ? 'refused' : 'generic');
  return code === 'EVENT_NETWORKING_CANT_FIND_COOLDOWN' ? { ok: false, code, key, retryAfterSeconds: retryAfterSecondsOf(source) } : { ok: false, code, key };
}
