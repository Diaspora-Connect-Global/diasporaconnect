/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useQuery } from '@apollo/client/react';
import JoinCommunityCard from "@/components/cards/JoinCommunityCard";
import { MyCommunityCard } from "@/components/cards/MyCommunityCard";
import { useTranslations } from 'next-intl';
import { LIST_AVAILABLE_COMMUNITIES, LIST_MY_JOINED_COMMUNITIES } from '@/services/gql/community';

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
    
    // Fetch user's joined communities
    const { data: myCommunitiesData, loading: myCommunitiesLoading } = useQuery<ListUserCommunitiesData>(
        LIST_MY_JOINED_COMMUNITIES
    );

    // Fetch available communities to discover
    const { data: discoverData, loading: discoverLoading } = useQuery<ListCommunitiesData>(
        LIST_AVAILABLE_COMMUNITIES,
        {
            variables: {
                limit: 20,
                offset: 0
            }
        }
    );

    const handleJoinCommunity = (communityId: string, communityName: string) => {
        console.log(`Join ${communityName} clicked! ID: ${communityId}`);
        // TODO: Implement REQUEST_JOIN_COMMUNITY mutation
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
                            buttonText={tActions('join')}
                            description={community.description || ''}
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