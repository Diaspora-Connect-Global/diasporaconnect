'use client';

import Image from 'next/image';
import { BadgeCheck, MapPin, Phone, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ButtonType1, ButtonType2, ButtonType4Pill } from '@/components/custom/button';
import type { EmbassyProfile } from './embassyMock';
import type { EmbassyViewProps } from './types';

interface EmbassyHeaderProps {
  community: EmbassyViewProps['community'];
  profile: EmbassyProfile;
  membership: Pick<
    EmbassyViewProps,
    | 'isActive'
    | 'isPending'
    | 'isSuspended'
    | 'canShowJoin'
    | 'canShowRequestToJoin'
    | 'canLeave'
    | 'canCancelRequest'
    | 'actionLoading'
    | 'joinLoading'
    | 'onJoinClick'
    | 'onLeaveClick'
    | 'onCancelRequest'
  >;
}

/**
 * Embassy banner: a flag/landmark cover image with an overlapping white identity
 * card (avatar, official-verified name, tagline, contact meta row, membership CTA).
 */
export function EmbassyHeader({ community, profile, membership }: EmbassyHeaderProps) {
  const t = useTranslations('community.embassy');
  const tActions = useTranslations('actions');
  const tCommunity = useTranslations('community');

  const bannerSrc = community.bannerUrl || '/og-default.png';
  const avatarSrc = community.avatarUrl || profile.flagUrl || '/GLOBE.png';

  return (
    <div className="relative">
      {/* Cover */}
      <div className="relative h-40 w-full overflow-hidden sm:h-52 lg:h-56">
        <Image
          src={bannerSrc}
          alt={community.name}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" aria-hidden />
      </div>

      {/* Identity card overlapping the cover */}
      <div className="px-3 lg:px-6">
        <div className="-mt-14 rounded-xl border border-border-subtle bg-surface-default p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border border-border-subtle bg-surface-default sm:h-24 sm:w-24">
                <Image
                  src={avatarSrc}
                  alt={community.name}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 pt-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="heading-xsmall truncate text-text-primary">{community.name}</h1>
                  {profile.isOfficial && (
                    <BadgeCheck
                      className="size-5 flex-shrink-0 text-text-info"
                      aria-label={t('officialVerified')}
                    />
                  )}
                </div>
                <p className="body-small mt-0.5 text-text-secondary">
                  {community.description || profile.tagline}
                </p>

                {/* Contact meta row */}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 caption-medium text-text-secondary">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-4" aria-hidden />
                    {profile.city}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-4" aria-hidden />
                    {profile.phone}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-4" aria-hidden />
                    {profile.officeHours}
                  </span>
                </div>
              </div>
            </div>

            {/* Membership CTA */}
            <div className="flex flex-shrink-0 items-center gap-2 self-start">
              {membership.isSuspended && (
                <span className="label-medium text-text-secondary">{tCommunity('badges.suspended')}</span>
              )}
              {membership.isActive && (
                <>
                  <ButtonType1 className="px-4 py-1.5" disabled>
                    {tCommunity('badges.member')}
                  </ButtonType1>
                  {membership.canLeave && (
                    <ButtonType4Pill
                      className="px-4 py-1.5"
                      onClick={membership.onLeaveClick}
                      disabled={membership.actionLoading}
                    >
                      {tCommunity('actions.leave')}
                    </ButtonType4Pill>
                  )}
                </>
              )}
              {membership.canShowJoin && (
                <ButtonType2
                  className="px-5 py-1.5"
                  onClick={membership.onJoinClick}
                  disabled={membership.actionLoading}
                >
                  {membership.joinLoading ? tActions('joining') : tActions('join')}
                </ButtonType2>
              )}
              {membership.canShowRequestToJoin && (
                <ButtonType2
                  className="px-5 py-1.5"
                  onClick={membership.onJoinClick}
                  disabled={membership.actionLoading}
                >
                  {membership.joinLoading ? tActions('joining') : tCommunity('actions.requestToJoin')}
                </ButtonType2>
              )}
              {membership.canCancelRequest && (
                <ButtonType1
                  className="px-4 py-1.5"
                  onClick={membership.onCancelRequest}
                  disabled={membership.actionLoading}
                >
                  {tCommunity('actions.cancelRequest')}
                </ButtonType1>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmbassyHeader;
