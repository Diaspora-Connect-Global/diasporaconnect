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

    // Select only the id from the store to get a stable primitive value
    const selectedCommunityId = useCommunityStore(state => state.getSelectedCommunity()?.id ?? null);
    const setSelectedCommunity = useCommunityStore(state => state.setSelectedCommunity);
    const setCommunities = useCommunityStore(state => state.setCommunities);

    const { data: communitiesData, loading: communitiesLoading } = useQuery<ListMyJoinedCommunitiesResponse>(
        LIST_MY_JOINED_COMMUNITIES
    );

    const communities = useMemo(() => {
        return communitiesData?.listUserCommunities || [];
    }, [communitiesData]);

    const handleCommunityChange = (community: Community) => {
        console.log('Switched to:', community.name);
    };

    // This effect now only runs when `communities` actually changes (stable via useMemo)
    // and uses the primitive `selectedCommunityId` instead of an object reference.
    useEffect(() => {
        if (communities.length === 0) return;

        const storeCommunities = communities.map(c => ({
            id: c.id,
            name: c.name
        }));

        setCommunities(storeCommunities);

        // Only set default if nothing is selected yet
        if (!selectedCommunityId) {
            setSelectedCommunity(communities[0].id);
        }
    }, [communities]); // eslint-disable-line react-hooks/exhaustive-deps
    // ^ Intentionally omitting setCommunities/setSelectedCommunity/selectedCommunityId:
    //   - Zustand setters are stable references and don't need to be deps.
    //   - selectedCommunityId is only used for the "set default once" guard;
    //     we don't want this effect to re-run every time a selection changes.

    const handleCommunitySelect = (community: Community) => {
        setSelectedCommunity(community.id);
        handleCommunityChange(community);
    };

    // Derive the display community from the local `communities` list using the stable id
    const displayCommunity = communities.find(c => c.id === selectedCommunityId) ?? communities[0];

    if (communitiesLoading) {
        return (
            <div className="w-full">
                <div className="py-3">
                    <div className="border p-2 rounded-2xl border-border-disabled flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                            <div className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Image width={24} height={24} src="/GLOBE.png" alt="Loading" className="rounded-full object-cover" />
                            </div>
                            <h1 className="body-large text-text-secondary truncate">
                                Loading communities...
                            </h1>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (communities.length === 0) {
        return (
            <div className="w-full">
                <div className="py-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div className="border p-2 rounded-2xl border-border-disabled flex items-center justify-between gap-2 cursor-pointer">
                                <div className="flex items-center gap-1 min-w-0 flex-1">
                                    <div className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Image width={24} height={24} src="/GLOBE.png" alt="Profile" className="rounded-full object-cover" />
                                    </div>
                                    <h1 className="body-large text-text-secondary truncate">
                                        {'No community'}
                                    </h1>
                                </div>
                                <MoreHorizontalIcon className="w-5 h-5 text-text-secondary flex-shrink-0" />
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className='bg-surface-default'>
                            <DropdownMenuLabel className='body-large text-text-primary'>
                                <Link href="/community" prefetch={false} className="hover:text-text-brand">
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
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                                <div className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0">
                                    {displayCommunity?.avatarUrl ? (
                                        <Image width={24} height={24} src={displayCommunity.avatarUrl} alt={displayCommunity.name} className="w-6 h-6 rounded-full object-cover" />
                                    ) : (
                                        <Image width={24} height={24} src="/GLOBE.png" alt="Community" className="rounded-full object-cover" />
                                    )}
                                </div>
                                <h1 className="body-large text-text-primary truncate">
                                    {displayCommunity?.name}
                                </h1>
                            </div>
                            <MoreHorizontalIcon className="w-5 h-5 text-text-secondary flex-shrink-0" />
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className='bg-surface-default'>
                        <DropdownMenuLabel className='body-large text-text-primary'>
                            <Link href="/community" prefetch={false} className="hover:text-text-brand">
                                {t('seeall')}
                            </Link>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        {communities.map((community) => (
                            <DropdownMenuItem
                                key={community.id}
                                onSelect={() => handleCommunitySelect(community)}
                                className='body-large text-text-primary flex items-center justify-between'
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {community.avatarUrl && (
                                        <Image width={20} height={20} src={community.avatarUrl} alt={community.name} className="rounded-full object-cover flex-shrink-0" />
                                    )}
                                    <span className="truncate flex-1">{community.name}</span>
                                </div>
                                {selectedCommunityId === community.id && (
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