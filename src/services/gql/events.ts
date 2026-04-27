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

// Some backend responses include ticket `currency`; keep it optional.
export interface EventTicket {
  id: string;
  name: string;
  priceInCents: number;
  currency?: string | null;
  description?: string | null;
  availableQuantity?: number | null;
}

export interface EventTicketFull {
  id: string;
  name: string;
  priceInCents: number;
  currency?: string | null;
  description?: string | null;
  totalQuantity?: number | null;
  soldQuantity?: number | null;
  reservedQuantity?: number | null;
  availableQuantity?: number | null;
  ticketType?: string | null;
  isActive: boolean;
  salesStart?: string | null;
  salesEnd?: string | null;
  createdAt?: string | null;
}

export interface RegistrationFormField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'checkbox';
  required: boolean;
  options?: string[] | null;
}

// EventGQL on the backend has no `capacityType` — use `capacity` (null = unlimited)
// and `availableSpots` (null = unlimited, 0 = sold out)
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
  capacity?: number | null;
  availableSpots?: number | null;
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
  registrationFormFields?: RegistrationFormField[] | null;
  myRegistrationId?: string | null;
}

export interface EventStats {
  eventId: string;
  totalRegistrations: number;
  confirmedRegistrations: number;
  pendingRegistrations: number;
  cancelledRegistrations: number;
  totalTicketsSold: number;
  totalCapacity: number;
  availableCapacity: number;
  totalCheckIns: number;
  currentlyAttending: number;
  saveCount: number;
  totalRevenue?: string | null;
  currency?: string | null;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  ticketId?: string | null;
  quantity: number;
  status: string;
  totalAmount?: string | null;
  currency?: string | null;
  registeredAt?: string | null;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  createdAt?: string | null;
}

export interface EventAttendanceRecord {
  id: string;
  userId: string;
  registrationId: string;
  checkInMethod: string;
  checkedInAt: string;
  checkedOutAt?: string | null;
}

export interface EventPromoCode {
  id: string;
  eventId: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses: number;
  usesCount: number;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt: string;
}

export interface ValidatePromoCodeResult {
  valid: boolean;
  promoCodeId?: string | null;
  discountAmountCents: number;
  finalAmountCents: number;
  reason?: string | null;
}

export interface SearchEventsInput {
  query: string;
  limit?: number;
  offset?: number;
}

export interface SearchEventsResponse {
  searchEvents: {
    success: boolean;
    message?: string;
    total: number;
    events: Array<{
      id: string;
      title: string;
      description?: string;
      startAt: string;
      endAt: string;
      eventCategory?: string;
      status: string;
      visibility: string;
      ownerType: string;
      ownerId: string;
    }>;
  };
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
    type?: string;
    venue?: string;
    address?: string;
    city?: string;
    country?: string;
    virtualLink?: string;
    platform?: string;
  };
  startAt: string;
  endAt: string;
  timezone: string;
  capacity?: number;
  isPaid: boolean;
  ticketPrice?: number;
  currency?: string;
  coverImageUrl?: string;
  tags?: string[];
}

export interface UpdateEventInput extends Partial<Omit<CreateEventInput, 'ownerType' | 'ownerId'>> {}

export interface RegisterForEventInput {
  eventId: string;
  ticketId?: string;
  quantity?: number;
  promoCode?: string;
  formResponsesJson?: string;
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

export interface ListEventsData {
  listEvents: {
    events: Event[];
    total: number;
    hasMore: boolean;
    page?: number;
    limit?: number;
  };
}

export interface UserEventsData {
  userEvents: {
    attending: Event[];
    saved: Event[];
  };
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
    waitlistPosition?: number | null;
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
  saveEvent: { id: string; savedAt: string };
}

export interface UnsaveEventData {
  unsaveEvent: boolean;
}

export interface CancelRegistrationData {
  cancelRegistration: boolean;
}

export interface GetEventStatsData {
  getEventStats: EventStats;
}

export interface GetEventRegistrationsData {
  getEventRegistrations: {
    registrations: EventRegistration[];
    total: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
}

export interface GetEventAttendanceData {
  getEventAttendance: {
    attendance: EventAttendanceRecord[];
    total: number;
  };
}

export interface GetEventTicketsData {
  getEventTickets: {
    tickets: EventTicketFull[];
  };
}

export interface EventPromoCodesData {
  eventPromoCodes: EventPromoCode[];
}

export interface ValidatePromoCodeData {
  validatePromoCode: ValidatePromoCodeResult;
}

export interface CloneEventData {
  cloneEvent: Event;
}

export interface UpdateEventFormFieldsData {
  updateEventFormFields: Event;
}

export interface CreateEventTicketData {
  createEventTicket: EventTicketFull;
}

export interface UpdateEventTicketData {
  updateEventTicket: EventTicketFull;
}

export interface CreateEventPromoCodeData {
  createEventPromoCode: EventPromoCode;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

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
      capacity
      availableSpots
      isPaid
      currency
      registrationCount
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
      createdAt
      updatedAt
    }
  }
`;

export const LIST_EVENTS = gql`
  query ListEvents($input: ListEventsInput) {
    listEvents(input: $input) {
      total
      hasMore
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
        capacity
        availableSpots
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
          description
          availableQuantity
        }
      }
    }
  }
