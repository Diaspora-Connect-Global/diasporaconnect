'use client';

import { useQuery } from '@apollo/client/react';
import {
  LIST_MY_JOINED_COMMUNITIES,
  LIST_USER_COMMUNITIES_BY_ID,
} from '@/services/gql/community';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Users, Globe } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { EmptyState } from '@/components/feedback';
import { toCdnUrl } from '@/lib/cdn';

interface Community {
  id: string;
  name: string;
  avatarUrl?: string;
  description?: string;
}

interface ListUserCommunitiesData {
  listUserCommunities: Community[];
}

interface ProfileCommunitiesProps {
  /** The userId whose communities to show */
  userId: string;
  /** Whether this is the logged-in user's own profile */
  isOwnProfile: boolean;
}

export default function ProfileCommunities({
  userId,
  isOwnProfile,
}: ProfileCommunitiesProps) {
  const t = useTranslations('profile.navigation');
  const tCommunity = useTranslations('community');
  const tFeedback = useTranslations('feedback');

  // Use the appropriate query based on whether it's the user's own profile
  const { data, loading } = useQuery<ListUserCommunitiesData>(
    isOwnProfile ? LIST_MY_JOINED_COMMUNITIES : LIST_USER_COMMUNITIES_BY_ID,
    {
      variables: isOwnProfile ? undefined : { userId },
      fetchPolicy: 'cache-and-network',
    },
  );

  const communities = data?.listUserCommunities ?? [];

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <h3 className="text-lg font-semibold mb-4">{t('communities')}</h3>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl animate-pulse"
          >
            <div className="w-10 h-10 rounded-full bg-surface-subtle" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-surface-subtle rounded" />
              <div className="h-3 w-48 bg-surface-subtle rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (communities.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={tFeedback('empty.communities.title')}
        action={
          isOwnProfile ? (
            <Link
              href="/community"
              prefetch={false}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-brand text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Globe className="w-4 h-4" />
              {tFeedback('empty.communities.cta')}
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{t('communities')}</h3>
        <span className="text-xs text-text-secondary bg-surface-subtle px-2 py-1 rounded-full">
          {communities.length}
        </span>
      </div>

      <div className="space-y-2">
        {communities.map((community) => (
          <div
            key={community.id}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-subtle transition-colors group"
          >
            {/* Community avatar */}
            <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden border border-border-subtle">
              <Image
                src={toCdnUrl(community.avatarUrl) || '/GLOBE.png'}
                alt={community.name}
                width={40}
                height={40}
                className="w-full h-full object-cover"
                unoptimized={!!(community.avatarUrl?.startsWith('http://') || community.avatarUrl?.startsWith('https://'))}
              />
            </div>

            {/* Community info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate group-hover:text-text-brand transition-colors">
                {community.name}
              </p>
              {community.description && (
                <p className="text-xs text-text-secondary truncate mt-0.5">
                  {community.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Link to full community page for own profile */}
      {isOwnProfile && (
        <Link
          href="/community"
          prefetch={false}
          className="block mt-4 text-center text-sm text-text-brand font-medium hover:underline"
        >
          {tCommunity('discoverMore')}
        </Link>
      )}
    </div>
  );
}
