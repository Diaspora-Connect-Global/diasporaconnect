'use client'
import React, { useState } from 'react';
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
}: MyCommunityCard2Props) {

    const t = useTranslations('community');

    const [selectedCommunity, setSelectedCommunity] = useState<Community>(
        communities.find(c => c.id === defaultCommunityId) || communities[0]
    );

    const handleCommunitySelect = (community: Community) => {
        setSelectedCommunity(community);
        onCommunityChange?.(community);
    };



    return (
        <header className="w-full">
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
                    className="w-6 h-6 rounded-full object-cover "
                  />
                </div>
                <h1 className="font-body-large text-text-primary truncate">
                  {selectedCommunity.title}
                </h1>
              </div>
              {/* Right section - Trigger icon */}
              <MoreHorizontalIcon className="w-5 h-5 text-text-secondary flex-shrink-0" />
            </div>
          </DropdownMenuTrigger>
                    <DropdownMenuContent className='bg-surface-default'>
                        <DropdownMenuLabel className='font-body-large text-text-primary'>
                            {t('seeall')}

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
        </header>
    );
}