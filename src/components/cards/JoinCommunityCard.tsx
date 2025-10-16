'use client';
import { Globe } from 'lucide-react';
import { ButtonType1 } from '../custom/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from 'next-intl';

interface JoinCommunityCardProps {
  title: string;
  description?: string;
  buttonText: string;
  onButtonClick?: () => void;
  onCardClick?: () => void;
  icon?: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  members?: number;
}

export default function JoinCommunityCard({
  title,
  members,
  description,
  buttonText,
  onButtonClick,
  onCardClick,
  icon,
  iconBgColor = "bg-orange-100",
  iconColor = "text-orange-600"
}: JoinCommunityCardProps) {
  const t = useTranslations('community');
  
  // Check if text is likely truncated (approximate character limits)
  const isTitleTruncated = title.length > 40;
  const isDescriptionTruncated = description && description.length > 80;

  return (
    <TooltipProvider>
      <div 
        className="bg-surface-default rounded-2xl w-full min-w-[200px] p-6 border border-border-subtle"
        onClick={onCardClick}
      >
        <div className="flex flex-col items-center text-center gap-2">
          {/* Icon */}
          <div className={`${iconBgColor} rounded-full p-2`}>
            {icon || <Globe className={`w-10 h-10 ${iconColor}`} strokeWidth={1.5} />}
          </div>

          {/* Title - max 2 lines with conditional tooltip */}
          {isTitleTruncated ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <h2 className="font-caption-large line-clamp-2 min-h-[2.5rem] cursor-help">
                  {title}
                </h2>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{title}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <h2 className="font-caption-large line-clamp-2 min-h-[2.5rem]">
              {title}
            </h2>
          )}

          {/* Description - max 3 lines with conditional tooltip */}
          {description && (
            isDescriptionTruncated ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="font-body-small text-text-primary line-clamp-3 min-h-[3.5rem] cursor-help">
                    {description}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{description}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <p className="font-body-small text-text-primary line-clamp-3 min-h-[3.5rem]">
                {description}
              </p>
            )
          )}

          {/* Members */}
          {members !== undefined && (
            <p className="font-caption-medium text-text-primary">
              {members.toLocaleString()} {t('members')}
            </p>
          )}

          {/* Button */}
          <ButtonType1 onClick={onButtonClick}>
            {buttonText}
          </ButtonType1>
        </div>
      </div>
    </TooltipProvider>
  );
}