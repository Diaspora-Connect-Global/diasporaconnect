'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import JoinCommunityCard from '@/components/cards/JoinCommunityCard';
import { EmptyState } from '@/components/feedback';
import { Input } from '@/components/ui/input';
import { useRouter } from '@/i18n/navigation';
import { toCdnUrl } from '@/lib/cdn';
import {
    GET_MY_GROUPS,
    SEARCH_GROUPS,
    JOIN_GROUP,
    type GetMyGroupsResponse,
    type SearchGroupsResponse,
    type JoinGroupResponse,
    GroupPrivacy,
} from '@/services/gql/groups';

// Statuses that mean "the viewer is already in this group".
const JOINED_STATUSES = new Set(['ACTIVE', 'MEMBER', 'JOINED', 'APPROVED']);

export default function GroupsTab() {
    const t = useTranslations('community');
    const tActions = useTranslations('actions');
    const router = useRouter();

    const [search, setSearch] = useState('');
    // Groups joined this session so their card flips to "Joined" immediately,
    // without waiting for a refetch to land.
    const [joinedThisSession, setJoinedThisSession] = useState<Set<string>>(new Set());

    const {
        data: myGroupsData,
        loading: myGroupsLoading,
        refetch: refetchMyGroups,
    } = useQuery<GetMyGroupsResponse>(GET_MY_GROUPS, {
        variables: { limit: 20, offset: 0 },
        fetchPolicy: 'cache-and-network',
    });

    // SEARCH_GROUPS requires a query string; an empty string asks the backend
    // for the full public catalog so the "Discover" grid is populated before
    // the viewer types anything.
    const {
        data: searchData,
        loading: searchLoading,
        refetch: refetchSearch,
    } = useQuery<SearchGroupsResponse>(SEARCH_GROUPS, {
        variables: { query: search, searchLimit: 20, searchOffset: 0 },
        fetchPolicy: 'cache-and-network',
    });

    const [joinGroup, { loading: joinLoading }] = useMutation<JoinGroupResponse>(JOIN_GROUP);

    const myGroups = useMemo(
        () => myGroupsData?.getMyGroups?.groups ?? [],
        [myGroupsData],
    );

    // Authoritative set of group ids the viewer already belongs to.
    const joinedGroupIds = useMemo(() => {
        const ids = new Set<string>(joinedThisSession);
        for (const g of myGroups) ids.add(g.id);
        return ids;
    }, [myGroups, joinedThisSession]);

    // "Discover" surfaces PUBLIC groups the viewer can join — drop private ones
    // and any they're already a member of.
    const discoverGroups = useMemo(() => {
        const groups = searchData?.searchGroups?.groups ?? [];
        return groups.filter(
            (g) => g.privacy === GroupPrivacy.PUBLIC && !joinedGroupIds.has(g.id),
        );
    }, [searchData, joinedGroupIds]);

    const handleJoin = async (groupId: string) => {
        try {
            const { data } = await joinGroup({ variables: { joinGroupId: groupId } });
            const payload = data?.joinGroup;
            if (payload?.success) {
                toast.success(payload.message ?? t('groups.joinedToast'));
                setJoinedThisSession((prev) => new Set(prev).add(groupId));
                void refetchMyGroups();
                void refetchSearch();
            } else {
                toast.error(payload?.message ?? t('groups.joinFailed'));
            }
        } catch (err) {
            console.error('Failed to join group:', err);
            toast.error(t('groups.joinFailed'));
        }
    };

    return (
        <div>
            <p className="text-2xl heading-large my-5">{t('groups.myGroups')}</p>

            <div className="bg-surface-default rounded-md p-6 overflow-auto scrollbar-hide max-h-[300px]">
                {myGroupsLoading && myGroups.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">{t('groups.loading')}</div>
                ) : myGroups.length ? (
                    <div className="flex flex-col divide-y divide-border-subtle">
                        {myGroups.map((group) => (
                            <button
                                key={group.id}
                                type="button"
                                onClick={() => router.push(`/groups/${group.id}`)}
                                className="flex items-center gap-3 py-3 text-left hover:bg-surface-hover rounded-md px-1 transition-colors"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={toCdnUrl(group.avatarUrl) || '/GLOBE.png'}
                                    alt={group.name}
                                    width={40}
                                    height={40}
                                    className="w-10 h-10 rounded-full object-cover border border-border-subtle flex-shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="label-large text-text-primary truncate">{group.name}</p>
                                    {group.description && (
                                        <p className="body-small text-text-secondary truncate">
                                            {group.description}
                                        </p>
                                    )}
                                </div>
                                <span className="caption-medium text-text-secondary flex-shrink-0">
                                    {group.memberCount ?? 0} {t('members')}
                                </span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">{t('groups.noJoined')}</div>
                )}
            </div>

            <p className="text-2xl heading-medium my-5">{t('groups.discover')}</p>

            <div className="mb-4 max-w-md">
                <Input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('groups.searchPlaceholder')}
                    aria-label={t('groups.searchPlaceholder')}
                />
            </div>

            <div className="overflow-auto scrollbar-hide grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                {searchLoading && discoverGroups.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-gray-500">
                        {t('groups.loading')}
                    </div>
                ) : discoverGroups.length ? (
                    discoverGroups.map((group) => {
                        const isJoined = joinedThisSession.has(group.id);
                        return (
                            <JoinCommunityCard
                                key={group.id}
                                title={group.name}
                                members={group.memberCount ?? 0}
                                description={group.description || ''}
                                avatarUrl={toCdnUrl(group.avatarUrl)}
                                buttonText={isJoined ? t('groups.joined') : tActions('join')}
                                onButtonClick={() => handleJoin(group.id)}
                                onCardClick={undefined}
                                isDisabled={isJoined || joinLoading}
                            />
                        );
                    })
                ) : (
                    <div className="col-span-full">
                        <EmptyState size="md" icon={Users} title={t('groups.noneFound')} />
                    </div>
                )}
            </div>
        </div>
    );
}
