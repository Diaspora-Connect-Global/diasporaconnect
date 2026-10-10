import { gql } from '@apollo/client';
import type { Event } from './events';

/**
 * The M2 event surface: the redesigned event page, the Register tab, event
 * content (programme / speakers / venue / updates) and organiser management.
 * Kept apart from `events.ts` so the documents other pages already depend on
 * (GET_EVENT, REGISTER_EVENT, …) are not changed under them.
 *
 * Every write here except `registerForEvent` is dark-launched at the gateway:
 * a refusal with `EVENT_FEATURE_UNAVAILABLE` must read as "not available yet".
 * Optional fields are requested individually-safe: the gateway returns null for
 * any it has no value for.
 */

export type RegistrationStatusGQL =
  | 'PENDING'
  | 'PENDING_APPROVAL'
  | 'CONFIRMED'
  | 'WAITLISTED'
  | 'REJECTED'
  | 'CANCELLED';

export interface EventPageEvent extends Event {
  myRegistrationStatus?: RegistrationStatusGQL | null;
  phase?: string | null;
  requiresApproval?: boolean | null;
  registrationOpensAt?: string | null;
  registrationClosesAt?: string | null;
  isFull?: boolean | null;
}

export const GET_EVENT_PAGE = gql`
  query GetEventPage($id: ID!) {
    getEvent(id: $id) {
      id
      title
      description
      status
      visibility
      startAt
      endAt
      eventCategory
      locationType
      locationDetails {
        type
        venueName
        address
        city
        country
        virtualLink
        platform
      }
      capacity
      availableSpots
      isPaid
      currency
      registrationCount
      isRegistered
      canRegister
      coverImageUrl
      registrationLink
      tags
      timezone
      ownerType
      ownerId
      tickets {
        id
        name
        priceInCents
        currency
        description
        availableQuantity
      }
      registrationFormFields {
        id
        label
        type
        required
        options
      }
      myRegistrationId
      myRegistrationStatus
      phase
      requiresApproval
      registrationOpensAt
      registrationClosesAt
      isFull
      createdAt
      updatedAt
    }
  }
`;
export interface GetEventPageData {
  getEvent: EventPageEvent | null;
}

// ─── Content (public reads) ──────────────────────────────────────────────────

export type SessionType =
  | 'KEYNOTE' | 'TALK' | 'PANEL' | 'WORKSHOP' | 'BREAK' | 'NETWORKING' | 'MEAL' | 'PERFORMANCE' | 'OTHER';
export type SpeakerRole = 'KEYNOTE' | 'PANELIST' | 'MODERATOR' | 'SPEAKER' | 'HOST';

export interface ProgrammeSession {
  id: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  timezone?: string | null;
  room?: string | null;
  sessionType: SessionType;
  speakerIds: string[];
  sortOrder: number;
}
export interface EventSpeaker {
  id: string;
  name: string;
  title?: string | null;
  organization?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  roleLabel: SpeakerRole;
  hasProfile: boolean;
  profileUsername?: string | null;
  sortOrder: number;
}
export interface EventUpdatePost {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
}
export interface EventVenueInfo {
  halls: Array<{ name: string; description?: string | null }>;
  directions?: string | null;
  accessibilityNotes?: string | null;
  parking?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactPublic: boolean;
}

export const EVENT_PROGRAMME = gql`
  query EventProgramme($eventId: ID!) {
    eventProgramme(eventId: $eventId) {
      id
      title
      description
      startAt
      endAt
      timezone
      room
      sessionType
      speakerIds
      sortOrder
    }
  }
`;
export interface EventProgrammeData {
  eventProgramme: ProgrammeSession[] | null;
}

export const EVENT_SPEAKERS = gql`
  query EventSpeakers($eventId: ID!) {
    eventSpeakers(eventId: $eventId) {
      id
      name
      title
      organization
      bio
      photoUrl
      roleLabel
      hasProfile
      profileUsername
      sortOrder
    }
  }
`;
export interface EventSpeakersData {
  eventSpeakers: EventSpeaker[] | null;
}

