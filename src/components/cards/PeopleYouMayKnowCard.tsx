'use client';
import Image from 'next/image';
import { useState } from 'react';

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
  buttonText = 'Add friend',
  buttonVariant = 'primary'
}: PeopleYouMayKnowCardProps) {
  const [isAdded, setIsAdded] = useState(false);

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
    <div className="flex items-center  justify-between py-2 px-1">
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
          <p className="font-body-small text-text-secondary">
            {mutualConnections} mutual connection{mutualConnections !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Right side - Action button */}
      <button 
        className={`font-label-medium text-text-brand  ${getButtonStyles()} transition-colors`}
        onClick={handleClick}
      >
        {isAdded ? 'Added' : buttonText}
      </button>
    </div>
  );
}

// Example usage:
/*
<UserConnectionCard
  profileImage="/path-to-image.jpg"
  name="Janet Doe"
  mutualConnections={4}
  onAddFriend={() => console.log('Friend added')}
  buttonText="Add friend"
  buttonVariant="primary"
/>

// Or in a list:
<div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
  <h2 className="font-semibold text-gray-900 mb-3">People you may know</h2>
  <UserConnectionCard
    profileImage="/path1.jpg"
    name="Janet Doe"
    mutualConnections={4}
  />
  <UserConnectionCard
    profileImage="/path2.jpg"
    name="John Smith"
    mutualConnections={12}
  />
  <UserConnectionCard
    profileImage="/path3.jpg"
    name="Sarah Johnson"
    mutualConnections={7}
  />
</div>
*/