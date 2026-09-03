'use client';

import FeedCardWithReply from '@/components/cards/FeedCardWithReply';
import { splitPostAttachments } from '@/lib/normalizeFeedPost';
import { formatDateProximity } from '@/macros/time';
import PostMediaModal, { type ModalMediaItem } from '@/components/cards/PostMediaModal';
import { Link } from '@/i18n/navigation';
import { ADD_ENGAGEMENT, REMOVE_ENGAGEMENT, CREATE_COMMENT, AddEngagementData, RemoveEngagementData, CreateCommentData } from '@/services/gql/postsFeed';
import type { Post } from '@/services/gql/types/postsFeed';
import { useFeed } from '@/hooks/useFeed';
import { useMutation } from '@apollo/client/react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, Newspaper } from 'lucide-react';
import { EmptyState, ErrorState } from '@/components/feedback';
import { resolveUserTier } from '@/lib/userTier';
import { FEED_COLUMN_CLASS } from '@/lib/feedColumnLayout';
import { buildMentionMap } from '@/components/custom/richTextRenderer';

function getProfileData(post: Post) {
  const orgProfile = post.authorProfile?.organizationProfile;
  if (post.authorType === 'COMMUNITY' && orgProfile) {
    return {
      name: orgProfile.name,
      avatar: orgProfile.logo || '/GLOBE.png',
      tier: undefined,
      type: 'Community' as const,
    };
  }
  if (post.authorType === 'ASSOCIATION' && orgProfile) {
    return {
      name: orgProfile.name,
      avatar: orgProfile.logo || '/GLOBE.png',
      tier: undefined,
      type: 'Association' as const,
    };
  }
  if (post.authorType === 'ORG' && orgProfile) {
    return {
      name: orgProfile.name,
      avatar: orgProfile.logo || '/GLOBE.png',
      tier: undefined,
      type: 'Organization' as const,
    };
  }
  if (post.authorType === 'USER' && post.authorProfile?.userProfile) {
    return {
      name: post.authorProfile.userProfile.name,
      avatar: post.authorProfile.userProfile.avatar || '/PROFILE.png',
      tier: resolveUserTier({
        tier: (post.authorProfile.userProfile as { tier?: string }).tier,
        verificationTier: post.authorProfile.userProfile.verificationTier,
      }),
      type: 'User' as const,
    };
  }
  return { name: 'Unknown User', avatar: '/PROFILE.png', tier: undefined, type: 'User' as const };
}