export const EVENT_UPDATES = gql`
  query EventUpdates($eventId: ID!, $pageSize: Int, $cursor: String) {
    eventUpdates(eventId: $eventId, pageSize: $pageSize, cursor: $cursor) {
      updates {
        id
        title
        body
        publishedAt
      }
      nextCursor
    }
  }
`;
export interface EventUpdatesData {
  eventUpdates: { updates: EventUpdatePost[]; nextCursor?: string | null } | null;
}

export const EVENT_VENUE_INFO = gql`
  query EventVenueInfo($eventId: ID!) {
    eventVenueInfo(eventId: $eventId) {
      halls {
        name
        description
      }
      directions
      accessibilityNotes
      parking
      contactEmail
      contactPhone
      contactPublic
    }
  }
`;
export interface EventVenueInfoData {
  eventVenueInfo: EventVenueInfo | null;
}

// ─── Registration ────────────────────────────────────────────────────────────

export type OrganiserJoinStatus = 'REQUESTED' | 'JOINED' | 'ALREADY_MEMBER' | 'NOT_APPLICABLE' | 'FAILED';

export interface RegisterForEventInputM2 {
  eventId: string;
  ticketId?: string;
  quantity?: number;
  promoCode?: string;
  formResponsesJson?: string;
  attendanceFormat?: 'IN_PERSON' | 'ONLINE';
  source?: string;
  inviteCode?: string;
  termsAccepted?: boolean;
  termsHash?: string;
  joinOrganiserCommunity?: boolean;
}

export const REGISTER_FOR_EVENT = gql`
  mutation RegisterForEventM2($input: RegisterForEventInput!) {
    registerForEvent(input: $input) {
      registrationId
      paymentIntentClientSecret
      waitlistPosition
      registrationStatus
      organiserCommunityJoin {
        status
        requiresPayment
      }
    }
  }
`;
export interface RegisterForEventData {
  registerForEvent: {
    registrationId: string;
    paymentIntentClientSecret?: string | null;
    waitlistPosition?: number | null;
    registrationStatus?: RegistrationStatusGQL | null;
    organiserCommunityJoin?: { status: OrganiserJoinStatus; requiresPayment: boolean } | null;
  } | null;
}

export const JOIN_EVENT_ORGANISER_COMMUNITY = gql`
  mutation JoinEventOrganiserCommunity($eventId: ID!) {
    joinEventOrganiserCommunity(eventId: $eventId) {
      status
      requiresPayment
    }
  }
`;
export interface JoinOrganiserData {
  joinEventOrganiserCommunity: { status: OrganiserJoinStatus; requiresPayment: boolean } | null;
}

/** The organiser's identity + the viewer's standing in it (name for the CTA, status for the button). */
export const GET_ORGANISER_COMMUNITY = gql`
  query GetEventOrganiserCommunity($id: ID!) {
    getCommunity(id: $id) {
      id
      name
      avatarUrl
      joinPolicy
      paymentType
      priceAmount
      priceCurrency
      membershipStatus
      enabledServices
    }
  }
`;
export const GET_ORGANISER_ASSOCIATION = gql`
  query GetEventOrganiserAssociation($id: ID!) {
    getAssociation(id: $id) {
      id
      name
      avatarUrl
      joinPolicy
      paymentType
      priceAmount
      priceCurrency
      membershipStatus
      enabledServices
    }
  }
`;
export interface OrganiserEntity {
  id: string;
  name: string;
  avatarUrl?: string | null;
  joinPolicy?: string | null;
  paymentType?: string | null;
  priceAmount?: number | null;
  priceCurrency?: string | null;
  membershipStatus?: string | null;
  enabledServices?: string[] | null;
}

/** Future events for the "Similar events" rail (filtered by category client-side). */
export const SIMILAR_EVENTS = gql`
  query SimilarEvents($input: ListEventsInput!) {
    searchEvents(input: $input) {
      events {
        id
        title
        startAt
        endAt
        eventCategory
        status
        visibility
        locationType
        locationDetails {
          type
          venueName
          city
          country
        }
        coverImageUrl
        registrationCount
      }
    }
  }
`;

