/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useQuery, useMutation } from '@apollo/client/react';
import JoinCommunityCard from "@/components/cards/JoinCommunityCard";
import { MyCommunityCard } from "@/components/cards/MyCommunityCard";
import { useTranslations } from 'next-intl';
import { LIST_AVAILABLE_COMMUNITIES, LIST_MY_JOINED_COMMUNITIES, REQUEST_JOIN_COMMUNITY } from '@/services/gql/community';
import { toast } from 'sonner';
import { useState } from 'react';

// Type definitions for GraphQL responses
interface Community {
    id: string;
    name: string;
    description?: string;
    avatarUrl?: string;
}

interface DiscoverCommunity extends Community {
    visibility: string;
    membershipStatus: string;
    communityType: {
        name: string;
        isEmbassy: boolean;
    };
    memberCount: number;
}

interface ListUserCommunitiesData {
    listUserCommunities: Community[];
}

export interface ListCommunitiesData {
    listCommunities: {
        communities: DiscoverCommunity[];
        total: number;
    };
}

export default function Community() {
    const t = useTranslations('community');
    const tActions = useTranslations('actions');
    
    const [joinedCommunities, setJoinedCommunities] = useState<Set<string>>(new Set());
    
    // Fetch user's joined communities
    const { data: myCommunitiesData, loading: myCommunitiesLoading, refetch: refetchMyCommunities } = useQuery<ListUserCommunitiesData>(
        LIST_MY_JOINED_COMMUNITIES
    );

    // Fetch available communities to discover
    const { data: discoverData, loading: discoverLoading, refetch: refetchCommunities } = useQuery<ListCommunitiesData>(
        LIST_AVAILABLE_COMMUNITIES,
        {
            variables: {
                limit: 20,
                offset: 0
            }
        }
    );

    const [requestJoinCommunity] = useMutation<{requestMembership: {status: string, message: string}}>(REQUEST_JOIN_COMMUNITY, {
        refetchQueries: [{ query: LIST_MY_JOINED_COMMUNITIES }],
        awaitRefetchQueries: false,
    });

    const handleJoinCommunity = async (communityId: string, communityName: string) => {
        try {
            const { data } = await requestJoinCommunity({
                variables: { communityId }
            });

            if (data?.requestMembership?.status === 'ACTIVE') {
                toast.success(data.requestMembership.message);
                setJoinedCommunities(prev => new Set(prev).add(communityId));
                // Refetch in background
                setTimeout(() => {
                    refetchCommunities();
                    refetchMyCommunities();
                }, 100);
            } else {
                toast.error('Failed to join community');
            }
        } catch (err) {
            console.error('Failed to join community:', err);
            toast.error('Failed to join community');
        }
    };

    return (
        <div className="mx-2 md:mx-[15%] overflow-auto scrollbar-hide h-app-inner pb-1">
            <p className="text-2xl font-heading-large my-5">{t('myCommunity')}</p>

            <div className="bg-surface-default rounded-md p-6 overflow-auto scrollbar-hide max-h-[300px]">
                {myCommunitiesLoading ? (
                    <div className="text-center py-8 text-gray-500">
                        Loading your communities...
                    </div>
                ) : myCommunitiesData?.listUserCommunities?.length ? (
                    myCommunitiesData?.listUserCommunities?.map((community) => (
                        <MyCommunityCard
                        id={community.id}
                            key={community.id}
                            title={community.name}
                            description={community.description || ''}
                        />
                    ))
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        You haven&apos;t joined any communities yet.
                    </div>
                )}
            </div>

            <p className="text-2xl font-heading-medium my-5">{t('discoverMore')}</p>

            <div className="overflow-auto scrollbar-hide grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                {discoverLoading ? (
                    <div className="col-span-full text-center py-8 text-gray-500">
                        Loading communities...
                    </div>
                ) : discoverData?.listCommunities?.communities?.length ? (
                    discoverData.listCommunities.communities.map((community) => (
                        <JoinCommunityCard
                            key={community.id}
                            title={community.name}
                            members={0}
                            onButtonClick={() => handleJoinCommunity(community.id, community.name)}
                            buttonText={
                                community.membershipStatus === 'MEMBER' || joinedCommunities.has(community.id)
                                    ? 'Joined'
                                    : tActions('join')
                            }
                            description={community.description || ''}
                            isDisabled={community.membershipStatus === 'MEMBER' || joinedCommunities.has(community.id)}
                        />
                    ))
                ) : (
                    <div className="col-span-full text-center py-8 text-gray-500">
                        No communities available to discover.
                    </div>
                )}
            </div>
        </div>
    );
}