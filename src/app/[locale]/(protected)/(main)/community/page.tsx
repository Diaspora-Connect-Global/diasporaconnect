/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useQuery, useMutation } from '@apollo/client/react';
import JoinCommunityCard from "@/components/cards/JoinCommunityCard";
import { MyCommunityCard } from "@/components/cards/MyCommunityCard";
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import { useTranslations } from 'next-intl';
import {
    DISCOVER_COMMUNITIES,
    LIST_MY_JOINED_COMMUNITIES,
    REQUEST_JOIN_COMMUNITY,
    SEARCH_COMMUNITIES,
    type CommunityPaymentType,
    type CommunityVisibility,
} from '@/services/gql/community';
import { toast } from 'sonner';
import { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { MembershipPaymentModal } from './_components/MembershipPaymentModal';
import { toJoinPolicy, type AccessProfile, type Visibility } from '@/types/membership';
import { cn } from '@/lib/utils';

interface RequestMembershipPayload {
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
    }>({ open: false, clientSecret: null, communityId: '', communityName: '' });

    const { data: myCommunitiesData, loading: myCommunitiesLoading, refetch: refetchMyCommunities } = useQuery<ListUserCommunitiesData>(
        LIST_MY_JOINED_COMMUNITIES
    );

    const { data: discoverData, loading: discoverLoading, refetch: refetchCommunities } = useQuery<DiscoverCommunitiesData>(
        DISCOVER_COMMUNITIES,
        {
            variables: {
                includeRecommended: true,
                limit: 20,
                offset: 0
            }
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
        }
    );

    const [requestJoinCommunity, { loading: joinLoading }] = useMutation<RequestJoinCommunityResponse>(REQUEST_JOIN_COMMUNITY, {
        refetchQueries: [{ query: LIST_MY_JOINED_COMMUNITIES }],
        awaitRefetchQueries: false,
    });

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
                void refetchCommunities();
                void refetchSearch();
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
        setPaymentModal({ open: false, clientSecret: null, communityId: '', communityName: '' });
        if (communityId) {
            setJoinedCommunities(prev => new Set(prev).add(communityId));
        }
        toast.success('Payment successful. Welcome to the community!');
        void refetchCommunities();
        void refetchMyCommunities();
        void refetchSearch();
    };

    const handlePaymentClose = () => {
        setPaymentModal({ open: false, clientSecret: null, communityId: '', communityName: '' });
    };

    const handleJoinClick = (communityId: string, communityName: string) => {
        setJoinModal({ open: true, id: communityId, name: communityName });
    };

    const handleJoinConfirm = async () => {
        if (!joinModal.id) return;
        const { id, name } = joinModal;
        setJoinModal({ open: false, id: '', name: '' });
        await handleJoinCommunity(id, name);
    };

    // Filtered discovery list (uses SEARCH_COMMUNITIES so payment fields are available).
    // Falls back to legacy DISCOVER_COMMUNITIES when search is empty so we don't regress
    // existing recommendations behavior.
    const searchedCommunities = useMemo(
        () => searchData?.searchCommunities?.communities ?? [],
        [searchData],
    );
    const legacyCommunities = useMemo(
        () => discoverData?.discoverCommunities?.communities ?? [],
        [discoverData],
    );

    const renderList: SearchCommunityItem[] = useMemo(() => {
        if (searchedCommunities.length === 0 && legacyCommunities.length > 0) {
            return legacyCommunities.map((c) => ({
                id: c.id,
                name: c.name,
                description: c.description,
                memberCount: c.memberCount,
                avatarUrl: c.avatarUrl,
                visibility: (c.visibility as CommunityVisibility) ?? null,
                paymentType: null,
                priceAmount: null,
                priceCurrency: null,
                membershipStatus: c.membershipStatus,
            }));
        }
        return searchedCommunities;
    }, [searchedCommunities, legacyCommunities]);

    const visibleCommunities = useMemo(
        () =>
            renderList
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
        [renderList, visibilityFilter, pricingFilter],
    );

    const anyDiscoverLoading = discoverLoading || searchLoading;

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
                        />
                    ))
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        You haven&apos;t joined any communities yet.
                    </div>
                )}
            </div>

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
                        const isPendingStatus = community.membershipStatus === 'PENDING';
                        const access = communityToAccess(community);
                        return (
                            <JoinCommunityCard
                                key={community.id}
                                title={community.name}
                                members={community.memberCount ?? 0}
                                onButtonClick={() => handleJoinClick(community.id, community.name)}
                                buttonText={
                                    isAlreadyJoined
                                        ? 'Joined'
                                        : isPendingStatus
                                            ? 'Pending'
                                            : tActions('join')
                                }
                                description={community.description || ''}
                                isDisabled={isAlreadyJoined || isPendingStatus}
                                access={access ?? undefined}
                            />
                        );
                    })
                ) : (
                    <div className="col-span-full text-center py-8 text-gray-500">
                        {tDiscovery('emptyFiltered')}
                    </div>
                )}
            </div>

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
                onSuccess={handlePaymentSuccess}
                onClose={handlePaymentClose}
            />
        </div>
    );
}
