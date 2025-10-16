'use client'
import React, { useState } from 'react';
import { Globe, MoreHorizontalIcon, Check } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '../ui/button';

interface Community {
    id: string;
    title: string;
    description?: string;
}

interface MyCommunityCard2Props {
    communities: Community[];
    defaultCommunityId?: string;
    onCommunityChange?: (community: Community) => void;
    onLeaveCommunity?: (community: Community) => void;
}

export function MyCommunityCard2({
    communities,
    defaultCommunityId,
    onCommunityChange,
    onLeaveCommunity
}: MyCommunityCard2Props) {
    const [selectedCommunity, setSelectedCommunity] = useState<Community>(
        communities.find(c => c.id === defaultCommunityId) || communities[0]
    );

    const handleCommunitySelect = (community: Community) => {
        setSelectedCommunity(community);
        onCommunityChange?.(community);
    };

    const handleLeaveCommunity = () => {
        onLeaveCommunity?.(selectedCommunity);
    };

    return (
        <header className="w-full border-b">
            <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="border p-2 rounded-2xl border-border-disabled flex items-center justify-between gap-2">
                    {/* Left section - Logo and selected community title */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-5 h-5 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                            <Globe className="w-6 h-6" />
                        </div>

                        <h1 className="font-body-large text-text-primary truncate">
                            {selectedCommunity.title}
                        </h1>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="focus-visible:ring-transparent border-0 shadow-none text-text-primary flex-shrink-0" variant="outline" aria-label="Open menu" size="icon-sm">
                                <MoreHorizontalIcon />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className='bg-surface-default'>
                            <DropdownMenuLabel className='font-body-large text-text-primary'>
                                Switch Community
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            {communities.map((community) => (
                                <DropdownMenuItem 
                                    key={community.id}
                                    onSelect={() => handleCommunitySelect(community)}
                                    className='font-body-large text-text-primary flex items-center justify-between'
                                >
                                    <span className="truncate flex-1">{community.title}</span>
                                    {selectedCommunity.id === community.id && (
                                        <Check className='w-4 h-4 text-text-brand flex-shrink-0 ml-2' />
                                    )}
                                </DropdownMenuItem>
                            ))}
                            
                            <DropdownMenuSeparator />
                          
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}