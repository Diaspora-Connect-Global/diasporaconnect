'use client';

import CommunityCardVariant2 from '@/components/cards/community/CommunityCardVariant2';
import { formatDateProximity } from '@/macros/time';
import { CommunityFeed, type FeedSlotContext } from '@/components/community/redesign/CommunityFeed';
import { HomeFeedTop, HomeFeedEmpty } from '@/components/home/HomeFeedExtras';
import { getProfileData } from '@/components/feed/feedPostHelpers';
import PageLoader from '@/components/custom/PageLoader';
import PostMediaModal, { type ModalMediaItem } from '@/components/cards/PostMediaModal';
import { HomeHero } from '@/components/home/HomeHero';
import { LatestListings } from '@/components/home/LatestListings';
import { CommunityPosts } from '@/components/home/HomeCommunityPosts';
import { FeedComposer } from '@/components/posts/FeedComposer';
import { HomeRail } from '@/components/home/HomeRail';
import { HomeRailMenu } from '@/components/home/HomeRailMenu';
import { HomeLeftColumn } from '@/components/home/HomeLeftColumn';
import { GET_MY_PROFILE, type GetProfileResponse } from '@/services/gql/profile';
import { Link } from '@/i18n/navigation';
import { REQUEST_JOIN_COMMUNITY, LIST_MY_JOINED_COMMUNITIES, GET_COMMUNITY } from '@/services/gql/community';
import {
  GET_ASSOCIATION,
  GET_USER_ASSOCIATIONS,
  REQUEST_JOIN_ASSOCIATION,
} from '@/services/gql/associations';
import {
  RECOMMENDED_COMMUNITIES,
  RECOMMENDED_ASSOCIATIONS,
} from '@/services/gql/postsFeed';
import type {
  RecommendedCommunitiesData,
  RecommendedAssociationsData,
} from '@/services/gql/types/recommendation';
import { GET_MY_PENDING_REQUESTS, type MyPendingRequestsData } from '@/services/gql/requests';
import { useApolloClient } from '@apollo/client/react';
import type { Post as ApiPost } from '@/services/gql/types/postsFeed';
import { useQuery, useMutation } from '@apollo/client/react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ButtonType3 } from '@/components/custom/button';
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import PrivacyPolicyModal from '@/components/custom/PrivacyPolicyModal';
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

// Position (posts above it) of the recommended-associations rail in the feed.
const ASSOCIATIONS_RAIL_INDEX = 3;

/**
 * Every ranked id resolved from the Apollo cache, in recommender order — or
 * null when any card is missing (then the network hydration decides).
 */
function readCachedCards<T extends { id: string }>(
  items: { itemId: string }[],
  read: (id: string) => T | null | undefined,
): T[] | null {
  const out: T[] = [];
  for (const it of items) {
    let card: T | null | undefined;
    try {
      card = read(it.itemId);
    } catch {
      card = null;
    }
    if (!card?.id) return null;
    out.push(card);
  }
  return out;
}

