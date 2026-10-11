'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { BATCH_CHECK_COMMUNITY_MEMBERSHIP, LIST_MY_JOINED_COMMUNITIES } from '@/services/gql/community';
import { GET_MY_ASSOCIATIONS } from '@/services/gql/associations';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * The communities and associations the signed-in user ADMINISTERS (an ACTIVE
 * membership whose role is an admin role). Only these can organise events, so
 * this list drives the organiser picker on /events/create, the "Create event"
 * entry point and the Manage links.
 *
 * Communities: `listUserCommunities` (the Community page's own query, a cache
 * hit there) for the ids, then `batchCheckMembership` for the viewer's status
 * and role in each. Associations: `getMyAssociations`, which carries
 * `myMembership`. 100 is far above how many entities one person administers.
 */
export interface AdminOrganiser {
  id: string;
  name: string;
  avatarUrl?: string | null;
  /** The lowercase `ownerType` events use. */
  kind: 'community' | 'association';
}

interface MyEntityRow {
  id: string;
  name: string;
  avatarUrl?: string | null;
  myMembership?: { status?: string | null; role?: string | null } | null;
}

export function isAdminMembership(m?: { status?: string | null; role?: string | null } | null): boolean {
  if (!m) return false;
  return String(m.status ?? '').toUpperCase() === 'ACTIVE' && /ADMIN/i.test(String(m.role ?? ''));
}

export function useAdminOrganisers(): {
  organisers: AdminOrganiser[];
  loading: boolean;
  /** `ownerType` is matched case-insensitively. */
  administers: (ownerType?: string | null, ownerId?: string | null) => boolean;
} {
  const signedIn = Boolean(useAuthStore((s) => s.tokens?.sessionToken));
  const joined = useQuery<{ listUserCommunities?: Array<{ id: string; name: string; avatarUrl?: string | null }> | null }>(
    LIST_MY_JOINED_COMMUNITIES,
    { skip: !signedIn },
  );
  const joinedRows = useMemo(() => (joined.data?.listUserCommunities ?? []).slice(0, 100), [joined.data]);
  const roles = useQuery<{ batchCheckMembership?: Array<{ status?: string | null; role?: string | null }> | null }>(
    BATCH_CHECK_COMMUNITY_MEMBERSHIP,
    { variables: { communityIds: joinedRows.map((c) => c.id) }, skip: !signedIn || joinedRows.length === 0 },
  );
  const associations = useQuery<{ getMyAssociations?: { associations?: MyEntityRow[] | null } | null }>(GET_MY_ASSOCIATIONS, {
    variables: { page: 1, limit: 100 },
    skip: !signedIn,
  });

  const organisers = useMemo<AdminOrganiser[]>(() => {
    const rows: AdminOrganiser[] = [];
    // batchCheckMembership answers in the order of the ids sent; a length
    // mismatch means we cannot tell whose role is whose, so trust none of it.
    const checks = roles.data?.batchCheckMembership ?? [];
    if (checks.length === joinedRows.length) {
      joinedRows.forEach((c, i) => {
        if (isAdminMembership(checks[i])) rows.push({ id: c.id, name: c.name, avatarUrl: c.avatarUrl, kind: 'community' });
      });
    }
    for (const a of associations.data?.getMyAssociations?.associations ?? []) {
      if (isAdminMembership(a.myMembership)) rows.push({ id: a.id, name: a.name, avatarUrl: a.avatarUrl, kind: 'association' });
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [joinedRows, roles.data, associations.data]);

  const administers = useMemo(
    () => (ownerType?: string | null, ownerId?: string | null) => {
      const kind = String(ownerType ?? '').toLowerCase();
      return organisers.some((o) => o.kind === kind && o.id === ownerId);
    },
    [organisers],
  );

  return { organisers, loading: signedIn && (joined.loading || roles.loading || associations.loading) && organisers.length === 0, administers };
}
