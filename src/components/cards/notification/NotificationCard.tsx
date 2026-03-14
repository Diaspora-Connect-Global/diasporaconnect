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
    /** Main title (e.g. app name or actor). */
    title?: string;
    /** Body text — can be multi-line; keep descriptive. */
    description?: string;
    /** Short label for notification type (e.g. "Like", "Comment", "Connection request"). */
    typeLabel?: string;
    logoIcon?: React.ReactNode;
    imageUrl?: string;
    time: string;
    read: boolean;
    onMarkAsRead?: () => void;
    onRemove?: () => void;
    onMenuClick?: () => void;
    /** When set, the row is clickable and navigates (e.g. to post/event). */
    onClick?: () => void;
}

export function NotificationCard({
    title,
    description = "",
    typeLabel,
    logoIcon,
    imageUrl,
    time = "3d",
    read = true,
    onMarkAsRead,
    onRemove,
    onClick,
}: NotificationCardProps) {
    const t = useTranslations('notification');
    const tCommon = useTranslations('common');

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
            <div className="lg:max-w-7xl mx-auto px-2 py-3 sm:px-4">
                <div className="flex items-center justify-between gap-2">
                    {/* Left section - Logo and branding (clickable when onClick provided) */}
                    <div
                        role={onClick ? 'button' : undefined}
                        tabIndex={onClick ? 0 : undefined}
                        onClick={onClick}
                        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
                        className={`flex items-center gap-2 sm:gap-3 min-w-0 flex-1 ${onClick ? 'cursor-pointer' : ''}`}
                    >
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {logoIcon ?? (imageUrl ? (
                                <Image
                                    width={40}
                                    height={40}
                                    src={imageUrl}
                                    alt=""
                                    className="w-full h-full rounded-full object-cover border-2 border-border-subtle"
                                />
                            ) : (
                                <Image
                                    width={32}
                                    height={32}
                                    src="/GLOBE.png"
                                    alt="Profile"
                                    className="w-full h-full rounded-full object-cover border-2 border-border-subtle"
                                />
                            ))}
                        </div>

                        <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                                {typeLabel && (
                                    <span className="text-text-secondary font-caption-medium uppercase tracking-wide">
                                        {typeLabel}
                                    </span>
                                )}
                                <span className="text-text-tertiary font-body-small text-xs">
                                    {formatDateProximity(time)}
                                </span>
                            </div>
                            {title && (
                                <h2 className="text-text-primary font-label-large text-sm sm:text-base truncate">
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p className="text-text-primary font-body-small text-xs sm:text-sm text-wrap line-clamp-2">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <div>
                                    <Button 
                                        className='bg-surface-default border-0 shadow-none text-text-primary p-1' 
                                        variant="outline" 
                                        aria-label={tCommon('openMenu')} 
                                        size="icon-sm"
                                    >
                                        <MoreHorizontalIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </Button>
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className='bg-surface-default min-w-[200px]'>
                                {!read && onMarkAsRead && (
                                    <>
                                        <DropdownMenuItem 
                                            onSelect={handleMarkAsRead} 
                                            className='font-body-large text-text-primary flex justify-between items-center'
                                        >
                                            <span>
                                                {t('markasread')}
                                            </span>
                                        </DropdownMenuItem>
                                        {onRemove && <DropdownMenuSeparator />}
                                    </>
                                )}
                                {onRemove && (
                                    <DropdownMenuItem 
                                        onSelect={handleRemove} 
                                        className='text-text-danger font-body-large'
                                    >
                                        {t('remove')}
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <div className='flex justify-end'>
                            {!read && (
                                <div
                                    className="w-2 h-2 bg-surface-brand rounded-full flex-shrink-0"
                                    aria-label={tCommon('unread')}
                                    title={tCommon('unread')}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}