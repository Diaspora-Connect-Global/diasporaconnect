'use client';

import FeedCardWithReply from '@/components/cards/FeedCardWithReply';
import { Link } from '@/i18n/navigation';
import { ADD_ENGAGEMENT, CREATE_COMMENT, AddEngagementData, CreateCommentData } from '@/services/gql/postsFeed';
import type { Post } from '@/services/gql/types/postsFeed';
import { useFeed } from '@/hooks/useFeed';
import { useMutation } from '@apollo/client/react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ButtonType3 } from '@/components/custom/button';
import { ChevronLeft } from 'lucide-react';
import { resolveUserTier } from '@/lib/userTier';

function getProfileData(post: Post) {
  if (post.authorType === 'ORG' && post.authorProfile?.organizationProfile) {
    return {
      name: post.authorProfile.organizationProfile.name,
      avatar: post.authorProfile.organizationProfile.logo || '/default-avatar.png',
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

function formatPostDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: new Date(dateString).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return 'Unknown date';
  }
}

export default function FeedPage() {
  const t = useTranslations('community');
  const searchParams = useSearchParams();
  const hashtag = searchParams.get('hashtag') ?? null;

  const {
    posts,
    loading: feedLoading,
    error: feedError,
    refetch: refetchFeed,
    loadingMore: feedLoadingMore,
    feedContainerRef,
  } = useFeed({ hashtag });

  const [addEngagement] = useMutation<AddEngagementData>(ADD_ENGAGEMENT);
  const [createComment] = useMutation<CreateCommentData>(CREATE_COMMENT);

  const handleLike = async (postId: string) => {
    try {
      await addEngagement({ variables: { input: { postId, engagementType: 'LIKE' } } });
    } catch (err) {
      console.error('Failed to like post:', err);
      toast.error('Failed to like post');
    }
  };

  const handleSave = async (postId: string) => {
    try {
      await addEngagement({ variables: { input: { postId, engagementType: 'SAVE' } } });
    } catch (err) {
      console.error('Failed to save post:', err);
      toast.error('Failed to save post');
    }
  };

  const handleShare = async (postId: string) => {
    try {
      await addEngagement({ variables: { input: { postId, engagementType: 'SHARE' } } });
    } catch (err) {
      console.error('Failed to share post:', err);
      toast.error('Failed to share post');
    }
  };

  const handleSendComment = async (postId: string, content: string, parentId?: string) => {
    if (!content.trim()) return;
    try {
      await createComment({
        variables: { input: { postId, text: content, ...(parentId ? { parentId } : {}) } },
      });
      toast.success('Comment posted!');
    } catch (err) {
      console.error('Failed to post comment:', err);
      toast.error('Failed to post comment');
      throw err;
    }
  };

  const hasPosts = posts.length > 0;

  return (
    <div className="h-app-inner flex overflow-hidden">
      <div
        ref={feedContainerRef}
        className="lg:max-w-[40vw] overflow-y-auto scrollbar-hide mx-4 py-4 flex flex-col"
      >
        {/* Header: back + hashtag title */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <Link
            href="/"
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
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="body-medium text-text-secondary mb-4">Failed to load feed. Please try again.</p>
              <ButtonType3 onClick={() => refetchFeed()} className="bg-primary rounded-lg">
                Retry
              </ButtonType3>
            </div>
          )}

          {!feedLoading && !feedError && !hasPosts && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="body-medium text-text-secondary mb-2">
                {hashtag ? `No posts with #${hashtag} yet.` : t('join')}
              </p>
            </div>
          )}

          {hasPosts &&
            posts.map((post: Post) => {
              const profileData = getProfileData(post);
              return (
                <div key={post.id} className="mb-2">
                  <FeedCardWithReply
                    postId={post.id}
                    profileImage={profileData.avatar}
                    profileName={profileData.name}
                    authorUserId={post.authorType?.toUpperCase() === 'USER' ? post.authorId : undefined}
                    profileTier={profileData.tier}
                    category={profileData.type}
                    postDate={formatPostDate(post.createdAt)}
                    content={post.text}
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
                    likes={post.engagementCounts.likes}
                    comments={post.engagementCounts.comments}
                    shares={post.engagementCounts.shares}
                    onLike={() => handleLike(post.id)}
                    onComment={() => {}}
                    onShare={() => handleShare(post.id)}
                    onSave={() => handleSave(post.id)}
                    onSendComment={(content, parentId) => handleSendComment(post.id, content, parentId)}
                    joinButton={false}
                    isLiked={post.userEngagement.hasLiked}
                    isSaved={post.userEngagement.hasSaved}
                    isShared={post.userEngagement.hasShared}
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
    </div>
  );
}
