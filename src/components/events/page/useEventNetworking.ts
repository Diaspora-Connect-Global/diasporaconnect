'use client';

import { useQuery } from '@apollo/client/react';
import {
  EVENT_NETWORKING_STATUS,
  EVENT_NETWORKING_TAXONOMY,
  type EventNetworkingStatusData,
  type EventNetworkingTaxonomyData,
  type NetworkingEligibility,
  type NetworkingParticipationStatus,
  type NetworkingTaxonomyItem,
} from '@/services/gql/eventPageNetworking';

export interface EventNetworkingView {
  /** Networking is switched on for this event AND released to this caller. */
  available: boolean;
  eligibility: NetworkingEligibility | null;
  participation: NetworkingParticipationStatus | null;
}

const NONE: EventNetworkingView = { available: false, eligibility: null, participation: null };

/**
 * Whether the networking feature is open for this event. Unavailable on any
 * doubt: signed out, still loading, a refusal (dark launch) or an error all read
 * as "not available", so no networking UI ever appears on a guess.
 */
export function useEventNetworking(eventId: string, enabled: boolean): EventNetworkingView {
  const { data } = useQuery<EventNetworkingStatusData>(EVENT_NETWORKING_STATUS, {
    variables: { eventId },
    skip: !enabled || !eventId,
    context: { silentErrors: true },
  });
  const s = data?.eventNetworkingStatus;
  if (!s) return NONE;
  return {
    available: Boolean(s.networkingEnabled && s.featureAvailable),
    eligibility: s.eligibility ?? null,
    participation: s.participationStatus ?? null,
  };
}

/** The taxonomy for a draft profile; an empty list when it cannot be read. */
export function useNetworkingTaxonomy(eventId: string, enabled: boolean): NetworkingTaxonomyItem[] {
  const { data } = useQuery<EventNetworkingTaxonomyData>(EVENT_NETWORKING_TAXONOMY, {
    variables: { eventId },
    skip: !enabled || !eventId,
    context: { silentErrors: true },
  });
  return data?.eventNetworkingTaxonomy ?? [];
}
