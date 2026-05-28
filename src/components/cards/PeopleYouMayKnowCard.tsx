'use client';
import Image from 'next/image';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Spinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { UserBadge, type Tier } from '@/components/custom/userBadge';
import { mapTrustScoreToTier } from '@/lib/userTier';

interface PeopleYouMayKnowCardProps {
  userId: string;
  profileImage: string;
  name: string;
  /**
   * Phase 2: arbitrary match-reason string (e.g. "Also in Ghana Embassy,
   * Diaspora Tech"). Replaces the legacy `mutualConnections` integer +
   * `matchReasons` array — the recommendation-service backed PYMK uses
   * shared communities exclusively.
   */
  matchReason?: string;
  /** @deprecated kept for any leftover callers; prefer `matchReason`. */
  mutualConnections?: number;
  /** Pre-resolved trust tier. Wins over `trustScore` when both are supplied. */
  tier?: Tier;
  /** Raw numeric trust score from the GQL `ProfileSummary`. Mapped to a tier
   * via `mapTrustScoreToTier` when `tier` is not provided. */
  trustScore?: number;
  onAddFriend?: () => void;
  buttonText?: string;
  buttonVariant?: 'primary' | 'secondary' | 'success';
  isLoading?: boolean;
}

export default function PeopleYouMayKnowCard({
  userId,
  profileImage,
  name,
  matchReason,
  mutualConnections,
  tier,
  trustScore,
  onAddFriend,
  buttonText,
  isLoading = false,
}: PeopleYouMayKnowCardProps) {
  const resolvedTier: Tier | undefined = tier ?? mapTrustScoreToTier(trustScore);
  const [isAdded, setIsAdded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const t = useTranslations('home');
  const tActions = useTranslations('actions');

  const handleClick = () => {
    if (!isAdded && onAddFriend && !isLoading) {
      onAddFriend();
      setIsAdded(true);
    }
  };

  // Get initials from name
  const getInitials = (name: string) => {
    const names = name.trim().split(' ');
    if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  // Generate a consistent color based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-yellow-500',
      'bg-teal-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getButtonLabel = () => {
    if (isLoading) {
      return '';
    }
    if (isAdded) {
      return tActions('added');
    }
    return buttonText || tActions('addFriend');
  };

  const buttonLabel = getButtonLabel();
  const shouldShowFallback = !profileImage || imageError;

  return (
    <div className="h-[2.5rem] flex space-x-6 items-center justify-between transition-colors rounded-lg">
      <Link
        href={`/${userId}`}
        className="flex min-w-0 flex-1 items-center gap-[0.5rem] rounded-md mr-2 outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-text-brand"
      >
        <div className="h-[1.5rem] w-[1.5rem] flex-shrink-0">
          {shouldShowFallback ? (
            <div
              className={`w-full h-full rounded-full flex items-center justify-center ${getAvatarColor(name)} text-white text-xs font-semibold`}
            >
              {getInitials(name)}
            </div>
          ) : (
            <Image
              width={32}
              height={32}
              src={profileImage}
              alt={`${name}'s profile`}
              className="w-full h-full rounded-full object-cover"
              onError={() => setImageError(true)}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1 max-w-full">
            <h3 className="caption-medium text-text-primary truncate">{name}</h3>
            {resolvedTier && <UserBadge tier={resolvedTier} size="xs" />}
          </div>
          <p className="body-small text-text-secondary truncate">
            {matchReason
              ? matchReason
              : `${mutualConnections ?? 0} ${t('mutualConnections', { count: mutualConnections ?? 0 })}`}
          </p>
        </div>
      </Link>

      {/* Right side - Action button */}
      <div className="flex items-center">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-text-brand cursor-pointer whitespace-nowrap"
          onClick={handleClick}
          disabled={isAdded || isLoading}
          aria-label={buttonLabel || 'Loading'}
        >
          {isLoading ? (
            <Spinner className="w-4 h-4" />
          ) : (
            <p className="label-medium">{buttonLabel}</p>
          )}
        </button>
      </div>
    </div>
  );
}