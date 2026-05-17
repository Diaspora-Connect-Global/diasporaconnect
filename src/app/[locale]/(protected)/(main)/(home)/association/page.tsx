'use client';

import { useCallback, useMemo, useState } from 'react';
import JoinAssociationCard from '@/components/cards/JoinAssociationCard';
import { MyAssociationCard } from '@/components/cards/MyAssociationCard';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  GET_MY_ASSOCIATIONS,
  SEARCH_ASSOCIATIONS,
  REQUEST_JOIN_ASSOCIATION,
  LEAVE_ASSOCIATION,
  CANCEL_JOIN_REQUEST,
  type AssociationPaymentType,
  type AssociationVisibility,
} from '@/services/gql/associations';
import { toJoinPolicy, type AccessProfile, type Visibility } from '@/types/membership';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

interface MyAssociationItem {
  id: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  memberCount?: number;
  defaultGroupId?: string | null;
  visibility?: AssociationVisibility | null;
  joinPolicy?: string | null;
  paymentType?: AssociationPaymentType | null;
  priceAmount?: number | null;
  priceCurrency?: string | null;
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
  visibility?: AssociationVisibility | null;
  paymentType?: AssociationPaymentType | null;
  priceAmount?: number | null;
  priceCurrency?: string | null;
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

type VisibilityFilter = 'ALL' | Visibility;
type PricingFilter = 'ALL' | 'FREE' | 'PAID';

const VISIBILITY_OPTIONS: VisibilityFilter[] = ['ALL', 'PUBLIC', 'PRIVATE'];
const PRICING_OPTIONS: PricingFilter[] = ['ALL', 'FREE', 'PAID'];

function readVisibility(param: string | null): VisibilityFilter {
  const upper = (param ?? 'ALL').toUpperCase();
  return upper === 'PUBLIC' || upper === 'PRIVATE' ? upper : 'ALL';
}

function readPricing(param: string | null): PricingFilter {
  const upper = (param ?? 'ALL').toUpperCase();
  return upper === 'FREE' || upper === 'PAID' ? upper : 'ALL';
}

function searchAssociationToAccess(
  a: SearchAssociationItem | MyAssociationItem,
): AccessProfile | null {
  if (!a.visibility) return null;
  const paymentType = a.paymentType ?? 'NONE';
  return {
    visibility: a.visibility,
    joinPolicy: toJoinPolicy(a.joinPolicy),
    paymentType,
    price:
      paymentType !== 'NONE' && a.priceAmount
        ? {
            amountInCents: a.priceAmount,
            currency: a.priceCurrency ?? 'GHS',
          }
        : undefined,
  };
}

export default function AssociationsPage() {
  const tActions = useTranslations('actions');
  const t = useTranslations('home.associations');
  const tDiscovery = useTranslations('association.discovery');

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const visibilityFilter = readVisibility(searchParams.get('visibility'));
  const pricingFilter = readPricing(searchParams.get('pricing'));

  const updateFilter = useCallback(
    (key: 'visibility' | 'pricing', value: string) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (value === 'ALL') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

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
  const [joinModal, setJoinModal] = useState<{ open: boolean; id: string; name: string; isRequest: boolean }>({
    open: false,
    id: '',
    name: '',
    isRequest: false,
  });

  const myAssociations = myData?.getMyAssociations?.associations ?? [];
  const allDiscover = searchData?.searchAssociations?.associations ?? [];
  const myIds = new Set(myAssociations.map((a) => a.id));
  const discoverAssociations = allDiscover.filter((assn) => !myIds.has(assn.id));

  const visibleDiscover = useMemo(
    () =>
      discoverAssociations
        .filter((assn) =>
          visibilityFilter === 'ALL'
            ? true
            : assn.visibility === visibilityFilter,
        )
        .filter((assn) => {
          if (pricingFilter === 'ALL') return true;
          const isPaid = !!assn.paymentType && assn.paymentType !== 'NONE';
          return pricingFilter === 'PAID' ? isPaid : !isPaid;
        }),
    [discoverAssociations, visibilityFilter, pricingFilter],
  );

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

  const handleJoinClick = (associationId: string, name: string, joinPolicy?: string) => {
    if (joinPolicy === 'INVITE_ONLY') {
      toast.error(t('toasts.inviteOnly'));
      return;
    }
    setJoinModal({
      open: true,
      id: associationId,
      name,
      isRequest: joinPolicy === 'REQUEST' || joinPolicy === 'APPROVAL',
    });
  };

  const handleJoinConfirm = async () => {
    if (!joinModal.id) return;
    await handleJoin(joinModal.id, joinModal.name, joinModal.isRequest ? 'REQUEST' : 'OPEN');
    setJoinModal({ open: false, id: '', name: '', isRequest: false });
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
              access={searchAssociationToAccess(assn) ?? undefined}
            />
          ))
        ) : (
          <div className="text-center py-8 text-text-secondary">{t('noAssociations')}</div>
        )}
      </div>

      <p className="heading-small my-5">{t('discoverTitle')}</p>

      <div
        className="flex flex-wrap items-center gap-2 mb-4"
        role="group"
        aria-label={tDiscovery('filtersLabel')}
      >
        <span className="text-sm text-text-secondary mr-1">
          {tDiscovery('visibilityLabel')}
        </span>
        {VISIBILITY_OPTIONS.map((v) => {
          const active = visibilityFilter === v;
          return (
            <button
              key={`visibility-${v}`}
              type="button"
              onClick={() => updateFilter('visibility', v)}
              aria-pressed={active}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                active
                  ? 'bg-surface-brand text-text-on-brand border-transparent'
                  : 'bg-surface-default text-text-secondary border-border-subtle hover:bg-surface-hover',
              )}
            >
              {tDiscovery(`visibility.${v.toLowerCase()}`)}
            </button>
          );
        })}
        <span className="text-sm text-text-secondary mx-1">
          {tDiscovery('pricingLabel')}
        </span>
        {PRICING_OPTIONS.map((p) => {
          const active = pricingFilter === p;
          return (
            <button
              key={`pricing-${p}`}
              type="button"
              onClick={() => updateFilter('pricing', p)}
              aria-pressed={active}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                active
                  ? 'bg-surface-brand text-text-on-brand border-transparent'
                  : 'bg-surface-default text-text-secondary border-border-subtle hover:bg-surface-hover',
              )}
            >
              {tDiscovery(`pricing.${p.toLowerCase()}`)}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {searchLoading ? (
          <div className="col-span-full text-center py-8 text-text-secondary">{t('loading')}</div>
        ) : visibleDiscover.length > 0 ? (
          visibleDiscover.map((assn) => {
            const isInviteOnly = assn.joinPolicy === 'INVITE_ONLY';
            const buttonText = isInviteOnly ? t('badges.inviteOnly') : tActions('join');
            const access = searchAssociationToAccess(assn);
            return (
              <JoinAssociationCard
                key={assn.id}
                title={assn.name}
                description={assn.description ?? undefined}
                members={assn.memberCount}
                profileImage={assn.avatarUrl || '/ADANSI.png'}
                profileName={assn.name}
                buttonText={buttonText}
                onButtonClick={() => handleJoinClick(assn.id, assn.name, assn.joinPolicy)}
                access={access ?? undefined}
              />
            );
          })
        ) : (
          <div className="col-span-full text-center py-8 text-text-secondary">
            {tDiscovery('emptyFiltered')}
          </div>
        )}
      </div>

      <ConfirmationModal
        open={joinModal.open}
        onCancel={() => setJoinModal({ open: false, id: '', name: '', isRequest: false })}
        onConfirm={handleJoinConfirm}
        title={joinModal.isRequest ? 'Request to join association?' : 'Join association?'}
        description={joinModal.name ? `You are about to ${joinModal.isRequest ? 'request to join' : 'join'} ${joinModal.name}.` : `You are about to ${joinModal.isRequest ? 'request to join this association' : 'join this association'}.`}
        confirmText={joinModal.isRequest ? t('actions.requestToJoin') : tActions('join')}
        isLoading={joinLoading}
      />

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
