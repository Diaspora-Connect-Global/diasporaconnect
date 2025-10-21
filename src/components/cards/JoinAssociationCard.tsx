'use client';
import {  ButtonType2 } from '../custom/button'; 
import { useTranslations } from 'next-intl';
import Image from 'next/image';

interface JoinAssociationCardProps {
  title: string;
  description?: string;
  members?: number;
  buttonText?: string;
  onButtonClick?: () => void;
  onCardClick?: () => void;
  icon?: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  profileImage: string;
  profileName: string;
}

export default function JoinAssociationCard({
  title,
  description,
  members,
  buttonText = 'Join',
  onButtonClick,
  profileImage,
  profileName,
}: JoinAssociationCardProps) {
  const t = useTranslations('community');

  return (
    <div
      className="flex flex-col items-center gap-3 mb-4 shadow-md bg-surface-default rounded-lg p-2 sm:p-4 hover:shadow-lg transition-shadow duration-200"
    >
      {/* Header */}
      <div className="flex w-full items-start justify-between ">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Image
            width={40}
            height={40}
            src={profileImage}
            alt={`${profileName} Profile`}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 sm:gap-2">
              <h3 className="font-label-large text-text-primary text-sm sm:text-base truncate">{title}</h3>
            </div>
            <p className="font-body-small text-text-secondary text-xs sm:text-sm flex flex-start">
              {members ? `${members.toLocaleString()} ${t('members')}` : t('noMembers')}
            </p>
          </div>
        </div>
        <ButtonType2
          onClick={onButtonClick}
          className="ml-2 sm:ml-4 py-3 px-6 text-xs sm:text-sm rounded-full"
        >
          {buttonText}
        </ButtonType2>
      </div>

      {/* Content */}
      {description && (
        <p className="font-body-small leading-relaxed text-xs sm:text-sm text-left px-2">
          {description}
        </p>
      )}
    </div>
  );
}