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
        className="bg-surface-default rounded-2xl lg:h-[calc(264/922*100vh)] lg:w-[calc(240/1512*100vw)] p-3 border border-border-subtle flex flex-col items-center justify-between"
        onClick={onCardClick}
      >
        {/* Icon */}
        <div className="flex items-center justify-center lg:h-[calc(64/922*100vh)] lg:w-[calc(64/1512*100vw)]">
          {icon || (
            <Image
              width={40}
              height={40}
              src="/GLOBE.png"
              alt="Profile"
              className="rounded-full object-contain"
            />
          )}
        </div>

        {/* Title - max 2 lines with conditional tooltip */}
        <div className="w-full text-center lg:h-[calc(24/922*100vh)]">
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
        <div className="w-full text-center lg:h-[calc(60/922*100vh)]">
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
        <div className="w-full text-center lg:h-[calc(16/922*100vh)]">
          {members !== undefined && (
            <p className="font-caption-medium text-text-primary">
              {members.toLocaleString()} {t('members')}
            </p>
          )}
        </div>

        {/* Button */}
        <div className="w-full flex justify-center lg:h-[calc(36/922*100vh)]">
          <ButtonType1
            onClick={onButtonClick}
            className="lg:w-[calc(140/1512*100vw)]"
          >
            {buttonText}
          </ButtonType1>
        </div>
      </div>
    </TooltipProvider>
  );
}