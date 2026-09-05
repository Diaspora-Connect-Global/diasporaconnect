'use client';

import { useState, type MouseEvent as ReactMouseEvent } from 'react';
import { formatDateProximity } from '@/macros/time';
import { useQuery, useMutation } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import {
  GET_USER_POSTS,
  GET_SAVED_POSTS,
  GET_LIKED_POSTS,
  GET_COMMENTED_POSTS,
  ADD_ENGAGEMENT,
  REMOVE_ENGAGEMENT,
  CREATE_COMMENT,
  GetUserPostsData,
  GetSavedPostsData,
  GetLikedPostsData,
  GetCommentedPostsData,
  AddEngagementData,
  RemoveEngagementData,
  CreateCommentData,
  Post,
} from '@/services/gql/postsFeed';
import FeedCardWithReply from '../cards/FeedCardWithReply';
import { deriveKindDelta, type ReactionKind } from '@/components/reactions/reactionAdapter';
import { resolveUserTier } from '@/lib/userTier';
import { splitPostAttachments } from '@/lib/normalizeFeedPost';
import { toast } from 'sonner';
import { readMutationOutcome, refusalMessageKey } from '@/lib/mutationOutcome';
import { Bookmark, Heart, MessageCircle, FileText, type LucideIcon } from 'lucide-react';
import { buildMentionMap, type MentionInputItem } from '@/components/custom/richTextRenderer';
import { EmptyState } from '@/components/feedback';

type TabId = 'myPosts' | 'saved' | 'liked' | 'commented';

const EMPTY_ICON_BY_TAB: Record<TabId, LucideIcon> = {
  myPosts: FileText,
  saved: Bookmark,
  liked: Heart,
  commented: MessageCircle,
};

const EMPTY_TITLE_KEY_BY_TAB: Record<TabId, string> = {
  myPosts: 'empty.myPosts.title',
  saved: 'empty.savedPosts.title',
  liked: 'empty.likedPosts.title',
  commented: 'empty.commentedPosts.title',
};

interface FilteredPostsProps {
  /** The userId whose posts to show */
  userId: string;
  /** Whether this is the logged-in user's own profile */
  isOwnProfile: boolean;
}

