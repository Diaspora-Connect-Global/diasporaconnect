import { gql } from '@apollo/client';

// Backend API: EventLocation is flat (type, venueName, address, city, country, virtualLink, platform)
export interface EventLocation {
  type: 'physical' | 'virtual' | 'hybrid';
  venueName?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  virtualLink?: string | null;
  platform?: string | null;
}

export interface EventTicket {
  id: string;
  name: string;
  priceInCents: number;
  description?: string | null;
  availableQuantity?: number | null;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  startAt: string;
  endAt: string;
  eventCategory: string;
  locationType: 'physical' | 'virtual' | 'hybrid';
  locationDetails?: EventLocation | null;
  isPaid: boolean;
  registrationCount?: number;
  availableSpots?: number | null;
  isRegistered: boolean;
  canRegister: boolean;
  tickets?: EventTicket[] | null;
  coverImageUrl?: string | null;
  tags?: string[] | null;
  timezone?: string | null;
}

/** Input for createEvent - keep for future use */
export interface CreateEventInput {
  ownerType: 'user' | 'community';
  ownerId: string;
  title: string;
  description: string;
  eventCategory: string;
  locationType: 'physical' | 'virtual' | 'hybrid';
  locationDetails: {
    physical?: { venue?: string; address?: string; city?: string; country?: string };
    virtual?: { platform?: string; joinUrl?: string };
  };
  startAt: string;
  endAt: string;
  isPaid: boolean;
}

export interface RegisterForEventInput {
  eventId: string;
  ticketId?: string;
  quantity?: number;
}

export interface CheckInInput {
  eventId: string;
  registrationId: string;
  checkInMethod: string;
}

// Response Types
export interface GetEventData {
  getEvent: Event | null;
}

export interface GetEventsData {
  events: Event[];
}

export interface GetUserEventsData {
  userEvents: {
    attending: Event[];
    saved: Event[];
  };
}

export interface CreateEventData {
  createEvent: string;
}

export interface RegisterEventData {
  registerForEvent: {
    registrationId: string;
    paymentIntentClientSecret?: string | null;
  };
}

export interface CheckInData {
  checkIn: {
    id: string;
    checkedInAt: string;
    checkInMethod: string;
  };
}

export interface SaveEventData {
  saveEvent: {
    id: string;
    savedAt: string;
  };
}

export interface UnsaveEventData {
  unsaveEvent: boolean;
}

// Queries (match backend Events API)
export const GET_EVENT = gql`
  query GetEvent($id: ID!) {
    getEvent(id: $id) {
      id
      title
      description
      status
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
      isPaid
      registrationCount
      availableSpots
      isRegistered
      canRegister
      coverImageUrl
      tags
      timezone
      tickets {
        id
        name
        priceInCents
        description
        availableQuantity
      }
    }
  }
`;

export const GET_EVENTS = gql`
  query GetEvents($limit: Int, $offset: Int) {
    events(limit: $limit, offset: $offset) {
      id
      title
      status
      startAt
      endAt
      eventCategory
      locationType
      locationDetails {
        type
        venueName
        city
        country
        virtualLink
      }
      isPaid
      registrationCount
      availableSpots
      isRegistered
      canRegister
      coverImageUrl
      tags
      tickets {
        id
        name
        priceInCents
        description
        availableQuantity
      }
    }
  }
`;

export const GET_USER_EVENTS = gql`
  query GetUserEvents {
    userEvents {
      attending {
        id
        title
        description
        status
        startAt
        endAt
        eventCategory
        isPaid
        registrationCount
        availableSpots
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
        coverImageUrl
        tags
        timezone
        isRegistered
        canRegister
      }
      saved {
        id
        title
        description
        status
        startAt
        endAt
        eventCategory
        isPaid
        registrationCount
        availableSpots
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
        coverImageUrl
        tags
        timezone
        isRegistered
        canRegister
      }
    }
  }
`;

// Mutations
export const CREATE_EVENT = gql`
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input)
  }
`;

export const REGISTER_EVENT = gql`
  mutation RegisterForEvent($input: RegisterForEventInput!) {
    registerForEvent(input: $input) {
      registrationId
      paymentIntentClientSecret
    }
  }
`;

export const CHECK_IN = gql`
  mutation CheckIn($input: CheckInInput!) {
    checkIn(input: $input) {
      id
      checkedInAt
      checkInMethod
    }
  }
`;

export const SAVE_EVENT = gql`
  mutation SaveEvent($eventId: ID!) {
    saveEvent(eventId: $eventId) {
      id
      savedAt
    }
  }
`;

export const UNSAVE_EVENT = gql`
  mutation UnsaveEvent($eventId: ID!) {
    unsaveEvent(eventId: $eventId)
  }
`;

// Enums
export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

export enum RegistrationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled'
}

// Helpers for UI: backend uses flat EventLocation (venueName, city, virtualLink, platform)
export function getEventLocationDisplay(event: Pick<Event, 'locationType' | 'locationDetails'>): string {
  const loc = event.locationDetails;
  if (!loc) {
    if (event.locationType === 'physical') return 'Physical';
    if (event.locationType === 'virtual') return 'Virtual';
    return 'Hybrid';
  }
  if (loc.type === 'physical') {
    return [loc.venueName, loc.city, loc.country].filter(Boolean).join(', ') || 'Physical';
  }
  if (loc.type === 'virtual') {
    return loc.platform || loc.virtualLink || 'Virtual';
  }
  return 'Hybrid';
}

/** Default/fallback image when event has no cover. Use this for alt and onError fallback. */
export const EVENT_PLACEHOLDER_IMAGE = '/EVENT.png';

export function getEventCoverImage(event: Pick<Event, 'coverImageUrl'>): string {
  const url = event.coverImageUrl?.trim();
  return url ? url : EVENT_PLACEHOLDER_IMAGE;
}
