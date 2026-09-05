'use client';

import { useMutation } from '@apollo/client/react';
import { useReducer } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import FeedCardWithReply from '@/components/cards/FeedCardWithReply';
import { deriveKindDelta, type ReactionKind } from '@/components/reactions/reactionAdapter';
import { splitPostAttachments } from '@/lib/normalizeFeedPost';
import { readMutationOutcome, refusalMessageKey } from '@/lib/mutationOutcome';
import { buildMentionMap } from '@/components/custom/richTextRenderer';
import { formatDateProximity } from '@/macros/time';
import { toCdnUrl } from '@/lib/cdn';
import {
  ADD_ENGAGEMENT,
  REMOVE_ENGAGEMENT,
  type AddEngagementData,
  type RemoveEngagementData,
} from '@/services/gql/postsFeed';
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
   * Happy. See `handleReact` below for where the write actually happens.
   */
  onLike: EmbassyViewProps['onLike'];
  onSave: EmbassyViewProps['onSave'];
  onShare: EmbassyViewProps['onShare'];
  onSendComment: EmbassyViewProps['onSendComment'];
  onDeletePost: EmbassyViewProps['onDeletePost'];
}

/**
 * Optimistic reaction state for one post.
 *
 * Kept as DELTAS over the server value (plus the two absolute facts) so it
 * composes with a refetch rather than pinning a stale snapshot, and so a
 * rollback is the same delta sign-flipped.
 *
 * `hasLiked` and `myReaction` move together with the per-kind deltas: telling
 * the card "you reacted" without saying WHICH leaves it guessing (it guesses
 * Happy), and moving one bucket without the other leaves the old reaction in
 * the breakdown beside the new one with a doubled total.
 */
interface ReactionPatch {
  /** Delta on the displayed total (`engagementCounts.likes`). */
  likes: number;
  /** Per-kind deltas; a SWITCH moves one between buckets and leaves `likes` at 0. */
  happy: number;
  hopeful: number;
  sad: number;
  /** Absolute, not a delta. */
  hasLiked: boolean;
  /** Absolute: WHICH reaction is now selected, or null when cleared. */
  myReaction: ReactionKind | null;
}

/**
 * MODULE-scoped on purpose, and this is the load-bearing detail.
 *
 * The community/association detail pages hold their posts in their own
 * `localPosts` state and hand this list a plain `onLike(postId, liked)`. There
 * is no `onReact` in `EmbassyViewProps`, so a reaction has nowhere to be
 * recorded upstream — and `EmbassyCommunityView` picks its tab with a `switch`,
 * which UNMOUNTS this list on every tab change. Component state would therefore
 * lose the viewer's just-made reaction the moment they looked at another tab,
 * and it would come back looking un-reacted until the feed query refetched.
 *
 * Module scope outlives the unmount, so the reaction survives a tab switch. The
 * map is read-through: an entry stops being applied as soon as the server value
 * agrees with it (see `patch` in the render below), so it cannot double-count.
 *
 * WHEN THE PLUMBING LANDS, delete all of this. Threading `onReact` through
 * `EmbassyViewProps` (types.ts) → `EmbassyCommunityView` → `EmbassyHomeTab` /
 * `EmbassyUpdatesTab` lets `CommunityDetailClient` / `AssociationDetailClient`
 * own the write next to their existing `updatePostCounts`, exactly like the
 * `useFeed` pages do. Those four files were outside this change's scope.
 */
const reactionPatches = new Map<string, ReactionPatch>();

/**
 * The reaction fields the API returns but `EmbassyFeedPost` does not declare.
 *
 * The detail pages select `...FullPost`, which includes `myReaction` and the
 * per-kind counts, so the values ARE on these objects at runtime — the local
 * interface in `types.ts` simply predates them. Widening here keeps the read
 * honest without editing a type this change does not own.
 */
function readReactionFacts(post: EmbassyFeedPost): {
  myReaction: ReactionKind | null;
  happy?: number;
  hopeful?: number;
  sad?: number;
} {
  const counts = post.engagementCounts as EmbassyFeedPost['engagementCounts'] & {
    happy?: number;
    hopeful?: number;
    sad?: number;
  };
  const engagement = post.userEngagement as EmbassyFeedPost['userEngagement'] & {
    myReaction?: ReactionKind | null;
  };
  return {
    myReaction: engagement.myReaction ?? null,
    happy: counts.happy,
    hopeful: counts.hopeful,
    sad: counts.sad,
  };
}

