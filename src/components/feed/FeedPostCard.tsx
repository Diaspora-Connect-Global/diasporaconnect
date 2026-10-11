'use client';

import { memo } from 'react';
import FeedCardWithReply from '@/components/cards/FeedCardWithReply';
import { ImpressionTracker } from '@/components/feed/ImpressionTracker';
import { buildMentionMap } from '@/components/custom/richTextRenderer';
import { splitPostAttachments } from '@/lib/normalizeFeedPost';
import { formatDateProximity } from '@/macros/time';
import type { ReactionKind } from '@/components/reactions/reactionAdapter';
import type { Post as ApiPost } from '@/services/gql/types/postsFeed';
import { getBlurFor, getDimsFor, getProfileData } from './feedPostHelpers';

export interface FeedPostCardProps {
  post: ApiPost;
  index: number;
  /** Impression surface reported with VIEW / DWELL signals. */
  surface: string;
  handleReact: (postId: string, op: 'add' | 'remove', reaction: ReactionKind | null, delta: number, previousReaction: ReactionKind | null) => void | Promise<void>;
  handleShare: (postId: string) => void | Promise<void>;
  handleSave: (postId: string, saved: boolean) => void | Promise<void>;
  handleSendComment: (postId: string, content: string, parentId?: string, mentions?: import('@/components/custom/richTextRenderer').MentionInputItem[]) => void | Promise<void>;
  removePost: (postId: string) => void;
  handleOpenMedia: (postId: string, mediaIndex: number) => void;
}

/**
 * One full feed post: the impression tracker around the shared card, which
 * carries the Happy / Hopeful / Sad reaction design. Home and Community render
 * the same card so a post looks and behaves identically in both.
 */
function FeedPostCardInner({ post, index: _index, surface, handleReact, handleShare, handleSave, handleSendComment, removePost, handleOpenMedia }: FeedPostCardProps) {
  const getPostMentionMap = (p: ApiPost) => buildMentionMap(p.mentions ?? []);
  const profileData = getProfileData(post);
  // LQIP blur-up lookup: precomputed in normalizeFeedPost as
  // `post.blurByUrl`; getBlurFor returns a reference-stable
  // function per post so the card's React.memo isn't defeated.
  const blurFor = getBlurFor(post.blurByUrl);
  const dimsFor = getDimsFor(post.dimsByUrl);
  return (
  <ImpressionTracker
    itemId={post.id}
    itemType="POST"
    source={post.__source}
    score={post.__score}
    surface={surface}
    className="mb-2"
  >
    <div id={`feed-post-${post.id}`} className="feed-card-cv">
      <FeedCardWithReply
        postId={post.id}
        aiCategory={post.categories?.[0]}
        profileImage={profileData.avatar}
        profileName={profileData.name}
        authorUserId={post.authorType?.toUpperCase() === 'USER' ? post.authorId : undefined}
        authorEntityId={post.authorId}
        authorEntityType={post.authorType}
        profileTier={profileData.tier}
        category={profileData.type}
        postDate={formatDateProximity(post.createdAt)}
        createdAt={post.createdAt}
        visibility={post.visibility as 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE'}
        content={post.text}
        mentionMap={getPostMentionMap(post)}
        images={post.attachments
          ?.filter(
            (a) =>
              a.mimeType?.startsWith('image/') ||
              String(a.type ?? '').toUpperCase() === 'IMAGE'
          )
          .map((a) => a.url || '')
          .filter(Boolean) || []}
        blurFor={blurFor}
        dimsFor={dimsFor}
        priorityFirstImage={_index === 0}
        videos={post.attachments
          ?.filter(
            (a) =>
              a.mimeType?.startsWith('video/') ||
              String(a.type ?? '').toUpperCase() === 'VIDEO'
          )
          .map((a) => a.url || '')
          .filter(Boolean) || []}
        documents={splitPostAttachments(post.attachments).documents}
        likes={post.engagementCounts.likes}
        comments={post.engagementCounts.comments}
        shares={post.engagementCounts.shares}
        // Per-reaction counts drive WHICH glyphs the cluster shows.
        // Undefined until every field is present — a partial object
        // would render a cluster asserting reactions we did not
        // actually measure. The total stays `likes`, which counts
        // untyped legacy rows the three flavours cannot account for.
        reactionBreakdown={
          post.engagementCounts.happy !== undefined &&
          post.engagementCounts.hopeful !== undefined &&
          post.engagementCounts.sad !== undefined
            ? {
                HAPPY: post.engagementCounts.happy,
                HOPEFUL: post.engagementCounts.hopeful,
                SAD: post.engagementCounts.sad,
              }
            : undefined
        }
        onReact={handleReact}
        onShare={handleShare}
        onSave={handleSave}
        onSendComment={handleSendComment}
        onDelete={removePost}
        joinButton={false}
        isLiked={post.userEngagement.hasLiked}
        // WHICH reaction the server recorded. Without this the
        // card sees only hasLiked and assumes Happy — which is
        // why a stored Hopeful or Sad came back as a heart.
        serverReaction={post.userEngagement.myReaction ?? null}
        isSaved={post.userEngagement.hasSaved}
        isShared={post.userEngagement.hasShared}
        onOpenMedia={handleOpenMedia}
      />
    </div>
  </ImpressionTracker>
  );
}

export const FeedPostCard = memo(FeedPostCardInner);
