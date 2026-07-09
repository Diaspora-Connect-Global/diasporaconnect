'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { UsersRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import JoinCommunityCard from '@/components/cards/JoinCommunityCard';
import { EmptyState } from '@/components/feedback';
import { useRouter } from '@/i18n/navigation';
import { toCdnUrl } from '@/lib/cdn';
import {
  LIST_COMMUNITY_GROUPS,
  GET_MY_GROUPS,
  JOIN_GROUP,
  REQUEST_TO_JOIN_GROUP,
  GroupPrivacy,
  type ListCommunityGroupsResponse,
  type GetMyGroupsResponse,
  type JoinGroupResponse,
  type RequestToJoinGroupResponse,
} from '@/services/gql/groups';
import type { EmbassyCommunity } from '../types';

interface EmbassyGroupsTabProps {
  community: EmbassyCommunity;
}

/**
 * Lists the groups that belong to this community and lets the viewer join
 * public ones (or request to join private ones). Clicking a card opens the
 * group's detail page.
 *
 * Data source: LIST_COMMUNITY_GROUPS(communityId). Groups are otherwise a
 * top-level entity with no community scoping, so this depends on a backend
 * `listCommunityGroups` resolver — until that exists the query errors and this
 * tab degrades to the empty state rather than breaking the page.
 */
export function EmbassyGroupsTab({ community }: EmbassyGroupsTabProps) {
  const t = useTranslations('community');
  const tActions = useTranslations('actions');
  const router = useRouter();

  // Groups joined this session so a card flips to "Joined" immediately.
  const [joinedThisSession, setJoinedThisSession] = useState<Set<string>>(new Set());

  const { data, loading, error, refetch } = useQuery<ListCommunityGroupsResponse>(
    LIST_COMMUNITY_GROUPS,
    {
      variables: { communityId: community.id, limit: 30, offset: 0 },
      skip: !community.id,
      fetchPolicy: 'cache-and-network',
      // A missing backend resolver would otherwise surface as an uncaught
      // Apollo error; swallow it and let the empty state handle it.
      errorPolicy: 'all',
    },
  );

  const { data: myGroupsData, refetch: refetchMyGroups } = useQuery<GetMyGroupsResponse>(
    GET_MY_GROUPS,
    { variables: { limit: 50, offset: 0 }, fetchPolicy: 'cache-and-network' },
  );

  const [joinGroup, { loading: joinLoading }] = useMutation<JoinGroupResponse>(JOIN_GROUP);
  const [requestToJoin, { loading: requestLoading }] =
    useMutation<RequestToJoinGroupResponse>(REQUEST_TO_JOIN_GROUP);

  const joinedGroupIds = useMemo(() => {
    const ids = new Set<string>(joinedThisSession);
    for (const g of myGroupsData?.getMyGroups?.groups ?? []) ids.add(g.id);
    return ids;
  }, [myGroupsData, joinedThisSession]);

  const groups = useMemo(
    () => data?.listCommunityGroups?.groups ?? [],
    [data],
  );

  const handleJoin = async (groupId: string, isPrivate: boolean) => {
    try {
      if (isPrivate) {
        const { data: res } = await requestToJoin({
          variables: { requestInput: { groupId } },
        });
        const payload = res?.requestToJoinGroup;
        if (payload?.success) {
          toast.success(payload.message ?? t('groups.detail.requestedToast'));
        } else {
          toast.error(payload?.message ?? t('groups.detail.requestFailed'));
        }
        return;
      }
      const { data: res } = await joinGroup({
        variables: { joinGroupId: groupId },
        refetchQueries: [{ query: GET_MY_GROUPS, variables: { limit: 50, offset: 0 } }],
      });
      const payload = res?.joinGroup;
      if (payload?.success) {
        toast.success(payload.message ?? t('groups.joinedToast'));
        setJoinedThisSession((prev) => new Set(prev).add(groupId));
        void refetchMyGroups();
        void refetch();
      } else {
        toast.error(payload?.message ?? t('groups.joinFailed'));
      }
    } catch (err) {
      console.error('Failed to join group:', err);
      toast.error(t('groups.joinFailed'));
    }
  };

  const showEmpty = !loading && (!!error || groups.length === 0);

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 lg:px-6">
      {loading && groups.length === 0 ? (
        <div className="py-12 text-center text-text-secondary">{t('groups.loading')}</div>
      ) : showEmpty ? (
        <EmptyState size="md" icon={UsersRound} title={t('groups.noneFound')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {groups.map((group) => {
            const isPrivate = group.privacy === GroupPrivacy.PRIVATE;
            const isJoined = joinedGroupIds.has(group.id);
            return (
              <JoinCommunityCard
                key={group.id}
                title={group.name}
                members={group.memberCount ?? 0}
                description={group.description || ''}
                avatarUrl={toCdnUrl(group.avatarUrl)}
                onCardClick={() => router.push(`/groups/${group.id}`)}
                buttonText={
                  isJoined
                    ? t('groups.joined')
                    : isPrivate
                      ? t('groups.detail.requestToJoin')
                      : tActions('join')
                }
                onButtonClick={() => handleJoin(group.id, isPrivate)}
                isDisabled={isJoined || joinLoading || requestLoading}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default EmbassyGroupsTab;