// ─── Organiser management ────────────────────────────────────────────────────

export const UPSERT_PROGRAMME_SESSION = gql`
  mutation UpsertEventProgrammeSession($input: EventProgrammeSessionInput!) {
    upsertEventProgrammeSession(input: $input) {
      id
    }
  }
`;
export const DELETE_PROGRAMME_SESSION = gql`
  mutation DeleteEventProgrammeSession($eventId: ID!, $sessionId: ID!) {
    deleteEventProgrammeSession(eventId: $eventId, sessionId: $sessionId)
  }
`;
export const UPSERT_EVENT_SPEAKER = gql`
  mutation UpsertEventSpeaker($input: EventSpeakerInput!) {
    upsertEventSpeaker(input: $input) {
      id
    }
  }
`;
export const DELETE_EVENT_SPEAKER = gql`
  mutation DeleteEventSpeaker($eventId: ID!, $speakerId: ID!) {
    deleteEventSpeaker(eventId: $eventId, speakerId: $speakerId)
  }
`;
export const PUBLISH_EVENT_UPDATE = gql`
  mutation PublishEventUpdate($eventId: ID!, $title: String!, $body: String!) {
    publishEventUpdate(eventId: $eventId, title: $title, body: $body) {
      id
    }
  }
`;
export const DELETE_EVENT_UPDATE = gql`
  mutation DeleteEventUpdate($eventId: ID!, $updateId: ID!) {
    deleteEventUpdate(eventId: $eventId, updateId: $updateId)
  }
`;

export const APPROVE_EVENT_REGISTRATION = gql`
  mutation ApproveEventRegistration($registrationId: ID!) {
    approveEventRegistration(registrationId: $registrationId) {
      id
      status
      registrationStatus
      waitlistPosition
    }
  }
`;
export const REJECT_EVENT_REGISTRATION = gql`
  mutation RejectEventRegistration($registrationId: ID!, $reason: String) {
    rejectEventRegistration(registrationId: $registrationId, reason: $reason) {
      id
      status
      registrationStatus
    }
  }
`;
export const PENDING_APPROVAL_REGISTRATIONS = gql`
  query PendingApprovalRegistrations($eventId: ID!, $limit: Int, $offset: Int) {
    getEventRegistrations(eventId: $eventId, limit: $limit, offset: $offset, status: "pending_approval") {
      total
      registrations {
        id
        userId
        quantity
        registeredAt
        attendanceFormat
      }
    }
  }
`;
export interface PendingApprovalData {
  getEventRegistrations: {
    total: number;
    registrations: Array<{
      id: string;
      userId: string;
      quantity: number;
      registeredAt?: string | null;
      attendanceFormat?: string | null;
    }>;
  };
}

export const UPDATE_REGISTRATION_SETTINGS = gql`
  mutation UpdateEventRegistrationSettings($input: EventRegistrationSettingsInput!) {
    updateEventRegistrationSettings(input: $input) {
      id
      requiresApproval
      registrationOpensAt
      registrationClosesAt
    }
  }
`;

export type EventStaffRole = 'EVENT_MANAGER' | 'NETWORKING_MANAGER';
export interface EventStaffMember {
  userId: string;
  role: EventStaffRole;
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  addedAt?: string | null;
}
export const EVENT_STAFF = gql`
  query EventStaff($eventId: ID!) {
    eventStaff(eventId: $eventId) {
      userId
      role
      displayName
      username
      avatarUrl
      addedAt
    }
  }
`;
export const ADD_EVENT_STAFF = gql`
  mutation AddEventStaff($eventId: ID!, $userId: ID!, $role: EventStaffRole!) {
    addEventStaff(eventId: $eventId, userId: $userId, role: $role) {
      userId
      role
    }
  }
`;
export const REMOVE_EVENT_STAFF = gql`
  mutation RemoveEventStaff($eventId: ID!, $userId: ID!) {
    removeEventStaff(eventId: $eventId, userId: $userId)
  }
`;
