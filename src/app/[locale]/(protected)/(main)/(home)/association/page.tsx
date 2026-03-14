'use client';

import { useState } from 'react';
import JoinAssociationCard from '@/components/cards/JoinAssociationCard';
import { MyAssociationCard } from '@/components/cards/MyAssociationCard';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import {
  GET_MY_ASSOCIATIONS,
  SEARCH_ASSOCIATIONS,
  REQUEST_JOIN_ASSOCIATION,
  LEAVE_ASSOCIATION,
  CANCEL_JOIN_REQUEST,
} from '@/services/gql/associations';

const PAGE_SIZE = 20;

interface MyAssociationItem {
  id: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  memberCount?: number;
  defaultGroupId?: string | null;
  myMembership?: {
    status: string;
    role: string;
    joinedAt?: string | null;
  } | null;
}

interface SearchAssociationItem {
  id: string;
  name: string;
  description?: string | null;
  memberCount?: number;
  joinPolicy?: string;
  avatarUrl?: string | null;
  membershipStatus?: string | null;
}

interface GetMyAssociationsData {
  getMyAssociations: {
    associations: MyAssociationItem[];
    total: number;
  };
}

interface SearchAssociationsData {
  searchAssociations: {
    associations: SearchAssociationItem[];
    total: number;
    page: number;
    limit: number;
  };
}

interface RequestJoinAssociationData {
  requestMembership: { status: string; message?: string };
}

