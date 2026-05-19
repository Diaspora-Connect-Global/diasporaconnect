'use client';

import CommunityCardVariant2 from '@/components/cards/community/CommunityCardVariant2';
import { formatDateProximity } from '@/macros/time';
import FeedCardWithReply from '@/components/cards/FeedCardWithReply';
import { FeedCardSkeleton } from '@/components/feed/FeedCardSkeleton';
import { Virtuoso } from 'react-virtuoso';
import PostMediaModal, { type ModalMediaItem } from '@/components/cards/PostMediaModal';
import { PeopleYouMayKnow } from '@/components/home/PeopleYouMayKnow';
import { Link } from '@/i18n/navigation';
import { REQUEST_JOIN_COMMUNITY, LIST_MY_JOINED_COMMUNITIES, GET_COMMUNITY } from '@/services/gql/community';
import { GET_ASSOCIATION } from '@/services/gql/associations';
import {
  ADD_ENGAGEMENT,
  REMOVE_ENGAGEMENT,
  CREATE_COMMENT,
  RECOMMENDED_COMMUNITIES,
  RECOMMENDED_ASSOCIATIONS,
  AddEngagementData,
  RemoveEngagementData,
  CreateCommentData
} from '@/services/gql/postsFeed';
import type {
  RecommendedCommunitiesData,
  RecommendedAssociationsData,
} from '@/services/gql/types/recommendation';
import { useApolloClient } from '@apollo/client/react';
import type { FeedViewMode, Post as ApiPost } from '@/services/gql/types/postsFeed';
import { useFeed } from '@/hooks/useFeed';
import { ImpressionTracker } from '@/components/feed/ImpressionTracker';
import { useQuery, useMutation } from '@apollo/client/react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ButtonType3 } from '@/components/custom/button';
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import PrivacyPolicyModal from '@/components/custom/PrivacyPolicyModal';
import { resolveUserTier } from '@/lib/userTier';
import { FEED_COLUMN_CLASS } from '@/lib/feedColumnLayout';
import { buildMentionMap } from '@/components/custom/richTextRenderer';

// Type definitions for better type safety.
//
// Phase 2: the home discover rails are now sourced from the
// recommendation-service via `recommendedCommunities` / `recommendedAssociations`,
// which return ranked ids only. We hydrate each id with `getCommunity` /
// `getAssociation` for the card shape below. (Mirrors the post-feed
// hydration pattern in `useFeed.hydrateRankedItems`.)
interface HydratedCommunityCard {
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
  } | null;
}

interface HydratedAssociationCard {
  id: string;
  name: string;
  description?: string;
  visibility: string;
  avatarUrl?: string;
  memberCount?: number;
  membershipStatus?: string;
  associationType?: {
    id: string;
    name: string;
  } | null;
}

interface GetCommunityQueryData {
  getCommunity: HydratedCommunityCard | null;
}

interface GetAssociationQueryData {
  getAssociation: HydratedAssociationCard | null;
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
  // Track the open media modal by postId rather than postIndex so the
  // open-media handler can be wired as a stable `useCallback`. With
  // virtualised feed rendering the underlying `posts` array is what we
  // resolve against; prev/next just step through it on click.
  const [modalState, setModalState] = useState<{ postId: string; mediaIndex: number } | null>(null);

  // ─── Discover rails (Phase 2: rec-service-backed) ──────────────────────────
  //
  // Both rails are a two-step hydration: fetch ranked ids from the
  // recommendation gateway query, then resolve each id to a full card via
  // `getCommunity` / `getAssociation`. Same pattern as the post-feed
  // hydration in `useFeed`. The previous `discoverCommunities` query is
  // replaced entirely.
  const apolloClient = useApolloClient();