export default function FeedPage() {
  const t = useTranslations('community');
  const tFeedback = useTranslations('feedback');
  const tCategory = useTranslations('categoryBadge');
  const searchParams = useSearchParams();
  const hashtag = searchParams.get('hashtag') ?? null;
  const category = searchParams.get('category') ?? null;
  const [modalState, setModalState] = useState<{ postIndex: number; mediaIndex: number } | null>(null);

  const {
    posts,
    loading: feedLoading,
    error: feedError,
    refetch: refetchFeed,
    loadingMore: feedLoadingMore,
    feedContainerRef,
    updatePostCounts,
    removePost,
  } = useFeed({ hashtag, category });

  const categoryLabel = category && tCategory.has(category) ? tCategory(category) : category;

  const [addEngagement] = useMutation<AddEngagementData>(ADD_ENGAGEMENT);
  const [removeEngagement] = useMutation<RemoveEngagementData>(REMOVE_ENGAGEMENT);
  const [createComment] = useMutation<CreateCommentData>(CREATE_COMMENT);

  const handleLike = async (postId: string, liked: boolean) => {
    updatePostCounts(postId, { likes: liked ? 1 : -1, hasLiked: liked });
    try {
      if (liked) {
        await addEngagement({ variables: { input: { postId, engagementType: 'LIKE' } } });
      } else {
        await removeEngagement({ variables: { input: { postId, engagementType: 'LIKE' } } });
      }
    } catch (err) {
      updatePostCounts(postId, { likes: liked ? -1 : 1, hasLiked: !liked });
      console.error(`Failed to ${liked ? 'like' : 'unlike'} post:`, err);
      toast.error(`Failed to ${liked ? 'like' : 'unlike'} post`);
    }
  };

  const handleSave = async (postId: string, saved: boolean) => {
    updatePostCounts(postId, { saves: saved ? 1 : -1, hasSaved: saved });
    try {
      if (saved) {
        await addEngagement({ variables: { input: { postId, engagementType: 'SAVE' } } });
      } else {
        await removeEngagement({ variables: { input: { postId, engagementType: 'SAVE' } } });
      }
    } catch (err) {
      updatePostCounts(postId, { saves: saved ? -1 : 1, hasSaved: !saved });
      console.error(`Failed to ${saved ? 'save' : 'unsave'} post:`, err);
      toast.error(`Failed to ${saved ? 'save' : 'unsave'} post`);
    }
  };

  const handleShare = async (postId: string) => {
    updatePostCounts(postId, { shares: 1 });
    try {
      await addEngagement({ variables: { input: { postId, engagementType: 'SHARE' } } });
    } catch (err) {
      updatePostCounts(postId, { shares: -1 });
      console.error('Failed to share post:', err);
      toast.error('Failed to share post');
    }
  };

  const handleSendComment = async (postId: string, content: string, parentId?: string, mentions?: import('@/components/custom/richTextRenderer').MentionInputItem[]) => {
    if (!content.trim()) return;
    updatePostCounts(postId, { comments: 1 });
    try {
      await createComment({
        variables: { input: { postId, text: content, idempotencyKey: crypto.randomUUID(), ...(parentId ? { parentId } : {}), ...(mentions?.length ? { mentions } : {}) } },
      });
      toast.success('Comment posted!');
    } catch (err) {
      updatePostCounts(postId, { comments: -1 });
      console.error('Failed to post comment:', err);
      toast.error('Failed to post comment');
      throw err;
    }
  };

  const hasPosts = posts.length > 0;

  const getPostMedia = (post: Post): ModalMediaItem[] => [
    ...(post.attachments ?? [])
      .filter(a => a.mimeType?.startsWith('image/') || String(a.type ?? '').toUpperCase() === 'IMAGE')
      .map(a => ({ type: 'image' as const, src: a.url || '' }))
      .filter(m => m.src),
    ...(post.attachments ?? [])
      .filter(a => a.mimeType?.startsWith('video/') || String(a.type ?? '').toUpperCase() === 'VIDEO')
      .map(a => ({ type: 'video' as const, src: a.url || '' }))
      .filter(m => m.src),
  ];

  const handleNavigatePost = (dir: 'next' | 'prev') => {
    if (modalState === null) return;
    let i = dir === 'next' ? modalState.postIndex + 1 : modalState.postIndex - 1;
    while (i >= 0 && i < posts.length) {
      if (getPostMedia(posts[i]!).length > 0) {
        setModalState({ postIndex: i, mediaIndex: 0 });
        return;
      }
      i = dir === 'next' ? i + 1 : i - 1;
    }
  };

  const modalPost = modalState !== null ? posts[modalState.postIndex] ?? null : null;
  const modalProfileData = modalPost ? getProfileData(modalPost) : null;

  return (
    <div className="h-app-inner flex overflow-hidden">
      <div ref={feedContainerRef} className={FEED_COLUMN_CLASS}>
        {/* Header: back + hashtag title */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <Link
            href="/home"
            className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="label-medium">{t('discover')}</span>
          </Link>
          {hashtag && (
            <h1 className="label-large text-text-primary">
              Posts with #{hashtag}
            </h1>
          )}
          {!hashtag && category && (
            <h1 className="label-large text-text-primary">
              {categoryLabel}
            </h1>
          )}
        </div>

        <div className="space-y-2">
          {feedLoading && posts.length === 0 && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-surface-subtle rounded-lg p-4 animate-pulse">
                  <div className="flex gap-3 mb-4">
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

          {feedError && (
            <ErrorState
              title={tFeedback('error.title')}
              description={tFeedback('error.description')}
              retryLabel={tFeedback('error.retry')}
              onRetry={() => refetchFeed()}
            />
          )}

          {!feedLoading && !feedError && !hasPosts && (
            <EmptyState
              icon={Newspaper}
              title={
                hashtag
                  ? `No posts with #${hashtag} yet.`
                  : category
                    ? `No posts in ${categoryLabel} yet.`
                    : tFeedback('empty.feed.title')
              }
              description={hashtag || category ? undefined : tFeedback('empty.feed.description')}
            />
          )}

          {hasPosts &&
            posts.map((post: Post, postIndex: number) => {
              const profileData = getProfileData(post);
              return (
                <div key={post.id} id={`feed-post-${post.id}`} className="mb-2">
                  <FeedCardWithReply
                    postId={post.id}
                    profileImage={profileData.avatar}
                    profileName={profileData.name}
                    {...(post.authorType?.toUpperCase() === 'USER' ? { authorUserId: post.authorId } : {})}
                    authorEntityId={post.authorId}
                    authorEntityType={post.authorType}
                    profileTier={profileData.tier}
                    category={profileData.type}
                    aiCategory={post.categories?.[0]}
                    postDate={formatDateProximity(post.createdAt)}
                    createdAt={post.createdAt}
                    visibility={post.visibility as 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE'}
                    content={post.text}
                    mentionMap={buildMentionMap(post.mentions ?? [])}
                    images={
                      post.attachments
                        ?.filter(
                          (a) =>
                            a.mimeType?.startsWith('image/') ||
                            String(a.type ?? '').toUpperCase() === 'IMAGE'
                        )
                        .map((a) => a.url || '')
                        .filter(Boolean) || []
                    }
                    videos={
                      post.attachments
                        ?.filter(
                          (a) =>
                            a.mimeType?.startsWith('video/') ||
                            String(a.type ?? '').toUpperCase() === 'VIDEO'
                        )
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
                    onDelete={removePost}
                    joinButton={false}
                    isLiked={post.userEngagement.hasLiked}
                    isSaved={post.userEngagement.hasSaved}
                    isShared={post.userEngagement.hasShared}
                    onOpenMedia={(_postId, mediaIndex) => setModalState({ postIndex, mediaIndex })}
                  />
                </div>
              );
            })}

          {feedLoadingMore && (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-text-brand border-t-transparent" />
            </div>
          )}
        </div>
      </div>

      {modalPost && modalProfileData && (
        <PostMediaModal
          postId={modalPost.id}
          profileImage={modalProfileData.avatar}
          profileName={modalProfileData.name}
          profileTier={modalProfileData.tier}
          authorUserId={modalPost.authorType?.toUpperCase() === 'USER' ? modalPost.authorId : undefined}
          authorEntityId={modalPost.authorId}
          authorEntityType={modalPost.authorType}
          category={modalProfileData.type}
          postDate={formatDateProximity(modalPost.createdAt)}
          visibility={modalPost.visibility as 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE'}
          content={modalPost.text}
          mentionMap={modalPost.mentions?.length ? Object.fromEntries(modalPost.mentions.map(m => [m.handle, m.entityId])) : undefined}
          allMedia={getPostMedia(modalPost)}
          initialMediaIndex={modalState!.mediaIndex}
          isLiked={modalPost.userEngagement.hasLiked}
          isSaved={modalPost.userEngagement.hasSaved}
          likeCount={modalPost.engagementCounts.likes}
          commentCount={modalPost.engagementCounts.comments}
          shareCount={modalPost.engagementCounts.shares}
          onLike={(liked) => handleLike(modalPost.id, liked)}
          onSave={(saved) => handleSave(modalPost.id, saved)}
          onShare={() => handleShare(modalPost.id)}
          onSendComment={(text, parentId, mentions) => handleSendComment(modalPost.id, text, parentId, mentions)}
          onClose={() => setModalState(null)}
          onNavigatePost={handleNavigatePost}
        />
      )}
    </div>
  );
}
