'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  GET_ORGANISER_ASSOCIATION,
  GET_ORGANISER_COMMUNITY,
  type OrganiserEntity,
} from '@/services/gql/eventsM2';
import { buildOrganiserView, type OrganiserView } from './organiser';

/**
 * The organising community / association of an event, or null for the legacy
 * user-owned events (which have none — nothing about "joining" applies).
 */
export function useOrganiser(ownerType?: string | null, ownerId?: string | null): {
  organiser: OrganiserView | null;
  loading: boolean;
} {
  const kind = String(ownerType ?? '').toLowerCase();
  const isCommunity = kind === 'community' && !!ownerId;
  const isAssociation = kind === 'association' && !!ownerId;

  const community = useQuery<{ getCommunity?: OrganiserEntity | null }>(GET_ORGANISER_COMMUNITY, {
    variables: { id: ownerId },
    skip: !isCommunity,
  });
  const association = useQuery<{ getAssociation?: OrganiserEntity | null }>(GET_ORGANISER_ASSOCIATION, {
    variables: { id: ownerId },
    skip: !isAssociation,
  });

  const organiser = useMemo(() => {
    if (isCommunity && community.data?.getCommunity) return buildOrganiserView(community.data.getCommunity, 'community');
    if (isAssociation && association.data?.getAssociation) {
      return buildOrganiserView(association.data.getAssociation, 'association');
    }
    return null;
  }, [isCommunity, isAssociation, community.data, association.data]);

  return { organiser, loading: (isCommunity && community.loading) || (isAssociation && association.loading) };
}
