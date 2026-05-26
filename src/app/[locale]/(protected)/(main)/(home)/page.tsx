'use client';

import CommunityCardVariant2 from '@/components/cards/community/CommunityCardVariant2';
import { formatDateProximity } from '@/macros/time';
import FeedCardWithReply from '@/components/cards/FeedCardWithReply';
import { FeedCardSkeleton } from '@/components/feed/FeedCardSkeleton';
import { Virtuoso } from 'react-virtuoso';
import PostMediaModal, { type ModalMediaItem } from '@/components/cards/PostMediaModal';
import { PeopleYouMayKnow } from '@/components/home/PeopleYouMayKnow';
import { NewPostsBanner } from '@/components/home/NewPostsBanner';
import { useUnseenFeedCount } from '@/hooks/useUnseenFeedCount';
import { Link } from '@/i18n/navigation';
import { REQUEST_JOIN_COMMUNITY, LIST_MY_JOINED_COMMUNITIES, GET_COMMUNITY } from '@/services/gql/community';
import {
  GET_ASSOCIATION,
  GET_USER_ASSOCIATIONS,
  REQUEST_JOIN_ASSOCIATION,
} from '@/services/gql/associations';
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ButtonType3 } from '@/components/custom/button';
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import PrivacyPolicyModal from '@/components/custom/PrivacyPolicyModal';
import { resolveUserTier } from '@/lib/userTier';
import { FEED_COLUMN_CLASS } from '@/lib/feedColumnLayout';
import { buildMentionMap } from '@/components/custom/richTextRenderer';
import AccessBadges from '@/components/cards/AccessBadges';
import { MembershipPaymentModal } from '@/components/memberships/MembershipPaymentModal';
import {
  toJoinPolicy,
  type AccessProfile,
  type MembershipEntity,
  type RequestMembershipResult,
  type SubscriptionPeriod,
} from '@/types/membership';

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
  joinPolicy?: string;       // 'OPEN' | 'APPROVAL' | 'INVITE_ONLY' | 'PAID' | 'REQUEST' (legacy)
  paymentType?: string;      // 'NONE' | 'ONE_TIME' | 'SUBSCRIPTION'
  priceAmount?: number;      // smallest unit (cents)
  priceCurrency?: string;    // ISO 4217 uppercase
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
  joinPolicy?: string;       // 'OPEN' | 'APPROVAL' | 'INVITE_ONLY' | 'PAID' | 'REQUEST' (legacy)
  paymentType?: string;      // 'NONE' | 'ONE_TIME' | 'SUBSCRIPTION'
  priceAmount?: number;      // smallest unit (cents)
  priceCurrency?: string;    // ISO 4217 uppercase
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

// Discriminated union the feed's Virtuoso instance iterates. Posts and the
// recommended-associations rail are virtualised side-by-side so a single
// scroll viewport drives both — `computeItemKey` and `itemContent` branch on
// `kind` to keep React happy across re-orders.
type FeedItem =
  | { kind: 'post'; post: ApiPost }
  | { kind: 'associationsRail' };

const ASSOCIATIONS_RAIL_INDEX = 3;

