'use client';

import { useState, useEffect } from 'react';
import { formatDateProximity } from '@/macros/time';
import AboutCommunity from '@/components/cards/community/AboutCommunity';
import { ButtonType1 } from '@/components/custom/button';
import { PeopleYouMayKnow } from '@/components/home/PeopleYouMayKnow';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import FeedCardWithReply from '@/components/cards/FeedCardWithReply';
import { useQuery, useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import {
  GET_COMMUNITY_DETAILS,
  CHECK_COMMUNITY_MEMBERSHIP,
  REQUEST_MEMBERSHIP_COMMUNITY,
  LEAVE_COMMUNITY,
  CANCEL_JOIN_REQUEST_COMMUNITY,
  type CommunityJoinPolicy,
  type CommunityPaymentType,
  type CommunityVisibility,
} from '@/services/gql/community';
import AccessSettingsForm from '@/components/cards/AccessSettingsForm';
import AccessBadges from '@/components/cards/AccessBadges';
import { MembershipPaymentModal } from '@/components/memberships/MembershipPaymentModal';
import {
  toJoinPolicy,
  type AccessProfile,
  type Visibility,
  type JoinPolicy,
  type PaymentType,
  type MembershipEntity,
  type RequestMembershipResult,
  type SubscriptionPeriod,
} from '@/types/membership';
import {
  GET_FEED,
  ADD_ENGAGEMENT,
  REMOVE_ENGAGEMENT,
  CREATE_COMMENT,
  type AddEngagementData,
  type RemoveEngagementData,
  type CreateCommentData,
} from '@/services/gql/postsFeed';
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import { buildMentionMap, type MentionInputItem } from '@/components/custom/richTextRenderer';

interface CommunityDetails {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  bannerUrl?: string | null;
  memberCount?: number;
  createdAt?: string;
  visibility?: CommunityVisibility | string;
  joinPolicy?: CommunityJoinPolicy;
  paymentType?: CommunityPaymentType | null;
  priceAmount?: number | null;
  priceCurrency?: string | null;
  defaultGroupId?: string | null;
  membershipStatus?: string | null;
}

interface GetCommunityDetailsResponse {
  getCommunity: CommunityDetails;
}

interface FeedPost {
  id: string;
  text: string;
  authorId: string;
  authorType: string;
  createdAt: string;
  visibility?: string;
  mentions?: { handle: string; displayName?: string; entityId: string }[];
  engagementCounts: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  userEngagement: {
    hasLiked: boolean;
    hasSaved: boolean;
    hasShared?: boolean;
  };
  categories?: string[];
}

interface GetFeedResponse {
  feed: {
    total: number;
    posts: FeedPost[];
  };
}

const ACTIVE = 'ACTIVE';
const PENDING = 'PENDING';
const SUSPENDED = 'SUSPENDED';
const MEMBER = 'MEMBER';

/** Statuses that mean the current user is a member (backend may return ACTIVE, MEMBER, JOINED, APPROVED, etc.) */
const MEMBER_STATUSES = new Set([ACTIVE, MEMBER, 'JOINED', 'APPROVED'].map((s) => s.toUpperCase()));
function isMemberStatus(status: string | null | undefined): boolean {
  if (status == null || status === '') return false;
  return MEMBER_STATUSES.has(String(status).toUpperCase());
}

export default function CommunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const communityId = params.id as string;
  const showSettings = searchParams.get('settings') === '1';

  const t = useTranslations('community');
  const tActions = useTranslations('actions');
  const tJoinModal = useTranslations('home.joinModal');

  const { data: detailsData, loading: detailsLoading } = useQuery<GetCommunityDetailsResponse>(
    GET_COMMUNITY_DETAILS,
    {
      variables: { communityId },
      fetchPolicy: 'cache-and-network',
    }
  );

  const { data: membershipData } = useQuery<{ checkCommunityMembership: { isMember: boolean } }>(
    CHECK_COMMUNITY_MEMBERSHIP,
    {
      variables: { communityId },
      fetchPolicy: 'cache-and-network',
      skip: !communityId,
    }
  );

  const { data: feedData, loading: feedLoading } = useQuery<GetFeedResponse>(GET_FEED, {
    variables: {
      input: {
        type: 'COMMUNITY',
        communityId,
        limit: 20,
        offset: 0,
      },
    },
  });

  const [requestMembershipMutation, { loading: joinLoading }] = useMutation(REQUEST_MEMBERSHIP_COMMUNITY, {
    refetchQueries: [
      { query: GET_COMMUNITY_DETAILS, variables: { communityId } },
      { query: CHECK_COMMUNITY_MEMBERSHIP, variables: { communityId } },
    ],
  });

  const [leaveCommunity, { loading: leaveLoading }] = useMutation(LEAVE_COMMUNITY, {
    refetchQueries: [
      { query: GET_COMMUNITY_DETAILS, variables: { communityId } },
      { query: CHECK_COMMUNITY_MEMBERSHIP, variables: { communityId } },
    ],
  });

  const [cancelJoinRequest, { loading: cancelLoading }] = useMutation(CANCEL_JOIN_REQUEST_COMMUNITY, {
    refetchQueries: [
      { query: GET_COMMUNITY_DETAILS, variables: { communityId } },
      { query: CHECK_COMMUNITY_MEMBERSHIP, variables: { communityId } },
    ],
  });

  const [addEngagement] = useMutation<AddEngagementData>(ADD_ENGAGEMENT);
  const [removeEngagement] = useMutation<RemoveEngagementData>(REMOVE_ENGAGEMENT);
  const [createComment] = useMutation<CreateCommentData>(CREATE_COMMENT);

  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [localPosts, setLocalPosts] = useState<FeedPost[]>([]);

  useEffect(() => {
    if (feedData?.feed?.posts) setLocalPosts(feedData.feed.posts);
  }, [feedData]);

  const updatePostCounts = (
    postId: string,
    delta: { likes?: number; comments?: number; shares?: number; saves?: number; hasLiked?: boolean; hasSaved?: boolean; hasShared?: boolean }
  ) => {
    setLocalPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              engagementCounts: {
                likes: p.engagementCounts.likes + (delta.likes ?? 0),
                comments: p.engagementCounts.comments + (delta.comments ?? 0),
                shares: p.engagementCounts.shares + (delta.shares ?? 0),
                saves: p.engagementCounts.saves + (delta.saves ?? 0),
              },
              userEngagement: {
                ...p.userEngagement,
                ...(delta.hasLiked !== undefined ? { hasLiked: delta.hasLiked } : {}),
                ...(delta.hasSaved !== undefined ? { hasSaved: delta.hasSaved } : {}),
                ...(delta.hasShared !== undefined ? { hasShared: delta.hasShared } : {}),
              },
            }
          : p
      )
    );
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
    updatePostCounts(postId, { shares: 1, hasShared: true });
    try {
      await addEngagement({ variables: { input: { postId, engagementType: 'SHARE' } } });
    } catch (err) {
      updatePostCounts(postId, { shares: -1, hasShared: false });
      console.error('Failed to share post:', err);
      toast.error('Failed to share post');
    }
  };

  const handleSendComment = async (
    postId: string,
    content: string,
    parentId?: string,
    mentions?: MentionInputItem[]
  ) => {
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
          },
        },
      });
      toast.success('Comment posted!');
    } catch (err) {
      updatePostCounts(postId, { comments: -1 });
      console.error('Failed to post comment:', err);
      toast.error('Failed to post comment');
      throw err;
    }
  };

  const community = detailsData?.getCommunity;
  const posts = localPosts;

  const status = community?.membershipStatus;
  const joinPolicy = community?.joinPolicy ?? 'OPEN';
  const isMemberFromCheck = membershipData?.checkCommunityMembership?.isMember === true;
  const isActive = isMemberStatus(status) || isMemberFromCheck;
  const isPending = status === PENDING || status === 'PENDING_PAYMENT';
  const isSuspended = status === SUSPENDED;
  const isInviteOnly = joinPolicy === 'INVITE_ONLY';
  const canShowJoin = !isActive && !isPending && !isSuspended && joinPolicy === 'OPEN';
  const canShowRequestToJoin = !isActive && !isPending && !isSuspended && joinPolicy === 'REQUEST';
  const canLeave = isActive;
  const canCancelRequest = isPending;

  const isPaidEntity =
    community?.paymentType === 'ONE_TIME' || community?.paymentType === 'SUBSCRIPTION';

  const callRequestMembership = async (period?: SubscriptionPeriod) => {
    const result = await requestMembershipMutation({
      variables: {
        input: {
          entityId: communityId,
          entityType: 'COMMUNITY',
          ...(period ? { subscriptionPeriod: period.toUpperCase() } : {}),
        },
      },
    });
    const payload = (result as { data?: { requestMembership?: {
      id?: string;
      status?: string;
      message?: string;
      requiresPayment?: boolean;
      clientSecret?: string;
    } } })?.data?.requestMembership;
    if (!payload) throw new Error('Request failed');
    return payload;
  };

  const handleDirectJoin = async () => {
    try {
      const payload = await callRequestMembership();
      if (payload.status === ACTIVE || payload.status === MEMBER) {
        toast.success(t('toasts.youAreNowMember', { name: community?.name ?? '' }));
      } else if (payload.status === PENDING) {
        toast.success(t('toasts.requestSubmitted'));
      } else if (payload.message) {
        toast.info(payload.message);
      }
    } catch (e) {
      if (isInviteOnly) {
        toast.error(t('toasts.inviteOnly'));
      } else {
        toast.error(e instanceof Error ? e.message : 'Request failed');
      }
    }
  };

  const handleJoinClick = () => {
    if (isPaidEntity) {
      setPaymentModalOpen(true);
      return;
    }
    setJoinModalOpen(true);
  };

  const handleJoinConfirm = async () => {
    await handleDirectJoin();
    setJoinModalOpen(false);
  };

  const handlePaymentModalRequest = async (args: {
    entityId: string;
    entityKind: 'community' | 'association';
    period?: SubscriptionPeriod;
  }): Promise<RequestMembershipResult> => {
    const payload = await callRequestMembership(args.period);
    const status =
      payload.status === 'PENDING_PAYMENT'
        ? 'PENDING_PAYMENT'
        : payload.status === PENDING
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
    toast.success(t('toasts.youAreNowMember', { name: community?.name ?? '' }));
  };

  const handlePaymentClose = () => setPaymentModalOpen(false);

  const handleLeaveClick = () => setLeaveModalOpen(true);

  const handleLeaveConfirm = async () => {
    try {
      await leaveCommunity({ variables: { communityId } });
      setLeaveModalOpen(false);
      toast.success(t('toasts.leftCommunity', { name: community?.name ?? '' }));
      router.push('/community');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to leave');
    }
  };

  const handleCancelRequest = async () => {
    try {
      await cancelJoinRequest({
        variables: {
          input: { entityId: communityId, entityType: 'COMMUNITY' },
        },
      });
      toast.success(t('toasts.requestCancelled'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to cancel request');
    }
  };

  if (detailsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <p className="text-text-secondary">{t('loading')}</p>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-surface-default border border-border-disabled shadow-md rounded-lg p-6 text-center max-w-md w-full">
          <div className="mx-auto w-24 h-24 mb-4">
            <Image
              src="/GLOBE.png"
              alt="Not found"
              width={96}
              height={96}
              className="rounded-full object-cover"
            />
          </div>
          <h2 className="text-2xl font-semibold mb-2">{t('notfound.title')}</h2>
          <p className="text-sm text-text-primary mb-6">{t('notfound.description')}</p>
          <div className="flex justify-center gap-3">
            <Link href="/community" prefetch={false}>
              <ButtonType1>{t('notfound.browse')}</ButtonType1>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const actionLoading = joinLoading || leaveLoading || cancelLoading;
  const displayMemberCount = community.memberCount ?? 0;

  const accessProfile: AccessProfile | undefined =
    community.visibility
      ? {
          visibility: (community.visibility as Visibility) ?? 'PUBLIC',
          joinPolicy: toJoinPolicy(community.joinPolicy),
          paymentType: (community.paymentType ?? 'NONE') as PaymentType,
          price:
            community.paymentType && community.paymentType !== 'NONE' && community.priceAmount
              ? {
                  amountInCents: community.priceAmount,
                  currency: community.priceCurrency ?? 'GHS',
                }
              : undefined,
        }
      : undefined;

  const paymentEntity: MembershipEntity | null = community
    ? {
        kind: 'community',
        id: community.id,
        name: community.name,
        access: {
          visibility: (community.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC'),
          joinPolicy: 'PAID',
          paymentType: (community.paymentType ?? 'NONE') as PaymentType,
          ...(community.priceAmount != null && community.priceCurrency
            ? {
                price: {
                  amountInCents: Math.round(Number(community.priceAmount)),
                  currency: community.priceCurrency,
                },
              }
            : {}),
        },
      }
    : null;

  const renderJoinModalContent = () => {
    if (!community) return null;
    const memberCount = community.memberCount ?? 0;
    return (
      <div className="flex flex-col gap-3">
        {/* Avatar + name + members row */}
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={community.avatarUrl || '/GLOBE.png'}
            alt={community.name}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover border border-border-subtle flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="font-semibold text-text-primary truncate">{community.name}</p>
            <p className="text-xs text-text-secondary truncate">
              {memberCount === 1
                ? tJoinModal('membersOne')
                : tJoinModal('membersOther', { count: memberCount })}
            </p>
          </div>
        </div>

        {/* Badges row */}
        {accessProfile && (
          <div className="flex flex-wrap items-center gap-1">
            <AccessBadges access={accessProfile} size="card" />
            {canShowRequestToJoin && (
              <span className="inline-flex items-center text-[0.6875rem] px-2 py-0.5 rounded-full bg-surface-warning text-text-on-warning border border-transparent">
                {tJoinModal('approvalRequired')}
              </span>
            )}
          </div>
        )}

        {/* Description */}
        {community.description && (
          <p className="text-sm text-text-secondary line-clamp-2">{community.description}</p>
        )}
      </div>
    );
  };

  return (
    <div className="lg:flex overflow-y-auto h-app-inner">
      <div className="overflow-y-auto scrollbar-hide lg:w-[40vw] px-3">
        <div className="min-h-[6rem] flex space-x-4 my-4 py-3 border-b">
          <div className="h-[6rem] w-[6rem] flex-shrink-0">
            <Image
              width={90}
              height={90}
              src={community.avatarUrl || '/GLOBE.png'}
              alt={community.name}
              className="h-full w-full rounded-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-between w-full">
            <div></div>
            <div className="justify-between items-center w-full">
              <p className="heading-xsmall">{community.name}</p>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {isSuspended && (
                  <span className="label-medium text-text-secondary">{t('badges.suspended')}</span>
                )}
                {isInviteOnly && !isActive && !isPending && (
                  <span className="label-medium text-text-secondary flex items-center gap-1">{t('badges.inviteOnly')}</span>
                )}
                {isActive && (
                  <span className="label-medium text-text-brand">{t('badges.member')}</span>
                )}
                {isPending && (
                  <span className="label-medium text-text-secondary">{t('badges.requestPending')}</span>
                )}
                {canShowJoin && (
                  <ButtonType1
                    className="py-1 px-3 label-medium"
                    onClick={handleJoinClick}
                    disabled={actionLoading}
                  >
                    {joinLoading ? tActions('joining') : tActions('join')}
                  </ButtonType1>
                )}
                {canShowRequestToJoin && (
                  <ButtonType1
                    className="py-1 px-3 label-medium"
                    onClick={handleJoinClick}
                    disabled={actionLoading}
                  >
                    {joinLoading ? tActions('joining') : t('actions.requestToJoin')}
                  </ButtonType1>
                )}
                {canCancelRequest && (
                  <ButtonType1
                    className="py-1 px-3 label-medium border-border-subtle text-text-secondary"
                    onClick={handleCancelRequest}
                    disabled={actionLoading}
                  >
                    {t('actions.cancelRequest')}
                  </ButtonType1>
                )}
                {canLeave && (
                  <ButtonType1
                    className="py-1 px-3 label-medium border-border-subtle text-text-secondary"
                    onClick={handleLeaveClick}
                    disabled={actionLoading}
                  >
                    {t('actions.leave')}
                  </ButtonType1>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:hidden">
          <AboutCommunity
            members={displayMemberCount}
            createdDate={community.createdAt ?? ''}
            visibility={community.visibility ?? 'Public'}
            description={community.description ?? ''}
            access={accessProfile}
          />
        </div>

        <div className="overflow-auto lg:max-h-[calc(100vh-64px)] scrollbar-hide">
          {feedLoading ? (
            <p className="text-text-secondary text-sm py-4 px-2">{t('loadingPosts')}</p>
          ) : posts.length > 0 ? (
            posts.map((post) => (
              <FeedCardWithReply
                key={post.id}
                postId={post.id}
                profileImage={community.avatarUrl || '/GLOBE.png'}
                profileName={community.name}
                {...(post.authorType?.toUpperCase() === 'USER' ? { authorUserId: post.authorId } : {})}
                authorEntityId={post.authorId}
                authorEntityType={post.authorType}
                createdAt={post.createdAt}
                category={community.name}
                aiCategory={post.categories?.[0]}
                postDate={formatDateProximity(post.createdAt)}
                visibility={post.visibility as 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE'}
                content={post.text}
                mentionMap={buildMentionMap(post.mentions ?? [])}
                shares={post.engagementCounts.shares}
                likes={post.engagementCounts.likes}
                comments={post.engagementCounts.comments}
                onLike={handleLike}
                onShare={handleShare}
                onSave={handleSave}
                onSendComment={handleSendComment}
                onDelete={(id) => setLocalPosts(prev => prev.filter(p => p.id !== id))}
                isLiked={post.userEngagement.hasLiked}
                isSaved={post.userEngagement.hasSaved}
                isShared={post.userEngagement.hasShared}
                joinButton={!isActive}
              />
            ))
          ) : (
            <p className="text-text-secondary text-sm py-4 px-2">{t('noPosts')}</p>
          )}
        </div>
      </div>

      <div className="lg:self-start h-app-inner lg:overflow-y-auto scrollbar-hide">
        <div className="space-y-6 flex-1 mb-6 mx-3">
          <div className="hidden lg:block">
            <AboutCommunity
              members={displayMemberCount}
              createdDate={community.createdAt ?? ''}
              visibility={community.visibility ?? 'Public'}
              description={community.description ?? ''}
              access={accessProfile}
            />
          </div>
          {showSettings && (
            <AccessSettingsForm
              kind="community"
              entityId={communityId}
              initial={{
                visibility: (community.visibility as Visibility) ?? 'PUBLIC',
                joinPolicy: toJoinPolicy(community.joinPolicy) as JoinPolicy,
                paymentType: (community.paymentType ?? 'NONE') as PaymentType,
                priceAmount: community.priceAmount ?? null,
                priceCurrency: community.priceCurrency ?? null,
              }}
            />
          )}
          <PeopleYouMayKnow />
        </div>
      </div>

      <ConfirmationModal
        open={joinModalOpen}
        onCancel={() => setJoinModalOpen(false)}
        onConfirm={handleJoinConfirm}
        title={canShowRequestToJoin ? 'Request to join community?' : tJoinModal('communityTitle')}
        description=""
        confirmText={canShowRequestToJoin ? t('actions.requestToJoin') : tActions('join')}
        isLoading={joinLoading}
      >
        {renderJoinModalContent()}
      </ConfirmationModal>

      <ConfirmationModal
        open={leaveModalOpen}
        onCancel={() => setLeaveModalOpen(false)}
        onConfirm={handleLeaveConfirm}
        title={t('leaveCommunityTitle')}
        description={t('leaveCommunityConfirm')}
        confirmText={t('actions.leave')}
        confirmVariant="destructive"
        isLoading={leaveLoading}
      />

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
