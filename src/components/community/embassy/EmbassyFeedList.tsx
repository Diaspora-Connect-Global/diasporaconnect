'use client';

import FeedCardWithReply from '@/components/cards/FeedCardWithReply';
import { splitPostAttachments } from '@/lib/normalizeFeedPost';
import { buildMentionMap } from '@/components/custom/richTextRenderer';
import { formatDateProximity } from '@/macros/time';
import { toCdnUrl } from '@/lib/cdn';
import type { EmbassyViewProps, EmbassyFeedPost } from './types';

interface EmbassyFeedListProps {
  posts: EmbassyFeedPost[];
  community: EmbassyViewProps['community'];
  fallbackAvatar: string;
  isMember: boolean;
  /**
   * Still declared because every caller passes it, and because the card keeps
   * `onLike` as its untyped-like fallback. Reactions do NOT go through it —
   * a boolean cannot carry WHICH reaction, so it would store every Sad as a
   * Happy. `onReact` is the reaction route.
   */
  onLike: EmbassyViewProps['onLike'];
  /**
   * Forwarded straight to the card, unwrapped.
   *
   * THIS LIST DELIBERATELY OWNS NO REACTION STATE AND FIRES NO MUTATION. It
   * used to do both, because `onReact` had no route down the component chain —
   * and since `EmbassyCommunityView` picks its tab with a `switch` that
   * UNMOUNTS this list on every tab change, the optimistic patch had to be
   * parked in a module-scoped Map just to survive the unmount.
   *
   * The write now lives in `CommunityDetailClient` / `AssociationDetailClient`
   * beside their `localPosts` + `updatePostCounts`, which sit ABOVE that
   * switch. Their state survives a tab change for free, the reaction lands in
   * the same object every other engagement counter lives in, and there is no
   * second layer of truth to reconcile. Do not reintroduce local state here.
   */
  onReact: EmbassyViewProps['onReact'];
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
  onReact,
  onSave,
  onShare,
  onSendComment,
  onDeletePost,
}: EmbassyFeedListProps) {
  return (
    <div className="space-y-4">
      {posts.map((post) => {
        const media = splitPostAttachments(post.attachments);
        const counts = post.engagementCounts;
        // Built ONLY when all three per-kind counts came back. Undefined means
        // "not measured" — rendering zeros would assert a breakdown we never
        // received. The total stays `likes`, which also counts untyped rows.
        const reactionBreakdown =
          counts.happy !== undefined &&
          counts.hopeful !== undefined &&
          counts.sad !== undefined
            ? { HAPPY: counts.happy, HOPEFUL: counts.hopeful, SAD: counts.sad }
            : undefined;
        return (
          <FeedCardWithReply
            key={post.id}
            postId={post.id}
            profileImage={toCdnUrl(community.avatarUrl) || toCdnUrl(fallbackAvatar)}
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
            shares={counts.shares}
            likes={counts.likes}
            comments={counts.comments}
            reactionBreakdown={reactionBreakdown}
            onReact={onReact}
            onShare={onShare}
            onSave={onSave}
            onSendComment={onSendComment}
            onDelete={onDeletePost}
            isLiked={post.userEngagement.hasLiked}
            // WHICH reaction the server recorded — without it the card sees
            // only hasLiked and assumes Happy, so a stored Hopeful or Sad
            // comes back as a heart.
            serverReaction={post.userEngagement.myReaction ?? null}
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
