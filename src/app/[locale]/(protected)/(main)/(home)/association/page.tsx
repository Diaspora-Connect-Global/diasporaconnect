'use client';

import { useCallback, useMemo, useState } from 'react';
import JoinAssociationCard from '@/components/cards/JoinAssociationCard';
import { MyAssociationCard } from '@/components/cards/MyAssociationCard';
import { PendingRequestCard } from '@/components/cards/PendingRequestCard';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { readMutationOutcome, refusalMessageKey } from '@/lib/mutationOutcome';
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
import { GET_MY_PENDING_REQUESTS, type MyPendingRequestsData } from '@/services/gql/requests';
import { toJoinPolicy, type AccessProfile, type Visibility } from '@/types/membership';
import { cn } from '@/lib/utils';
import AccessBadges from '@/components/cards/AccessBadges';
import { toCdnUrl } from '@/lib/cdn';

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
  associationType?: { id: string; name: string } | null;
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
  associationType?: { id: string; name: string } | null;
}

// Minimal shape the rich join-modal needs. Both the discover and "my
// associations" rows satisfy it (memberCount/description/visibility/etc.
// are all optional on the underlying queries).
type AssociationRowLike = SearchAssociationItem | MyAssociationItem;

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
  const tCommunity = useTranslations('community');
  const tJoinModal = useTranslations('home.joinModal');
  // Root-scoped on purpose: `refusalMessageKey` returns a FULLY QUALIFIED
  // key path (e.g. 'community.errors.not_found'), so it must be handed to an
  // UNSCOPED translator or next-intl prefixes the scope and resolves nothing.
  const tRoot = useTranslations();

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

  const { data: pendingData, refetch: refetchPending } = useQuery<MyPendingRequestsData>(
    GET_MY_PENDING_REQUESTS,
    { fetchPolicy: 'cache-and-network' },
  );

  const [cancelJoinRequest, { loading: cancelLoading }] = useMutation(CANCEL_JOIN_REQUEST, {
    refetchQueries: [
      { query: GET_MY_ASSOCIATIONS, variables: { page: 1, limit: PAGE_SIZE } },
      { query: SEARCH_ASSOCIATIONS, variables: { input: { page: 1, limit: PAGE_SIZE } } },
      { query: GET_MY_PENDING_REQUESTS },
    ],
  });

  const [leaveModal, setLeaveModal] = useState<{ open: boolean; id: string; name: string }>({
    open: false,
    id: '',
    name: '',
  });
  type JoinModalState =
    | { open: false }
    | { open: true; isRequest: boolean; entity: AssociationRowLike };
  const [joinModal, setJoinModal] = useState<JoinModalState>({ open: false });

  const myAssociations = myData?.getMyAssociations?.associations ?? [];
  const allDiscover = searchData?.searchAssociations?.associations ?? [];
  const myIds = new Set(myAssociations.map((a) => a.id));
  const discoverAssociations = allDiscover.filter((assn) => !myIds.has(assn.id));

  // Pending join requests get their own section (below "My associations"),
  // so keep the "My associations" list to active memberships only.
  const activeMyAssociations = useMemo(
    () => myAssociations.filter((a) => a.myMembership?.status !== 'PENDING'),
    [myAssociations],
  );
  const pendingAssociationRequests = useMemo(
    () =>
      (pendingData?.getMyPendingRequests ?? []).filter(
        (r) => r.entityType?.toUpperCase() === 'ASSOCIATION',
      ),
    [pendingData],
  );

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
    const result = await requestJoin({ variables: { associationId } });
    const outcome = readMutationOutcome(result, (d) => d.requestMembership);
    if (!outcome.ok) {
      toast.error(tRoot(refusalMessageKey(outcome.message, 'community.errors')));
      return;
    }
    const status = result?.data?.requestMembership?.status;
    if (status === 'ACTIVE' || status === 'MEMBER') {
      toast.success(t('toasts.youAreNowMember', { name }));
    } else if (status === 'PENDING') {
      toast.success(t('toasts.requestSubmitted'));
    } else if (result?.data?.requestMembership?.message) {
      toast.info(result.data.requestMembership.message);
    }
    refetchMy();
    refetchSearch();
    void refetchPending();
  };

  const handleJoinClick = (entity: AssociationRowLike) => {
    const joinPolicy = entity.joinPolicy ?? undefined;
    if (joinPolicy === 'INVITE_ONLY') {
      toast.error(t('toasts.inviteOnly'));
      return;
    }
    setJoinModal({
      open: true,
      isRequest: joinPolicy === 'REQUEST' || joinPolicy === 'APPROVAL',
      entity,
    });
  };

  const handleJoinConfirm = async () => {
    if (!joinModal.open) return;
    const { entity, isRequest } = joinModal;
    await handleJoin(entity.id, entity.name, isRequest ? 'REQUEST' : 'OPEN');
    setJoinModal({ open: false });
  };

  // Renders the rich body of the join confirmation modal: avatar, name,
  // association type, member count, access badges, an "approval required"
  // chip when applicable, and a truncated description. Only produces output
  // while the modal is open so the discriminated union narrows cleanly.
  const renderJoinModalContent = () => {
    if (!joinModal.open) return null;
    const e = joinModal.entity;
    const typeName = e.associationType?.name;

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
            src={toCdnUrl(e.avatarUrl) || '/GLOBE.png'}
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

  const handleLeaveClick = (id: string, name: string) => {
    setLeaveModal({ open: true, id, name });
  };

  const handleLeaveConfirm = async () => {
    if (!leaveModal.id) return;
    const result = await leaveAssociation({ variables: { associationId: leaveModal.id } });
    const outcome = readMutationOutcome(result, (d) => d.leaveAssociation);
    if (!outcome.ok) {
      toast.error(tRoot(refusalMessageKey(outcome.message, 'community.errors')));
      return;
    }
    setLeaveModal({ open: false, id: '', name: '' });
    toast.success(t('toasts.leftAssociation', { name: leaveModal.name }));
  };

  const handleCancelRequest = async (associationId: string) => {
    const result = await cancelJoinRequest({
      variables: {
        input: { entityId: associationId, entityType: 'ASSOCIATION' },
      },
    });
    const outcome = readMutationOutcome(result, (d) => d.cancelJoinRequest);
    if (!outcome.ok) {
      toast.error(tRoot(refusalMessageKey(outcome.message, 'community.errors')));
      return;
    }
    toast.success(t('toasts.requestCancelled'));
    void refetchPending();
  };

  return (
    <div className="lg:w-[60vw] h-app-inner px-4 py-2 overflow-y-auto scrollbar-hide">
      <p className="heading-small mb-2">{t('myAssociationsTitle')}</p>

      <div className="bg-surface-default rounded-md p-6 overflow-auto scrollbar-hide max-h-[18rem]">
        {myLoading ? (
          <div className="text-center py-8 text-text-secondary">{t('loading')}</div>
        ) : activeMyAssociations.length > 0 ? (
          activeMyAssociations.map((assn) => (
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

      {pendingAssociationRequests.length > 0 && (
        <>
          <p className="heading-small my-5">{tCommunity('pendingRequestsTitle')}</p>
          <div className="bg-surface-default rounded-md p-2 sm:p-4 overflow-auto scrollbar-hide max-h-[18rem]">
            {pendingAssociationRequests.map((req) => (
              <PendingRequestCard
                key={req.id}
                name={req.entityName}
                href={`/association/${req.entityId}`}
                pendingLabel={tActions('pending')}
                cancelLabel={tCommunity('actions.cancelRequest')}
                confirmTitle={tCommunity('cancelRequestTitle')}
                confirmDescription={tCommunity('cancelRequestConfirm', { name: req.entityName })}
                onCancel={() => handleCancelRequest(req.entityId)}
                cancelling={cancelLoading}
              />
            ))}
          </div>
        </>
      )}

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
                profileImage={toCdnUrl(assn.avatarUrl) || '/GLOBE.png'}
                profileName={assn.name}
                buttonText={buttonText}
                onButtonClick={() => handleJoinClick(assn)}
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
        onCancel={() => setJoinModal({ open: false })}
        onConfirm={handleJoinConfirm}
        title={
          joinModal.open && joinModal.isRequest
            ? `${t('actions.requestToJoin')}?`
            : tJoinModal('associationTitle')
        }
        description=""
        confirmText={
          joinModal.open && joinModal.isRequest
            ? t('actions.requestToJoin')
            : tCommunity('joinassociation')
        }
        isLoading={joinLoading}
      >
        {renderJoinModalContent()}
      </ConfirmationModal>

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
