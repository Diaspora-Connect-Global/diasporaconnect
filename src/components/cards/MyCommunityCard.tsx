'use client'
import React from 'react';
import { ChevronRight, Globe, MoreHorizontalIcon, MoreVertical } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '../ui/button';
import { useTranslations } from 'next-intl';

interface GhanaConnectHeaderProps {
    title?: string;
    description?: string;
    logoIcon?: React.ReactNode;
    onMenuClick?: () => void;
}

export function MyCommunityCard({
    title = "GhanaConnect:Global",
    description = "Connect with professionals and businesses across Ghana and abroad.",
    logoIcon,
    onMenuClick
}: GhanaConnectHeaderProps) {
    const t = useTranslations('community');
    
    return (
        <header className="w-full border-b">
            <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    {/* Left section - Logo and branding */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 via-yellow-500 to-green-600 rounded-lg flex items-center justify-center shadow-sm">
                            {logoIcon || <Globe className="w-6 h-6 text-white" />}
                        </div>

                        <div className="flex flex-col">
                            <h1 className="text-text-primary font-label-large">
                                {title}
                            </h1>
                            <p className="text-text-primary font-body-small">
                                {description}
                            </p>
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className='bg-surface-default border-0 shadow-none text-text-primary' variant="outline" aria-label="Open menu" size="icon-sm">
                                <MoreHorizontalIcon />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className='bg-surface-default'>
                            <DropdownMenuItem onSelect={() => console.log(title)} className='font-body-large text-text-primary'>
                                <p>{t('openInHome')}</p>
                                <p><ChevronRight/></p>
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