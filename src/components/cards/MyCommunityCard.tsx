/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import React, { useState } from 'react';
import { ChevronRight, MoreHorizontalIcon } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ButtonType3 } from '../custom/button';
import { useTranslations } from 'next-intl';
import Image from 'next/image'
import { useCommunityStore } from '@/store/useCommunityStore';
import { useRouter, usePathname } from "next/navigation";
import { useMutation } from '@apollo/client/react';
import { LEAVE_COMMUNITY, LIST_MY_JOINED_COMMUNITIES, LIST_AVAILABLE_COMMUNITIES } from '@/services/gql/community';
import { toast } from 'sonner';
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import { AccessBadges } from './AccessBadges';
import { CommunityTypeBadge } from './CommunityTypeBadge';
import type { AccessProfile } from '@/types/membership';



interface GhanaConnectHeaderProps {
    title?: string;
    id: string;
    description?: string;
    logoIcon?: React.ReactNode;
    avatarUrl?: string | null;
    onMenuClick?: () => void;
    access?: AccessProfile;
    communityType?: { name: string; isEmbassy: boolean } | null;
}

export function MyCommunityCard({
    title = "",
     description = "",
    logoIcon,
    avatarUrl,
    id,
    access,
    communityType,
}: GhanaConnectHeaderProps) {
    
    const router = useRouter();
    const t = useTranslations('community');
    const tCommon = useTranslations('common');

    const setSelectedCommunity = useCommunityStore(state => state.setSelectedCommunity);
    const [leaveModalOpen, setLeaveModalOpen] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    
    const [leaveCommunity] = useMutation<{leaveCommunity: {success: boolean, message: string}}>(LEAVE_COMMUNITY, {
        refetchQueries: [
            { query: LIST_MY_JOINED_COMMUNITIES },
            { query: LIST_AVAILABLE_COMMUNITIES, variables: { limit: 20, offset: 0 } }
        ],
        awaitRefetchQueries: false,
    });
    
    const handleLeaveCommunityClick = () => {
        setLeaveModalOpen(true);
    };

    const handleLeaveCommunityConfirm = async () => {
        setIsLeaving(true);
        try {
            const { data } = await leaveCommunity({
                variables: { communityId: id }
            });

            if (data?.leaveCommunity?.success) {
                toast.success(data.leaveCommunity.message || 'Left community successfully');
                setLeaveModalOpen(false);
            } else {
                toast.error('Failed to leave community');
            }
        } catch (err) {
            console.error('Failed to leave community:', err);
            toast.error('Failed to leave community');
        } finally {
            setIsLeaving(false);
        }
    };
    
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
                                src={avatarUrl || "/GLOBE.png"}
                                alt={title || "Community"}
                                className="w-full h-full rounded-full object-cover border-2 border-border-subtle"
                            />
                            }
                        </div>

                        <div className="flex flex-col min-w-0 flex-1"> {/* Allow text truncation */}
                            <h1 className="text-text-primary label-large text-sm sm:text-base truncate cursor-pointer hover:text-text-brand" onClick={() => router.push(`/community/${id}`)}> {/* Responsive font and truncate long titles */}
                                {title}
                            </h1>
                            <p className="text-text-primary body-small text-xs sm:text-sm text-wrap line-clamp-1"> {/* Smaller font, clamp description on small screens */}
                                {description}
                            </p>
                            {(access || communityType) && (
                                <div className="mt-1 flex flex-wrap items-center gap-1">
                                    {communityType && (
                                        <CommunityTypeBadge communityType={communityType} />
                                    )}
                                    {access && <AccessBadges access={access} size="card" />}
                                </div>
                            )}
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <ButtonType3 className='p-1 min-w-0' aria-label={tCommon('openMenu')}>
                                <MoreHorizontalIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                            </ButtonType3>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className='bg-surface-default min-w-[200px]'> {/* Wider menu for touch targets */}
                            <DropdownMenuItem onSelect={() => router.push(`/community/${id}`)} className='body-large text-text-primary flex justify-between items-center'>
                                <span>{t('viewCommunity')}</span>
                                <ChevronRight className="w-4 h-4" />
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleCommunitySelect(id)} className='body-large text-text-primary flex justify-between items-center'>
                                <span>{t('openInHome')}</span>
                                <ChevronRight className="w-4 h-4" />
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={handleLeaveCommunityClick} className='text-text-danger body-large'>
                                {t('leaveCommunity')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <ConfirmationModal
                open={leaveModalOpen}
                onCancel={() => setLeaveModalOpen(false)}
                onConfirm={handleLeaveCommunityConfirm}
                title={t('leaveCommunityTitle') || 'Leave community?'}
                description={t('leaveCommunityConfirm') || 'You will need to re-join to see posts and events.'}
                confirmText={t('leaveCommunity') || 'Leave'}
                confirmVariant="destructive"
                isLoading={isLeaving}
            />
        </header>
    );
}