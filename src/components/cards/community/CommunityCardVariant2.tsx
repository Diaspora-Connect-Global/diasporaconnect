'use client';
import { ButtonType1 } from '../../custom/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

interface CommunityCardVariant2Props {
    title: string;
    description?: string;
    onButtonClick?: () => void;
    onCardClick?: () => void;
    icon?: React.ReactNode;
    members?: number;
    buttonText: string;
}

export default function CommunityCardVariant2({
    title,
    members,
    onButtonClick,
    onCardClick,
    icon,
}: CommunityCardVariant2Props) {
    const t = useTranslations('community');

    const isTitleTruncated = title.length > 40; 

    return (
        <TooltipProvider>
            <div
                className="bg-surface-default rounded-2xl h-[12.25rem] lg:min-w-[14.5rem]  lg:max-w-[15.5rem]  p-[0.75rem] border border-border-subtle flex flex-col items-center justify-between overflow-hidden "
                onClick={onCardClick}
            >
                {/* Icon */}
                <div className="flex items-center justify-center h-[4rem] w-[4rem]">
                    {icon || (
                        <Image
                            width={64}
                            height={64}
                            src="/GLOBE.png"
                            alt="Profile"
                            className="rounded-full object-contain w-full h-full"
                        />
                    )}
                </div>

                {/* Title - max 2 lines with conditional tooltip */}
                <div className="w-full text-center h-[1.5rem]">
                    {isTitleTruncated ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <h2 className="font-caption-large truncate cursor-help">
                                    {title}
                                </h2>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-xs">{title}</p>
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <h2 className="font-caption-large truncate">{title}</h2>
                    )}
                </div>

                {/* Members */}
                <div className="w-full text-center h-[1rem]">
                    {members !== undefined && (
                        <p className="font-caption-medium text-text-primary">
                            {members.toLocaleString()} {t('members')}
                        </p>
                    )}
                </div>

                {/* Button */}
                <div className="w-full flex justify-center h-[2.25rem] ">
                    <ButtonType1
                        onClick={onButtonClick}
                        className="w-[8.75rem]  shrink"
                    >
                        {t('joincommunity')}
                    </ButtonType1>
                </div>
            </div>
        </TooltipProvider>
    );
}