'use client'
import React, { useEffect, useMemo } from 'react';
import { MoreHorizontalIcon, Check } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTranslations } from 'next-intl';
import Image from 'next/image'
import { useCommunityStore } from '@/store/useCommunityStore';
import { Link } from '@/i18n/navigation';
import { useQuery } from '@apollo/client/react';
import { LIST_MY_JOINED_COMMUNITIES } from '@/services/gql/community';

interface Community {
    id: string;
    name: string;
    avatarUrl?: string;
}

interface ListMyJoinedCommunitiesResponse {
    listUserCommunities: Community[];
}

export function MyCommunityCard2() {

    const t = useTranslations('community');

    // Get store state and actions separately
    const selectedCommunity = useCommunityStore(state => state.getSelectedCommunity());
    const setSelectedCommunity = useCommunityStore(state => state.setSelectedCommunity);
    const setCommunities = useCommunityStore(state => state.setCommunities);

    // Fetch user's joined communities
    const { data: communitiesData, loading: communitiesLoading } = useQuery<ListMyJoinedCommunitiesResponse>(
        LIST_MY_JOINED_COMMUNITIES
    );

    // Memoize communities to prevent recreation on every render
    const communities = useMemo(() => {
        return communitiesData?.listUserCommunities || [];
    }, [communitiesData]);

    // Handle community change
    const handleCommunityChange = (community: Community) => {
        console.log('Switched to:', community.name);
    };

    // Initialize store with communities on mount and when data changes
    useEffect(() => {
        if (communities.length > 0) {
            // Update store with fetched communities
            const storeCommunities = communities.map(c => ({
                id: c.id,
                name: c.name
            }));
            
            setCommunities(storeCommunities);

            // Set default selected community if none is selected
            if (!selectedCommunity) {
                const defaultCommunity = communities[0];
                setSelectedCommunity(defaultCommunity.id);
            }
        }
    }, [communities, selectedCommunity, setCommunities, setSelectedCommunity]);

    const handleCommunitySelect = (community: Community) => {
        setSelectedCommunity(community.id);
        handleCommunityChange(community);
    };

    // Find the full community object for display
    const displayCommunity = selectedCommunity 
        ? communities.find(c => c.id === selectedCommunity.id) 
        : communities[0];

    // Show loading state
    if (communitiesLoading) {
        return (
            <div className="w-full">
                <div className="py-3">
                    <div className="border p-2 rounded-2xl border-border-disabled flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                            <div className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Image
                                    width={24}
                                    height={24}
                                    src="/GLOBE.png"
                                    alt="Loading"
                                    className="w-6 h-6 rounded-full object-cover"
                                />
                            </div>
                            <h1 className="font-body-large text-text-secondary truncate">
                                Loading communities...
                            </h1>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Show "No community" with dropdown to discover communities
    if (communities.length === 0) {
        return (
            <div className="w-full">
                <div className="py-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div className="border p-2 rounded-2xl border-border-disabled flex items-center justify-between gap-2 cursor-pointer">
                                <div className="flex items-center gap-1 min-w-0 flex-1">
                                    <div className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Image
                                            width={24}
                                            height={24}
                                            src="/GLOBE.png"
                                            alt="Profile"
                                            className="w-6 h-6 rounded-full object-cover"
                                        />
                                    </div>
                                    <h1 className="font-body-large text-text-secondary truncate">
                                        {'No community'}
                                    </h1>
                                </div>
                                <MoreHorizontalIcon className="w-5 h-5 text-text-secondary flex-shrink-0" />
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className='bg-surface-default'>
                            <DropdownMenuLabel className='font-body-large text-text-primary'>
                                <Link href="/community" className="hover:text-text-brand">
                                    {t('discover') || 'Discover communities'}
                                </Link>
                            </DropdownMenuLabel>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="py-3">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="border p-2 rounded-2xl border-border-disabled flex items-center justify-between gap-2 cursor-pointer">
                            {/* Left section - Logo and selected community title */}
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                                <div className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0">
                                    {displayCommunity?.avatarUrl ? (
                                        <Image
                                            width={24}
                                            height={24}
                                            src={displayCommunity.avatarUrl}
                                            alt={displayCommunity.name}
                                            className="w-6 h-6 rounded-full object-cover"
                                        />
                                    ) : (
                                        <Image
                                            width={24}
                                            height={24}
                                            src="/GLOBE.png"
                                            alt="Community"
                                            className="w-6 h-6 rounded-full object-cover"
                                        />
                                    )}
                                </div>
                                <h1 className="font-body-large text-text-primary truncate">
                                    {displayCommunity?.name}
                                </h1>
                            </div>
                            {/* Right section - Trigger icon */}
                            <MoreHorizontalIcon className="w-5 h-5 text-text-secondary flex-shrink-0" />
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className='bg-surface-default'>
                        <DropdownMenuLabel className='font-body-large text-text-primary'>
                            <Link href="/community" className="hover:text-text-brand">
                                {t('seeall')}
                            </Link>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        {communities.map((community) => (
                            <DropdownMenuItem
                                key={community.id}
                                onSelect={() => handleCommunitySelect(community)}
                                className='font-body-large text-text-primary flex items-center justify-between'
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {community.avatarUrl && (
                                        <Image
                                            width={20}
                                            height={20}
                                            src={community.avatarUrl}
                                            alt={community.name}
                                            className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                                        />
                                    )}
                                    <span className="truncate flex-1">{community.name}</span>
                                </div>
                                {selectedCommunity?.id === community.id && (
                                    <Check className='w-4 h-4 text-text-brand flex-shrink-0 ml-2' />
                                )}
                            </DropdownMenuItem>
                        ))}

                        <DropdownMenuSeparator />
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}