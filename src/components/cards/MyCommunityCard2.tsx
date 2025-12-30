'use client'
import React, { useEffect } from 'react';
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

interface Community {
    id: string;
    title: string;
    description?: string;
}

export function MyCommunityCard2() {

    const t = useTranslations('community');

    // Get store state and actions separately
    const selectedCommunity = useCommunityStore(state => state.getSelectedCommunity());
    const setSelectedCommunity = useCommunityStore(state => state.setSelectedCommunity);
    const setCommunities = useCommunityStore(state => state.setCommunities);
    const storeCommunities = useCommunityStore(state => state.communities);

    const communities: Community[] = [
         {
            id: '1',
            title: 'GhanaConnect:Global',
            description: 'Connect with professionals and businesses across Ghana and abroad.'
        },
        {
            id: '2',
            title: 'GhanaTechHub',
            description: 'A platform for tech enthusiasts to collaborate and innovate.'
        },
        {
            id: '3',
            title: 'GhanaArtsNetwork',
            description: 'Showcasing the rich cultural heritage of Ghana.'
        }
    ];

    // Handle community change
    const handleCommunityChange = (community: Community) => {
        console.log('Switched to:', community.title);
        // Add your logic here (e.g., fetch community data, update state, etc.)
    };

    // Initialize store with communities on mount
    useEffect(() => {
        // Only update if communities have changed
        const storeCommunities = communities.map(c => ({
            id: c.id,
            name: c.title
        }));
        
        setCommunities(storeCommunities);

        // Set default selected community if none is selected
        if (!selectedCommunity && communities.length > 0) {
            const defaultCommunity = communities[0];
            setSelectedCommunity(defaultCommunity.id);
        }
        // Only run when communities array changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [communities.length]);

    const handleCommunitySelect = (community: Community) => {
        setSelectedCommunity(community.id);
        handleCommunityChange(community);
    };

    // Find the full community object for display
    const displayCommunity = selectedCommunity 
        ? communities.find(c => c.id === selectedCommunity.id) 
        : communities[0];

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
                                    <Image
                                        width={24}
                                        height={24}
                                        src="/GLOBE.png"
                                        alt="Profile"
                                        className="w-6 h-6 rounded-full object-cover"
                                    />
                                </div>
                                <h1 className="font-body-large text-text-primary truncate">
                                    {displayCommunity?.title}
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
                                <span className="truncate flex-1">{community.title}</span>
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