  const [communities, setCommunities] = useState<HydratedCommunityCard[]>([]);
  const [associations, setAssociations] = useState<HydratedAssociationCard[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(true);
  const [associationsLoading, setAssociationsLoading] = useState(true);

  const { data: recCommunitiesData, refetch: refetchCommunitiesRanked } =
    useQuery<RecommendedCommunitiesData>(RECOMMENDED_COMMUNITIES, {
      variables: { limit: 20 },
      fetchPolicy: 'cache-and-network',
    });

  const { data: recAssociationsData, refetch: refetchAssociationsRanked } =
    useQuery<RecommendedAssociationsData>(RECOMMENDED_ASSOCIATIONS, {
      variables: { limit: 20 },
      fetchPolicy: 'cache-and-network',
    });

  // Hydrate communities by id, preserving the recommender's order.
  useEffect(() => {
    const items = recCommunitiesData?.recommendedCommunities?.items;
    if (!items) return;
    if (items.length === 0) {
      setCommunities([]);
      setDiscoverLoading(false);
      return;
    }
    let cancelled = false;
    setDiscoverLoading(true);
    void Promise.allSettled(
      items.map((it) =>
        apolloClient.query<GetCommunityQueryData>({
          query: GET_COMMUNITY,
          variables: { id: it.itemId },
          fetchPolicy: 'cache-first',
          errorPolicy: 'ignore',
        })
      )
    ).then((settled) => {
      if (cancelled) return;
      const byId = new Map<string, HydratedCommunityCard>();
      settled.forEach((res) => {
        if (res.status !== 'fulfilled') return;
        const raw = res.value.data?.getCommunity;
        if (raw?.id) byId.set(raw.id, raw);
      });
      // Preserve recommender order; drop any ids that failed to resolve.
      const ordered: HydratedCommunityCard[] = [];
      for (const it of items) {
        const card = byId.get(it.itemId);
        if (card) ordered.push(card);
      }
      setCommunities(ordered);
      setDiscoverLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [recCommunitiesData, apolloClient]);

  // Hydrate associations by id, preserving the recommender's order.
  useEffect(() => {
    const items = recAssociationsData?.recommendedAssociations?.items;
    if (!items) return;
    if (items.length === 0) {
      setAssociations([]);
      setAssociationsLoading(false);
      return;
    }
    let cancelled = false;
    setAssociationsLoading(true);
    void Promise.allSettled(
      items.map((it) =>
        apolloClient.query<GetAssociationQueryData>({
          query: GET_ASSOCIATION,
          variables: { id: it.itemId },
          fetchPolicy: 'cache-first',
          errorPolicy: 'ignore',
        })
      )
    ).then((settled) => {
      if (cancelled) return;
      const byId = new Map<string, HydratedAssociationCard>();
      settled.forEach((res) => {
        if (res.status !== 'fulfilled') return;
        const raw = res.value.data?.getAssociation;
        if (raw?.id) byId.set(raw.id, raw);
      });
      const ordered: HydratedAssociationCard[] = [];
      for (const it of items) {
        const card = byId.get(it.itemId);
        if (card) ordered.push(card);
      }
      setAssociations(ordered);
      setAssociationsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [recAssociationsData, apolloClient]);

  // Helper: re-fetch both ranked queries after a membership state change.
  const refetchCommunities = useCallback(() => {
    void refetchCommunitiesRanked();
    void refetchAssociationsRanked();
  }, [refetchCommunitiesRanked, refetchAssociationsRanked]);

  // Feed with infinite scroll
  const {
    posts,
    loading: feedLoading,
    error: feedError,
    refetch: refetchFeed,
    loadingMore: feedLoadingMore,
    feedContainerRef,
    loadMore: feedLoadMore,
    hasMore: feedHasMore,
    updatePostCounts,
    removePost,
  } = useFeed({ mode: viewMode });

  // Scroll container element captured via callback ref so Virtuoso can
  // virtualize against it instead of the window. The same node is exposed
  // through `feedContainerRef` for backwards compatibility (some legacy
  // code paths may still rely on it).
  const [feedScrollEl, setFeedScrollEl] = useState<HTMLDivElement | null>(null);
  const setFeedScrollRef = useCallback(
    (el: HTMLDivElement | null) => {
      setFeedScrollEl(el);
      if (feedContainerRef) {
        (feedContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }
    },
    [feedContainerRef],
  );

  // Virtuoso fires `endReached` near the bottom; gate the call behind the
  // same `hasMore` + already-loading checks the old scroll-listener used.
  const handleEndReached = useCallback(() => {
    if (feedHasMore && !feedLoadingMore && !feedLoading) {
      feedLoadMore();
    }
  }, [feedHasMore, feedLoadingMore, feedLoading, feedLoadMore]);

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
  // Engagement signals are recorded via the post-feed Kafka pipeline (LIKE /
  // UNLIKE / SAVE / UNSAVE / SHARE / COMMENT). VIEW + DWELL still go through
  // the direct recordInteraction gRPC path via <ImpressionTracker>, which
  // owns its own hook instance — so this page no longer needs one directly.
  const isRecommendedArm = viewMode === 'you';
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

  // Engagement signals (LIKE/UNLIKE/SAVE/UNSAVE/SHARE/COMMENT) flow to the
  // recommendation index via Kafka — post-feed-service publishes the canonical
  // event from its addEngagement / removeEngagement / createComment handlers,
  // and recommendation-service consumes it. We previously dual-fired
  // `recordInteraction` from the client too, which produced duplicate rows
  // in interaction_log. Removed.
  //
  // The direct `recordInteraction` gRPC call is still used by
  // ImpressionTracker (VIEW + DWELL) and by future CLICK_THROUGH wiring —
  // those signals don't have a post-feed source.

  // Wrapped in useCallback so the references stay stable across home-page
  // re-renders. The cards are memoised — if these handlers churned on every
  // render every visible card would re-render too, which was the main cause
  // of stutter at the `loadMore` boundary.
  const handleLike = useCallback(async (postId: string, liked: boolean) => {
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
  }, [addEngagement, removeEngagement, updatePostCounts]);

  const handleSave = useCallback(async (postId: string, saved: boolean) => {
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
  }, [addEngagement, removeEngagement, updatePostCounts]);

  const handleShare = useCallback(async (postId: string) => {
    updatePostCounts(postId, { shares: 1 });
    try {
      await addEngagement({ variables: { input: { postId, engagementType: 'SHARE' } } });
    } catch (err) {
      updatePostCounts(postId, { shares: -1 });
      console.error('Failed to share post:', err);
      toast.error('Failed to share post');
    }
  }, [addEngagement, updatePostCounts]);

  // Handle new comment (or reply when parentId is set)
  const handleSendComment = useCallback(async (postId: string, content: string, parentId?: string, mentions?: import('@/components/custom/richTextRenderer').MentionInputItem[]) => {
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
            ...(mentions?.length ? { mentions } : {}),
          }
        }
      });
      // The post.comment.created Kafka event published by the
      // CreateCommentHandler is the canonical signal — no client-side
      // dual-fire needed (removed to avoid double-counting).

      toast.success('Comment posted!');
    } catch (err) {
      updatePostCounts(postId, { comments: -1 });
      console.error('Failed to post comment:', err);
      toast.error('Failed to post comment');
      throw err;
    }
  }, [createComment, updatePostCounts]);

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
  }, [communities, associations]);

  const hasCommunities = communities.length > 0;
  const hasAssociations = associations.length > 0;

  const hasPosts = posts.length > 0;

  // Helper function to get profile data based on author type
  // Updated to handle uppercase author types from API
  const getProfileData = (post: ApiPost) => {
    const orgProfile = post.authorProfile?.organizationProfile;
    if (post.authorType === 'COMMUNITY' && orgProfile) {
      return {
        name: orgProfile.name,
        avatar: orgProfile.logo || '/GLOBE.png',
        tier: undefined,
        isVerified: orgProfile.isVerified,
        isVip: false,
        type: 'Community' as const,
      };
    }
    if (post.authorType === 'ASSOCIATION' && orgProfile) {
      return {
        name: orgProfile.name,
        avatar: orgProfile.logo || '/ADANSI.PNG',
        tier: undefined,
        isVerified: orgProfile.isVerified,
        isVip: false,
        type: 'Association' as const,
      };
    }
    // Handle organization posts (authorType === 'ORG')
    if (post.authorType === 'ORG' && orgProfile) {
      return {
        name: orgProfile.name,
        avatar: orgProfile.logo || '/default-avatar.png',
        tier: undefined,
        isVerified: orgProfile.isVerified,
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

  const getPostMentionMap = (post: ApiPost) => buildMentionMap(post.mentions ?? []);

  const handleNavigatePost = (dir: 'next' | 'prev') => {
    if (modalState === null) return;
    const currentIndex = posts.findIndex((p) => p.id === modalState.postId);
    if (currentIndex < 0) return;
    let i = dir === 'next' ? currentIndex + 1 : currentIndex - 1;
    while (i >= 0 && i < posts.length) {
      const next = posts[i];
      if (next && getPostMedia(next).length > 0) {
        setModalState({ postId: next.id, mediaIndex: 0 });
        return;
      }
      i = dir === 'next' ? i + 1 : i - 1;
    }
  };

  const modalPost = modalState !== null ? posts.find((p) => p.id === modalState.postId) ?? null : null;
  const modalProfileData = modalPost ? getProfileData(modalPost) : null;

  // Stable handlers so memoised FeedCardWithReply instances don't see a
  // fresh prop on every parent render. handleOpenMedia takes the post id
  // from the card (we changed the card prop signature to forward it).
  const handleOpenMedia = useCallback((postId: string, mediaIndex: number) => {
    setModalState({ postId, mediaIndex });
  }, []);

  return (
    <div className="h-app-inner flex overflow-hidden">
      <PrivacyPolicyModal />
      {/* Main Feed - Independent Scroll */}
      <div
        ref={setFeedScrollRef}
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

        {/* Associations you may like — Phase 2 rail.
            Same card pattern as the communities rail; data sourced from
            `recommendedAssociations` and hydrated via `getAssociation`.
            Hidden when the recommender returns no associations (no
            useless empty rail on a brand-new account). */}
        {(associationsLoading || hasAssociations) && (
          <>
            <div className="flex items-center justify-between mb-4 shrink-0 gap-2">
              <h2 className="text-[clamp(0.65rem,2.5vw,0.875rem)] font-medium min-w-0 truncate">
                {t('associationsYouMayLike') || 'Associations you may like'}
              </h2>
              <Link href="/association" prefetch={false} className="flex-shrink-0">
                <p className="text-[clamp(0.65rem,2.5vw,0.875rem)] font-medium text-text-brand whitespace-nowrap">
                  {t('seeall')}
                </p>
              </Link>
            </div>

            <div className="relative mb-6">
              {associationsLoading && (
                <div className="flex gap-2 overflow-hidden pb-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex-none w-[280px]">
                      <div className="h-32 bg-surface-subtle rounded-lg animate-pulse" />
                    </div>
                  ))}
                </div>
              )}

              {!associationsLoading && hasAssociations && (
                <div
                  className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 shrink-0
                             snap-x snap-mandatory"
                  style={{ scrollBehavior: 'smooth' }}
                >
                  {associations.map((association) => (
                    <div key={association.id} className="flex-none snap-start">
                      <CommunityCardVariant2
                        icon={association.avatarUrl}
                        title={association.name}
                        members={association?.memberCount || 0}
                        onButtonClick={() => handleJoinClick(association.id, association.name)}
                        buttonText={
                          association.membershipStatus === 'MEMBER' ||
                          joinedCommunities.has(association.id)
                            ? 'Joined'
                            : t('joincommunity')
                        }
                        isDisabled={
                          association.membershipStatus === 'MEMBER' ||
                          joinedCommunities.has(association.id)
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

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

          {/* Feed Posts — virtualised. Off-screen cards are unmounted so
              the DOM size stays bounded as the user scrolls deeper, and
              the surrounding chrome (top toggle, sidebar, modals) keeps
              its layout because we pass the existing scroll column as
              the custom scroll parent. */}
          {hasPosts && (
            <Virtuoso
              data={posts}
              customScrollParent={feedScrollEl ?? undefined}
              endReached={handleEndReached}
              increaseViewportBy={{ top: 0, bottom: 600 }}
              computeItemKey={(_, post) => post.id}
              components={{
                Footer: feedLoadingMore
                  ? () => (
                      <>
                        <FeedCardSkeleton />
                        <FeedCardSkeleton />
                      </>
                    )
                  : undefined,
              }}
              itemContent={(_postIndex, post) => {
                const profileData = getProfileData(post);
                return (
                  <ImpressionTracker
                    itemId={post.id}
                    itemType="POST"
                    source={post.__source}
                    score={post.__score}
                    surface={isRecommendedArm ? 'home_feed' : 'community_feed'}
                    className="mb-2"
                  >
                    <div id={`feed-post-${post.id}`}>
                      <FeedCardWithReply
                        postId={post.id}
                        profileImage={profileData.avatar}
                        profileName={profileData.name}
                        authorUserId={post.authorType?.toUpperCase() === 'USER' ? post.authorId : undefined}
                        authorEntityId={post.authorId}
                        authorEntityType={post.authorType}
                        profileTier={profileData.tier}
                        category={profileData.type}
                        postDate={formatDateProximity(post.createdAt)}
                        createdAt={post.createdAt}
                        visibility={post.visibility as 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE'}
                        content={post.text}
                        mentionMap={getPostMentionMap(post)}
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
                        onLike={handleLike}
                        onShare={handleShare}
                        onSave={handleSave}
                        onSendComment={handleSendComment}
                        onDelete={removePost}
                        joinButton={false}
                        isLiked={post.userEngagement.hasLiked}
                        isSaved={post.userEngagement.hasSaved}
                        isShared={post.userEngagement.hasShared}
                        onOpenMedia={handleOpenMedia}
                      />
                    </div>
                  </ImpressionTracker>
                );
              }}
            />
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
          mentionMap={getPostMentionMap(modalPost)}
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
          onDelete={removePost}
        />
      )}
    </div>
  );
}