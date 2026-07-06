'use client';

import Image from 'next/image';
import { BadgeCheck, MapPin, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ButtonType1, ButtonType2 } from '@/components/custom/button';
import { useIsEmbassy } from '@/components/community/embassy/communityVariant';
import type { EmbassyProfile } from './embassyData';
import type { EmbassyViewProps } from './types';
import { toCdnUrl } from '@/lib/cdn';

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

/** Convert an ISO-3166 alpha-2 code (e.g. "FR") to a country name ("France").
 *  Non-code values (already a full name) are returned unchanged. */
function countryLabel(value?: string | null): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (/^[A-Za-z]{2}$/.test(v)) {
    try {
      return new Intl.DisplayNames(['en'], { type: 'region' }).of(v.toUpperCase()) ?? v;
    } catch {
      return v;
    }
  }
  return v;
}

/**
 * Embassy banner: a flag/landmark cover image with an overlapping white identity
 * card (avatar, official-verified name, tagline, contact meta row, membership CTA).
 */
export function EmbassyHeader({ community, profile, membership }: EmbassyHeaderProps) {
  const t = useTranslations('community.embassy');
  const tActions = useTranslations('actions');
  const tCommunity = useTranslations('community');
  const isEmbassy = useIsEmbassy();

  // The verified badge means "official verified embassy" for embassies, but a
  // neutral "verified community" for general communities.
  const verifiedLabel = isEmbassy ? t('officialVerified') : t('verifiedCommunity');

  const bannerSrc = toCdnUrl(community.bannerUrl) || '/og-default.png';
  const avatarSrc = toCdnUrl(community.avatarUrl) || toCdnUrl(profile.flagUrl) || '/GLOBE.png';

  // Backend contact fields fall back to the mock profile when null/empty.
  const phone = community.contactPhone || profile.phone;
  const location = countryLabel(community.locationCountry) || community.address || profile.city;

  return (
    <div className="relative overflow-hidden">
      {/* Banner backdrop — fills the whole header, down to the tab bar */}
      <div className="absolute inset-0 -z-10">
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

      {/* Identity card floating on the banner — banner shows above it and below it
          (the bottom padding leaves banner touching the tab bar). */}
      <div className="relative z-10 px-3 pt-16 pb-8 sm:pt-20 lg:px-6">
        <div className="rounded-xl border border-border-subtle bg-surface-default p-4 shadow-sm sm:p-5">
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
                  <h1 className="heading-xsmall line-clamp-2 text-gray-900">{community.name}</h1>
                  {profile.isOfficial && (
                    <BadgeCheck
                      className="size-5 flex-shrink-0 fill-blue-600 text-white"
                      aria-label={verifiedLabel}
                    />
                  )}
                </div>
                <p className="label-medium mt-0.5 text-gray-900">
                  {community.description || profile.tagline}
                </p>

                {/* Contact meta row */}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 caption-medium text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-4" aria-hidden />
                    {location}
                  </span>
                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      className="inline-flex items-center gap-1 transition-colors hover:text-gray-900"
                    >
                      <Phone className="size-4" aria-hidden />
                      {phone}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Membership CTA */}
            <div className="flex flex-shrink-0 flex-col items-stretch gap-2 self-stretch sm:flex-row sm:items-center sm:self-start">
              {membership.isSuspended && (
                <span className="label-medium text-text-secondary">{tCommunity('badges.suspended')}</span>
              )}
              {membership.isActive && (
                <>
                  <span className="w-full whitespace-nowrap rounded-full border border-gray-300 bg-surface-default px-5 py-1.5 text-center label-medium text-gray-900 sm:w-auto">
                    {tCommunity('badges.member')}
                  </span>
                  {membership.canLeave && (
                    <button
                      type="button"
                      onClick={membership.onLeaveClick}
                      disabled={membership.actionLoading}
                      className="w-full whitespace-nowrap rounded-full border border-red-300 bg-surface-default px-5 py-1.5 text-center label-medium text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      {tCommunity('actions.leave')}
                    </button>
                  )}
                </>
              )}
              {membership.canShowJoin && (
                <ButtonType2
                  className="!w-full px-5 py-1.5 text-center sm:!w-fit"
                  onClick={membership.onJoinClick}
                  disabled={membership.actionLoading}
                >
                  {membership.joinLoading ? tActions('joining') : tActions('join')}
                </ButtonType2>
              )}
              {membership.canShowRequestToJoin && (
                <ButtonType2
                  className="!w-full px-5 py-1.5 text-center sm:!w-fit"
                  onClick={membership.onJoinClick}
                  disabled={membership.actionLoading}
                >
                  {membership.joinLoading ? tActions('joining') : tCommunity('actions.requestToJoin')}
                </ButtonType2>
              )}
              {membership.canCancelRequest && (
                <ButtonType1
                  className="!w-full px-4 py-1.5 text-center sm:!w-fit"
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