export default function Home() {
  const t = useTranslations('community');
  const tCommon = useTranslations('common');
  const tJoinModal = useTranslations('home.joinModal');
  const tHomePage = useTranslations('homePage');
  const tActions = useTranslations('actions');
    // Already in the cache: the shell's boot gate loaded the profile before this page mounted.
  const { data: profileData } = useQuery<GetProfileResponse>(GET_MY_PROFILE, { fetchPolicy: 'cache-first' });
  const profile = profileData?.getProfile?.profile ?? null;
  // Track the open media modal by postId rather than postIndex so the
  // open-media handler can be wired as a stable `useCallback`. With
  // virtualised feed rendering the underlying `posts` array is what we
  // resolve against; prev/next just step through it on click.
  const [modalState, setModalState] = useState<{ postId: string; mediaIndex: number } | null>(null);
  // Whether the page has appeared yet (see the loading gate near the render).
  // Declared up here because effects that attach to DOM nodes rendered only
  // after the gate opens must re-run when it does.
  const [pageShown, setPageShown] = useState(false);

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

  const {
    data: recCommunitiesData,
    loading: recCommunitiesLoading,
    refetch: refetchCommunitiesRanked,
  } =
    useQuery<RecommendedCommunitiesData>(RECOMMENDED_COMMUNITIES, {
      variables: { limit: 20 },
      fetchPolicy: 'cache-and-network',
    });

  const {
    data: recAssociationsData,
    loading: recAssociationsLoading,
    refetch: refetchAssociationsRanked,
  } =
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
    // Revisit: paint straight from the Apollo cache when every card is already
    // there, then revalidate over the network below (which still corrects a
    // stale memberCount). Never flips the rail back to "loading".
    const cached = readCachedCards(items, (id) =>
      apolloClient.readQuery<GetCommunityQueryData>({
        query: GET_COMMUNITY,
        variables: { id },
      })?.getCommunity,
    );
    if (cached) {
      setCommunities(cached);
      setDiscoverLoading(false);
    }
    let cancelled = false;
    void Promise.allSettled(
      items.map((it) =>
        apolloClient.query<GetCommunityQueryData>({
          query: GET_COMMUNITY,
          variables: { id: it.itemId },
          // network-only (not cache-first): the Apollo client is a module-level
          // singleton whose normalized cache survives SPA navigation. cache-first
          // served a stale `Community:<id>` entity (memberCount 0) on navigation
          // while a full refresh — which empties the cache — fetched the correct
          // count. Revalidate on every hydration so counts are always fresh.
          // (one-shot client.query() rejects 'cache-and-network', so network-only.)
          fetchPolicy: 'network-only',
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
    // Same cache-first paint as the communities rail above.
    const cached = readCachedCards(items, (id) =>
      apolloClient.readQuery<GetAssociationQueryData>({
        query: GET_ASSOCIATION,
        variables: { id },
      })?.getAssociation,
    );
    if (cached) {
      setAssociations(cached);
      setAssociationsLoading(false);
    }
    let cancelled = false;
    void Promise.allSettled(
      items.map((it) =>
        apolloClient.query<GetAssociationQueryData>({
          query: GET_ASSOCIATION,
          variables: { id: it.itemId },
          // network-only (not cache-first): see the community rail above — a warm
          // singleton cache served a stale memberCount 0 on SPA navigation.
          fetchPolicy: 'network-only',
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

  // ─── Pending join requests ────────────────────────────────────────────────
  //
  // Communities/associations the viewer has already requested to join (awaiting
  // an admin decision) must not appear in the discover rails — the "Join" button
  // there would just bounce off the backend with "You already have a pending
  // request…". They live in the dedicated "Pending requests" sections on the
  // community/association pages instead.
  const { data: pendingData, loading: pendingLoading, refetch: refetchPending } =
    useQuery<MyPendingRequestsData>(GET_MY_PENDING_REQUESTS, {
      fetchPolicy: 'cache-and-network',
    });

  // Requested this session — keeps a card from flashing back in between the
  // mutation resolving and the pending-requests refetch landing.
  const [requestedEntities, setRequestedEntities] = useState<Set<string>>(new Set());

  const pendingCommunityIds = useMemo(
    () =>
      new Set(
        (pendingData?.getMyPendingRequests ?? [])
          .filter((r) => r.entityType?.toUpperCase() === 'COMMUNITY')
          .map((r) => r.entityId),
      ),
    [pendingData],
  );

  const pendingAssociationIds = useMemo(
    () =>
      new Set(
        (pendingData?.getMyPendingRequests ?? [])
          .filter((r) => r.entityType?.toUpperCase() === 'ASSOCIATION')
          .map((r) => r.entityId),
      ),
    [pendingData],
  );

  const isPendingEntity = useCallback(
    (id: string, status: string | undefined, pendingIds: Set<string>) =>
      pendingIds.has(id) ||
      requestedEntities.has(id) ||
      status?.toUpperCase() === 'PENDING',
    [requestedEntities],
  );

  const visibleAssociations = useMemo(
    () =>
      associations.filter(
        (a) => !isPendingEntity(a.id, a.membershipStatus, pendingAssociationIds),
      ),
    [associations, pendingAssociationIds, isPendingEntity],
  );

  // Helper: re-fetch both ranked queries after a membership state change.
  const refetchCommunities = useCallback(() => {
    void refetchCommunitiesRanked();
    void refetchAssociationsRanked();
  }, [refetchCommunitiesRanked, refetchAssociationsRanked]);

  // The page's scroll column; it drives the shared feed's infinite scroll.
  const [feedScrollEl, setFeedScrollEl] = useState<HTMLDivElement | null>(null);

  // Mutations
  // Engagement signals are recorded via the post-feed Kafka pipeline (LIKE /
  // UNLIKE / SAVE / UNSAVE / SHARE / COMMENT). VIEW + DWELL still go through
  // the direct recordInteraction gRPC path via <ImpressionTracker>, which
  // owns its own hook instance — so this page no longer needs one directly.
  const [requestJoinCommunity, { loading: joinCommunityLoading }] = useMutation<{requestMembership: {status: string, message: string}}>(REQUEST_JOIN_COMMUNITY, {
    refetchQueries: [{ query: LIST_MY_JOINED_COMMUNITIES }, { query: GET_MY_PENDING_REQUESTS }],
    awaitRefetchQueries: false,
  });
  const [requestJoinAssociation, { loading: joinAssociationLoading }] = useMutation<{requestMembership: {status: string, message: string}}>(REQUEST_JOIN_ASSOCIATION, {
    // GET_USER_ASSOCIATIONS drives the home sidebar's "Discover associations"
    // section (HomeSidebar.tsx). Refetching it on a successful join means
    // the joined association appears in the sidebar list immediately,
    // without a page refresh.
    refetchQueries: [{ query: GET_USER_ASSOCIATIONS }, { query: GET_MY_PENDING_REQUESTS }],
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
        } else {
          // PENDING / PENDING_PAYMENT: drop the card from the rail right away so
          // the user can't fire a second request against the same entity.
          setRequestedEntities((prev) => new Set(prev).add(entityId));
          void refetchPending();
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
      // Webhook delay: Option B doesn't create the membership row until
      // payment-service publishes `payment.membership.confirmed` and the
      // community-service consumer processes it (~1-3 seconds end-to-end).
      // Immediate refetch returns the pre-row state. Refetch after a short
      // delay so the rail AND the sidebar lists pick up the freshly-
      // activated row without forcing the user to reload the page.
      const REFETCH_DELAY_MS = 3000;
      setTimeout(() => {
        void refetchCommunities();
        // Sidebar's "Discover associations" my-list + the joined-communities
        // sidebar both refetch via Apollo cache invalidation.
        void apolloClient.refetchQueries({
          include: [GET_USER_ASSOCIATIONS, LIST_MY_JOINED_COMMUNITIES],
        });
      }, REFETCH_DELAY_MS);
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

  // Scroll state of the recommended-associations rail's chevron buttons.
  const SCROLL_STEP = 300;

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
  }, [associationsScrollEl, visibleAssociations]);

  const hasAssociations = visibleAssociations.length > 0;

  // Helper function to get profile data based on author type
  // Updated to handle uppercase author types from API
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

  // Stable handlers so memoised FeedCardWithReply instances don't see a
  // fresh prop on every parent render. handleOpenMedia takes the post id
  // from the card (we changed the card prop signature to forward it).
  const handleOpenMedia = useCallback((postId: string, mediaIndex: number) => {
    setModalState({ postId, mediaIndex });
  }, []);

  // ─── Page-level loading gate ──────────────────────────────────────────────
  // One combined flag for everything above the fold (feed, discover rails,
  // pending-request filter, cold-start prompt), so the page appears WHOLE
  // instead of region-by-region. Each part counts only while it has no data
  // yet — cache-and-network revisits render instantly — and an errored query
  // stops counting so a failure can never pin the loader.
  const communitiesPending =
    discoverLoading &&
    (recCommunitiesLoading || !!recCommunitiesData?.recommendedCommunities?.items);
  const associationsPending =
    associationsLoading &&
    (recAssociationsLoading || !!recAssociationsData?.recommendedAssociations?.items);
  const initialLoading =
    communitiesPending ||
    associationsPending ||
    (pendingLoading && !pendingData);
  // Latched (state declared near the top): once the page has appeared, later
  // refetches never swap it back for the full-page loader.
  useEffect(() => {
    if (!initialLoading) setPageShown(true);
  }, [initialLoading]);

  // The post-media modal (Home only). Rendered inside the shared feed, which
  // hands over the posts and engagement handlers of the ONE feed it fetched.
  const renderMediaModal = ({ posts, handlers, removePost }: FeedSlotContext) => {
    const { handleReact, handleSave, handleShare, handleSendComment } = handlers;
    const modalPost = modalState !== null ? posts.find((p) => p.id === modalState.postId) ?? null : null;
    const modalProfileData = modalPost ? getProfileData(modalPost) : null;
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
    if (!modalPost || !modalProfileData) return null;
    return (
      <PostMediaModal
        postId={modalPost.id}
        profileImage={modalProfileData.avatar}
        profileName={modalProfileData.name}
        profileTier={modalProfileData.tier}
        authorUserId={modalPost.authorType?.toUpperCase() === 'USER' ? modalPost.authorId : undefined}
        authorEntityId={modalPost.authorId}
        authorEntityType={modalPost.authorType}
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
        // The modal has a plain like button and only ever means Happy.
        onLike={(liked) =>
          handleReact(
            modalPost.id,
            liked ? 'add' : 'remove',
            liked ? 'HAPPY' : null,
            liked ? 1 : -1,
            // The reaction actually stored, so a refused unlike restores the
            // real one. Passing null here would resurrect a SAD post as
            // unreacted, and a default would do exactly that invisibly.
            modalPost.userEngagement.myReaction ?? null,
          )
        }
        onSave={(saved) => handleSave(modalPost.id, saved)}
        onShare={() => handleShare(modalPost.id)}
        onSendComment={(text, parentId, mentions) => handleSendComment(modalPost.id, text, parentId, mentions)}
        onClose={() => setModalState(null)}
        onNavigatePost={handleNavigatePost}
        onDelete={removePost}
      />
    );
  };

  // Recommended associations, spliced into the shared feed a few posts down.
  const associationsRail = (
    <div key="associations-rail" className="mb-2 relative">
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
                        {visibleAssociations.map((association) => (
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
                                  ? tActions('joined')
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

  if (!pageShown && initialLoading) {
    return (
      <div className="h-app-inner flex overflow-hidden">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="h-app-inner flex overflow-hidden">
      <PrivacyPolicyModal />
      <HomeLeftColumn />
      {/* Main Feed - Independent Scroll */}
      <div
        ref={setFeedScrollEl}
        className="flex min-w-0 w-full flex-1 flex-col gap-5 overflow-y-auto scrollbar-hide px-4 py-4 lg:pl-0 lg:pr-6"
      >
        <HomeHero firstName={profile?.firstName} city={profile?.city} countryCode={profile?.residenceCountry || profile?.countryOfOrigin} />
        <LatestListings />
        <CommunityPosts />
        {/* Phones: the left column's and the rail's entries live in the header's menu drawer. */}
        <HomeRailMenu />
        <h2 id="home-feed-title" className="-mb-2 text-lg font-bold text-text-primary">
          {tHomePage('feed.title')}
        </h2>
        <FeedComposer avatarUrl={profile?.avatarUrl} />
        <CommunityFeed
          scrollRoot={feedScrollEl}
          onOpenMedia={handleOpenMedia}
          renderTop={(ctx) => <HomeFeedTop ctx={ctx} />}
          renderEmpty={(ctx) => (ctx.tab === 'latest' ? null : <HomeFeedEmpty ctx={ctx} />)}
          inlineItem={hasAssociations ? { index: ASSOCIATIONS_RAIL_INDEX, node: associationsRail } : undefined}
          renderOverlay={renderMediaModal}
        />
      </div>

      {/* Sidebar - Independent Scroll */}
      <div className="hidden w-[22rem] shrink-0 overflow-y-auto scrollbar-hide py-4 lg:block xl:w-[24rem]">
        <HomeRail idPrefix="desktop" />
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

    </div>
  );
}