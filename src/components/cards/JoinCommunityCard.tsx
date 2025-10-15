'use client';
import { Globe } from 'lucide-react';
import { ButtonType1 } from '../custom/button';

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
  return (
    <div 
      className="bg-surface-default rounded-2xl w-full max-w-[200px] p-6 border border-border-subtle "
      onClick={onCardClick}
    >
      <div className="flex flex-col items-center text-center gap-2">
        {/* Icon */}
        <div className={`${iconBgColor} rounded-full p-2`}>
          {icon || <Globe className={`w-10 h-10 ${iconColor}`} strokeWidth={1.5} />}
        </div>

        {/* Title */}
        <h2 className="font-caption-large">
          {title}
        </h2>

        {/* Description */}
        {description && (
          <p className="font-body-small text-text-primary">
            {description}
          </p>
        )}

        {/* Members */}
        {members !== undefined && (
          <p className="font-caption-medium text-text-primary">
            {members} members
          </p>
        )}

        {/* Button */}
        <ButtonType1 onClick={onButtonClick}>
          {buttonText}
        </ButtonType1>
      </div>
    </div>
  );
}