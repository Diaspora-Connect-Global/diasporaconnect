import { gql } from '@apollo/client';

/**
 * Event networking MEETINGS (M5) documents and types.
 *
 * Contract: `docs/networking/meetings.graphql` (printed from the gateway's built
 * schema). The gateway that serves these operations is NOT deployed yet, so
 * `npm run validate:graphql` lists them as broken against the live gateway; that
 * is expected. They are checked against the printed SDL by
 * `scripts/validate-meetings-documents.mjs` instead. Every operation here is
 * gated by `MEETINGS_UI_ENABLED` (`lib/networkingFeatures.ts`) and never runs
 * while it is false.
 *
 * People appear only as their opaque `handle` plus a display snapshot: no user
 * id exists in these documents. Always sent with NETWORKING_CONTEXT (no-cache).
 */

export type MeetingStatus = 'REQUESTED' | 'ALT_PROPOSED' | 'CONFIRMED' | 'RESCHEDULE_PROPOSED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED';
export type MeetingRole = 'REQUESTER' | 'RECIPIENT';
export type MeetingFormat = 'IN_PERSON' | 'ONLINE';
export type MeetingPolicy = 'MUTUAL_ONLY' | 'ANY_PARTICIPANT' | 'DISABLED';
export type MeetingFilter = 'PENDING' | 'UPCOMING' | 'ALTERNATIVES' | 'COMPLETED' | 'CANCELLED';
export type MeetingPurpose =
  | 'PARTNERSHIP' | 'INVESTMENT' | 'MENTORSHIP' | 'HIRING' | 'COLLABORATION'
  | 'KNOWLEDGE_EXCHANGE' | 'BUSINESS_DEVELOPMENT' | 'INTRODUCTION' | 'OTHER';
export type MeetingAction = 'ACCEPT' | 'DECLINE' | 'PROPOSE_ALTERNATIVE';
export type MeetingScheduleKind = 'MEETING' | 'SESSION' | 'CIRCLE_SESSION';

export const MEETING_FILTERS: MeetingFilter[] = ['PENDING', 'UPCOMING', 'ALTERNATIVES', 'COMPLETED', 'CANCELLED'];
export const MEETING_PURPOSES: MeetingPurpose[] = [
  'PARTNERSHIP', 'INVESTMENT', 'MENTORSHIP', 'HIRING', 'COLLABORATION', 'KNOWLEDGE_EXCHANGE', 'BUSINESS_DEVELOPMENT', 'INTRODUCTION', 'OTHER',
];
export const MEETING_NOTE_MAX = 280;
export const MEETING_MAX_PROPOSALS = 3;

/** UTC instants plus the event-timezone wall clock (so no client-side zone maths is needed). */
export interface MeetingSlot {
  startAt: string;
  endAt: string;
  localDate: string;
  localStart: string;
  localEnd: string;
  utcOffset: string;
}

export interface MeetingPoint {
  id: string;
  name: string;
  directions?: string | null;
  capacityPerSlot: number;
  active: boolean;
  sortOrder: number;
}

export interface MeetingWindow {
  date: string;
  startTime: string;
  endTime: string;
  startAt?: string | null;
  endAt?: string | null;
}

export interface MeetingSettings {
  eventId: string;
  meetingPolicy: MeetingPolicy;
  meetingDurations: number[];
  meetingWindows: MeetingWindow[];
  maxMeetingsPerPerson: number;
  maxPendingRequests: number;
  meetingPoints: MeetingPoint[];
  timezone: string;
  version: number;
  allowedFormats: MeetingFormat[];
  slotStepMinutes: number;
}

export interface MeetingSettingsInput {
  eventId: string;
  meetingPolicy?: MeetingPolicy;
  meetingDurations?: number[];
  meetingWindows?: Array<{ date: string; startTime: string; endTime: string }>;
  maxMeetingsPerPerson?: number;
  maxPendingRequests?: number;
  meetingPoints?: Array<{ id?: string | null; name: string; directions?: string | null; capacityPerSlot: number; sortOrder?: number }>;
  expectedVersion?: number;
}

export interface MeetingSlotSuggestions {
  slots: MeetingSlot[];
  timezone: string;
  allowedDurations: number[];
  allowedFormats: MeetingFormat[];
  meetingPointOptions: MeetingPoint[];
  purposes: MeetingPurpose[];
}

export interface MeetingCounterpart {
  handle: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  username?: string | null;
  headline?: string | null;
  available: boolean;
}

export interface MeetingProposal {
  slot: MeetingSlot;
  kind: 'ALTERNATIVE' | 'RESCHEDULE';
  proposedByMe: boolean;
}

export interface Meeting {
  meetingId: string;
  eventId: string;
  status: MeetingStatus;
  role: MeetingRole;
  awaitingMe: boolean;
  counterpart?: MeetingCounterpart | null;
  slot?: MeetingSlot | null;
  durationMinutes: number;
  timezone: string;
  format?: MeetingFormat | null;
  meetingPoint?: MeetingPoint | null;
  onlineUrl?: string | null;
  purpose?: MeetingPurpose | null;
  note?: string | null;
  openProposals: MeetingProposal[];
  previousSlot?: MeetingSlot | null;
  rescheduleCount: number;
  cancelledBy?: 'ME' | 'COUNTERPART' | 'SYSTEM' | null;
  cancelReason?: 'BY_PARTICIPANT' | 'MATCH_DISSOLVED' | 'BLOCKED' | 'PARTICIPATION_ENDED' | null;
  expiresAt?: string | null;
  createdAt?: string | null;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  canAccept: boolean;
  canDecline: boolean;
  canPropose: boolean;
  canCancel: boolean;
  canReschedule: boolean;
  version: number;
  updatedAt?: string | null;
}

