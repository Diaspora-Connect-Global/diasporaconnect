/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useQuery, useMutation } from '@apollo/client/react';
import JoinCommunityCard from "@/components/cards/JoinCommunityCard";
import { MyCommunityCard } from "@/components/cards/MyCommunityCard";
import { PendingRequestCard } from "@/components/cards/PendingRequestCard";
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import { EmptyState } from '@/components/feedback';
import { Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
    DISCOVER_COMMUNITIES,
    LIST_MY_JOINED_COMMUNITIES,
    REQUEST_JOIN_COMMUNITY,
    CANCEL_JOIN_REQUEST_COMMUNITY,
    SEARCH_COMMUNITIES,
    type CommunityPaymentType,
    type CommunityVisibility,
} from '@/services/gql/community';
import { GET_MY_PENDING_REQUESTS, type MyPendingRequestsData } from '@/services/gql/requests';
import { toast } from 'sonner';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { MembershipPaymentModal } from './_components/MembershipPaymentModal';
import { toJoinPolicy, type AccessProfile, type Visibility } from '@/types/membership';
import { cn } from '@/lib/utils';
import AccessBadges from '@/components/cards/AccessBadges';
import { toCdnUrl } from '@/lib/cdn';

interface RequestMembershipPayload {
    id?: string | null;
    status: string;
    message: string;
    requiresPayment?: boolean | null;
    clientSecret?: string | null;
}

interface RequestJoinCommunityResponse {
    requestMembership: RequestMembershipPayload;
}

interface Community {
    id: string;
    name: string;
    description?: string;
    avatarUrl?: string;
    communityType?: {
        name: string;
        isEmbassy: boolean;
    } | null;
}

interface DiscoverCommunity extends Community {
    visibility: string;
    membershipStatus: string;
    communityType: {
        name: string;
        isEmbassy: boolean;
    };
    memberCount: number;
}

interface ListUserCommunitiesData {
    listUserCommunities: Community[];
}

export interface DiscoverCommunitiesData {
    discoverCommunities: {
        communities: DiscoverCommunity[];
        total: number;
    };
}

interface SearchCommunityItem {
    id: string;
    name: string;
    description?: string | null;
    memberCount?: number | null;
    joinPolicy?: string | null;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    visibility?: CommunityVisibility | null;
    paymentType?: CommunityPaymentType | null;
    priceAmount?: number | null;
    priceCurrency?: string | null;
    membershipStatus?: string | null;
    communityType?: { name: string; isEmbassy: boolean } | null;
}

interface SearchCommunitiesData {
    searchCommunities: {
        communities: SearchCommunityItem[];
        total: number;
    };
}

const JOINED_STATUSES = new Set(['ACTIVE', 'MEMBER', 'JOINED', 'APPROVED']);

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

function communityToAccess(c: SearchCommunityItem): AccessProfile | null {
    if (!c.visibility) return null;
    const paymentType = c.paymentType ?? 'NONE';
    return {
        visibility: c.visibility,
        joinPolicy: toJoinPolicy(c.joinPolicy),
        paymentType,
        price:
            paymentType !== 'NONE' && c.priceAmount
                ? {
                      amountInCents: c.priceAmount,
                      currency: c.priceCurrency ?? 'GHS',
                  }
                : undefined,
    };
}

