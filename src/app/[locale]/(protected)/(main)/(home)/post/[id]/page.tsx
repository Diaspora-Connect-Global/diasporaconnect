'use client';

import { useQuery, useMutation } from '@apollo/client/react';
import { formatDateProximity } from '@/macros/time';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { GET_POST, ADD_ENGAGEMENT, REMOVE_ENGAGEMENT, CREATE_COMMENT, GetPostData, AddEngagementData, RemoveEngagementData, CreateCommentData } from '@/services/gql/postsFeed';
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
import { buildMentionMap } from '@/components/custom/richTextRenderer';

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
  const [removeEngagement] = useMutation<RemoveEngagementData>(REMOVE_ENGAGEMENT);
  const [createComment] = useMutation<CreateCommentData>(CREATE_COMMENT);

  const handleLike = async (liked: boolean) => {
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

  const handleSendComment = async (content: string, parentId?: string, mentions?: import('@/components/custom/richTextRenderer').MentionInputItem[]) => {
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

  if (error || (!loading && !data?.post)) {
    return (
      <div className="h-app-inner flex overflow-hidden">
        <div className={cn(FEED_COLUMN_POST_PAGE_CLASS, 'items-center justify-center p-4')}>
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-alt flex items-center justify-center">
              <Loader2 className="w-0 h-0" />
              <svg className="w-8 h-8 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-text-primary mb-2">This post has been deleted</h1>
            <p className="text-text-secondary text-sm mb-6">The post you&apos;re looking for no longer exists.</p>
            <button
              onClick={() => router.push('/')}
              className="px-5 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors label-medium"
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
    type: 'User' | 'Organization' | 'Community' | 'Association';
  };
  const orgProfile = normalizedPostResolved.authorProfile?.organizationProfile;
  if (normalizedPostResolved.authorType === 'COMMUNITY' && orgProfile) {
    profileData = {
      name: orgProfile.name?.trim() || 'Community',
      avatar: orgProfile.logo?.trim() || '/GLOBE.png',
      tier: undefined,
      type: 'Community',
    };
  } else if (normalizedPostResolved.authorType === 'ASSOCIATION' && orgProfile) {
    profileData = {
      name: orgProfile.name?.trim() || 'Association',
      avatar: orgProfile.logo?.trim() || '/ADANSI.PNG',
      tier: undefined,
      type: 'Association',
    };
  } else if (normalizedPostResolved.authorType === 'ORG' && orgProfile) {
    profileData = {
      name: orgProfile.name?.trim() || 'Organization',
      avatar: orgProfile.logo?.trim() || '/default-avatar.png',
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
          authorEntityId={normalizedPostResolved.authorId}
          authorEntityType={normalizedPostResolved.authorType}
          profileTier={profileData.tier}
          category={profileData.type}
          postDate={formatDateProximity(normalizedPostResolved.createdAt)}
          createdAt={normalizedPostResolved.createdAt}
          onDelete={() => router.push('/')}
          visibility={normalizedPostResolved.visibility as 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE'}
          content={normalizedPostResolved.text}
          mentionMap={buildMentionMap(normalizedPostResolved.mentions ?? [])}
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
          onLike={(liked) => handleLike(liked)}
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