export default function Home() {
  const t = useTranslations('community');
  const tCommon = useTranslations('common');
  const tJoinModal = useTranslations('home.joinModal');
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

  // "X new posts available" pill — only polls while the For-You tab is
  // active and the page is visible. Click → refetch (which fires with
  // refresh=true via useFeed's refreshTick path) + scroll to top + reset.
  const {
    count: unseenCount,
    reset: resetUnseenCount,
  } = useUnseenFeedCount({ enabled: isRecommendedArm });
  const [requestJoinCommunity, { loading: joinCommunityLoading }] = useMutation<{requestMembership: {status: string, message: string}}>(REQUEST_JOIN_COMMUNITY, {
    refetchQueries: [{ query: LIST_MY_JOINED_COMMUNITIES }],
    awaitRefetchQueries: false,
  });
  const [requestJoinAssociation, { loading: joinAssociationLoading }] = useMutation<{requestMembership: {status: string, message: string}}>(REQUEST_JOIN_ASSOCIATION, {
    // GET_USER_ASSOCIATIONS drives the home sidebar's "Discover associations"
    // section (HomeSidebar.tsx). Refetching it on a successful join means
    // the joined association appears in the sidebar list immediately,
    // without a page refresh.
    refetchQueries: [{ query: GET_USER_ASSOCIATIONS }],
    awaitRefetchQueries: false,
  });
  const joinLoading = joinCommunityLoading || joinAssociationLoading;
  const [joiningCommunities, setJoiningCommunities] = useState<Set<string>>(new Set());
  const [joinedCommunities, setJoinedCommunities] = useState<Set<string>>(new Set());
  type JoinModalState =
    | { open: false }
    | {
        open: true;
        kind: 'community' | 'association';
        entity: HydratedCommunityCard | HydratedAssociationCard;
      };
  const [joinModal, setJoinModal] = useState<JoinModalState>({ open: false });

  // Handle join — branches on entity kind. The COMMUNITY mutation sends
  // `entityType: "COMMUNITY"` to the backend; using it for an association
  // id triggers `Entity not found` because the lookup runs against the
  // wrong table. Always dispatch the mutation matching the modal's kind.
  // Returns the raw response so callers (free path = handleJoinConfirm,
  // paid path = MembershipPaymentModal) can branch on requiresPayment.
  type RequestMembershipPayload = {
    id?: string;
    status?: string;
    message?: string;
    requiresPayment?: boolean;
    clientSecret?: string | null;
  };

  const callRequestMembership = async (
    kind: 'community' | 'association',
    entityId: string,
  ): Promise<RequestMembershipPayload | null> => {
    const { data } =
      kind === 'association'
        ? await requestJoinAssociation({ variables: { associationId: entityId } })
        : await requestJoinCommunity({ variables: { communityId: entityId } });
    return (data?.requestMembership as RequestMembershipPayload | undefined) ?? null;
  };

  // Free-path join — fired when the entity is NOT a paid community / association.
  const handleFreeJoin = async (
    kind: 'community' | 'association',
    entityId: string,
  ) => {
    const failMessage =
      kind === 'association' ? 'Failed to join association' : 'Failed to join community';
    try {
      const payload = await callRequestMembership(kind, entityId);
      const status = payload?.status;
      if (status === 'ACTIVE' || status === 'PENDING' || status === 'PENDING_PAYMENT') {
        toast.success(
          payload?.message ||
            (status === 'ACTIVE'
              ? 'Joined successfully'
              : 'Your request is pending approval'),
        );
        if (status === 'ACTIVE') {
          setJoinedCommunities((prev) => new Set(prev).add(entityId));
          setTimeout(() => refetchCommunities(), 100);
        }
      } else {
        toast.error(failMessage);
      }
    } catch (err) {
      console.error(`${failMessage}:`, err);
      toast.error(failMessage);
    }
  };

  const handleJoinClick = (
    kind: 'community' | 'association',
    entity: HydratedCommunityCard | HydratedAssociationCard,
  ) => {
    setJoinModal({ open: true, kind, entity });
  };

  // --- Paid-membership flow ---
  // When the entity has paymentType ONE_TIME / SUBSCRIPTION, the join
  // confirmation diverts to MembershipPaymentModal which owns the
  // request invocation AND the Stripe / Paystack rails. Mirrors the
  // pattern in association/[id]/page.tsx + community/[id]/page.tsx.
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentEntity, setPaymentEntity] = useState<MembershipEntity | null>(null);

  const isPaidEntity = (e: HydratedCommunityCard | HydratedAssociationCard) =>
    e.paymentType === 'ONE_TIME' || e.paymentType === 'SUBSCRIPTION';

  const buildPaymentEntity = (
    kind: 'community' | 'association',
    e: HydratedCommunityCard | HydratedAssociationCard,
  ): MembershipEntity => ({
    kind,
    id: e.id,
    name: e.name,
    access: {
      visibility: e.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
      joinPolicy: toJoinPolicy(e.joinPolicy),
      paymentType:
        e.paymentType === 'ONE_TIME' || e.paymentType === 'SUBSCRIPTION'
          ? (e.paymentType as 'ONE_TIME' | 'SUBSCRIPTION')
          : 'NONE',
      price:
        typeof e.priceAmount === 'number' && e.priceCurrency
          ? { amountInCents: e.priceAmount, currency: e.priceCurrency }
          : undefined,
    },
  });

  const handlePaymentModalRequest = async (args: {
    entityId: string;
    entityKind: 'community' | 'association';
    period?: SubscriptionPeriod;
  }): Promise<RequestMembershipResult> => {
    // `period` is currently unused on the home-page flow — the BE picks
    // it up via the entity itself when applicable. Kept in the signature
    // for parity with the detail-page implementation.
    void args.period;
    const payload = await callRequestMembership(args.entityKind, args.entityId);
    if (!payload) {
      throw new Error('Empty response from requestMembership');
    }
    const status =
      payload.status === 'PENDING_PAYMENT'
        ? 'PENDING_PAYMENT'
        : payload.status === 'PENDING'
          ? 'PENDING'
          : 'ACTIVE';
    return {
      membershipId: payload.id ?? args.entityId,
      status,
      requiresPayment: Boolean(payload.requiresPayment),
      ...(payload.clientSecret ? { clientSecret: payload.clientSecret } : {}),
      ...(payload.message ? { message: payload.message } : {}),
    };
  };

  const handlePaymentSuccess = (_membershipId: string) => {
    if (paymentEntity) {
      toast.success(`You are now a member of ${paymentEntity.name}`);
      setJoinedCommunities((prev) => new Set(prev).add(paymentEntity.id));
      setTimeout(() => refetchCommunities(), 100);
    }
    setPaymentModalOpen(false);
    setPaymentEntity(null);
  };

  const handlePaymentClose = () => {
    setPaymentModalOpen(false);
    setPaymentEntity(null);
  };

  const handleJoinConfirm = async () => {
    if (!joinModal.open) return;
    const { kind, entity } = joinModal;

    if (isPaidEntity(entity)) {
      // Divert to the payment modal — it'll fire the request mutation
      // itself once the user picks a payment rail.
      setPaymentEntity(buildPaymentEntity(kind, entity));
      setPaymentModalOpen(true);
      setJoinModal({ open: false });
      return;
    }

    await handleFreeJoin(kind, entity.id);
    setJoinModal({ open: false });
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
  // One ref-set per rail (communities + associations) so each rail has
  // its own scroll state. Same shape as before for the communities rail;
  // the second triplet drives the associations rail's chevron buttons.
  const SCROLL_STEP = 300;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Callback-ref pattern — the associations rail lives inside Virtuoso's
  // itemContent, so it can unmount/remount as the user scrolls vertically.
  // A plain useRef would attach the scroll listener to the first DOM node
  // and never re-attach after a remount → left chevron permanently stuck
  // on `false` because the event never fires from the new node. Using a
  // state setter as the ref re-runs the effect every time React commits a
  // new node, keeping the listener bound to whatever's mounted now.
  const [associationsScrollEl, setAssociationsScrollEl] = useState<HTMLDivElement | null>(null);
  const [assocCanScrollLeft, setAssocCanScrollLeft] = useState(false);
  const [assocCanScrollRight, setAssocCanScrollRight] = useState(true);

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
  };

  const scrollAssocLeft = () => {
    associationsScrollEl?.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' });
  };

  const scrollAssocRight = () => {
    associationsScrollEl?.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
  };

  // Wires the smart-button state to a scroll container — fires on scroll
  // and on window resize. Encapsulates the "atLeft/atRight" math so both
  // rails consume it identically without duplicating the listener logic.
  const wireScrollListeners = (
    el: HTMLDivElement | null,
    setLeft: (v: boolean) => void,
    setRight: (v: boolean) => void,
  ) => {
    if (!el) return () => {};
    const checkScroll = () => {
      const atLeft = el.scrollLeft <= 2;
      const atRight = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
      setLeft(!atLeft);
      setRight(!atRight);
    };
    checkScroll();
    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  };

  useEffect(() => {
    const cleanupCommunities = wireScrollListeners(
      scrollRef.current,
      setCanScrollLeft,
      setCanScrollRight,
    );
    return cleanupCommunities;
  }, [communities]);

  // Separate effect for the associations rail — keyed on the actual DOM
  // node so Virtuoso remount → callback ref runs → state changes → effect
  // re-fires → listener attaches to the new node. The communities rail
  // doesn't need this because it lives outside Virtuoso.
  useEffect(() => {
    const cleanupAssociations = wireScrollListeners(
      associationsScrollEl,
      setAssocCanScrollLeft,
      setAssocCanScrollRight,
    );
    return cleanupAssociations;
  }, [associationsScrollEl, associations]);

  const hasCommunities = communities.length > 0;
  const hasAssociations = associations.length > 0;

  const hasPosts = posts.length > 0;

  // Splice the associations rail into the virtualised feed at a fixed depth so
  // recs surface mid-scroll without dominating the column. Only injected when
  // the recommender actually returned associations — no skeleton-only row on
  // a brand-new account where the rail would just be empty noise.
  const feedItems = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = posts.map((post) => ({ kind: 'post', post }));
    if (hasAssociations && items.length > 0) {
      const insertAt = Math.min(ASSOCIATIONS_RAIL_INDEX, items.length);
      items.splice(insertAt, 0, { kind: 'associationsRail' });
    }
    return items;
  }, [posts, hasAssociations]);

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

  // Renders the rich body of the join confirmation modal: avatar, name,
  // type/member count, access badges, and a truncated description. Only
  // produces output while the modal is open so the discriminated union
  // narrows cleanly. Hooks are kept out of this helper (tJoinModal is
  // declared at the top of the component) to avoid hook-in-callback issues.
  const renderJoinModalContent = () => {
    if (!joinModal.open) return null;
    const e = joinModal.entity;
    const typeName =
      joinModal.kind === 'community'
        ? (e as HydratedCommunityCard).communityType?.name
        : (e as HydratedAssociationCard).associationType?.name;

    const access: AccessProfile = {
      visibility: e.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
      joinPolicy: toJoinPolicy(e.joinPolicy),
      paymentType:
        e.paymentType === 'ONE_TIME' || e.paymentType === 'SUBSCRIPTION'
          ? (e.paymentType as 'ONE_TIME' | 'SUBSCRIPTION')
          : 'NONE',
      price:
        typeof e.priceAmount === 'number' && e.priceCurrency
          ? { amountInCents: e.priceAmount, currency: e.priceCurrency }
          : undefined,
    };

    return (
      <div className="flex flex-col gap-3">
        {/* Avatar + name + type/members row */}
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={e.avatarUrl || '/GLOBE.png'}
            alt={e.name}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover border border-border-subtle flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="font-semibold text-text-primary truncate">{e.name}</p>
            <p className="text-xs text-text-secondary truncate">
              {typeName ? `${typeName} · ` : ''}
              {(e.memberCount ?? 0) === 1
                ? tJoinModal('membersOne')
                : tJoinModal('membersOther', { count: e.memberCount ?? 0 })}
            </p>
          </div>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-1">
          <AccessBadges access={access} size="card" />
          {access.joinPolicy === 'APPROVAL' && (
            <span className="inline-flex items-center text-[0.6875rem] px-2 py-0.5 rounded-full bg-surface-warning text-text-on-warning border border-transparent">
              {tJoinModal('approvalRequired')}
            </span>
          )}
        </div>

        {/* Description */}
        {e.description && (
          <p className="text-sm text-text-secondary line-clamp-2">{e.description}</p>
        )}
      </div>
    );
  };

  return (
    <div className="h-app-inner flex overflow-hidden">
      <PrivacyPolicyModal />
      {/* Main Feed - Independent Scroll */}
      <div
        ref={setFeedScrollRef}
        className={FEED_COLUMN_CLASS}
      >
        {/* Discover Section — collapses entirely when the recommender has nothing to show. */}
        {(discoverLoading || hasCommunities) && (
        <>
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
                      description={community.description}
                      members={community?.memberCount || 0}
                      onButtonClick={() => handleJoinClick('community', community)}
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
          {isRecommendedArm && (
            <NewPostsBanner
              count={unseenCount}
              onClick={() => {
                void refetchFeed();
                if (feedScrollEl) {
                  feedScrollEl.scrollTo({ top: 0, behavior: 'smooth' });
                }
                resetUnseenCount();
              }}
            />
          )}
          {hasPosts && (
            <Virtuoso
              data={feedItems}
              customScrollParent={feedScrollEl ?? undefined}
              endReached={handleEndReached}
              increaseViewportBy={{ top: 0, bottom: 600 }}
              computeItemKey={(_, item) =>
                item.kind === 'post' ? item.post.id : 'associations-rail'
              }
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
              itemContent={(_index, item) => {
                if (item.kind === 'associationsRail') {
                  return (
                    <div className="mb-2 relative">
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
                      {/* Chevron buttons — only render when the rail can scroll
                          in the corresponding direction. Same look + behavior as
                          the communities rail above. */}
                      {assocCanScrollLeft && (
                        <ButtonType3
                          onClick={scrollAssocLeft}
                          className="absolute left-0 top-1/2 -translate-y-1/2 z-10
                                     flex h-10 w-10 items-center justify-center
                                     rounded-full bg-surface-default/80 shadow-md
                                     transition-colors hover:bg-surface-subtle border-0 min-w-0"
                          aria-label={tCommon('scrollLeft')}
                        >
                          <ChevronLeftIcon className="h-6 w-6 text-primary" />
                        </ButtonType3>
                      )}
                      {assocCanScrollRight && (
                        <ButtonType3
                          onClick={scrollAssocRight}
                          className="absolute right-0 top-1/2 -translate-y-1/2 z-10
                                     flex h-10 w-10 items-center justify-center
                                     rounded-full bg-surface-default/80 shadow-md
                                     transition-colors hover:bg-surface-subtle border-0 min-w-0"
                          aria-label={tCommon('scrollRight')}
                        >
                          <ChevronRightIcon className="h-6 w-6 text-primary" />
                        </ButtonType3>
                      )}
                      {/* Single flat scroll container — same structure as the
                          community rail so the chevron-button math (scrollLeft,
                          scrollWidth, clientWidth) reads identical metrics.
                          Callback ref re-attaches the scroll listener whenever
                          Virtuoso remounts this item. */}
                      <div
                        ref={setAssociationsScrollEl}
                        className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
                        style={{ scrollBehavior: 'smooth' }}
                      >
                        <div className="contents">
                        {associations.map((association) => (
                          <div key={association.id} className="flex-none snap-start">
                            <CommunityCardVariant2
                              icon={association.avatarUrl}
                              title={association.name}
                              description={association.description}
                              members={association?.memberCount || 0}
                              onButtonClick={() =>
                                handleJoinClick('association', association)
                              }
                              buttonText={
                                association.membershipStatus === 'MEMBER' ||
                                joinedCommunities.has(association.id)
                                  ? 'Joined'
                                  : t('joinassociation')
                              }
                              isDisabled={
                                association.membershipStatus === 'MEMBER' ||
                                joinedCommunities.has(association.id)
                              }
                            />
                          </div>
                        ))}
                        </div>
                      </div>
                    </div>
                  );
                }

                const post = item.post;
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
                        aiCategory={post.categories?.[0]}
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
        onCancel={() => setJoinModal({ open: false })}
        onConfirm={handleJoinConfirm}
        title={
          joinModal.open && joinModal.kind === 'association'
            ? tJoinModal('associationTitle')
            : tJoinModal('communityTitle')
        }
        description=""
        confirmText={
          joinModal.open && joinModal.kind === 'association'
            ? t('joinassociation')
            : t('joincommunity')
        }
        isLoading={joinLoading}
      >
        {renderJoinModalContent()}
      </ConfirmationModal>

      {/* Paid-membership flow — fired from handleJoinConfirm when the
          selected entity has paymentType ONE_TIME / SUBSCRIPTION. The
          modal owns the request invocation and the Stripe/Paystack
          rails; we just supply the entity, the request callback, and a
          success handler. */}
      {paymentEntity && (
        <MembershipPaymentModal
          open={paymentModalOpen}
          onClose={handlePaymentClose}
          entity={paymentEntity}
          requestMembership={handlePaymentModalRequest}
          onSuccess={handlePaymentSuccess}
        />
      )}

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