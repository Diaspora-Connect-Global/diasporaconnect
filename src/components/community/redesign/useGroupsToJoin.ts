import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { JOIN_GROUP, REQUEST_TO_JOIN_GROUP, GET_MY_GROUPS } from '@/services/gql/groups';
import { REDESIGN_GROUPS_TO_JOIN, REDESIGN_MY_GROUP_IDS } from '@/services/gql/redesign';

export type GroupRow = { id: string; name: string; description?: string | null; privacy?: string | null; memberCount?: number | null; avatarUrl?: string | null; viewerMembershipStatus?: string | null };
const SILENT = { context: { silentErrors: true } } as const;

function pendingIds(groups?: GroupRow[] | null): string[] {
  return (groups ?? []).filter((g) => g?.viewerMembershipStatus === 'PENDING').map((g) => g.id);
}

/**
 * Groups the viewer has not joined yet (everything the group search returns,
 * minus their own groups) plus the join / request-to-join action. Shared by the
 * Community page's "Groups to join" and the Home left column.
 */
export function useGroupsToJoin(shown: number, skip = false) {
  const t = useTranslations('communityPage.groups');
  const { data: all } = useQuery<{ searchGroups?: { groups?: GroupRow[] | null } | null }>(REDESIGN_GROUPS_TO_JOIN, { variables: { query: '', limit: 24, offset: 0 }, fetchPolicy: 'cache-and-network', skip, ...SILENT });
  const { data: mine } = useQuery<{ getMyGroups?: { groups?: { id: string }[] | null } | null }>(REDESIGN_MY_GROUP_IDS, { variables: { limit: 100, offset: 0 }, fetchPolicy: 'cache-and-network', skip, ...SILENT });
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [sessionRequested, setSessionRequested] = useState<Set<string>>(new Set());
  const [joinGroup] = useMutation<{ joinGroup?: { success?: boolean; message?: string } | null }>(JOIN_GROUP, { refetchQueries: [{ query: GET_MY_GROUPS, variables: { limit: 50, offset: 0 } }, { query: REDESIGN_MY_GROUP_IDS, variables: { limit: 100, offset: 0 } }] });
  const [requestToJoin] = useMutation<{ requestToJoinGroup?: { success?: boolean; message?: string } | null }>(REQUEST_TO_JOIN_GROUP);

  const groups = useMemo(() => {
    // Until we know what the viewer already belongs to, show nothing rather than groups they may be in.
    if (!mine?.getMyGroups) return [];
    const joined = new Set((mine.getMyGroups.groups ?? []).filter(Boolean).map((g) => g.id));
    // `viewerMembershipStatus` survives a reload: ACTIVE / BANNED groups are never offered, PENDING ones read "Requested".
    return (all?.searchGroups?.groups ?? [])
      .filter((g) => g && g.id && g.name && !joined.has(g.id) && g.viewerMembershipStatus !== 'ACTIVE' && g.viewerMembershipStatus !== 'BANNED')
      .slice(0, shown);
  }, [all, mine, shown]);
  // Requests already sent (from a previous visit, or this one).
  const requested = useMemo(() => {
    const ids = new Set<string>(pendingIds(all?.searchGroups?.groups));
    for (const id of sessionRequested) ids.add(id);
    return ids;
  }, [all, sessionRequested]);

  const act = async (g: GroupRow) => {
    const isPrivate = g.privacy === 'PRIVATE';
    setBusy(g.id);
    try {
      const res = isPrivate ? await requestToJoin({ variables: { requestInput: { groupId: g.id } } }) : await joinGroup({ variables: { joinGroupId: g.id } });
      const payload = isPrivate ? (res.data as { requestToJoinGroup?: { success?: boolean } } | null | undefined)?.requestToJoinGroup : (res.data as { joinGroup?: { success?: boolean } } | null | undefined)?.joinGroup;
      if (payload?.success) {
        setDone((p) => new Set(p).add(g.id));
        if (isPrivate) setSessionRequested((p) => new Set(p).add(g.id));
        toast.success(isPrivate ? t('requestedToast') : t('joinedToast'));
      } else {
        toast.error(t('failedToast'));
      }
    } catch {
      toast.error(t('failedToast'));
    } finally {
      setBusy(null);
    }
  };
  return { groups, busy, done, requested, act };
}
