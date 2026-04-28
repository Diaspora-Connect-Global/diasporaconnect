'use client';

import CommunityCardVariant2 from '@/components/cards/community/CommunityCardVariant2';
import { formatDateProximity } from '@/macros/time';
import FeedCardWithReply from '@/components/cards/FeedCardWithReply';
import PostMediaModal, { type ModalMediaItem } from '@/components/cards/PostMediaModal';
import { PeopleYouMayKnow } from '@/components/home/PeopleYouMayKnow';
import { Link } from '@/i18n/navigation';
import { DISCOVER_COMMUNITIES, REQUEST_JOIN_COMMUNITY, LIST_MY_JOINED_COMMUNITIES } from '@/services/gql/community';
import {
  ADD_ENGAGEMENT,
  REMOVE_ENGAGEMENT,
  CREATE_COMMENT,
  AddEngagementData,
  RemoveEngagementData,
  CreateCommentData
} from '@/services/gql/postsFeed';
import type { FeedViewMode, Post as ApiPost } from '@/services/gql/types/postsFeed';
import { useFeed } from '@/hooks/useFeed';
import { useQuery, useMutation } from '@apollo/client/react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ButtonType3 } from '@/components/custom/button';
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import PrivacyPolicyModal from '@/components/custom/PrivacyPolicyModal';
import { resolveUserTier } from '@/lib/userTier';
import { FEED_COLUMN_CLASS } from '@/lib/feedColumnLayout';

// Type definitions for better type safety
interface DiscoverCommunitiesData {
  discoverCommunities: {
    communities: Array<{
      id: string;
      name: string;
      description?: string;
      visibility: string;
      avatarUrl?: string;
      memberCount?: number;
      membershipStatus?: string;
      communityType?: {
        name: string;
        isEmbassy: boolean;
      };
    }>;
    total: number;
  };
}

interface UserProfile {
  name: string;
  avatar: string | null;
  isVip: boolean;
  verificationTier: string;
}

interface OrganizationProfile {
  name: string;
  logo: string | null;
  isVerified: boolean;
}

interface AuthorProfile {
  userProfile: UserProfile | null;
  organizationProfile: OrganizationProfile | null;
}

interface Post {
  id: string;
  text: string;
  authorId: string;
  authorType: string;
  authorProfile: AuthorProfile;
  createdAt: string;
  attachments?: {
    id: string;
    objectKey: string;
    url?: string;
    type: string;
    mimeType: string;
    size: number;
  }[];
  engagementCounts: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  userEngagement: {
    hasLiked: boolean;
    hasSaved: boolean;
    hasShared: boolean;
  };
}

