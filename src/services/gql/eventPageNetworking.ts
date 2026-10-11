import { gql } from '@apollo/client';

/**
 * What the event page and its Register tab need from event networking: whether
 * the feature is open for this event, the taxonomy a draft profile is built
 * from, and the draft save. Every operation exists in the gateway's
 * event-networking module (names and args checked against its resolver).
 */

export type NetworkingEligibility = 'NOT_REGISTERED' | 'PENDING' | 'CONFIRMED' | 'INELIGIBLE';
export type NetworkingParticipationStatus = 'NOT_JOINED' | 'ACTIVE' | 'PAUSED' | 'WITHDRAWN' | 'REVOKED';
export type NetworkingTaxonomyKind = 'ROLE' | 'INTEREST' | 'CAPABILITY' | 'INDUSTRY' | 'MARKET' | 'LANGUAGE';

export const EVENT_NETWORKING_STATUS = gql`
  query EventNetworkingStatus($eventId: ID!) {
    eventNetworkingStatus(eventId: $eventId) {
      networkingEnabled
      featureAvailable
      eligibility
      participationStatus
    }
  }
`;
export interface EventNetworkingStatusData {
  eventNetworkingStatus?: {
    networkingEnabled: boolean;
    featureAvailable: boolean;
    eligibility: NetworkingEligibility;
    participationStatus: NetworkingParticipationStatus;
  } | null;
}

export const EVENT_NETWORKING_TAXONOMY = gql`
  query EventNetworkingTaxonomy($eventId: ID) {
    eventNetworkingTaxonomy(eventId: $eventId) {
      code
      kind
      labelKey
      needLabelKey
      offerLabelKey
      sortOrder
    }
  }
`;
export interface NetworkingTaxonomyItem {
  code: string;
  kind?: NetworkingTaxonomyKind | null;
  labelKey: string;
  needLabelKey?: string | null;
  offerLabelKey?: string | null;
  sortOrder: number;
}
export interface EventNetworkingTaxonomyData {
  eventNetworkingTaxonomy?: NetworkingTaxonomyItem[] | null;
}

export const EVENT_NETWORKING_SAVE_DRAFT = gql`
  mutation EventNetworkingSaveDraft($eventId: ID!, $profile: EventNetworkingProfileInput) {
    eventNetworkingSaveDraft(eventId: $eventId, profile: $profile) {
      participation {
        status
        hasProfile
      }
    }
  }
`;
export interface EventNetworkingSaveDraftData {
  eventNetworkingSaveDraft?: { participation?: { status: NetworkingParticipationStatus; hasProfile: boolean } | null } | null;
}
