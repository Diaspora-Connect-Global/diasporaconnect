'use client';

import { useQuery, useMutation } from '@apollo/client/react';
import { useParams, useRouter } from 'next/navigation';
import { GET_POST, ADD_ENGAGEMENT, CREATE_COMMENT, SHARE_POST, GetPostData, AddEngagementData, CreateCommentData, SharePostData } from '@/services/gql/postsFeed';
import FeedCardWithReply from '@/components/cards/FeedCardWithReply';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const { data, loading, error } = useQuery<GetPostData>(GET_POST, {
    variables: { id: postId },
    skip: !postId,
  });

  const [addEngagement] = useMutation<AddEngagementData>(ADD_ENGAGEMENT);
  const [createComment] = useMutation<CreateCommentData>(CREATE_COMMENT);
  const [sharePost] = useMutation<SharePostData>(SHARE_POST);

  const handleLike = async () => {
    try {
      await addEngagement({
        variables: { input: { postId, engagementType: 'LIKE' } },
      });
    } catch {
      toast.error('Failed to like post');
    }
  };

  const handleSave = async () => {
    try {
      await addEngagement({
        variables: { input: { postId, engagementType: 'SAVE' } },
      });
    } catch {
      toast.error('Failed to save post');
    }
  };

  const handleShare = async () => {
    try {
      const { data } = await sharePost({ variables: { postId } });
      if (data?.sharePost.shareLink) {
        await navigator.clipboard.writeText(data.sharePost.shareLink);
        toast.success('Link copied to clipboard');
      }
    } catch {
      toast.error('Failed to share post');
    }
  };

  const handleSendComment = async (content: string, parentId?: string) => {
    try {
      await createComment({
        variables: {
          input: {
            postId,
            text: content,
            ...(parentId ? { parentId } : {}),
          },
        },
      });
    } catch (err) {
      toast.error('Failed to add comment');
      throw err;
    }
  };

  const getProfileData = () => {
    const post = data?.post;
    if (!post) return { name: 'Unknown', avatar: '/PROFILE.png', type: 'User' as const };

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

  const formatPostDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: new Date(dateString).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-subtle flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-text-brand" />
      </div>
    );
  }

  if (error || !data?.post) {
    return (
      <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Post not found</h1>
          <p className="text-text-secondary mb-4">The post you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-surface-brand text-white rounded-md hover:bg-surface-brand-dark transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const post = data.post;
  const profileData = getProfileData();

  return (
    <div className="min-h-screen bg-surface-subtle">
      <div className="max-w-3xl mx-auto p-4">
        <FeedCardWithReply
          postId={post.id}
          profileImage={profileData.avatar}
          profileName={profileData.name}
          category={profileData.type}
          postDate={formatPostDate(post.createdAt)}
          content={post.text}
          images={
            post.attachments
              ?.filter((a) => a.mimeType?.startsWith('image/'))
              .map((a) => a.url || '')
              .filter(Boolean) || []
          }
          likes={post.engagementCounts.likes}
          comments={post.engagementCounts.comments}
          shares={post.engagementCounts.shares}
          onLike={handleLike}
          onComment={() => {}}
          onShare={handleShare}
          onSave={handleSave}
          onSendComment={handleSendComment}
          joinButton={false}
          isLiked={post.userEngagement?.hasLiked || false}
          isSaved={post.userEngagement?.hasSaved || false}
          isShared={post.userEngagement?.hasShared || false}
        />
      </div>
    </div>
  );
}
