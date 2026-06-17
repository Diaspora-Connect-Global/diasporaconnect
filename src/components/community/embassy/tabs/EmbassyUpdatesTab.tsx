'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { EmbassyFeedList } from '../EmbassyFeedList';
import type { EmbassyProfile } from '../embassyMock';
import type { EmbassyViewProps } from '../types';

interface EmbassyUpdatesTabProps {
  props: EmbassyViewProps;
  profile: EmbassyProfile;
}

/** Updates = the community's own post feed (announcements/news posts). */
export function EmbassyUpdatesTab({ props, profile }: EmbassyUpdatesTabProps) {
  const t = useTranslations('community.embassy');
  const { community, posts, feedLoading } = props;

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 lg:px-6">
      <Card className="border-border-subtle">
        <CardContent className="p-5">
          <h2 className="heading-xsmall mb-4 text-text-primary">{t('home.latestUpdates')}</h2>
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
            <p className="body-small py-4 text-text-secondary">{t('home.noUpdates')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default EmbassyUpdatesTab;