/**
 * Optimistic reaction state for one post.
 *
 * These tabs read their posts straight off the Apollo query result — there is
 * no `useFeed` and therefore no `updatePostCounts` — so the optimistic layer
 * lives here, keyed by post id. It is kept as DELTAS over the server value
 * (plus the two absolute facts) so it composes with a refetch instead of
 * pinning a stale snapshot, and so a rollback is the same delta sign-flipped.
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

export default function FilteredPosts({ userId, isOwnProfile }: FilteredPostsProps) {
  const t = useTranslations('profile.navigation');
  const tFeedback = useTranslations('feedback');
  // Root-scoped on purpose: `refusalMessageKey` returns a FULLY QUALIFIED key
  // ('feed.errors.not_found'), so it must go to an UNSCOPED translator.
  const tRoot = useTranslations();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabId>('myPosts');
  const [reactionPatches, setReactionPatches] = useState<Record<string, ReactionPatch>>({});

  // Navigate to the post detail page unless the click originated from an
  // interactive child (buttons, links, inputs, media, or any element
  // explicitly marked as clickable via `cursor-pointer`).
  const handlePostCardClick = (postId: string) => (e: ReactMouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Skip the navigation when the click originated inside an interactive
    // child of the card. Radix renders DropdownMenuItem / DialogContent
    // with `role="menuitem"` / `role="dialog"` (NOT role="button"), so we
    // explicitly include them — without this, clicking the post's ⋯-menu
    // Delete item opens the modal AND bubbles up to navigate to /post/{id},
    // stealing the focus before the delete mutation can run.
    const interactive = target.closest(
      'button, a, input, textarea, select, label, img, video, [role="button"], [role="menuitem"], [role="menu"], [role="dialog"], [data-radix-popper-content-wrapper], .cursor-pointer'
    );
    if (interactive) return;

    router.push(`/post/${postId}`);
  };

  // ---- Tabs config ----
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = isOwnProfile
    ? [
        { id: 'myPosts', label: t('posts'), icon: <FileText className="w-4 h-4" /> },
        { id: 'saved', label: t('saved'), icon: <Bookmark className="w-4 h-4" /> },
        { id: 'liked', label: t('liked'), icon: <Heart className="w-4 h-4" /> },
        { id: 'commented', label: t('commented'), icon: <MessageCircle className="w-4 h-4" /> },
      ]
    : [
        // Other users only see their posts
        { id: 'myPosts', label: t('posts'), icon: <FileText className="w-4 h-4" /> },
      ];

  // ---- "My Posts" / user posts via feed with authorId ----
  const {
    data: postsData,
    loading: postsLoading,
  } = useQuery<GetUserPostsData>(GET_USER_POSTS, {
    variables: {
      authorId: userId,
      authorType: 'USER',
      limit: 30,
      offset: 0,
    },
    skip: activeTab !== 'myPosts',
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: savedData,
    loading: savedLoading,
  } = useQuery<GetSavedPostsData>(GET_SAVED_POSTS, {
    variables: {
      limit: 30,
      offset: 0,
      userId: isOwnProfile ? undefined : userId,
    },
    skip: activeTab !== 'saved',
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: likedData,
    loading: likedLoading,
  } = useQuery<GetLikedPostsData>(GET_LIKED_POSTS, {
    variables: {
      limit: 30,
      offset: 0,
      userId: isOwnProfile ? undefined : userId,
    },
    skip: activeTab !== 'liked',
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: commentedData,
    loading: commentedLoading,
  } = useQuery<GetCommentedPostsData>(GET_COMMENTED_POSTS, {
    variables: {
      limit: 30,
      offset: 0,
      userId: isOwnProfile ? undefined : userId,
    },
    skip: activeTab !== 'commented',
    fetchPolicy: 'cache-and-network',
  });

  // ---- Mutations ----
  const [addEngagement] = useMutation<AddEngagementData>(ADD_ENGAGEMENT);
  const [removeEngagement] = useMutation<RemoveEngagementData>(REMOVE_ENGAGEMENT);
  const [createComment] = useMutation<CreateCommentData>(CREATE_COMMENT);

  // ---- Derived data ----
  const posts: Post[] =
    activeTab === 'myPosts'
      ? (postsData?.userPosts as Post[]) ?? []
      : activeTab === 'saved'
      ? (savedData?.savedPosts?.posts as Post[]) ?? []
      : activeTab === 'liked'
      ? (likedData?.likedPosts?.posts as Post[]) ?? []
      : (commentedData?.commentedPosts?.posts as Post[]) ?? [];

  const loading = 
    activeTab === 'myPosts' ? postsLoading : 
    activeTab === 'saved' ? savedLoading :
    activeTab === 'liked' ? likedLoading : commentedLoading;

  // ---- Handlers ----
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

    const patch = (sign: 1 | -1, hasLiked: boolean, myReaction: ReactionKind | null) =>
      setReactionPatches((prev) => {
        const before = prev[postId];
        return {
          ...prev,
          [postId]: {
            likes: (before?.likes ?? 0) + sign * delta,
            happy: (before?.happy ?? 0) + sign * (kindDelta.HAPPY ?? 0),
            hopeful: (before?.hopeful ?? 0) + sign * (kindDelta.HOPEFUL ?? 0),
            sad: (before?.sad ?? 0) + sign * (kindDelta.SAD ?? 0),
            hasLiked,
            myReaction,
          },
        };
      });

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

  const handleSave = async (postId: string, saved: boolean) => {
    try {
      if (saved) {
        await addEngagement({ variables: { input: { postId, engagementType: 'SAVE' } } });
      } else {
        await removeEngagement({ variables: { input: { postId, engagementType: 'SAVE' } } });
      }
    } catch {
      toast.error(`Failed to ${saved ? 'save' : 'unsave'} post`);
    }
  };

  const handleShare = async (postId: string) => {
    try {
      await addEngagement({
        variables: { input: { postId, engagementType: 'SHARE' } },
      });
    } catch {
      toast.error('Failed to share post');
    }
  };

  const handleSendComment = async (postId: string, content: string, parentId?: string, mentions?: MentionInputItem[]) => {
    try {
      await createComment({
        variables: {
          input: {
            postId,
            text: content,
            idempotencyKey: crypto.randomUUID(),
            ...(parentId ? { parentId } : {}),
            ...(mentions?.length ? { mentions } : {}),
          },
        },
      });
    } catch (err) {
      toast.error('Failed to add comment');
      throw err;
    }
  };

  // ---- Helpers ----
  const getProfileData = (post: Post) => {
    if (post.authorType === 'ORG' && post.authorProfile?.organizationProfile) {
      return {
        name: post.authorProfile.organizationProfile.name,
        avatar: '/default-avatar.png',
        tier: undefined,
        type: 'Organization' as const,
      };
    }
    if (post.authorProfile?.userProfile) {
      const userProfile = post.authorProfile.userProfile;
      return {
        name: userProfile.name,
        avatar: userProfile.avatar || '/PROFILE.png',
        tier: resolveUserTier({
          tier: (userProfile as { tier?: string }).tier,
          verificationTier: userProfile.verificationTier,
          trustScore: (userProfile as { trustScore?: number }).trustScore,
        }),
        type: 'User' as const,
      };
    }
    return { name: 'Unknown', avatar: '/PROFILE.png', tier: undefined, type: 'User' as const };
  };


  // ---- Render ----
  return (
    <div className="overflow-hidden lg:flex">
      {/* Left: Sub-tabs */}
      <div className="lg:w-[12vw] flex lg:flex-col border-r border-border-subtle bg-surface-default">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full text-left flex items-center justify-center lg:justify-start gap-2 lg:p-3 p-2 transition-colors border-t first:border-t-0 cursor-pointer
              ${
                activeTab === tab.id
                  ? 'text-brand bg-brand/5 font-medium border-b-2 border-b-border-brand'
                  : 'text-text-primary hover:bg-muted'
              }`}
          >
            {tab.icon}
            <span className="text-sm hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Right: Feed */}
      <div className="flex-1 overflow-y-auto bg-surface-default p-4 space-y-4 max-h-[70vh]">
        {/* Loading skeletons */}
        {loading && posts.length === 0 && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface-subtle rounded-lg p-4 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-surface-default rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-surface-default rounded w-1/3 mb-2" />
                    <div className="h-3 bg-surface-default rounded w-1/4" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-surface-default rounded w-full" />
                  <div className="h-4 bg-surface-default rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && posts.length === 0 && (
          <EmptyState
            size="md"
            icon={EMPTY_ICON_BY_TAB[activeTab]}
            title={tFeedback(EMPTY_TITLE_KEY_BY_TAB[activeTab])}
          />
        )}

        {/* Posts */}
        {posts.map((post) => {
          const profileData = getProfileData(post);
          // Server counts with this post's optimistic patch folded in.
          const counts = post.engagementCounts;
          const serverHasLiked = post.userEngagement?.hasLiked ?? false;
          const serverReaction = post.userEngagement?.myReaction ?? null;
          const pending = reactionPatches[post.id];
          // Once the server reports the reaction the patch was asserting, the
          // patch has been ABSORBED into the server counts — these tabs run
          // `cache-and-network`, so leaving it applied would count the same
          // reaction twice after a tab switch refetches. Let the server win.
          const patch =
            pending &&
            pending.hasLiked === serverHasLiked &&
            pending.myReaction === serverReaction
              ? undefined
              : pending;
          const likeCount = Math.max(0, (counts?.likes ?? 0) + (patch?.likes ?? 0));
          const viewerHasLiked = patch ? patch.hasLiked : serverHasLiked;
          const viewerReaction = patch ? patch.myReaction : serverReaction;
          // Built ONLY when all three per-kind counts came back. Undefined means
          // "not measured" — rendering zeros would assert a breakdown we never
          // received. The total stays `likes`, which also counts untyped rows.
          const reactionBreakdown =
            counts?.happy !== undefined &&
            counts?.hopeful !== undefined &&
            counts?.sad !== undefined
              ? {
                  HAPPY: Math.max(0, counts.happy + (patch?.happy ?? 0)),
                  HOPEFUL: Math.max(0, counts.hopeful + (patch?.hopeful ?? 0)),
                  SAD: Math.max(0, counts.sad + (patch?.sad ?? 0)),
                }
              : undefined;
          return (
            <div
              key={post.id}
              className="mb-2"
              role="link"
              tabIndex={0}
              style={{ cursor: 'pointer' }}
              onClick={handlePostCardClick(post.id)}
              onKeyDown={(e) => {
                // Only act when focus is on the wrapper itself — typing in
                // a nested textarea/input (e.g. the inline edit-post editor)
                // bubbles space/enter up here and would otherwise navigate
                // away mid-edit.
                if (e.target !== e.currentTarget) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  router.push(`/post/${post.id}`);
                }
              }}
            >
              <FeedCardWithReply
                postId={post.id}
                profileImage={profileData.avatar}
                profileName={profileData.name}
                profileTier={profileData.tier}
                authorUserId={post.authorType?.toUpperCase() === 'USER' ? post.authorId : undefined}
                authorEntityId={post.authorId}
                authorEntityType={post.authorType}
                category={profileData.type}
                aiCategory={post.categories?.[0]}
                postDate={formatDateProximity(post.createdAt)}
                createdAt={post.createdAt}
                visibility={post.visibility as 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE'}
                content={post.text}
                mentionMap={buildMentionMap(post.mentions ?? [])}
                images={
                  post.attachments
                    ?.filter((a) => a.mimeType?.startsWith('image/') || a.type?.toUpperCase() === 'IMAGE')
                    .map((a) => a.url || '')
                    .filter(Boolean) || []
                }
                videos={
                  post.attachments
                    ?.filter((a) => a.mimeType?.startsWith('video/') || a.type?.toUpperCase() === 'VIDEO')
                    .map((a) => a.url || '')
                    .filter(Boolean) || []
                }
                documents={splitPostAttachments(post.attachments).documents}
                likes={likeCount}
                comments={post.engagementCounts.comments}
                shares={post.engagementCounts.shares}
                reactionBreakdown={reactionBreakdown}
                onReact={handleReact}
                onShare={handleShare}
                onSave={handleSave}
                onSendComment={handleSendComment}
                joinButton={false}
                isLiked={viewerHasLiked}
                // WHICH reaction is recorded — without it the card sees only
                // hasLiked and assumes Happy, so a stored Hopeful or Sad comes
                // back as a heart.
                serverReaction={viewerReaction}
                isSaved={post.userEngagement.hasSaved}
                isShared={post.userEngagement.hasShared}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}