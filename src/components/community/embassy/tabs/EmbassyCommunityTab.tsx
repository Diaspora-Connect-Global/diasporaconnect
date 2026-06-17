'use client';

import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { Users, MessagesSquare, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { VIEW_COMMUNITY_STATS } from '@/services/gql/community';
import { EmbassyFeedList } from '../EmbassyFeedList';
import type { EmbassyProfile } from '../embassyMock';
import type { EmbassyViewProps } from '../types';

interface CommunityStatsResponse {
  getCommunityStats: {
    memberCount: number;
    pendingRequestCount: number;
    postCount: number;
  };
}

interface EmbassyCommunityTabProps {
  props: EmbassyViewProps;
  profile: EmbassyProfile;
}

/** Community = stats overview (community-service) + the community discussion feed. */
export function EmbassyCommunityTab({ props, profile }: EmbassyCommunityTabProps) {
  const t = useTranslations('community.embassy');
  const { community, posts, feedLoading, displayMemberCount } = props;

  const { data } = useQuery<CommunityStatsResponse>(VIEW_COMMUNITY_STATS, {
    variables: { communityId: community.id },
    fetchPolicy: 'cache-and-network',
  });

  const stats = data?.getCommunityStats;
  const memberCount = stats?.memberCount ?? displayMemberCount;
  const postCount = stats?.postCount ?? posts.length;

  const cards = [
    { icon: Users, label: t('community.members'), value: memberCount },
    { icon: MessagesSquare, label: t('community.discussions'), value: postCount },
    { icon: FileText, label: t('community.pending'), value: stats?.pendingRequestCount ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-3 py-6 lg:px-6">
      {/* Overview */}
      <Card className="border-border-subtle">
        <CardContent className="p-5">
          <h2 className="heading-xsmall mb-4 text-text-primary">{t('community.overview')}</h2>
          <div className="grid grid-cols-3 gap-3">
            {cards.map((c) => (
              <div key={c.label} className="rounded-lg bg-surface-subtle p-4 text-center">
                <c.icon className="mx-auto mb-1 size-5 text-text-brand" aria-hidden />
                <p className="heading-xsmall text-text-primary">{c.value}</p>
                <p className="caption-small text-text-secondary">{c.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Discussions */}
      <Card className="border-border-subtle">
        <CardContent className="p-5">
          <h3 className="label-large mb-4 text-text-primary">{t('community.discussionsTitle')}</h3>
          {feedLoading ? (
            <p className="body-small py-4 text-text-secondary">{t('home.loadingUpdates')}</p>
          ) : posts.length > 0 ? (
            <EmbassyFeedList
              posts={posts}
              community={community}
              fallbackAvatar={profile.flagUrl || '/GLOBE.png'}
              isMember={props.isActive}
              onLike={props.onLike}
              onSave={props.onSave}
              onShare={props.onShare}
              onSendComment={props.onSendComment}
              onDeletePost={props.onDeletePost}
            />
          ) : (
            <p className="body-small py-4 text-text-secondary">{t('community.noDiscussions')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default EmbassyCommunityTab;
