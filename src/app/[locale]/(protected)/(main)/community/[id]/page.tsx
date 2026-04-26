'use client';

import { useState } from 'react';
import { formatDateProximity } from '@/macros/time';
import AboutCommunity from '@/components/cards/community/AboutCommunity';
import { ButtonType1 } from '@/components/custom/button';
import { PeopleYouMayKnow } from '@/components/home/PeopleYouMayKnow';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import FeedCardWithReply from '@/components/cards/FeedCardWithReply';
import { useQuery, useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import {
  GET_COMMUNITY_DETAILS,
  CHECK_COMMUNITY_MEMBERSHIP,
  REQUEST_JOIN_COMMUNITY,
  LEAVE_COMMUNITY,
  CANCEL_JOIN_REQUEST_COMMUNITY,
  type CommunityJoinPolicy,
} from '@/services/gql/community';
import { GET_FEED } from '@/services/gql/postsFeed';
import { ConfirmationModal } from '@/components/custom/confirmationModal';

interface CommunityDetails {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  bannerUrl?: string | null;
  memberCount?: number;
  createdAt?: string;
  visibility?: string;
  joinPolicy?: CommunityJoinPolicy;
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
  engagementCounts: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  userEngagement: {
    hasLiked: boolean;
    hasSaved: boolean;
  };
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
  const communityId = params.id as string;

  const t = useTranslations('community');
  const tActions = useTranslations('actions');

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

  const [requestJoin, { loading: joinLoading }] = useMutation(REQUEST_JOIN_COMMUNITY, {
    variables: { communityId },
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

  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const community = detailsData?.getCommunity;
  const posts = feedData?.feed?.posts || [];

  const status = community?.membershipStatus;
  const joinPolicy = community?.joinPolicy ?? 'OPEN';
  const isMemberFromCheck = membershipData?.checkCommunityMembership?.isMember === true;
  const isActive = isMemberStatus(status) || isMemberFromCheck;
  const isPending = status === PENDING;
  const isSuspended = status === SUSPENDED;
  const isInviteOnly = joinPolicy === 'INVITE_ONLY';
  const canShowJoin = !isActive && !isPending && !isSuspended && joinPolicy === 'OPEN';
  const canShowRequestToJoin = !isActive && !isPending && !isSuspended && joinPolicy === 'REQUEST';
  const canLeave = isActive;
  const canCancelRequest = isPending;

  const handleJoin = async () => {
    try {
      const res = await requestJoin();
      const result = (res as { data?: { requestMembership?: { status?: string; message?: string } } })?.data?.requestMembership;
      if (result?.status === ACTIVE || result?.status === MEMBER) {
        toast.success(t('toasts.youAreNowMember', { name: community?.name ?? '' }));
      } else if (result?.status === PENDING) {
        toast.success(t('toasts.requestSubmitted'));
      } else if (result?.message) {
        toast.info(result.message);
      }
    } catch (e) {
      if (isInviteOnly) {
        toast.error(t('toasts.inviteOnly'));
      } else {
        toast.error(e instanceof Error ? e.message : 'Request failed');
      }
    }
  };

  const handleJoinClick = () => setJoinModalOpen(true);

  const handleJoinConfirm = async () => {
    await handleJoin();
    setJoinModalOpen(false);
  };

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
  const displayMemberCount = isActive && (community.memberCount == null || community.memberCount === 0)
    ? 1
    : (community.memberCount ?? 0);

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
                category={community.name}
                postDate={formatDateProximity(post.createdAt)}
                visibility={post.visibility as 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE'}
                content={post.text}
                shares={post.engagementCounts.shares}
                likes={post.engagementCounts.likes}
                comments={post.engagementCounts.comments}
                onLike={() => {}}
                onComment={() => {}}
                onShare={() => {}}
                onSave={() => {}}
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
            />
          </div>
          <PeopleYouMayKnow />
        </div>
      </div>

      <ConfirmationModal
        open={joinModalOpen}
        onCancel={() => setJoinModalOpen(false)}
        onConfirm={handleJoinConfirm}
        title={canShowRequestToJoin ? 'Request to join community?' : 'Join community?'}
        description={community?.name ? `You are about to ${canShowRequestToJoin ? 'request to join' : 'join'} ${community.name}.` : `You are about to ${canShowRequestToJoin ? 'request to join this community' : 'join this community'}.`}
        confirmText={canShowRequestToJoin ? t('actions.requestToJoin') : tActions('join')}
        isLoading={joinLoading}
      />

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
    </div>
  );
}
