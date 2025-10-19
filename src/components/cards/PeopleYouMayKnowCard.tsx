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

  // const getButtonStyles = () => {
  //   const baseStyles = 'px-3 py-1 rounded-md font-label-medium transition-colors w-[80px] text-center';
  //   if (isAdded) {
  //     return `${baseStyles} bg-gray-200 text-gray-500 cursor-not-allowed`;
  //   }
  //   switch (buttonVariant) {
  //     case 'secondary':
  //       return `${baseStyles} bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900`;
  //     case 'success':
  //       return `${baseStyles} bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700`;
  //     default:
  //       return `${baseStyles} bg-brand-light text-brand hover:bg-brand hover:text-white`;
  //   }
  // };

  const buttonLabel = isAdded ? tActions('added') : buttonText || tActions('addFriend');

  return (
    <div className="w-[288px] lg:w-[calc(288/1512*100vw)] lg:h-[calc(40/922*100vh)] flex justify-between items-center  hover:bg-surface-subtle transition-colors  rounded-lg">
      {/* Left side - Profile info */}
      <div className="flex items-center gap-2">
        <div className=" lg:h-[calc(32/922*100vh)] lg:w-[calc(32/1512*100vw)]">
          <Image
            width={32}
            height={32}
            src={profileImage}
            alt={`${name}'s profile`}
            className="w-full h-full rounded-full object-cover "
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-caption-medium text-text-primary truncate">{name}</h3>
          <p className="font-body-small text-text-secondary truncate">
            {mutualConnections} {t('mutualConnections', { count: mutualConnections })}
          </p>
        </div>
      </div>

      {/* Right side - Action button */}
      <div className="flex items-center">
        <button
          className="inline-flex text-text-brand cursor-pointer"
          onClick={handleClick}
          disabled={isAdded}
          aria-label={buttonLabel}
        >
          <LabelMedium>{buttonLabel}</LabelMedium>
        </button>
      </div>
    </div>
  );
}