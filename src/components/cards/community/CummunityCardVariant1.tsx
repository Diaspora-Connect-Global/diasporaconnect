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

interface CommunityCardVariant1Props {
  title: string;
  description?: string;
  onButtonClick?: () => void;
  onCardClick?: () => void;
  icon?: React.ReactNode;
  members?: number;
  buttonText: string;
}

export default function CommunityCardVariant1({
  title,
  members,
  description,
  onButtonClick,
  onCardClick,
  icon,
  buttonText
}: CommunityCardVariant1Props) {
  const t = useTranslations('community');

  // Check if text is likely truncated (approximate character limits)
  const isTitleTruncated = title.length > 40; // Adjusted for typical 2-line truncation
  const isDescriptionTruncated = description && description.length > 80;

  return (
    <TooltipProvider>
      <div
        className="bg-surface-default rounded-2xl lg:h-[16.5rem] lg:w-[15rem] p-[0.75rem] border border-border-subtle flex flex-col items-center justify-between"
        onClick={onCardClick}
      >
        {/* Icon */}
        <div className="flex items-center justify-center lg:h-[4rem] lg:w-[4rem]">
          {icon || (
            <Image
              width={40}
              height={40}
              src="/GLOBE.png"
              alt="Profile"
              className="rounded-full object-contain w-full h-full"
            />
          )}
        </div>

        {/* Title - max 2 lines with conditional tooltip */}
        <div className="w-full text-center lg:h-[1.5rem]">
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

        {/* Description - max 3 lines with conditional tooltip */}
        <div className="w-full text-center lg:h-[3.75rem]">
          {description && (
            isDescriptionTruncated ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="font-body-small text-text-primary line-clamp-3 cursor-help">
                    {description}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{description}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <p className="font-body-small text-text-primary line-clamp-3">
                {description}
              </p>
            )
          )}
        </div>

        {/* Members */}
        <div className="w-full text-center lg:h-[1rem]">
          {members !== undefined && (
            <p className="font-caption-medium text-text-primary">
              {members.toLocaleString()} {t('members')}
            </p>
          )}
        </div>

        {/* Button */}
        <div className="w-full flex justify-center lg:h-[2.25rem]">
          <ButtonType1
            onClick={onButtonClick}
            className="lg:w-[8.75rem]"
          >
            {buttonText}
          </ButtonType1>
        </div>
      </div>
    </TooltipProvider>
  );
}