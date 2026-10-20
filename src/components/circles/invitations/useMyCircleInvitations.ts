'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';

import { MY_CIRCLE_INVITATIONS } from '@/services/gql/circles';
import type {
  MyCircleInvitationsData,
  MyCircleInvitationsVariables,
} from '@/services/gql/types/circles';

import { isPendingInvitation } from './status';

/**
 * Invitations are few (one per circle that asked you) — a single page is the
 * whole inbox in practice, and the cap keeps the per-row card lookups bounded.
 */
export const INVITATIONS_PAGE = 20;

/** The caller's pending circle invitations. Shared by the Circles page badge and the inbox. */
export function useMyCircleInvitations() {
  const query = useQuery<MyCircleInvitationsData, MyCircleInvitationsVariables>(
    MY_CIRCLE_INVITATIONS,
    {
      variables: { limit: INVITATIONS_PAGE, offset: 0 },
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
  );
  const pending = useMemo(
    () => (query.data?.myCircleInvitations ?? []).filter((i) => isPendingInvitation(i)),
    [query.data],
  );
  return { ...query, pending };
}
