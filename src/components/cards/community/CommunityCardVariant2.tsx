'use client';
import { ButtonType1 } from '../../custom/button';
import { FitText } from '../../custom/FitText';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { AccessBadges } from '@/components/cards/AccessBadges';
import { CommunityTypeBadge } from '@/components/cards/CommunityTypeBadge';
import type { AccessProfile } from '@/types/membership';

interface CommunityCardVariant2Props {
    title: string;
    description?: string;
    onButtonClick?: () => void;
    onCardClick?: () => void;
    icon?: string;
    members: number;
    buttonText: string;
    isDisabled?: boolean;
    access?: AccessProfile;
    communityType?: { name: string; isEmbassy: boolean } | null;
}

export default function CommunityCardVariant2({
    title,
    description,
    members,
    onButtonClick,
    onCardClick,
    icon,
    buttonText,
    isDisabled = false,
    access,
    communityType,
}: CommunityCardVariant2Props) {
    const t = useTranslations('community');

    const isTitleTruncated = title.length > 40;

    return (
        <TooltipProvider>
            <div
                className="relative bg-surface-default rounded-2xl lg:min-w-[14.5rem] lg:max-w-[15.5rem] w-[14.5rem] h-[16rem] p-4 border border-border-subtle flex flex-col items-center gap-2 overflow-hidden"
                onClick={onCardClick}
            >
                {/* Community type — top-right pill, matches design */}
                {communityType && (
                    <CommunityTypeBadge
                        communityType={communityType}
                        className="absolute top-3 right-3 z-10"
                    />
                )}

                {/* Icon */}
                <div className="flex items-center justify-center h-16 w-16 mt-1">
                    <Image
                        width={64}
                        height={64}
                        src={icon || "/GLOBE.png"}
                        alt="Profile"
                        className="rounded-full object-contain w-full h-full"
                    />
                </div>

                {/* Title — max 2 lines, conditional tooltip when long */}
                <div className="w-full text-center px-1">
                    {isTitleTruncated ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <h2 className="caption-large font-semibold line-clamp-2 cursor-help leading-snug">
                                    {title}
                                </h2>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-xs">{title}</p>
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <h2 className="caption-large font-semibold line-clamp-2 leading-snug">
                            {title}
                        </h2>
                    )}
                </div>

                {/* Members */}
                {members !== undefined && (
                    <p className="caption-medium text-text-secondary">
                        {members ?? 0} {t('members')}
                    </p>
                )}

                {/* Description — 2-line clamp, muted color, centered */}
                {description && (
                    <p className="text-xs text-text-secondary text-center line-clamp-2 leading-snug px-1">
                        {description}
                    </p>
                )}

                {access && (
                    <div className="w-full flex justify-center">
                        <AccessBadges access={access} size="card" />
                    </div>
                )}

                {/* Button — full width to match the design mock. The card is a
                    fixed 14.5rem, so long localized CTAs ("Rejoindre la
                    communauté", "Unisciti all'associazione") overflow the pill at
                    the base 16px label size. FitText shrinks the label only as
                    much as each language needs, so short labels keep full size. */}
                <div className="w-full mt-auto pt-2">
                    <ButtonType1
                        onClick={onButtonClick}
                        className="w-full min-w-0 px-2"
                        disabled={isDisabled}
                    >
                        <FitText>{buttonText}</FitText>
                    </ButtonType1>
                </div>
            </div>
        </TooltipProvider>
    );
}