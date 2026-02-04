/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import React from 'react';
import { ChevronRight, MoreHorizontalIcon } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '../ui/button';
import { useTranslations } from 'next-intl';
import Image from 'next/image'
import { useCommunityStore } from '@/store/useCommunityStore';
import { useRouter, usePathname } from "next/navigation";



interface GhanaConnectHeaderProps {
    title?: string;
    id: string;
    description?: string;
    logoIcon?: React.ReactNode;
    onMenuClick?: () => void;
}

export function MyCommunityCard({
    title = "",
     description = "",
    logoIcon,
    id
}: GhanaConnectHeaderProps) {
    
    const router = useRouter();
    const t = useTranslations('community');
    const tCommon = useTranslations('common');

        const setSelectedCommunity = useCommunityStore(state => state.setSelectedCommunity);
    
     const handleCommunitySelect = (id :string) => {
        setSelectedCommunity(id);
        router.push(`/`);
    };
    
    return (
        <header className="w-full border-b">
            <div className="max-w-7xl mx-auto px-2 py-3 sm:px-4"> {/* Reduced padding on extra-small screens */}
                <div className="flex items-center justify-between gap-2"> {/* Added gap for spacing on small screens */}
                    {/* Left section - Logo and branding */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1"> {/* min-w-0 and flex-1 to truncate text if needed */}
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"> {/* Smaller logo on mobile */}
                            {logoIcon || 
                             <Image
                                width={32}
                                height={32}
                                src="/GLOBE.png"
                                alt="Profile"
                                className="w-full h-full rounded-full object-cover border-2 border-border-subtle"
                            />
                            }
                        </div>

                        <div className="flex flex-col min-w-0 flex-1"> {/* Allow text truncation */}
                            <h1 className="text-text-primary font-label-large text-sm sm:text-base truncate cursor-pointer hover:text-text-brand" onClick={() => handleCommunitySelect(id)}> {/* Responsive font and truncate long titles */}
                                {title}
                            </h1>
                            <p className="text-text-primary font-body-small text-xs sm:text-sm text-wrap line-clamp-1"> {/* Smaller font, clamp description on small screens */}
                                {description}
                            </p>
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className='bg-surface-default border-0 shadow-none text-text-primary p-1' variant="outline" aria-label={tCommon('openMenu')} size="icon-sm">
                                <MoreHorizontalIcon className="w-4 h-4 sm:w-5 sm:h-5" /> {/* Smaller icon on mobile */}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className='bg-surface-default min-w-[200px]'> {/* Wider menu for touch targets */}
                            <DropdownMenuItem onSelect={() => handleCommunitySelect(id)} className='font-body-large text-text-primary flex justify-between items-center'>
                                <span>{t('openInHome')}</span>
                                <ChevronRight className="w-4 h-4" />
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className='text-text-danger font-body-large'>
                                {t('leaveCommunity')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}