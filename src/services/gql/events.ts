import { gql } from '@apollo/client';

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
  currency?: string | null;
  description?: string | null;
  availableQuantity?: number | null;
}

export interface Event {
  id: string;
  ownerType: 'user' | 'community' | 'association';
  ownerId: string;
  title: string;
  description?: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  visibility: 'public' | 'community' | 'association' | 'invite_only';
  startAt: string;
  endAt: string;
  eventCategory: string;
  locationType: 'physical' | 'virtual' | 'hybrid';
  locationDetails?: EventLocation | null;
  capacityType?: 'limited' | 'unlimited';
  capacity?: number | null;
  isPaid: boolean;
  currency?: string | null;
  registrationCount?: number;
  viewCount?: number;
  saveCount?: number;
  isRegistered: boolean;
  canRegister: boolean;
  tickets?: EventTicket[] | null;
  coverImageUrl?: string | null;
  tags?: string[] | null;
  timezone?: string | null;
  publishedAt?: string | null;
  cancelledAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  recurringEventId?: string | null;
}

export interface CreateEventInput {
  ownerType: 'user' | 'community' | 'association';
  ownerId?: string;
  title: string;
  description: string;
  eventCategory: string;
  visibility: 'public' | 'community' | 'association' | 'invite_only';
  locationType: 'physical' | 'virtual' | 'hybrid';
  locationDetails: {
    physical?: { venue?: string; address?: string; city?: string; country?: string };
    virtual?: { platform?: string; joinUrl?: string };
  };
  startAt: string;
  endAt: string;
  timezone: string;
  capacityType: 'limited' | 'unlimited';
  capacity?: number;
  isPaid: boolean;
  currency?: string;
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  id: string;
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

export interface SearchEventsData {
  searchEvents: {
    events: Event[];
    totalCount: number;
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
}

export interface GetMyEventsData {
  getMyEvents: Event[];
}

export interface GetMySavedEventsData {
  getMySavedEvents: Event[];
}

export interface IsEventSavedData {
  isEventSaved: boolean;
}

export interface CreateEventData {
  createEvent: Event;
}

export interface UpdateEventData {
  updateEvent: Event;
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
  saveEvent: boolean;
}

export interface UnsaveEventData {
  unsaveEvent: boolean;
}

// Queries
export const GET_EVENT = gql`
  query GetEvent($id: ID!) {
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
      capacityType
      capacity
      isPaid
      currency
      registrationCount
      viewCount
      saveCount
      isRegistered
      canRegister
      coverImageUrl
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
      publishedAt
      createdAt
      updatedAt
    }
  }
`;

export const SEARCH_EVENTS = gql`
  query SearchEvents($query: String, $category: String, $locationType: String, $limit: Int, $offset: Int) {
    searchEvents(query: $query, category: $category, locationType: $locationType, limit: $limit, offset: $offset) {
      events {
        id
        title
        status
        visibility
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
        capacityType
        capacity
        isPaid
        currency
        registrationCount
        isRegistered
        canRegister
        coverImageUrl
        tags
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
      }
      totalCount
    }
  }
`;

export const GET_MY_EVENTS = gql`
  query GetMyEvents {
    getMyEvents {
      id
      title
      description
      status
      visibility
      startAt
      endAt
      eventCategory
      isPaid
      currency
      registrationCount
      capacityType
      capacity
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
      ownerType
      ownerId
    }
  }
`;

export const GET_MY_SAVED_EVENTS = gql`
  query GetMySavedEvents {
    getMySavedEvents {
      id
      title
      description
      status
      visibility
      startAt
      endAt
      eventCategory
      isPaid
      currency
      registrationCount
      capacityType
      capacity
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
      ownerType
      ownerId
    }
  }
`;

export const IS_EVENT_SAVED = gql`
  query IsEventSaved($eventId: ID!) {
    isEventSaved(eventId: $eventId)
  }
`;

// Mutations
export const CREATE_EVENT = gql`
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input) {
      id
      title
      status
    }
  }
`;

export const UPDATE_EVENT = gql`
  mutation UpdateEvent($input: UpdateEventInput!) {
    updateEvent(input: $input) {
      id
      title
      status
    }
  }
`;

export const PUBLISH_EVENT = gql`
  mutation PublishEvent($id: ID!) {
    publishEvent(id: $id) {
      id
      status
      publishedAt
    }
  }
`;

export const UNPUBLISH_EVENT = gql`
  mutation UnpublishEvent($id: ID!) {
    unpublishEvent(id: $id) {
      id
      status
    }
  }
`;

export const CANCEL_EVENT = gql`
  mutation CancelEvent($id: ID!) {
    cancelEvent(id: $id) {
      id
      status
      cancelledAt
    }
  }
`;

export const DELETE_EVENT = gql`
  mutation DeleteEvent($id: ID!) {
    deleteEvent(id: $id)
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

export const CANCEL_REGISTRATION = gql`
  mutation CancelRegistration($registrationId: ID!) {
    cancelRegistration(registrationId: $registrationId)
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
    saveEvent(eventId: $eventId)
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