export interface MeetingCounts {
  pending: number;
  upcoming: number;
  alternatives: number;
  completed: number;
  cancelled: number;
  awaitingMe: number;
}

export interface MeetingPage {
  meetings: Meeting[];
  nextCursor?: string | null;
  counts?: MeetingCounts | null;
}

export interface MeetingScheduleItem {
  kind: MeetingScheduleKind;
  slot?: MeetingSlot | null;
  title?: string | null;
  location?: string | null;
  status?: MeetingStatus | null;
  meeting?: Meeting | null;
  sessionId?: string | null;
  sessionType?: string | null;
  circleId?: string | null;
}

export interface MeetingSchedule {
  items: MeetingScheduleItem[];
  timezone: string;
  circleSessionsAvailable: boolean;
}

export interface MeetingRequestInput {
  eventId: string;
  handle: string;
  startAt: string;
  durationMinutes: number;
  format: MeetingFormat;
  meetingPointId?: string;
  purpose: MeetingPurpose;
  note?: string;
  onlineUrl?: string;
  acknowledgeProfileReveal?: boolean;
}

export interface MeetingRespondInput {
  eventId: string;
  meetingId: string;
  action: MeetingAction;
  proposedStarts?: string[];
  startAt?: string;
  onlineUrl?: string;
}

const SLOT = `startAt endAt localDate localStart localEnd utcOffset`;
const POINT = `id name directions capacityPerSlot active sortOrder`;

export const MEETING_FIELDS = `
  meetingId eventId status role awaitingMe durationMinutes timezone format onlineUrl purpose note
  rescheduleCount cancelledBy cancelReason expiresAt createdAt confirmedAt cancelledAt
  canAccept canDecline canPropose canCancel canReschedule version updatedAt
  counterpart { handle displayName avatarUrl username headline available }
  slot { ${SLOT} }
  previousSlot { ${SLOT} }
  meetingPoint { ${POINT} }
  openProposals { kind proposedByMe slot { ${SLOT} } }`;

const SETTINGS = `
  eventId meetingPolicy meetingDurations maxMeetingsPerPerson maxPendingRequests timezone version allowedFormats slotStepMinutes
  meetingWindows { date startTime endTime startAt endAt }
  meetingPoints { ${POINT} }`;

export const MEETING_SETTINGS = gql`
  query NetworkingMeetingSettings($eventId: ID!) {
    eventNetworkingMeetingSettings(eventId: $eventId) { ${SETTINGS} }
  }
`;

export const MEETING_UPDATE_SETTINGS = gql`
  mutation NetworkingUpdateMeetingSettings($input: EventNetworkingMeetingSettingsInput!) {
    eventNetworkingUpdateMeetingSettings(input: $input) { ${SETTINGS} }
  }
`;

export const MEETING_SUGGEST_SLOTS = gql`
  query NetworkingSuggestMeetingSlots($eventId: ID!, $handle: String!, $durationMinutes: Int!, $fromAt: String, $toAt: String, $meetingPointId: ID, $limit: Int) {
    eventNetworkingSuggestMeetingSlots(eventId: $eventId, handle: $handle, durationMinutes: $durationMinutes, fromAt: $fromAt, toAt: $toAt, meetingPointId: $meetingPointId, limit: $limit) {
      timezone allowedDurations allowedFormats purposes
      slots { ${SLOT} }
      meetingPointOptions { ${POINT} }
    }
  }
`;

export const MEETING_MY_MEETINGS = gql`
  query NetworkingMyMeetings($eventId: ID!, $filter: EventNetworkingMeetingFilter, $cursor: String, $limit: Int) {
    eventNetworkingMyMeetings(eventId: $eventId, filter: $filter, cursor: $cursor, limit: $limit) {
      nextCursor
      counts { pending upcoming alternatives completed cancelled awaitingMe }
      meetings { ${MEETING_FIELDS} }
    }
  }
`;

export const MEETING_ONE = gql`
  query NetworkingMeeting($eventId: ID!, $meetingId: ID!) {
    eventNetworkingMeeting(eventId: $eventId, meetingId: $meetingId) { ${MEETING_FIELDS} }
  }
`;

export const MEETING_MY_SCHEDULE = gql`
  query NetworkingMySchedule($eventId: ID!) {
    eventNetworkingMySchedule(eventId: $eventId) {
      timezone circleSessionsAvailable
      items {
        kind title location status sessionId sessionType circleId
        slot { ${SLOT} }
        meeting { ${MEETING_FIELDS} }
      }
    }
  }
`;

export const MEETING_REQUEST = gql`
  mutation NetworkingRequestMeeting($input: EventNetworkingMeetingRequestInput!) {
    eventNetworkingRequestMeeting(input: $input) { ${MEETING_FIELDS} }
  }
`;

export const MEETING_RESPOND = gql`
  mutation NetworkingRespondToMeeting($input: EventNetworkingMeetingRespondInput!) {
    eventNetworkingRespondToMeeting(input: $input) { ${MEETING_FIELDS} }
  }
`;

export const MEETING_CANCEL = gql`
  mutation NetworkingCancelMeeting($eventId: ID!, $meetingId: ID!) {
    eventNetworkingCancelMeeting(eventId: $eventId, meetingId: $meetingId) { ${MEETING_FIELDS} }
  }
`;

export const MEETING_PROPOSE_RESCHEDULE = gql`
  mutation NetworkingProposeReschedule($eventId: ID!, $meetingId: ID!, $proposedStarts: [String!]!) {
    eventNetworkingProposeReschedule(eventId: $eventId, meetingId: $meetingId, proposedStarts: $proposedStarts) { ${MEETING_FIELDS} }
  }
`;
