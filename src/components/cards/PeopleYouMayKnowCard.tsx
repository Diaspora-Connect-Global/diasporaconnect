'use client';
import Image from 'next/image';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { LabelMedium } from '../utils';

interface PeopleYouMayKnowCardProps {
  profileImage: string;
  name: string;
  mutualConnections: number;
  onAddFriend?: () => void;
  buttonText?: string;
  buttonVariant?: 'primary' | 'secondary' | 'success';
}

export default function PeopleYouMayKnowCard({
  profileImage,
  name,
  mutualConnections,
  onAddFriend,
  buttonText,
}: PeopleYouMayKnowCardProps) {
  const [isAdded, setIsAdded] = useState(false);
  const t = useTranslations('home');
  const tActions = useTranslations('actions');

  const handleClick = () => {
    if (!isAdded && onAddFriend) {
      onAddFriend();
    }
    setIsAdded((prev) => !prev);
  };

  const buttonLabel = isAdded ? tActions('added') : buttonText || tActions('addFriend');

  return (
    <div className=" h-[2.5rem] flex space-x-6 items-center justify-between  transition-colors rounded-lg ">
      {/* Left side - Profile info */}
      <div className="flex items-center mr-2 gap-[0.5rem]">
        <div className="h-[1.5rem] w-[1.5rem]">
          <Image
            width={32}
            height={32}
            src={profileImage}
            alt={`${name}'s profile`}
            className="w-full h-full rounded-full object-cover"
          />
        </div>
        <div className="flex-1 ">
          <h3 className="caption-medium text-text-primary truncate">{name}</h3>
          <p className="body-small text-text-secondary truncate">
            {mutualConnections} {t('mutualConnections', { count: mutualConnections })}
          </p>
        </div>
      </div>

      {/* Right side - Action button */}
      <div className="flex items-center ">
        <button
          className="inline-flex text-text-brand cursor-pointer  whitespace-nowrap"
          onClick={handleClick}
          disabled={isAdded}
          aria-label={buttonLabel}
        >
          <p className='label-medium'>{buttonLabel}</p>
        </button>
      </div>
    </div>
  );
}