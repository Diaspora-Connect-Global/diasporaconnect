'use client';

import { useQuery, useMutation } from '@apollo/client/react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { GET_POST, ADD_ENGAGEMENT, CREATE_COMMENT, GetPostData, AddEngagementData, CreateCommentData } from '@/services/gql/postsFeed';
import type { FeedPostFragment, Post } from '@/services/gql/types/postsFeed';
import { GET_USER_PROFILE } from '@/services/gql/profile';
import type { GetProfileResponse } from '@/services/gql/types/profile';
import { normalizeFeedPost } from '@/lib/normalizeFeedPost';
import FeedCardWithReply from '@/components/cards/FeedCardWithReply';
import { PeopleYouMayKnow } from '@/components/home/PeopleYouMayKnow';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { resolveUserTier } from '@/lib/userTier';
import { FEED_COLUMN_POST_PAGE_CLASS } from '@/lib/feedColumnLayout';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/store/useUserStore';
import type { Profile } from '@/services/gql/types/profile';

function formatFullNameFromProfile(p: Profile | null): string {
  if (!p) return '';
  return [p.firstName, p.middleName, p.lastName]
    .map((s) => (s ? String(s).trim() : ''))
    .filter(Boolean)
    .join(' ')
    .trim();
}

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = params.id as string;
  const focusCommentId = searchParams.get('commentId');
  const currentUser = useUserStore((s) => s.user);

  const { data, loading, error } = useQuery<GetPostData>(GET_POST, {
    variables: { id: postId },
    skip: !postId,
    errorPolicy: 'ignore',
  });

  const post = data?.post;
  const normalizedPost = post ? normalizeFeedPost(post as FeedPostFragment) : null;
  const nameFromPostPayload =
    normalizedPost?.authorType === 'ORG' && normalizedPost.authorProfile?.organizationProfile
      ? normalizedPost.authorProfile.organizationProfile.name?.trim() ?? ''
      : (normalizedPost?.authorProfile?.userProfile?.name?.trim() ?? '');

  const authorId = normalizedPost?.authorId;
  const isAuthorCurrentUser =
    Boolean(authorId && currentUser?.userId && authorId === currentUser.userId);
  /** When the post is yours (e.g. your reply), session profile has the display name the API may omit */
  const nameFromCurrentUser = isAuthorCurrentUser ? formatFullNameFromProfile(currentUser) : '';

  const needsAuthorProfileFetch =
    normalizedPost != null &&
    normalizedPost.authorType === 'USER' &&
    Boolean(normalizedPost.authorId) &&
    (!nameFromPostPayload || nameFromPostPayload === 'Unknown') &&
    !nameFromCurrentUser;

  const { data: authorProfileData, loading: authorProfileLoading } = useQuery<GetProfileResponse>(
    GET_USER_PROFILE,
    {
      variables: { userId: normalizedPost?.authorId ?? '' },
      skip: !needsAuthorProfileFetch,
      fetchPolicy: 'cache-first',
    }
  );

  const [addEngagement] = useMutation<AddEngagementData>(ADD_ENGAGEMENT);
  const [createComment] = useMutation<CreateCommentData>(CREATE_COMMENT);

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
      await addEngagement({
        variables: { input: { postId, engagementType: 'SHARE' } },
      });
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
            idempotencyKey: crypto.randomUUID(),
            ...(parentId ? { parentId } : {}),
          },
        },
      });
    } catch (err) {
      toast.error('Failed to add comment');
      throw err;
    }
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
      <div className="h-app-inner flex overflow-hidden">
        <div className={cn(FEED_COLUMN_POST_PAGE_CLASS, 'items-center justify-center')}>
          <Loader2 className="w-8 h-8 animate-spin text-text-brand" />
        </div>
        <div className="hidden lg:block lg:flex-1 lg:min-w-0 overflow-y-auto py-4">
          <PeopleYouMayKnow />
        </div>
      </div>
    );
  }

  if (error || !data?.post) {
    return (
      <div className="h-app-inner flex overflow-hidden">
        <div className={cn(FEED_COLUMN_POST_PAGE_CLASS, 'items-center justify-center p-4')}>
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
        <div className="hidden lg:block lg:flex-1 lg:min-w-0 overflow-y-auto py-4">
          <PeopleYouMayKnow />
        </div>
      </div>
    );
  }

  /** Same pipeline as feed cards — fills author from `author` when `authorProfile` is sparse */
  const normalizedPostResolved: Post = normalizedPost as Post;

  const authorProfile = authorProfileData?.getProfile?.success
    ? authorProfileData.getProfile.profile
    : undefined;
  const resolvedFullName = authorProfile
    ? [authorProfile.firstName, authorProfile.middleName, authorProfile.lastName]
        .map((s) => (s ? String(s).trim() : ''))
        .filter(Boolean)
        .join(' ')
        .trim()
    : '';
  const bestResolvedName = nameFromCurrentUser || resolvedFullName;

  let profileData: {
    name: string;
    avatar: string;
    tier: ReturnType<typeof resolveUserTier> | undefined;
    type: 'User' | 'Organization';
  };
  if (normalizedPostResolved.authorType === 'ORG' && normalizedPostResolved.authorProfile?.organizationProfile) {
    const org = normalizedPostResolved.authorProfile.organizationProfile;
    profileData = {
      name: org.name?.trim() || 'Organization',
      avatar: org.logo?.trim() || '/default-avatar.png',
      tier: undefined,
      type: 'Organization',
    };
  } else if (normalizedPostResolved.authorProfile?.userProfile) {
    const user = normalizedPostResolved.authorProfile.userProfile;
    const fromPost = user.name?.trim() ?? '';
    const nameFromPostOrResolved =
      bestResolvedName ||
      (fromPost && fromPost !== 'Unknown' ? fromPost : '') ||
      (authorProfileLoading && needsAuthorProfileFetch ? 'Loading...' : '');
    profileData = {
      name: nameFromPostOrResolved || 'Member',
      avatar: (isAuthorCurrentUser && currentUser?.avatarUrl?.trim()) ||
        authorProfile?.avatarUrl?.trim() ||
        user.avatar?.trim() ||
        '/PROFILE.png',
      tier: resolveUserTier({
        tier: (user as { tier?: string }).tier,
        verificationTier: user.verificationTier,
        trustScore:
          authorProfile?.trustScore ??
          (isAuthorCurrentUser ? currentUser?.trustScore : null) ??
          null,
      }),
      type: 'User',
    };
  } else {
    const nameFallback =
      bestResolvedName ||
      (authorProfileLoading && needsAuthorProfileFetch ? 'Loading...' : '') ||
      'Member';
    profileData = {
      name: nameFallback,
      avatar:
        (isAuthorCurrentUser && currentUser?.avatarUrl?.trim()) ||
        authorProfile?.avatarUrl?.trim() ||
        '/PROFILE.png',
      tier: resolveUserTier({
        trustScore:
          authorProfile?.trustScore ??
          (isAuthorCurrentUser ? currentUser?.trustScore : null) ??
          null,
      }),
      type: 'User',
    };
  }

  return (
    <div className="h-app-inner flex overflow-hidden">
      {/* Fixed `40vw` on lg+ so width does not track the right rail (`FEED_COLUMN_POST_PAGE_CLASS`) */}
      <div className={FEED_COLUMN_POST_PAGE_CLASS}>
        <div className="w-full min-w-0 max-w-full space-y-2">
          <div className="mb-2 w-full min-w-0">
            <FeedCardWithReply
          postId={normalizedPostResolved.id}
          profileImage={profileData.avatar}
          profileName={profileData.name}
          {...(normalizedPostResolved.authorType === 'USER' ? { authorUserId: normalizedPostResolved.authorId } : {})}
          profileTier={profileData.tier}
          category={profileData.type}
          postDate={formatPostDate(normalizedPostResolved.createdAt)}
          content={normalizedPostResolved.text}
          images={
            normalizedPostResolved.attachments
              ?.filter(
                (a) =>
                  a.mimeType?.startsWith('image/') || String(a.type ?? '').toUpperCase() === 'IMAGE'
              )
              .map((a) => a.url || '')
              .filter(Boolean) || []
          }
          videos={
            normalizedPostResolved.attachments
              ?.filter(
                (a) =>
                  a.mimeType?.startsWith('video/') || String(a.type ?? '').toUpperCase() === 'VIDEO'
              )
              .map((a) => a.url || '')
              .filter(Boolean) || []
          }
          likes={normalizedPostResolved.engagementCounts?.likes ?? 0}
          comments={normalizedPostResolved.engagementCounts?.comments ?? 0}
          shares={normalizedPostResolved.engagementCounts?.shares ?? 0}
          onLike={handleLike}
          onComment={() => {}}
          onShare={handleShare}
          onSave={handleSave}
          onSendComment={handleSendComment}
          joinButton={false}
          isLiked={normalizedPostResolved.userEngagement?.hasLiked || false}
          isSaved={normalizedPostResolved.userEngagement?.hasSaved || false}
          isShared={normalizedPostResolved.userEngagement?.hasShared || false}
          initialFocusCommentId={focusCommentId ?? undefined}
            />
          </div>
        </div>
      </div>
      {/* Takes remaining width so the post column stays a fixed `40vw` */}
      <div className="hidden lg:block lg:flex-1 lg:min-w-0 overflow-y-auto py-4">
        <PeopleYouMayKnow />
      </div>
    </div>
  );
}
