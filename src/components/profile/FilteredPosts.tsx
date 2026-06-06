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
import { splitPostAttachments } from '@/lib/normalizeFeedPost';
import { toast } from 'sonner';
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

export default function FilteredPosts({ userId, isOwnProfile }: FilteredPostsProps) {
  const t = useTranslations('profile.navigation');
  const tFeedback = useTranslations('feedback');
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabId>('myPosts');

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
  const handleLike = async (postId: string, liked: boolean) => {
    try {
      if (liked) {
        await addEngagement({ variables: { input: { postId, engagementType: 'LIKE' } } });
      } else {
        await removeEngagement({ variables: { input: { postId, engagementType: 'LIKE' } } });
      }
    } catch {
      toast.error(`Failed to ${liked ? 'like' : 'unlike'} post`);
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
        type: 'Organization' as const,
      };
    }
    if (post.authorProfile?.userProfile) {
      return {
        name: post.authorProfile.userProfile.name,
        avatar: post.authorProfile.userProfile.avatar || '/PROFILE.png',
        type: 'User' as const,
      };
    }
    return { name: 'Unknown', avatar: '/PROFILE.png', type: 'User' as const };
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
                likes={post.engagementCounts.likes}
                comments={post.engagementCounts.comments}
                shares={post.engagementCounts.shares}
                onLike={handleLike}
                onShare={handleShare}
                onSave={handleSave}
                onSendComment={handleSendComment}
                joinButton={false}
                isLiked={post.userEngagement.hasLiked}
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