`;

export const USER_EVENTS = gql`
  query UserEvents {
    userEvents {
      attending {
        id
        title
        description
        startAt
        endAt
        status
        eventCategory
        visibility
        timezone
        tags
        locationType
        locationDetails {
          type
          venueName
          address
          city
          country
        }
        capacity
        availableSpots
        coverImageUrl
        registrationCount
        isPaid
        currency
        isRegistered
        canRegister
        tickets {
          id
          name
          priceInCents
          currency
          description
          availableQuantity
        }
      }
      saved {
        id
        title
        description
        startAt
        endAt
        status
        eventCategory
        visibility
        timezone
        tags
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
        coverImageUrl
        registrationCount
        isPaid
        currency
        isRegistered
        canRegister
        tickets {
          id
          name
          priceInCents
          currency
          description
          availableQuantity
        }
      }
    }
  }
`;

export const IS_EVENT_SAVED = gql`
  query IsEventSaved($eventId: ID!) {
    isEventSaved(eventId: $eventId)
  }
`;

export const VALIDATE_PROMO_CODE = gql`
  query ValidatePromoCode($eventId: ID!, $code: String!, $totalAmountCents: Int!) {
    validatePromoCode(eventId: $eventId, code: $code, totalAmountCents: $totalAmountCents) {
      valid
      promoCodeId
      discountAmountCents
      finalAmountCents
      reason
    }
  }
`;

export const GET_EVENT_STATS = gql`
  query GetEventStats($eventId: ID!) {
    getEventStats(eventId: $eventId) {
      eventId
      totalRegistrations
      confirmedRegistrations
      pendingRegistrations
      cancelledRegistrations
      totalTicketsSold
      totalCapacity
      availableCapacity
      totalCheckIns
      currentlyAttending
      saveCount
      totalRevenue
      currency
    }
  }
`;

export const GET_EVENT_REGISTRATIONS = gql`
  query GetEventRegistrations($eventId: ID!, $limit: Int, $offset: Int, $status: String) {
    getEventRegistrations(eventId: $eventId, limit: $limit, offset: $offset, status: $status) {
      total
      hasMore
      registrations {
        id
        userId
        ticketId
        quantity
        status
        totalAmount
        currency
        registeredAt
        confirmedAt
        cancelledAt
      }
    }
  }
`;

export const GET_EVENT_ATTENDANCE = gql`
  query GetEventAttendance($eventId: ID!, $limit: Int, $offset: Int) {
    getEventAttendance(eventId: $eventId, limit: $limit, offset: $offset) {
      total
      attendance {
        id
        userId
        registrationId
        checkInMethod
        checkedInAt
        checkedOutAt
      }
    }
  }
`;

export const GET_EVENT_TICKETS = gql`
  query GetEventTickets($eventId: ID!, $activeOnly: Boolean) {
    getEventTickets(eventId: $eventId, activeOnly: $activeOnly) {
      tickets {
        id
        name
        priceInCents
        description
        totalQuantity
        soldQuantity
        availableQuantity
        ticketType
        isActive
        salesStart
        salesEnd
        createdAt
      }
    }
  }
`;

export const EVENT_PROMO_CODES = gql`
  query EventPromoCodes($eventId: ID!) {
    eventPromoCodes(eventId: $eventId) {
      id
      code
      discountType
      discountValue
      maxUses
      usesCount
      isActive
      expiresAt
      createdAt
    }
  }
