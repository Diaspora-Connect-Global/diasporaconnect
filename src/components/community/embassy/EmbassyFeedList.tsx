'use client';

import FeedCardWithReply from '@/components/cards/FeedCardWithReply';
import { splitPostAttachments } from '@/lib/normalizeFeedPost';
import { buildMentionMap } from '@/components/custom/richTextRenderer';
import { formatDateProximity } from '@/macros/time';
import type { EmbassyViewProps, EmbassyFeedPost } from './types';

interface EmbassyFeedListProps {
  posts: EmbassyFeedPost[];
  community: EmbassyViewProps['community'];
  fallbackAvatar: string;
  isMember: boolean;
  onLike: EmbassyViewProps['onLike'];
  onSave: EmbassyViewProps['onSave'];
  onShare: EmbassyViewProps['onShare'];
  onSendComment: EmbassyViewProps['onSendComment'];
  onDeletePost: EmbassyViewProps['onDeletePost'];
}

/** Renders a list of community posts using the shared FeedCardWithReply card. */
export function EmbassyFeedList({
  posts,
  community,
  fallbackAvatar,
  isMember,
  onLike,
  onSave,
  onShare,
  onSendComment,
  onDeletePost,
}: EmbassyFeedListProps) {
  return (
    <div className="space-y-4">
      {posts.map((post) => {
        const media = splitPostAttachments(post.attachments);
        return (
          <FeedCardWithReply
            key={post.id}
            postId={post.id}
            profileImage={community.avatarUrl || fallbackAvatar}
            profileName={community.name}
            {...(post.authorType?.toUpperCase() === 'USER' ? { authorUserId: post.authorId } : {})}
            authorEntityId={post.authorId}
            authorEntityType={post.authorType}
            createdAt={post.createdAt}
            category={community.name}
            aiCategory={post.categories?.[0]}
            postDate={formatDateProximity(post.createdAt)}
            visibility={post.visibility as 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE'}
            content={post.text}
            images={media.images}
            videos={media.videos}
            documents={media.documents}
            mentionMap={buildMentionMap(post.mentions ?? [])}
            shares={post.engagementCounts.shares}
            likes={post.engagementCounts.likes}
            comments={post.engagementCounts.comments}
            onLike={onLike}
            onShare={onShare}
            onSave={onSave}
            onSendComment={onSendComment}
            onDelete={onDeletePost}
            isLiked={post.userEngagement.hasLiked}
            isSaved={post.userEngagement.hasSaved}
            isShared={post.userEngagement.hasShared}
            joinButton={!isMember}
          />
        );
      })}
    </div>
  );
}

export default EmbassyFeedList;