export default function AssociationsPage() {
  const tActions = useTranslations('actions');
  const t = useTranslations('home.associations');

  const { data: myData, loading: myLoading, refetch: refetchMy } = useQuery<GetMyAssociationsData>(
    GET_MY_ASSOCIATIONS,
    { variables: { page: 1, limit: PAGE_SIZE } }
  );

  const { data: searchData, loading: searchLoading, refetch: refetchSearch } = useQuery<SearchAssociationsData>(
    SEARCH_ASSOCIATIONS,
    {
      variables: {
        input: {
          page: 1,
          limit: PAGE_SIZE,
        },
      },
    }
  );

  const [requestJoin, { loading: joinLoading }] = useMutation<RequestJoinAssociationData>(REQUEST_JOIN_ASSOCIATION, {
    refetchQueries: [
      { query: GET_MY_ASSOCIATIONS, variables: { page: 1, limit: PAGE_SIZE } },
      { query: SEARCH_ASSOCIATIONS, variables: { input: { page: 1, limit: PAGE_SIZE } } },
    ],
  });

  const [leaveAssociation, { loading: leaveLoading }] = useMutation(LEAVE_ASSOCIATION, {
    refetchQueries: [
      { query: GET_MY_ASSOCIATIONS, variables: { page: 1, limit: PAGE_SIZE } },
      { query: SEARCH_ASSOCIATIONS, variables: { input: { page: 1, limit: PAGE_SIZE } } },
    ],
  });

  const [cancelJoinRequest, { loading: cancelLoading }] = useMutation(CANCEL_JOIN_REQUEST, {
    refetchQueries: [
      { query: GET_MY_ASSOCIATIONS, variables: { page: 1, limit: PAGE_SIZE } },
      { query: SEARCH_ASSOCIATIONS, variables: { input: { page: 1, limit: PAGE_SIZE } } },
    ],
  });

  const [leaveModal, setLeaveModal] = useState<{ open: boolean; id: string; name: string }>({
    open: false,
    id: '',
    name: '',
  });

  const myAssociations = myData?.getMyAssociations?.associations ?? [];
  const allDiscover = searchData?.searchAssociations?.associations ?? [];
  const myIds = new Set(myAssociations.map((a) => a.id));
  const discoverAssociations = allDiscover.filter((assn) => !myIds.has(assn.id));

  const handleJoin = async (associationId: string, name: string, joinPolicy?: string) => {
    if (joinPolicy === 'INVITE_ONLY') {
      toast.error(t('toasts.inviteOnly'));
      return;
    }
    try {
      const { data } = await requestJoin({ variables: { associationId } });
      const status = data?.requestMembership?.status;
      if (status === 'ACTIVE' || status === 'MEMBER') {
        toast.success(t('toasts.youAreNowMember', { name }));
      } else if (status === 'PENDING') {
        toast.success(t('toasts.requestSubmitted'));
      } else if (data?.requestMembership?.message) {
        toast.info(data.requestMembership.message);
      }
      refetchMy();
      refetchSearch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to join');
    }
  };

  const handleLeaveClick = (id: string, name: string) => {
    setLeaveModal({ open: true, id, name });
  };

  const handleLeaveConfirm = async () => {
    if (!leaveModal.id) return;
    try {
      await leaveAssociation({ variables: { associationId: leaveModal.id } });
      setLeaveModal({ open: false, id: '', name: '' });
      toast.success(t('toasts.leftAssociation', { name: leaveModal.name }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to leave');
    }
  };

  const handleCancelRequest = async (associationId: string) => {
    try {
      await cancelJoinRequest({
        variables: {
          input: { entityId: associationId, entityType: 'ASSOCIATION' },
        },
      });
      toast.success(t('toasts.requestCancelled'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to cancel request');
    }
  };

  return (
    <div className="lg:w-[60vw] h-app-inner px-4 py-2 overflow-y-auto scrollbar-hide">
      <p className="heading-small mb-2">{t('myAssociationsTitle')}</p>

      <div className="bg-surface-default rounded-md p-6 overflow-auto scrollbar-hide max-h-[18rem]">
        {myLoading ? (
          <div className="text-center py-8 text-text-secondary">{t('loading')}</div>
        ) : myAssociations.length > 0 ? (
          myAssociations.map((assn) => (
            <MyAssociationCard
              key={assn.id}
              id={assn.id}
              title={assn.name}
              description={assn.description ?? ''}
              avatarUrl={assn.avatarUrl}
              buttonText={
                assn.myMembership?.status === 'PENDING'
                  ? tActions('pending')
                  : tActions('joined')
              }
              isPending={assn.myMembership?.status === 'PENDING'}
              onLeaveClick={() => handleLeaveClick(assn.id, assn.name)}
              onCancelRequestClick={
                assn.myMembership?.status === 'PENDING'
                  ? () => handleCancelRequest(assn.id)
                  : undefined
              }
            />
          ))
        ) : (
          <div className="text-center py-8 text-text-secondary">{t('noAssociations')}</div>
        )}
      </div>

      <p className="heading-small my-5">{t('discoverTitle')}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {searchLoading ? (
          <div className="col-span-full text-center py-8 text-text-secondary">{t('loading')}</div>
        ) : discoverAssociations.length > 0 ? (
          discoverAssociations.map((assn) => {
            const isInviteOnly = assn.joinPolicy === 'INVITE_ONLY';
            const buttonText = isInviteOnly ? t('badges.inviteOnly') : tActions('join');
            return (
              <JoinAssociationCard
                key={assn.id}
                title={assn.name}
                description={assn.description ?? undefined}
                members={assn.memberCount}
                profileImage={assn.avatarUrl || '/ADANSI.png'}
                profileName={assn.name}
                buttonText={buttonText}
                onButtonClick={() => !isInviteOnly && handleJoin(assn.id, assn.name, assn.joinPolicy)}
              />
            );
          })
        ) : (
          <div className="col-span-full text-center py-8 text-text-secondary">
            {t('noDiscoverAssociations')}
          </div>
        )}
      </div>

      <ConfirmationModal
        open={leaveModal.open}
        onCancel={() => setLeaveModal({ open: false, id: '', name: '' })}
        onConfirm={handleLeaveConfirm}
        title={t('leaveConfirm.title')}
        description={t('leaveConfirm.description')}
        confirmText={t('actions.leave')}
        confirmVariant="destructive"
        isLoading={leaveLoading || cancelLoading}
      />
    </div>
  );
}
