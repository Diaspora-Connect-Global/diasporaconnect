import { gql } from '@apollo/client';

// Types
export interface Event {
  id: string;
  ownerType: 'user' | 'community';
  ownerId: string;
  title: string;
  description: string;
  eventCategory: string;
  visibility?: 'public' | 'community_only' | 'private' | 'unlisted';
  locationType: 'physical' | 'virtual' | 'hybrid';
  locationDetails?: {
    physical?: { venue?: string; address?: string; city?: string; country?: string };
    virtual?: { platform?: string; joinUrl?: string };
  };
  startAt: string;
  endAt: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  isPaid: boolean;
  registrationCount: number;
  availableSpots?: number;
  isRegistered?: boolean;
  canRegister?: boolean;
  tickets?: Array<{
    id: string;
    name: string;
    priceInCents: number;
  }>;
}

/** Input for createEvent - locationDetails matches API LocationDetailsInput */
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
}

export interface CheckInInput {
  eventId: string;
  registrationId: string;
  checkInMethod: string;
}

// Response Types
export interface GetEventData {
  event: Event | null;
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
    paymentIntentClientSecret?: string;
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

// Queries
export const GET_EVENT = gql`
  query GetEvent($id: ID!) {
    event(id: $id) {
      id
      title
      description
      status
      startAt
      endAt
      eventCategory
      locationType
      locationDetails {
        physical {
          venue
          address
          city
          country
        }
        virtual {
          platform
          joinUrl
        }
      }
      isPaid
      registrationCount
      availableSpots
      isRegistered
      canRegister
      tickets {
        id
        name
        priceInCents
      }
    }
  }
`;

export const GET_EVENTS = gql`
  query GetEvents($limit: Int, $offset: Int) {
    events(limit: $limit, offset: $offset) {
      id
      title
      description
      eventCategory
      startAt
      endAt
      locationType
      locationDetails {
        physical {
          venue
          city
          country
        }
        virtual {
          platform
        }
      }
      isPaid
      registrationCount
      availableSpots
      isRegistered
      canRegister
    }
  }
`;

export const GET_USER_EVENTS = gql`
  query GetUserEvents {
    userEvents {
      attending {
        id
        title
        startAt
        endAt
        locationType
        locationDetails {
          physical {
            venue
            city
            country
          }
          virtual {
            platform
          }
        }
        registrationCount
      }
      saved {
        id
        title
        startAt
        endAt
        locationType
        locationDetails {
          physical {
            venue
            city
            country
          }
          virtual {
            platform
          }
        }
        registrationCount
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
  mutation Register($input: RegisterForEventInput!) {
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