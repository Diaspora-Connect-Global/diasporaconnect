'use client'
import React from 'react';
import { MoreHorizontalIcon } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '../../ui/button';
import { useTranslations } from 'next-intl';
import Image from 'next/image'
import { formatDateProximity } from '@/macros/time';

interface NotificationCardProps {
    title?: string;
    description?: string;
    logoIcon?: React.ReactNode;
    time: string;
    read: boolean;
    onMarkAsRead?: () => void;
    onRemove?: () => void;
    onMenuClick?: () => void;
}

export function NotificationCard({
    title = "GhanaConnect:Global",
    description = "Connect with professionals and businesses across Ghana and abroad.",
    logoIcon,
    time = "3d",
    read = true,
    onMarkAsRead,
    onRemove,
}: NotificationCardProps) {
    const t = useTranslations('notification');

    const handleMarkAsRead = (event: Event) => {
        event.preventDefault();
        if (onMarkAsRead) {
            onMarkAsRead();
        }
    };

    const handleRemove = (event: Event) => {
        event.preventDefault();
        if (onRemove) {
            onRemove();
        }
    };

    return (
        <header className="w-full border-b">
            <div className="max-w-7xl mx-auto px-2 py-3 sm:px-4">
                <div className="flex items-center justify-between gap-2">
                    {/* Left section - Logo and branding */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0">
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

                        <div className="flex flex-col min-w-0 flex-1">
                            <h1 className="text-text-primary font-label-large text-sm sm:text-base truncate">
                                {title}
                            </h1>
                            <p className="text-text-primary font-body-small text-xs sm:text-sm text-wrap line-clamp-1">
                                {description}
                            </p>
                            <p className="text-text-primary font-body-small text-xs sm:text-sm text-wrap line-clamp-1">
                                {
                                 formatDateProximity(time)
                                }
                            </p>
                        </div>
                    </div>

                    <div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <div>
                                    <Button 
                                        className='bg-surface-default border-0 shadow-none text-text-primary p-1' 
                                        variant="outline" 
                                        aria-label="Open menu" 
                                        size="icon-sm"
                                    >
                                        <MoreHorizontalIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </Button>
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className='bg-surface-default min-w-[200px]'>
                                {!read && (
                                    <>
                                        <DropdownMenuItem 
                                            onSelect={handleMarkAsRead} 
                                            className='font-body-large text-text-primary flex justify-between items-center'
                                        >
                                            <span>
                                                {t('markasread')}
                                            </span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                    </>
                                )}
                                <DropdownMenuItem 
                                    onSelect={handleRemove} 
                                    className='text-text-danger font-body-large'
                                >
                             {   t('remove')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <div className='flex justify-end'>
                            {!read && (
                                <div
                                    className="w-2 h-2 bg-surface-brand rounded-full flex-shrink-0"
                                    aria-label="Unread"
                                    title="Unread"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}