/** Renders a list of community posts using the shared FeedCardWithReply card. */
export function EmbassyFeedList({
  posts,
  community,
  fallbackAvatar,
  isMember,
  onSave,
  onShare,
  onSendComment,
  onDeletePost,
}: EmbassyFeedListProps) {
  // Root-scoped on purpose: `refusalMessageKey` returns a FULLY QUALIFIED key
  // ('feed.errors.not_found'), so it must go to an UNSCOPED translator.
  const tRoot = useTranslations();
  const [, bumpPatchVersion] = useReducer((n: number) => n + 1, 0);
  const [addEngagement] = useMutation<AddEngagementData>(ADD_ENGAGEMENT);
  const [removeEngagement] = useMutation<RemoveEngagementData>(REMOVE_ENGAGEMENT);

  // Apollo runs `errorPolicy: 'all'`, so a REFUSED mutation RESOLVES with
  // `data: null` and the catch never fires — only a transport failure reaches
  // it. The optimistic patch is therefore gated on `readMutationOutcome`, or a
  // refused reaction stays on screen looking successful.
  const handleReact = async (
    postId: string,
    op: 'add' | 'remove',
    reaction: ReactionKind | null,
    delta: number,
    // The RAW prior `myReaction`, not the derived selection — they differ for a
    // pre-migration untyped like, where the derived value reports HAPPY for
    // display and rolling back with it would claim a type the row never had.
    previousReaction: ReactionKind | null,
  ) => {
    const adding = op === 'add';
    // A SWITCH (Happy→Sad) sends delta 0 — the server updates the row in place,
    // so the total must not move. What hasLiked was BEFORE this change:
    //   remove -> was reacted; add with delta 0 -> a switch, so was reacted;
    //   add with delta 1 -> a first reaction, so was not.
    const wasReacted = !adding || delta === 0;
    // `previousReaction` null is a pre-migration untyped like, which belongs to
    // no bucket — nothing is decremented and the untyped remainder shrinks by
    // one on its own. That is correct.
    const kindDelta = deriveKindDelta(previousReaction, reaction, adding);

    const patch = (sign: 1 | -1, hasLiked: boolean, myReaction: ReactionKind | null) => {
      const before = reactionPatches.get(postId);
      reactionPatches.set(postId, {
        likes: (before?.likes ?? 0) + sign * delta,
        happy: (before?.happy ?? 0) + sign * (kindDelta.HAPPY ?? 0),
        hopeful: (before?.hopeful ?? 0) + sign * (kindDelta.HOPEFUL ?? 0),
        sad: (before?.sad ?? 0) + sign * (kindDelta.SAD ?? 0),
        hasLiked,
        myReaction,
      });
      bumpPatchVersion();
    };

    patch(1, adding, adding ? reaction : null);
    const rollback = () => patch(-1, wasReacted, previousReaction);

    try {
      const result = adding
        ? await addEngagement({
            variables: {
              // reactionType is sent EXPLICITLY. Omitting it stores NULL — an
              // untyped like, indistinguishable from a pre-migration row.
              input: { postId, engagementType: 'LIKE', reactionType: reaction ?? 'HAPPY' },
            },
          })
        : await removeEngagement({ variables: { input: { postId, engagementType: 'LIKE' } } });
      const outcome = readMutationOutcome(result, (d) =>
        adding ? d?.addEngagement : d?.removeEngagement,
      );
      if (!outcome.ok) {
        rollback();
        toast.error(tRoot(refusalMessageKey(outcome.message, 'feed.errors')));
      }
    } catch (err) {
      rollback();
      console.error(`Failed to ${adding ? 'react to' : 'un-react'} post:`, err);
      toast.error(tRoot('feed.errors.failed'));
    }
  };

  return (
    <div className="space-y-4">
      {posts.map((post) => {
        const media = splitPostAttachments(post.attachments);
        const facts = readReactionFacts(post);
        const serverHasLiked = post.userEngagement.hasLiked;
        const pending = reactionPatches.get(post.id);
        // Once the server reports the reaction the patch was asserting, the
        // patch has been ABSORBED into the server counts — keep applying its
        // deltas and the same reaction would be counted twice.
        const patch =
          pending &&
          pending.hasLiked === serverHasLiked &&
          pending.myReaction === facts.myReaction
            ? undefined
            : pending;
        const likeCount = Math.max(0, post.engagementCounts.likes + (patch?.likes ?? 0));
        // Built ONLY when all three per-kind counts came back. Undefined means
        // "not measured" — rendering zeros would assert a breakdown we never
        // received. The total stays `likes`, which also counts untyped rows.
        const reactionBreakdown =
          facts.happy !== undefined &&
          facts.hopeful !== undefined &&
          facts.sad !== undefined
            ? {
                HAPPY: Math.max(0, facts.happy + (patch?.happy ?? 0)),
                HOPEFUL: Math.max(0, facts.hopeful + (patch?.hopeful ?? 0)),
                SAD: Math.max(0, facts.sad + (patch?.sad ?? 0)),
              }
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
            shares={post.engagementCounts.shares}
            likes={likeCount}
            comments={post.engagementCounts.comments}
            reactionBreakdown={reactionBreakdown}
            onReact={handleReact}
            onShare={onShare}
            onSave={onSave}
            onSendComment={onSendComment}
            onDelete={onDeletePost}
            isLiked={patch ? patch.hasLiked : serverHasLiked}
            // WHICH reaction the server recorded — without it the card sees
            // only hasLiked and assumes Happy, so a stored Hopeful or Sad
            // comes back as a heart.
            serverReaction={patch ? patch.myReaction : facts.myReaction}
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