export default function Home() {
  const t = useTranslations('community');
  const tCommon = useTranslations('common');
  const [viewMode, setViewMode] = useState<FeedViewMode>('you');
  const [modalState, setModalState] = useState<{ postIndex: number; mediaIndex: number } | null>(null);

  // Fetch communities
  const { data: discoverData, loading: discoverLoading, refetch: refetchCommunities } = useQuery<DiscoverCommunitiesData>(
    DISCOVER_COMMUNITIES,
    {
      variables: {
        includeRecommended: true,
        limit: 20,
        offset: 0
      }
    }
  );

  // Feed with infinite scroll
  const {
    posts,
    loading: feedLoading,
    error: feedError,
    refetch: refetchFeed,
    loadingMore: feedLoadingMore,
    feedContainerRef,
    updatePostCounts,
    removePost,
  } = useFeed({ mode: viewMode });

  useEffect(() => {
    const savedView = sessionStorage.getItem('viewFilter');
    if (savedView === 'you' || savedView === 'following') {
      setViewMode(savedView);
    }

    const handleViewFilterChange = (event: Event) => {
      const customEvent = event as CustomEvent<FeedViewMode>;
      if (customEvent.detail === 'you' || customEvent.detail === 'following') {
        setViewMode(customEvent.detail);
      }
    };

    window.addEventListener('viewFilterChange', handleViewFilterChange as EventListener);
    return () => {
      window.removeEventListener('viewFilterChange', handleViewFilterChange as EventListener);
    };
  }, []);

  // Mutations
  const [addEngagement] = useMutation<AddEngagementData>(ADD_ENGAGEMENT);
  const [removeEngagement] = useMutation<RemoveEngagementData>(REMOVE_ENGAGEMENT);
  const [createComment] = useMutation<CreateCommentData>(CREATE_COMMENT);
  const [requestJoinCommunity, { loading: joinLoading }] = useMutation<{requestMembership: {status: string, message: string}}>(REQUEST_JOIN_COMMUNITY, {
    refetchQueries: [{ query: LIST_MY_JOINED_COMMUNITIES }],
    awaitRefetchQueries: false,
  });
  const [joiningCommunities, setJoiningCommunities] = useState<Set<string>>(new Set());
  const [joinedCommunities, setJoinedCommunities] = useState<Set<string>>(new Set());
  const [joinModal, setJoinModal] = useState<{ open: boolean; id: string; name: string }>({
    open: false,
    id: '',
    name: '',
  });

  // Handle join community
  const handleJoinCommunity = async (communityId: string) => {
    try {
      const { data } = await requestJoinCommunity({
        variables: { communityId }
      });

      if (data?.requestMembership?.status === 'ACTIVE') {
        toast.success(data.requestMembership.message);
        setJoinedCommunities(prev => new Set(prev).add(communityId));
        // Refetch in background
        setTimeout(() => refetchCommunities(), 100);
      } else {
        toast.error('Failed to join community');
      }
    } catch (err) {
      console.error('Failed to join community:', err);
      toast.error('Failed to join community');
    }
  };

  const handleJoinClick = (communityId: string, communityName: string) => {
    setJoinModal({ open: true, id: communityId, name: communityName });
  };

  const handleJoinConfirm = async () => {
    if (!joinModal.id) return;
    await handleJoinCommunity(joinModal.id);
    setJoinModal({ open: false, id: '', name: '' });
  };

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

  const handleSave = async (postId: string) => {
    updatePostCounts(postId, { saves: 1 });
    try {
      await addEngagement({ variables: { input: { postId, engagementType: 'SAVE' } } });
    } catch (err) {
      updatePostCounts(postId, { saves: -1 });
      console.error('Failed to save post:', err);
      toast.error('Failed to save post');
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

  // Handle new comment (or reply when parentId is set)
  const handleSendComment = async (postId: string, content: string, parentId?: string) => {
    if (!content.trim()) return;

    updatePostCounts(postId, { comments: 1 });
    try {
      await createComment({
        variables: {
          input: {
            postId,
            text: content,
            idempotencyKey: crypto.randomUUID(),
            ...(parentId ? { parentId } : {}),
          }
        }
      });

      toast.success('Comment posted!');
    } catch (err) {
      updatePostCounts(postId, { comments: -1 });
      console.error('Failed to post comment:', err);
      toast.error('Failed to post comment');
      throw err;
    }
  };

  // --- Horizontal Scroll with Smart Buttons ---
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const SCROLL_STEP = 300;

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkScroll = () => {
      const atLeft = el.scrollLeft <= 2;
      const atRight = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
      setCanScrollLeft(!atLeft);
      setCanScrollRight(!atRight);
    };

    checkScroll();
    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [discoverData]);

  const communities = discoverData?.discoverCommunities?.communities || [];
  const hasCommunities = communities.length > 0;

  const hasPosts = posts.length > 0;

  // Helper function to get profile data based on author type
  // Updated to handle uppercase author types from API
  const getProfileData = (post: ApiPost) => {
    // Handle organization posts (authorType === 'ORG')
    if (post.authorType === 'ORG' && post.authorProfile?.organizationProfile) {
      return {
        name: post.authorProfile.organizationProfile.name,
        avatar: post.authorProfile.organizationProfile.logo || '/default-avatar.png',
        tier: undefined,
        isVerified: post.authorProfile.organizationProfile.isVerified,
        isVip: false,
        type: 'Organization' as const
      };
    } 
    // Handle user posts (authorType === 'USER')
    else if (post.authorType === 'USER' && post.authorProfile?.userProfile) {
      return {
        name: post.authorProfile.userProfile.name,
        avatar: post.authorProfile.userProfile.avatar || '/PROFILE.png',
        tier: resolveUserTier({
          tier: (post.authorProfile.userProfile as { tier?: string }).tier,
          verificationTier: post.authorProfile.userProfile.verificationTier,
        }),
        isVerified: post.authorProfile.userProfile.verificationTier !== 'unverified' && 
                    post.authorProfile.userProfile.verificationTier !== 'NONE',
        isVip: post.authorProfile.userProfile.isVip,
        type: 'User' as const
      };
    }
    
    // Fallback for unknown or missing data
    return {
      name: 'Unknown User',
      avatar: '/PROFILE.png',
      tier: undefined,
      isVerified: false,
      isVip: false,
      type: 'User' as const
    };
  };


  const getPostMedia = (post: ApiPost): ModalMediaItem[] => [
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
      <PrivacyPolicyModal />
      {/* Main Feed - Independent Scroll */}
      <div
        ref={feedContainerRef}
        className={FEED_COLUMN_CLASS}
      >
        {/* Discover Section */}
        <div className="flex items-center justify-between mb-4 shrink-0 gap-2">
          <h2 className="text-[clamp(0.65rem,2.5vw,0.875rem)] font-medium min-w-0 truncate">{t('discover')}</h2>
          <Link href="/community" prefetch={false} className="flex-shrink-0">
            <p className="text-[clamp(0.65rem,2.5vw,0.875rem)] font-medium text-text-brand whitespace-nowrap">{t('seeall')}</p>
          </Link>
        </div>

        {/* Communities Carousel with Smart Arrows */}
        <div className="relative mb-6">
          {/* Loading State */}
          {discoverLoading && (
            <div className="flex gap-2 overflow-hidden pb-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-none w-[280px]">
                  <div className="h-32 bg-surface-subtle rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!discoverLoading && !hasCommunities && (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <p className="body-medium text-text-secondary mb-2">
                {t('noCommunitiesFound')}
              </p>
            </div>
          )}

          {/* Communities List */}
          {!discoverLoading && hasCommunities && (
            <>
              {/* Left Arrow */}
              {canScrollLeft && (
                <ButtonType3
                  onClick={scrollLeft}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10
                             flex h-10 w-10 items-center justify-center
                             rounded-full bg-surface-default/80 shadow-md
                             transition-colors hover:bg-surface-subtle border-0 min-w-0"
                  aria-label={tCommon('scrollLeft')}
                >
                  <ChevronLeftIcon className="h-6 w-6 text-primary" />
                </ButtonType3>
              )}

              {/* Right Arrow */}
              {canScrollRight && (
                <ButtonType3
                  onClick={scrollRight}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10
                             flex h-10 w-10 items-center justify-center
                             rounded-full bg-surface-default/80 shadow-md
                             transition-colors hover:bg-surface-subtle border-0 min-w-0"
                  aria-label={tCommon('scrollRight')}
                >
                  <ChevronRightIcon className="h-6 w-6 text-primary" />
                </ButtonType3>
              )}

              {/* Scrollable Container */}
              <div
                ref={scrollRef}
                className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 shrink-0
                           snap-x snap-mandatory"
                style={{ scrollBehavior: 'smooth' }}
              >
                {communities.map((community) => (
                  <div key={community.id} className="flex-none snap-start">
                    <CommunityCardVariant2
                      icon={community.avatarUrl}
                      title={community.name}
                      members={community?.memberCount || 0}
                      onButtonClick={() => handleJoinClick(community.id, community.name)}
                      buttonText={
                        community.membershipStatus === 'MEMBER' || joinedCommunities.has(community.id)
                          ? 'Joined'
                          : t('joincommunity')
                      }
                      isDisabled={community.membershipStatus === 'MEMBER' || joinedCommunities.has(community.id)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Feed Posts - Takes remaining space */}
        <div className="space-y-2">
          {/* Feed Loading State — only on initial load */}
          {feedLoading && posts.length === 0 && (
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

          {/* Feed Error State */}
          {feedError && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="body-medium text-text-secondary mb-4">
                Failed to load feed. Please try again.
              </p>
              <ButtonType3
                onClick={() => refetchFeed()}
                className="px-4 py-2 bg-primary rounded-lg"
              >
                Retry
              </ButtonType3>
            </div>
          )}

          {/* Feed Empty State */}
          {!feedLoading && !feedError && !hasPosts && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="body-medium text-text-secondary mb-2">
                {t('join')}
              </p>
            </div>
          )}

          {/* Feed Posts */}
          {hasPosts && posts.map((post, postIndex) => {
            const profileData = getProfileData(post);
            return (
              <div key={post.id} id={`feed-post-${post.id}`} className="mb-2">
                <FeedCardWithReply
                  postId={post.id}
                  profileImage={profileData.avatar}
                  profileName={profileData.name}
                    authorUserId={post.authorType?.toUpperCase() === 'USER' ? post.authorId : undefined}
                    profileTier={profileData.tier}
                  category={profileData.type}
                  postDate={formatDateProximity(post.createdAt)}
                  createdAt={post.createdAt}
                  visibility={post.visibility as 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE'}
                  content={post.text}
                  images={post.attachments
                    ?.filter(
                      (a) =>
                        a.mimeType?.startsWith('image/') ||
                        String(a.type ?? '').toUpperCase() === 'IMAGE'
                    )
                    .map((a) => a.url || '')
                    .filter(Boolean) || []}
                  videos={post.attachments
                    ?.filter(
                      (a) =>
                        a.mimeType?.startsWith('video/') ||
                        String(a.type ?? '').toUpperCase() === 'VIDEO'
                    )
                    .map((a) => a.url || '')
                    .filter(Boolean) || []}
                  likes={post.engagementCounts.likes}
                  comments={post.engagementCounts.comments}
                  shares={post.engagementCounts.shares}
                  onLike={(liked) => handleLike(post.id, liked)}
                  onComment={() => console.log('Open comment input for', post.id)}
                  onShare={() => handleShare(post.id)}
                  onSave={() => handleSave(post.id)}
                  onSendComment={(content, parentId) => handleSendComment(post.id, content, parentId)}
                  onDelete={removePost}
                  joinButton={false}
                  isLiked={post.userEngagement.hasLiked}
                  isSaved={post.userEngagement.hasSaved}
                  isShared={post.userEngagement.hasShared}
                  onOpenMedia={(mediaIndex) => setModalState({ postIndex, mediaIndex })}
                />
              </div>
            );
          })}

          {/* Load more indicator */}
          {feedLoadingMore && (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-text-brand border-t-transparent" />
            </div>
          )}
        </div>
      </div>

      {/* Sidebar - Independent Scroll */}
      <div className="hidden lg:block min-w-0 overflow-y-auto py-4">
        <PeopleYouMayKnow />
      </div>

      <ConfirmationModal
        open={joinModal.open}
        onCancel={() => setJoinModal({ open: false, id: '', name: '' })}
        onConfirm={handleJoinConfirm}
        title="Join community?"
        description={joinModal.name ? `You are about to join ${joinModal.name}.` : 'You are about to join this community.'}
        confirmText={t('joincommunity')}
        isLoading={joinLoading}
      />

      {modalPost && modalProfileData && (
        <PostMediaModal
          postId={modalPost.id}
          profileImage={modalProfileData.avatar}
          profileName={modalProfileData.name}
          profileTier={modalProfileData.tier}
          authorUserId={modalPost.authorType?.toUpperCase() === 'USER' ? modalPost.authorId : undefined}
          createdAt={modalPost.createdAt}
          category={modalProfileData.type}
          postDate={formatDateProximity(modalPost.createdAt)}
          visibility={modalPost.visibility as 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE'}
          content={modalPost.text}
          allMedia={getPostMedia(modalPost)}
          initialMediaIndex={modalState!.mediaIndex}
          isLiked={modalPost.userEngagement.hasLiked}
          isSaved={modalPost.userEngagement.hasSaved}
          likeCount={modalPost.engagementCounts.likes}
          commentCount={modalPost.engagementCounts.comments}
          shareCount={modalPost.engagementCounts.shares}
          onLike={(liked) => handleLike(modalPost.id, liked)}
          onSave={() => handleSave(modalPost.id)}
          onShare={() => handleShare(modalPost.id)}
          onSendComment={(text, parentId) => handleSendComment(modalPost.id, text, parentId)}
          onClose={() => setModalState(null)}
          onNavigatePost={handleNavigatePost}
          onDelete={removePost}
        />
      )}
    </div>
  );
}