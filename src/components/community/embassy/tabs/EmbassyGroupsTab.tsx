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
  GET_GROUP,
  GET_MY_GROUPS,
  JOIN_GROUP,
  REQUEST_TO_JOIN_GROUP,
  GroupPrivacy,
  type GetGroupResponse,
  type GetMyGroupsResponse,
  type JoinGroupResponse,
  type RequestToJoinGroupResponse,
  type Group,
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
 * The backend does not (yet) expose a per-community group list — a community
 * only carries a single built-in group via `defaultGroupId`. So this tab shows
 * that default group today. When the backend adds a `listCommunityGroups`
 * resolver, swap the GET_GROUP call below for the list query and map its rows
 * into `groups`; the rest of the tab already handles a multi-group list.
 */
export function EmbassyGroupsTab({ community }: EmbassyGroupsTabProps) {
  const t = useTranslations('community');
  const tActions = useTranslations('actions');
  const router = useRouter();

  // Groups joined this session so a card flips to "Joined" immediately.
  const [joinedThisSession, setJoinedThisSession] = useState<Set<string>>(new Set());

  const { data: defaultGroupData, loading, refetch } = useQuery<GetGroupResponse>(
    GET_GROUP,
    {
      variables: { groupId: community.defaultGroupId },
      skip: !community.defaultGroupId,
      fetchPolicy: 'cache-and-network',
    },
  );
  const defaultGroup = defaultGroupData?.getGroup?.group;

  const groups: Group[] = useMemo(
    () => (defaultGroup ? [defaultGroup] : []),
    [defaultGroup],
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

  // Groups the viewer already belongs to render as a list; the rest render as
  // joinable "discover" cards.
  const joinedGroups = useMemo(
    () => groups.filter((g) => joinedGroupIds.has(g.id)),
    [groups, joinedGroupIds],
  );
  const discoverGroups = useMemo(
    () => groups.filter((g) => !joinedGroupIds.has(g.id)),
    [groups, joinedGroupIds],
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

  const isLoading = loading && groups.length === 0;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-3 py-6 lg:px-6">
        <div className="py-12 text-center text-text-secondary">{t('groups.loading')}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 lg:px-6 space-y-8">
      {/* Groups you've joined — list layout */}
      <section>
        <h2 className="heading-medium text-xl mb-4 text-text-primary">{t('groups.myGroups')}</h2>
        {joinedGroups.length ? (
          <div className="bg-surface-default rounded-2xl border border-border-subtle divide-y divide-border-subtle overflow-hidden">
            {joinedGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => router.push(`/groups/${group.id}`)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={toCdnUrl(group.avatarUrl) || '/GLOBE.png'}
                  alt={group.name}
                  width={44}
                  height={44}
                  className="h-11 w-11 flex-shrink-0 rounded-full border border-border-subtle object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="label-large truncate text-text-primary">{group.name}</p>
                  {group.description && (
                    <p className="body-small truncate text-text-secondary">{group.description}</p>
                  )}
                </div>
                <span className="caption-medium flex-shrink-0 text-text-secondary">
                  {(group.memberCount ?? 0).toLocaleString()} {t('members')}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState size="sm" icon={UsersRound} title={t('groups.noJoined')} />
        )}
      </section>

      {/* Discover groups in this community — card layout */}
      <section>
        <h2 className="heading-medium text-xl mb-4 text-text-primary">{t('groups.discover')}</h2>
        {discoverGroups.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {discoverGroups.map((group) => {
              const isPrivate = group.privacy === GroupPrivacy.PRIVATE;
              return (
                <JoinCommunityCard
                  key={group.id}
                  title={group.name}
                  members={group.memberCount ?? 0}
                  description={group.description || ''}
                  avatarUrl={toCdnUrl(group.avatarUrl)}
                  onCardClick={() => router.push(`/groups/${group.id}`)}
                  buttonText={
                    isPrivate ? t('groups.detail.requestToJoin') : tActions('join')
                  }
                  onButtonClick={() => handleJoin(group.id, isPrivate)}
                  isDisabled={joinLoading || requestLoading}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState size="sm" icon={UsersRound} title={t('groups.noneFound')} />
        )}
      </section>
    </div>
  );
}

export default EmbassyGroupsTab;