`;

export const GET_EVENTS_BY_OWNER = gql`
  query GetEventsByOwner($ownerId: ID!, $ownerType: String!, $status: String, $limit: Int, $offset: Int) {
    getEventsByOwner(ownerId: $ownerId, ownerType: $ownerType, status: $status, limit: $limit, offset: $offset) {
      total
      events {
        id
        title
        status
        startAt
        endAt
        registrationCount
        availableSpots
        isPaid
        coverImageUrl
        ownerType
        ownerId
      }
    }
  }
`;

// ─── Mutations ────────────────────────────────────────────────────────────────

export const CREATE_EVENT = gql`
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input) {
      id
      title
      status
      startAt
      endAt
      isPaid
      currency
    }
  }
`;

export const UPDATE_EVENT = gql`
  mutation UpdateEvent($id: ID!, $input: UpdateEventInput!) {
    updateEvent(id: $id, input: $input) {
      id
      title
      status
      updatedAt
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
  mutation CancelEvent($id: ID!, $reason: String!) {
    cancelEvent(id: $id, reason: $reason) {
      id
      status
      cancelledAt
    }
  }
`;

export const DELETE_EVENT = gql`
  mutation DeleteEvent($id: ID!) {
    deleteEvent(id: $id) {
      success
      message
    }
  }
`;

export const CLONE_EVENT = gql`
  mutation CloneEvent($input: CloneEventInput!) {
    cloneEvent(input: $input) {
      id
      title
      status
      startAt
      endAt
    }
  }
`;

export const UPDATE_EVENT_FORM_FIELDS = gql`
  mutation UpdateEventFormFields($input: UpdateEventFormFieldsInput!) {
    updateEventFormFields(input: $input) {
      id
      registrationFormFields {
        id
        label
        type
        required
        options
      }
    }
  }
`;

export const CREATE_EVENT_TICKET = gql`
  mutation CreateEventTicket($eventId: ID!, $input: CreateTicketInput!) {
    createEventTicket(eventId: $eventId, input: $input) {
      id
      name
      priceInCents
      totalQuantity
      isActive
      ticketType
      salesStart
      salesEnd
    }
  }
`;

export const UPDATE_EVENT_TICKET = gql`
  mutation UpdateEventTicket($ticketId: ID!, $input: UpdateTicketInput!) {
    updateEventTicket(ticketId: $ticketId, input: $input) {
      id
      name
      priceInCents
      totalQuantity
      isActive
    }
  }
`;

export const CREATE_EVENT_PROMO_CODE = gql`
  mutation CreateEventPromoCode($input: CreatePromoCodeInput!) {
    createEventPromoCode(input: $input) {
      id
      code
      discountType
      discountValue
      maxUses
      usesCount
      isActive
      expiresAt
      createdAt
    }
  }
`;

export const DEACTIVATE_EVENT_PROMO_CODE = gql`
  mutation DeactivateEventPromoCode($promoCodeId: ID!) {
    deactivateEventPromoCode(promoCodeId: $promoCodeId)
  }
`;

export const DELETE_EVENT_PROMO_CODE = gql`
  mutation DeleteEventPromoCode($promoCodeId: ID!) {
    deleteEventPromoCode(promoCodeId: $promoCodeId)
  }
`;

export const REGISTER_EVENT = gql`
  mutation RegisterForEvent($input: RegisterForEventInput!) {
    registerForEvent(input: $input) {
      registrationId
      paymentIntentClientSecret
      waitlistPosition
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

// ─── Enums ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

/** `availableSpots === 0` means sold out. `null` means unlimited. */
export function isEventSoldOut(event: Pick<Event, 'availableSpots'>): boolean {
  return event.availableSpots === 0;
}

export const EVENT_PLACEHOLDER_IMAGE = '/EVENT.png';

export function getEventCoverImage(event: Pick<Event, 'coverImageUrl'>): string {
  const url = event.coverImageUrl?.trim();
  return url ? url : EVENT_PLACEHOLDER_IMAGE;
}

export function formatPrice(cents: number, currency = 'GHS'): string {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

export const SEARCH_EVENTS = gql`
  query SearchEvents($query: String!, $limit: Int, $offset: Int) {
    searchEvents(query: $query, limit: $limit, offset: $offset) {
      success
      message
      total
      events {
        id
        title
        description
        startAt
        endAt
        eventCategory
        status
        visibility
        ownerType
        ownerId
      }
    }
  }
`;
