'use client';

import { useState, useEffect } from 'react';
import AboutAssociation from "@/components/cards/association/AboutAssociation";
import { ButtonType1 } from "@/components/custom/button";
import { PeopleYouMayKnow } from "@/components/home/PeopleYouMayKnow";
import HomeSidebar from "@/components/home/HomeSidebar";
import { useAuthStore } from "@/store/useAuthStore";
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";
import { useQuery, useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { readMutationOutcome, refusalMessageKey } from '@/lib/mutationOutcome';
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import {
    GET_ASSOCIATION_DETAILS,
    GET_MY_ASSOCIATIONS,
    REQUEST_MEMBERSHIP_ASSOCIATION,
    LEAVE_ASSOCIATION,
    CANCEL_JOIN_REQUEST,
    type AssociationJoinPolicy,
    type AssociationPaymentType,
} from '@/services/gql/associations';
import { MembershipPaymentModal } from '@/components/memberships/MembershipPaymentModal';
import AccessSettingsForm from '@/components/cards/AccessSettingsForm';
import AccessBadges from '@/components/cards/AccessBadges';
import {
    toJoinPolicy,
    type AccessProfile,
    type JoinPolicy,
    type MembershipEntity,
    type PaymentType,
    type RequestMembershipResult,
    type SubscriptionPeriod,
    type Visibility,
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
import type { Attachment } from '@/services/gql/types/postsFeed';
import { type MentionInputItem } from '@/components/custom/richTextRenderer';
import { toCdnUrl } from '@/lib/cdn';
import { EmbassyCommunityView } from '@/components/community/embassy/EmbassyCommunityView';
import { associationToEmbassyCommunity } from '@/components/community/embassy/associationAdapter';
import type { EmbassyFeedPost } from '@/components/community/embassy/types';

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */
interface AssociationDetails {
    id: string;
    name: string;
    description?: string;
    avatarUrl?: string;
    memberCount?: number;
    createdAt?: string;
    visibility?: string;
    joinPolicy?: AssociationJoinPolicy;
    paymentType?: AssociationPaymentType | null;
    priceAmount?: number | null;
    priceCurrency?: string | null;
    defaultGroupId?: string | null;
    membershipStatus?: string | null; // ACTIVE | PENDING | SUSPENDED | MEMBER (legacy)
    /**
     * Enabled member-facing service module keys. `null`/absent → all enabled
     * (legacy/non-loaded); `[]` → none enabled. Drives module gating.
     */
    enabledServices?: string[] | null;
    associationType?: { id: string; name: string } | null;
}

interface GetAssociationDetailsResponse {
    getAssociation: AssociationDetails;
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
    attachments?: Attachment[];
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

/* ------------------------------------------------------------------ */
/* Component */
/* ------------------------------------------------------------------ */
export default function AssociationPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const associationId = params.id as string;
    const showSettings = searchParams.get('settings') === '1';

    const t = useTranslations("home.associations");
    const tActions = useTranslations("actions");
    const tJoinModal = useTranslations('home.joinModal');
    // Root-scoped on purpose: `refusalMessageKey` returns a FULLY QUALIFIED
    // key path (e.g. 'community.errors.not_found'), so it must be handed to an
    // UNSCOPED translator or next-intl prefixes the scope and resolves nothing.
    const tRoot = useTranslations();

    const { data: detailsData, loading: detailsLoading } = useQuery<GetAssociationDetailsResponse>(
        GET_ASSOCIATION_DETAILS,
        {
            variables: { associationId },
            fetchPolicy: 'cache-and-network',
        }
    );

    const { data: myAssociationsData } = useQuery<{
        getMyAssociations: { associations: { id: string }[] };
    }>(GET_MY_ASSOCIATIONS, {
        variables: { page: 1, limit: 500 },
        fetchPolicy: 'cache-and-network',
        skip: !associationId,
    });

    const { data: feedData, loading: feedLoading } = useQuery<GetFeedResponse>(GET_FEED, {
        variables: {
            input: {
                type: 'ASSOCIATION',
                associationId,
                limit: 20,
                offset: 0,
            },
        },
    });

    const [requestMembershipMutation, { loading: joinLoading }] = useMutation<{
        requestMembership: {
            id?: string | null;
            status: string;
            message?: string | null;
            requiresPayment?: boolean | null;
            clientSecret?: string | null;
        };
    }>(REQUEST_MEMBERSHIP_ASSOCIATION, {
        refetchQueries: [
            { query: GET_ASSOCIATION_DETAILS, variables: { associationId } },
            { query: GET_MY_ASSOCIATIONS, variables: { page: 1, limit: 500 } },
        ],
    });

    const [leaveAssociation, { loading: leaveLoading }] = useMutation(LEAVE_ASSOCIATION, {
        refetchQueries: [
            { query: GET_ASSOCIATION_DETAILS, variables: { associationId } },
            { query: GET_MY_ASSOCIATIONS, variables: { page: 1, limit: 500 } },
        ],
    });

    const [cancelJoinRequest, { loading: cancelLoading }] = useMutation(CANCEL_JOIN_REQUEST, {
        refetchQueries: [
            { query: GET_ASSOCIATION_DETAILS, variables: { associationId } },
            { query: GET_MY_ASSOCIATIONS, variables: { page: 1, limit: 500 } },
        ],
    });

    const [addEngagement] = useMutation<AddEngagementData>(ADD_ENGAGEMENT);
    const [removeEngagement] = useMutation<RemoveEngagementData>(REMOVE_ENGAGEMENT);
    const [createComment] = useMutation<CreateCommentData>(CREATE_COMMENT);

    const [hydrated, setHydrated] = useState(false);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
    useEffect(() => {
        const unsubscribe = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
        if (useAuthStore.persist.hasHydrated()) setHydrated(true);
        return unsubscribe;
    }, []);
    const showSidebar = hydrated && isAuthenticated;

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

    const association = detailsData?.getAssociation;
    const posts = localPosts;

    const status = association?.membershipStatus;
    const joinPolicy = association?.joinPolicy ?? 'OPEN';
    const myAssociationIds = new Set(
        myAssociationsData?.getMyAssociations?.associations?.map((a) => a.id) ?? []
    );
    const isMemberFromMyList = associationId ? myAssociationIds.has(associationId) : false;
    const isActive = isMemberStatus(status) || isMemberFromMyList;
    const isPending = status === PENDING;
    const isSuspended = status === SUSPENDED;
    const isInviteOnly = joinPolicy === 'INVITE_ONLY';
    const canShowJoin = !isActive && !isPending && !isSuspended && joinPolicy === 'OPEN';
    const canShowRequestToJoin = !isActive && !isPending && !isSuspended && joinPolicy === 'REQUEST';
    const canLeave = isActive;
    const canCancelRequest = isPending;

    // The paid-membership flow is driven by the shared MembershipPaymentModal.
    // It owns the REQUEST_MEMBERSHIP invocation when payment is required so it
    // can branch into the Stripe/Paystack rails. For free entities we call
    // REQUEST_MEMBERSHIP directly and skip the modal.
    const isPaidEntity =
        association?.paymentType === 'ONE_TIME' || association?.paymentType === 'SUBSCRIPTION';

    const callRequestMembership = async (period?: SubscriptionPeriod) => {
        const result = await requestMembershipMutation({
            variables: {
                input: {
                    entityId: associationId,
                    entityType: 'ASSOCIATION',
                    ...(period ? { subscriptionPeriod: period.toUpperCase() } : {}),
                },
            },
        });
        const payload = result.data?.requestMembership;
        if (!payload) throw new Error('Request failed');
        return payload;
    };

    const handleDirectJoin = async () => {
        try {
            const payload = await callRequestMembership();
            if (payload.status === ACTIVE || payload.status === MEMBER) {
                toast.success(t('toasts.youAreNowMember', { name: association?.name ?? '' }));
            } else if (payload.status === PENDING) {
                toast.success(t('toasts.requestSubmitted'));
            } else if (payload.message) {
                toast.info(payload.message);
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Request failed';
            if (isInviteOnly) {
                toast.error(t('toasts.inviteOnly'));
            } else {
                toast.error(msg);
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
        toast.success(t('toasts.youAreNowMember', { name: association?.name ?? '' }));
    };

    const handlePaymentClose = () => setPaymentModalOpen(false);

    // GUESS: BE `priceAmount` is already the smallest-unit (cents/pesewas) integer —
    // mirrors Community's `Int` gateway typing and the payment-service convention.
    // If the actual value is in major units, this will need a *100 multiply.
    // Flagged for reviewer in /tmp/payments-coder-notes.md.
    const paymentEntity: MembershipEntity | null = association
        ? {
              kind: 'association',
              id: association.id,
              name: association.name,
              access: {
                  visibility: (association.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC'),
                  joinPolicy: 'PAID',
                  paymentType: association.paymentType ?? 'NONE',
                  ...(association.priceAmount != null && association.priceCurrency
                      ? {
                            price: {
                                amountInCents: Math.round(Number(association.priceAmount)),
                                currency: association.priceCurrency,
                            },
                        }
                      : {}),
              },
          }
        : null;

    const handleLeaveClick = () => setLeaveModalOpen(true);

    const handleLeaveConfirm = async () => {
        try {
            const result = await leaveAssociation({ variables: { associationId } });
            const outcome = readMutationOutcome(result, d => d.leaveAssociation);
            if (!outcome.ok) {
                const key = refusalMessageKey(outcome.message, 'community.errors');
                toast.error(tRoot(key));
                return;
            }
            setLeaveModalOpen(false);
            toast.success(t('toasts.leftAssociation', { name: association?.name ?? '' }));
            router.push('/association');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to leave');
        }
    };

    const handleCancelRequest = async () => {
        try {
            const result = await cancelJoinRequest({
                variables: {
                    input: { entityId: associationId, entityType: 'ASSOCIATION' },
                },
            });
            const outcome = readMutationOutcome(result, d => d.cancelJoinRequest);
            if (!outcome.ok) {
                const key = refusalMessageKey(outcome.message, 'community.errors');
                toast.error(tRoot(key));
                return;
            }
            toast.success(t('toasts.requestCancelled'));
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to cancel request');
        }
    };

    if (detailsLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-4">
                <p className="text-text-secondary">{t("loading")}</p>
            </div>
        );
    }

    if (!association) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-4">
                <div className="bg-surface-default border border-border-disabled shadow-md rounded-lg p-6 text-center max-w-md w-full">
                    <div className="mx-auto w-24 h-24 mb-4">
                        <Image
                            src="/ADANSI.PNG"
                            alt="Not found"
                            width={96}
                            height={96}
                            className="rounded-full object-cover"
                        />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2">{t("notfound.title")}</h2>
                    <p className="text-sm text-text-primary mb-6">
                        {t("notfound.description")}
                    </p>
                    <div className="flex justify-center gap-3">
                        <Link href="/association">
                            <ButtonType1>
                                {t("notfound.browse")}
                            </ButtonType1>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const actionLoading = joinLoading || leaveLoading || cancelLoading;

    const accessProfile: AccessProfile | undefined = association.visibility
        ? {
              visibility: (association.visibility as Visibility) ?? 'PUBLIC',
              joinPolicy: toJoinPolicy(association.joinPolicy),
              paymentType: (association.paymentType ?? 'NONE') as PaymentType,
              price:
                  association.paymentType && association.paymentType !== 'NONE' && association.priceAmount
                      ? {
                            amountInCents: association.priceAmount,
                            currency: association.priceCurrency ?? 'GHS',
                        }
                      : undefined,
          }
        : undefined;

    // Rich body for the join confirmation modal — avatar, name, type +
    // member count, access badges, optional approval-required chip, and a
    // truncated description. Mirrors the home-page pattern. Returns null
    // when association hasn't loaded yet so the modal renders nothing
    // weird if it ever opens too early.
    const renderJoinModalContent = () => {
        if (!association) return null;
        const access: AccessProfile = {
            visibility: association.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
            joinPolicy: toJoinPolicy(association.joinPolicy),
            paymentType:
                association.paymentType === 'ONE_TIME' || association.paymentType === 'SUBSCRIPTION'
                    ? (association.paymentType as 'ONE_TIME' | 'SUBSCRIPTION')
                    : 'NONE',
            price:
                typeof association.priceAmount === 'number' && association.priceCurrency
                    ? { amountInCents: association.priceAmount, currency: association.priceCurrency }
                    : undefined,
        };
        const typeName = association.associationType?.name;
        const memberCount = association.memberCount ?? 0;

        return (
            <div className="flex flex-col gap-3">
                {/* Avatar + name + type/members row */}
                <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={toCdnUrl(association.avatarUrl) || '/GLOBE.png'}
                        alt={association.name}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover border border-border-subtle flex-shrink-0"
                    />
                    <div className="min-w-0">
                        <p className="font-semibold text-text-primary truncate">{association.name}</p>
                        <p className="text-xs text-text-secondary truncate">
                            {typeName ? `${typeName} · ` : ''}
                            {memberCount === 1
                                ? tJoinModal('membersOne')
                                : tJoinModal('membersOther', { count: memberCount })}
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
                {association.description && (
                    <p className="text-sm text-text-secondary line-clamp-2">{association.description}</p>
                )}
            </div>
        );
    };

    // The membership dialogs are identical for both the tabbed view and the
    // owner "settings" surface — kept in one fragment so nothing regresses.
    const membershipModals = (
        <>
            <ConfirmationModal
                open={joinModalOpen}
                onCancel={() => setJoinModalOpen(false)}
                onConfirm={handleJoinConfirm}
                title={canShowRequestToJoin ? 'Request to join association?' : tJoinModal('associationTitle')}
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
                title={t('leaveConfirm.title')}
                description={t('leaveConfirm.description')}
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
        </>
    );

    // Owner-only settings surface (`?settings=1`). Preserves the AccessSettingsForm
    // control plus the AboutAssociation summary and PeopleYouMayKnow rail that the
    // flat feed used to show, now reachable alongside the tabbed module.
    if (showSettings) {
        return (
            <div className="mx-auto lg:flex min-h-full">
                {showSidebar && (
                    <div className="hidden lg:block lg:sticky lg:w-[20vw] top-[4rem] h-full scrollbar-hide">
                        <HomeSidebar />
                    </div>
                )}
                <div className="min-w-0 flex-1 h-app-inner overflow-y-auto scrollbar-hide">
                    <div className="mx-auto max-w-2xl space-y-6 px-3 py-6">
                        <Link
                            href={`/association/${associationId}`}
                            className="label-medium inline-flex items-center gap-1 text-text-brand"
                        >
                            <ChevronLeft className="size-4" aria-hidden />
                            {association.name}
                        </Link>
                        <AboutAssociation
                            members={association.memberCount ?? 0}
                            createdDate={association.createdAt ?? ''}
                            visibility={association.visibility ?? 'Public'}
                            description={association.description ?? ''}
                            access={accessProfile}
                        />
                        <AccessSettingsForm
                            kind="association"
                            entityId={associationId}
                            initial={{
                                visibility: (association.visibility as Visibility) ?? 'PUBLIC',
                                joinPolicy: toJoinPolicy(association.joinPolicy) as JoinPolicy,
                                paymentType: (association.paymentType ?? 'NONE') as PaymentType,
                                priceAmount: association.priceAmount ?? null,
                                priceCurrency: association.priceCurrency ?? null,
                            }}
                        />
                        <PeopleYouMayKnow />
                    </div>
                </div>
                {membershipModals}
            </div>
        );
    }

    // Primary surface: the owner-type aware Embassy tabbed module, gated by
    // association.enabledServices (applied inside EmbassyTabBar/View via the same
    // isTabEnabled helper) and driving every tab with ownerType ASSOCIATION.
    return (
        <>
            <EmbassyCommunityView
                variant="general"
                ownerKind="association"
                community={associationToEmbassyCommunity(association)}
                posts={posts as EmbassyFeedPost[]}
                feedLoading={feedLoading}
                displayMemberCount={association.memberCount ?? 0}
                isActive={isActive}
                isPending={isPending}
                isSuspended={isSuspended}
                isInviteOnly={isInviteOnly}
                canShowJoin={canShowJoin}
                canShowRequestToJoin={canShowRequestToJoin}
                canLeave={canLeave}
                canCancelRequest={canCancelRequest}
                actionLoading={actionLoading}
                joinLoading={joinLoading}
                onJoinClick={handleJoinClick}
                onLeaveClick={handleLeaveClick}
                onCancelRequest={handleCancelRequest}
                onLike={handleLike}
                onSave={handleSave}
                onShare={handleShare}
                onSendComment={handleSendComment}
                onDeletePost={(id) => setLocalPosts((prev) => prev.filter((p) => p.id !== id))}
                showSidebar={showSidebar}
            />
            {membershipModals}
        </>
    );
}
