'use client';
import Image from 'next/image';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

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
  buttonVariant = 'primary'
}: PeopleYouMayKnowCardProps) {
  const [isAdded, setIsAdded] = useState(false);
  const t = useTranslations('home');
  const tActions = useTranslations('actions');

  const handleClick = () => {
    setIsAdded(!isAdded);
    onAddFriend?.();
  };

  const getButtonStyles = () => {
    if (isAdded) {
      return 'text-gray-600 hover:text-gray-700';
    }
    
    switch (buttonVariant) {
      case 'secondary':
        return 'text-gray-700 hover:text-gray-900';
      case 'success':
        return 'text-green-600 hover:text-green-700';
      default:
        return 'text-blue-600 hover:text-blue-700';
    }
  };

  return (
    <div className="flex items-center justify-between py-2 px-1">
      {/* Left side - Profile info */}
      <div className="flex items-center gap-3">
        <Image
          width={40}
          height={40} 
          src={profileImage} 
          alt={name}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div>
          <h3 className="font-caption-medium text-text-primary">
            {name}
          </h3>
          <p className="font-body-small text-text-secondary truncate">
            {mutualConnections} {t('mutualConnections')}
          </p>
        </div>
      </div>

      {/* Right side - Action button */}
      <button 
        className={`font-label-medium text-text-brand ${getButtonStyles()} transition-colors`}
        onClick={handleClick}
      >
        {isAdded ? t('added') : tActions('addFriend')}
      </button>
    </div>
  );
}