export default function Community() {
    const t = useTranslations('community');
    const tDiscovery = useTranslations('community.discovery');
    const tActions = useTranslations('actions');
    const tJoinModal = useTranslations('home.joinModal');

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

    const [joinedCommunities, setJoinedCommunities] = useState<Set<string>>(new Set());
    // Communities the viewer has just requested to join (APPROVAL/REQUEST policy)
    // this session. Tracked optimistically so the card flips to "Pending"
    // immediately, without waiting on — or depending on — the backend refetch
    // reflecting the new PENDING status.
    const [pendingCommunities, setPendingCommunities] = useState<Set<string>>(new Set());
    type JoinModalState =
        | { open: false }
        | { open: true; entity: SearchCommunityItem };
    const [joinModal, setJoinModal] = useState<JoinModalState>({ open: false });
    const [paymentModal, setPaymentModal] = useState<{
        open: boolean;
        clientSecret: string | null;
        communityId: string;
        communityName: string;
        membershipId: string;
    }>({ open: false, clientSecret: null, communityId: '', communityName: '', membershipId: '' });

    const { data: myCommunitiesData, loading: myCommunitiesLoading, refetch: refetchMyCommunities } = useQuery<ListUserCommunitiesData>(
        LIST_MY_JOINED_COMMUNITIES,
        { fetchPolicy: 'cache-and-network' }
    );

    const { data: discoverData, loading: discoverLoading, refetch: refetchCommunities } = useQuery<DiscoverCommunitiesData>(
        DISCOVER_COMMUNITIES,
        {
            variables: {
                includeRecommended: true,
                limit: 20,
                offset: 0
            },
            fetchPolicy: 'cache-and-network',
        }
    );

    const { data: searchData, loading: searchLoading, refetch: refetchSearch } = useQuery<SearchCommunitiesData>(
        SEARCH_COMMUNITIES,
        {
            variables: {
                input: {
                    page: 1,
                    limit: 20,
                },
            },
            fetchPolicy: 'cache-and-network',
        }
    );

    const { data: pendingData, refetch: refetchPending } = useQuery<MyPendingRequestsData>(
        GET_MY_PENDING_REQUESTS,
        { fetchPolicy: 'cache-and-network' }
    );

    const [requestJoinCommunity, { loading: joinLoading }] = useMutation<RequestJoinCommunityResponse>(REQUEST_JOIN_COMMUNITY, {
        refetchQueries: [{ query: LIST_MY_JOINED_COMMUNITIES }, { query: GET_MY_PENDING_REQUESTS }],
        awaitRefetchQueries: false,
    });

    const [cancelJoinRequest, { loading: cancelLoading }] = useMutation(CANCEL_JOIN_REQUEST_COMMUNITY, {
        refetchQueries: [{ query: GET_MY_PENDING_REQUESTS }],
        awaitRefetchQueries: false,
    });

    // The viewer's pending community join requests (APPROVAL/REQUEST policy,
    // awaiting an admin decision). `getMyPendingRequests` spans entity types,
    // so filter to communities here.
    const pendingCommunityRequests = useMemo(
        () =>
            (pendingData?.getMyPendingRequests ?? []).filter(
                (r) => r.entityType?.toUpperCase() === 'COMMUNITY',
            ),
        [pendingData],
    );
    const pendingRequestIds = useMemo(
        () => new Set(pendingCommunityRequests.map((r) => r.entityId)),
        [pendingCommunityRequests],
    );

    const handleCancelRequest = async (communityId: string) => {
        try {
            await cancelJoinRequest({
                variables: { input: { entityId: communityId, entityType: 'COMMUNITY' } },
            });
            setPendingCommunities((prev) => {
                const next = new Set(prev);
                next.delete(communityId);
                return next;
            });
            toast.success(t('toasts.requestCancelled'));
            void refetchPending();
            void refetchCommunities();
            void refetchSearch();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to cancel request');
        }
    };

    const handleJoinCommunity = async (communityId: string, communityName: string) => {
        try {
            const { data } = await requestJoinCommunity({
                variables: { communityId }
            });

            const payload = data?.requestMembership;
            if (!payload) {
                toast.error('Failed to join community');
                return;
            }

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
                toast.success(payload.message ?? 'You have joined the community.');
                setJoinedCommunities(prev => new Set(prev).add(communityId));
                setTimeout(() => {
                    refetchCommunities();
                    refetchMyCommunities();
                    refetchSearch();
                }, 100);
            } else if (payload.status === 'PENDING') {
                toast.success(payload.message ?? 'Your request to join has been submitted for review.');
                setPendingCommunities(prev => new Set(prev).add(communityId));
                void refetchCommunities();
                void refetchSearch();
                void refetchPending();
            } else {
                toast.error('Failed to join community');
            }
        } catch (err) {
            console.error('Failed to join community:', err);
            toast.error('Failed to join community');
        }
    };

    const handlePaymentSuccess = () => {
        const { communityId } = paymentModal;
        setPaymentModal({ open: false, clientSecret: null, communityId: '', communityName: '', membershipId: '' });
        if (communityId) {
            setJoinedCommunities(prev => new Set(prev).add(communityId));
        }
        toast.success('Payment successful. Welcome to the community!');
        void refetchCommunities();
        void refetchMyCommunities();
        void refetchSearch();
    };

    const handlePaymentClose = () => {
        setPaymentModal({ open: false, clientSecret: null, communityId: '', communityName: '', membershipId: '' });
    };

    const handleJoinClick = (entity: SearchCommunityItem) => {
        setJoinModal({ open: true, entity });
    };

    const handleJoinConfirm = async () => {
        if (!joinModal.open) return;
        const { id, name } = joinModal.entity;
        setJoinModal({ open: false });
        await handleJoinCommunity(id, name);
    };

    // "Discover more communities" prefers the PERSONALISED list from
    // DISCOVER_COMMUNITIES (community-service.discoverCommunities — does
    // viewer-aware scoring: country / friends-in-community / interests /
    // trending / freshness). SEARCH_COMMUNITIES is used only when the
    // personalised result is empty so we never render an empty section —
    // and as a source for the richer payment fields (paymentType /
    // priceAmount / priceCurrency) which DISCOVER doesn't currently carry.
    const searchedCommunities = useMemo(
        () => searchData?.searchCommunities?.communities ?? [],
        [searchData],
    );
    const personalisedCommunities = useMemo(
        () => discoverData?.discoverCommunities?.communities ?? [],
        [discoverData],
    );

    // Persistent id -> real memberCount cache. The rec-backed DISCOVER list
    // reports an unreliable count (often 0); SEARCH carries the real one. But
    // once the viewer has a membership on a community (e.g. a PENDING request),
    // the backend can drop it from SEARCH results — which would otherwise lose
    // the count and fall the card back to 0. Remembering every real count we've
    // seen keeps it stable across refetches.
    const [memberCountCache, setMemberCountCache] = useState<Record<string, number>>({});
    useEffect(() => {
        const updates: Record<string, number> = {};
        for (const c of searchedCommunities) {
            if (typeof c.memberCount === 'number' && c.memberCount > 0 && memberCountCache[c.id] !== c.memberCount) {
                updates[c.id] = c.memberCount;
            }
        }
        if (Object.keys(updates).length > 0) {
            setMemberCountCache((prev) => ({ ...prev, ...updates }));
        }
    }, [searchedCommunities, memberCountCache]);

    const renderList: SearchCommunityItem[] = useMemo(() => {
        if (personalisedCommunities.length > 0) {
            // Stitch in payment fields from the SEARCH result when we have
            // them — the personalised list doesn't expose paymentType /
            // priceAmount yet, but the access badges + paid join flow rely
            // on those values to render correctly.
            const paymentById = new Map(
                searchedCommunities.map((c) => [
                    c.id,
                    {
                        paymentType: c.paymentType ?? null,
                        priceAmount: c.priceAmount ?? null,
                        priceCurrency: c.priceCurrency ?? null,
                        // memberCount is stitched from SEARCH too: the rec-backed
                        // DISCOVER list reports an unreliable count (often 0), so we
                        // fall back to the SEARCH count when DISCOVER's is missing/0.
                        memberCount: c.memberCount ?? null,
                    },
                ]),
            );
            return personalisedCommunities.map((c) => {
                const pay = paymentById.get(c.id) ?? {
                    paymentType: null,
                    priceAmount: null,
                    priceCurrency: null,
                    memberCount: null,
                };
                return {
                    id: c.id,
                    name: c.name,
                    description: c.description,
                    // Prefer the first non-zero count: `||` treats 0/null as "missing"
                    // so a real positive SEARCH count (live, then last-known via the
                    // cache) wins when DISCOVER reports 0.
                    memberCount: c.memberCount || pay.memberCount || memberCountCache[c.id] || 0,
                    avatarUrl: toCdnUrl(c.avatarUrl),
                    visibility: (c.visibility as CommunityVisibility) ?? null,
                    paymentType: pay.paymentType,
                    priceAmount: pay.priceAmount,
                    priceCurrency: pay.priceCurrency,
                    membershipStatus: c.membershipStatus,
                    communityType: c.communityType,
                };
            });
        }
        // Fallback: personalised was empty (e.g. recommender warming up) —
        // show the search catalog rather than an empty state.
        return searchedCommunities.map((c) => ({
            ...c,
            avatarUrl: toCdnUrl(c.avatarUrl),
            memberCount: c.memberCount || memberCountCache[c.id] || 0,
        }));
    }, [personalisedCommunities, searchedCommunities, memberCountCache]);

    // Authoritative set of communities the viewer has already joined: the
    // LIST_MY_JOINED_COMMUNITIES result, plus any joined this session
    // (joinedCommunities) so the card disappears immediately after joining,
    // without waiting for a refetch to land.
    const joinedCommunityIds = useMemo(() => {
        const ids = new Set<string>(joinedCommunities);
        for (const c of myCommunitiesData?.listUserCommunities ?? []) {
            ids.add(c.id);
        }
        return ids;
    }, [myCommunitiesData, joinedCommunities]);

    const visibleCommunities = useMemo(
        () =>
            renderList
                // "Discover more communities" surfaces communities to join, so
                // drop the ones the viewer is already a member of — and the ones
                // with a pending request, which get their own section above.
                .filter(
                    (c) =>
                        !joinedCommunityIds.has(c.id) &&
                        !JOINED_STATUSES.has(c.membershipStatus?.toUpperCase() ?? '') &&
                        !pendingRequestIds.has(c.id) &&
                        !pendingCommunities.has(c.id),
                )
                .filter((c) =>
                    visibilityFilter === 'ALL'
                        ? true
                        : c.visibility === visibilityFilter,
                )
                .filter((c) => {
                    if (pricingFilter === 'ALL') return true;
                    const isPaid = !!c.paymentType && c.paymentType !== 'NONE';
                    return pricingFilter === 'PAID' ? isPaid : !isPaid;
                }),
        [renderList, joinedCommunityIds, pendingRequestIds, pendingCommunities, visibilityFilter, pricingFilter],
    );

    const anyDiscoverLoading = discoverLoading || searchLoading;

    // Renders the rich body of the join confirmation modal: avatar, name,
    // type/member count, access badges, and a truncated description. Only
    // produces output while the modal is open so the discriminated union
    // narrows cleanly.
    const renderJoinModalContent = () => {
        if (!joinModal.open) return null;
        const e = joinModal.entity;

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
                {/* Avatar + name + members row */}
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
        <div className="lg:w-[60vw] h-app-inner px-4 py-2 overflow-y-auto scrollbar-hide">
            <p className="text-2xl heading-large my-5">{t('myCommunity')}</p>

            <div className="bg-surface-default rounded-md p-6 overflow-auto scrollbar-hide max-h-[300px]">
                {myCommunitiesLoading ? (
                    <div className="text-center py-8 text-gray-500">
                        Loading your communities...
                    </div>
                ) : myCommunitiesData?.listUserCommunities?.length ? (
                    myCommunitiesData?.listUserCommunities?.map((community) => (
                        <MyCommunityCard
                            id={community.id}
                            key={community.id}
                            title={community.name}
                            description={community.description || ''}
                            avatarUrl={toCdnUrl(community.avatarUrl)}
                            communityType={community.communityType}
                        />
                    ))
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        You haven&apos;t joined any communities yet.
                    </div>
                )}
            </div>

            {pendingCommunityRequests.length > 0 && (
                <>
                    <p className="text-2xl heading-medium my-5">{t('pendingRequestsTitle')}</p>
                    <div className="bg-surface-default rounded-md p-2 sm:p-4 overflow-auto scrollbar-hide max-h-[300px]">
                        {pendingCommunityRequests.map((req) => (
                            <PendingRequestCard
                                key={req.id}
                                name={req.entityName}
                                href={`/community/${req.entityId}`}
                                pendingLabel={t('pendingBadge')}
                                cancelLabel={t('actions.cancelRequest')}
                                confirmTitle={t('cancelRequestTitle')}
                                confirmDescription={t('cancelRequestConfirm', { name: req.entityName })}
                                onCancel={() => handleCancelRequest(req.entityId)}
                                cancelling={cancelLoading}
                            />
                        ))}
                    </div>
                </>
            )}

            <p className="text-2xl heading-medium my-5">{t('discoverMore')}</p>

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

            <div className="overflow-auto scrollbar-hide grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                {anyDiscoverLoading ? (
                    <div className="col-span-full text-center py-8 text-gray-500">
                        Loading communities...
                    </div>
                ) : visibleCommunities.length ? (
                    visibleCommunities.map((community) => {
                        const isAlreadyJoined = JOINED_STATUSES.has(community.membershipStatus?.toUpperCase() ?? '') || joinedCommunities.has(community.id);
                        const isPendingStatus = community.membershipStatus === 'PENDING' || pendingCommunities.has(community.id);
                        const access = communityToAccess(community);
                        return (
                            <JoinCommunityCard
                                key={community.id}
                                title={community.name}
                                members={community.memberCount ?? 0}
                                onButtonClick={() => handleJoinClick(community)}
                                buttonText={
                                    isAlreadyJoined
                                        ? 'Joined'
                                        : isPendingStatus
                                            ? 'Pending'
                                            : tActions('join')
                                }
                                description={community.description || ''}
                                avatarUrl={community.avatarUrl}
                                isDisabled={isAlreadyJoined || isPendingStatus}
                                access={access ?? undefined}
                                communityType={community.communityType}
                            />
                        );
                    })
                ) : (
                    <div className="col-span-full">
                        <EmptyState
                            size="md"
                            icon={Globe}
                            title={tDiscovery('emptyFiltered')}
                        />
                    </div>
                )}
            </div>

            <ConfirmationModal
                open={joinModal.open}
                onCancel={() => setJoinModal({ open: false })}
                onConfirm={handleJoinConfirm}
                title={tJoinModal('communityTitle')}
                description=""
                confirmText={tActions('join')}
                isLoading={joinLoading}
            >
                {renderJoinModalContent()}
            </ConfirmationModal>

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
    );
}
