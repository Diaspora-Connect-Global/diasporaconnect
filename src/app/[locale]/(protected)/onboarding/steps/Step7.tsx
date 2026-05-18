"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useQuery, useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { FormData } from '../page';
import { MultiStep } from '@/components/custom/multistep';
import JoinCommunityCard from '@/components/cards/JoinCommunityCard';
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import { MembershipPaymentModal } from '@/app/[locale]/(protected)/(main)/community/_components/MembershipPaymentModal';
import {
  DISCOVER_COMMUNITIES,
  REQUEST_JOIN_COMMUNITY,
  LIST_MY_JOINED_COMMUNITIES,
} from '@/services/gql/community';

interface RequestMembershipPayload {
  id?: string | null;
  status: string;
  message: string;
  requiresPayment?: boolean | null;
  clientSecret?: string | null;
}

interface DiscoverCommunity {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  memberCount?: number;
  membershipStatus?: string;
  visibility?: string;
  communityType?: { name: string; isEmbassy: boolean };
}

interface DiscoverCommunitiesData {
  discoverCommunities: {
    communities: DiscoverCommunity[];
    total: number;
  };
}

interface Step7Props {
  data: FormData;
  updateData: (data: Partial<FormData>) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export const Step7: React.FC<Step7Props> = ({ data, updateData, nextStep, prevStep }) => {
  const router = useRouter();
  const t = useTranslations('onboarding');
  const tActions = useTranslations('actions');
  const tC = useTranslations('community');
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [joinModal, setJoinModal] = useState<{ open: boolean; id: string; name: string }>({
    open: false,
    id: '',
    name: '',
  });
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean;
    clientSecret: string | null;
    communityId: string;
    communityName: string;
    membershipId: string;
  }>({ open: false, clientSecret: null, communityId: '', communityName: '', membershipId: '' });

  const { data: discoverData, loading: discoverLoading } =
    useQuery<DiscoverCommunitiesData>(DISCOVER_COMMUNITIES, {
      variables: {
        includeRecommended: true,
        limit: 5,
        offset: 0,
        country: data.country || undefined,
      },
    });

  const [requestJoinCommunity, { loading: joinLoading }] = useMutation<{
    requestMembership: RequestMembershipPayload;
  }>(REQUEST_JOIN_COMMUNITY, {
    refetchQueries: [{ query: LIST_MY_JOINED_COMMUNITIES }],
  });

  const handleJoinCommunity = async (communityId: string, communityName: string) => {
    try {
      const { data: res } = await requestJoinCommunity({
        variables: { communityId },
      });
      const payload = res?.requestMembership;
      if (!payload) {
        toast.error(tC('joinFailed') ?? 'Failed to join community');
        return;
      }

      // Paid community: open Stripe modal to collect payment.
      if (payload.requiresPayment && payload.clientSecret) {
        setPaymentModal({
          open: true,
          clientSecret: payload.clientSecret,
          communityId,
          communityName,
          membershipId: payload.id ?? communityId,
        });
        return;
      }

      if (payload.status === 'ACTIVE') {
        toast.success(payload.message ?? tC('joined'));
        setJoinedIds((prev) => new Set(prev).add(communityId));
      } else if (payload.status === 'PENDING') {
        toast.success(payload.message ?? 'Your request to join has been submitted for review.');
      } else {
        toast.error(tC('joinFailed') ?? 'Failed to join community');
      }
    } catch {
      toast.error(tC('joinFailed') ?? 'Failed to join community');
    }
  };

  const handlePaymentSuccess = () => {
    const { communityId } = paymentModal;
    setPaymentModal({ open: false, clientSecret: null, communityId: '', communityName: '', membershipId: '' });
    if (communityId) {
      setJoinedIds((prev) => new Set(prev).add(communityId));
    }
    toast.success('Payment successful. Welcome to the community!');
  };

  const handlePaymentClose = () => {
    setPaymentModal({ open: false, clientSecret: null, communityId: '', communityName: '', membershipId: '' });
  };

  const handleJoinClick = (communityId: string, communityName: string) => {
    setJoinModal({ open: true, id: communityId, name: communityName });
  };

  const handleJoinConfirm = async () => {
    if (!joinModal.id) return;
    await handleJoinCommunity(joinModal.id, joinModal.name);
    setJoinModal({ open: false, id: '', name: '' });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    router.push('/');
  };

  const communities = discoverData?.discoverCommunities?.communities ?? [];

  const isJoined = (c: DiscoverCommunity) =>
    c.membershipStatus === 'MEMBER' || joinedIds.has(c.id);

  return (
    <MultiStep
      stepNumber={7}
      totalSteps={7}
      title={t('community.title')}
      subtitle={t('community.description')}
      isNextDisabled={false}
      nextButtonText={tActions('finish')}
      showBackButton
      showStepLabel
      showSkipButton={false}
      onNext={handleSubmit}
      onBack={prevStep}
    >
      <div className="w-full max-w-full scrollbar-hide lg:mx-0 lg:px-0">
        {discoverLoading ? (
          <div className="flex items-center justify-center py-12 text-text-secondary">
            {tC('loading') ?? 'Loading communities...'}
          </div>
        ) : communities.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-text-secondary">
            {tC('noCommunities') ?? 'No communities to show right now.'}
          </div>
        ) : (
          <div
            className="
              flex flex-col gap-2
              overflow-y-auto overflow-x-hidden
              snap-y snap-mandatory
              lg:flex-row lg:gap-2
              lg:overflow-y-hidden lg:overflow-x-auto
              lg:snap-x
              scrollbar-hide
            "
          >
            {communities.map((community) => {
              const joined = isJoined(community);
              return (
                <div
                  key={community.id}
                  className="snap-start w-full lg:w-auto lg:flex-shrink-0"
                >
                  <JoinCommunityCard
                    title={community.name}
                    members={community.memberCount ?? 0}
                    description={community.description ?? ''}
                    buttonText={joined ? tActions('joined') : tC('joincommunity')}
                    onButtonClick={() =>
                      !joined && handleJoinClick(community.id, community.name)
                    }
                    isDisabled={joined}
                    icon={
                      community.avatarUrl ? (
                        <Image
                          width={48}
                          height={48}
                          src={community.avatarUrl}
                          alt=""
                          className="rounded-full object-cover w-12 h-12"
                        />
                      ) : undefined
                    }
                  />
                </div>
              );
            })}
          </div>
        )}

        <ConfirmationModal
          open={joinModal.open}
          onCancel={() => setJoinModal({ open: false, id: '', name: '' })}
          onConfirm={handleJoinConfirm}
          title="Join community?"
          description={joinModal.name ? `You are about to join ${joinModal.name}.` : 'You are about to join this community.'}
          confirmText={tActions('join')}
          isLoading={joinLoading}
        />

        <MembershipPaymentModal
          open={paymentModal.open}
          clientSecret={paymentModal.clientSecret}
          communityId={paymentModal.communityId}
          communityName={paymentModal.communityName}
          membershipId={paymentModal.membershipId}
          onSuccess={handlePaymentSuccess}
          onClose={handlePaymentClose}
        />
      </div>
    </MultiStep>
  );
};
