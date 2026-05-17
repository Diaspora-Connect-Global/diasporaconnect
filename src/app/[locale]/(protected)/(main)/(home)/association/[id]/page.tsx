'use client';

import { useState, useEffect } from 'react';
import { formatDateProximity } from '@/macros/time';
import AboutAssociation from "@/components/cards/association/AboutAssociation";
import { ButtonType1 } from "@/components/custom/button";
import { PeopleYouMayKnow } from "@/components/home/PeopleYouMayKnow";
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import FeedCardWithReply from "@/components/cards/FeedCardWithReply";
import { useQuery, useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
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
import { buildMentionMap, type MentionInputItem } from '@/components/custom/richTextRenderer';

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
            await leaveAssociation({ variables: { associationId } });
            setLeaveModalOpen(false);
            toast.success(t('toasts.leftAssociation', { name: association?.name ?? '' }));
            router.push('/association');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to leave');
        }
    };

    const handleCancelRequest = async () => {
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

    return (
        <div className="lg:flex overflow-y-auto h-app-inner">
            <div className="overflow-y-auto scrollbar-hide lg:w-[40vw] px-3">
                <div className="min-h-[6rem] flex space-x-4 my-4 py-3 border-b">
                    <div className="h-[6rem] w-[6rem] flex-shrink-0">
                        <Image
                            width={90}
                            height={90}
                            src={association.avatarUrl || '/ADANSI.PNG'}
                            alt={association.name}
                            className="h-full w-full rounded-full object-cover"
                        />
                    </div>
                    <div className="flex flex-col justify-between w-full">
                        <div></div>
                        <div className="justify-between items-center w-full">
                            <p className="heading-xsmall">{association.name}</p>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                {isSuspended && (
                                    <span className="label-medium text-text-secondary">{t('badges.suspended')}</span>
                                )}
                                {isInviteOnly && !isActive && !isPending && (
                                    <span className="label-medium text-text-secondary flex items-center gap-1">
                                        {t('badges.inviteOnly')}
                                    </span>
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
                                        {joinLoading ? tActions("joining") : tActions("join")}
                                    </ButtonType1>
                                )}
                                {canShowRequestToJoin && (
                                    <ButtonType1
                                        className="py-1 px-3 label-medium"
                                        onClick={handleJoinClick}
                                        disabled={actionLoading}
                                    >
                                        {joinLoading ? tActions("joining") : t('actions.requestToJoin')}
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
                    <AboutAssociation
                        members={association.memberCount ?? 0}
                        createdDate={association.createdAt ?? ''}
                        visibility={association.visibility ?? 'Public'}
                        description={association.description ?? ''}
                        access={accessProfile}
                    />
                </div>

                <div className="overflow-auto lg:max-h-[calc(100vh-64px)] scrollbar-hide">
                    {feedLoading ? (
                        <p className="text-text-secondary text-sm py-4 px-2">{t("loadingPosts")}</p>
                    ) : posts.length > 0 ? (
                        posts.map((post) => (
                            <FeedCardWithReply
                                key={post.id}
                                postId={post.id}
                                profileImage={association.avatarUrl || '/ADANSI.PNG'}
                                profileName={association.name}
                                {...(post.authorType?.toUpperCase() === 'USER' ? { authorUserId: post.authorId } : {})}
                                authorEntityId={post.authorId}
                                authorEntityType={post.authorType}
                                createdAt={post.createdAt}
                                category={association.name}
                                postDate={formatDateProximity(post.createdAt)}
                                visibility={post.visibility as 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE'}
                                content={post.text}
                                mentionMap={buildMentionMap(post.mentions ?? [])}
                                shares={post.engagementCounts.shares}
                                likes={post.engagementCounts.likes}
                                comments={post.engagementCounts.comments}
                                onLike={(liked) => handleLike(post.id, liked)}
                                onComment={() => {}}
                                onShare={() => handleShare(post.id)}
                                onSave={(saved) => handleSave(post.id, saved)}
                                onSendComment={(content, parentId, mentions) => handleSendComment(post.id, content, parentId, mentions)}
                                onDelete={(id) => setLocalPosts(prev => prev.filter(p => p.id !== id))}
                                isLiked={post.userEngagement.hasLiked}
                                isSaved={post.userEngagement.hasSaved}
                                isShared={post.userEngagement.hasShared}
                                joinButton={!isActive}
                            />
                        ))
                    ) : (
                        <p className="text-text-secondary text-sm py-4 px-2">{t("noPosts")}</p>
                    )}
                </div>
            </div>

            <div className="lg:self-start h-app-inner lg:overflow-y-auto scrollbar-hide">
                <div className="space-y-6 flex-1 mb-6 mx-3">
                    <div className="hidden lg:block">
                        <AboutAssociation
                            members={association.memberCount ?? 0}
                            createdDate={association.createdAt ?? ''}
                            visibility={association.visibility ?? 'Public'}
                            description={association.description ?? ''}
                            access={accessProfile}
                        />
                    </div>
                    {showSettings && (
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
                    )}
                    <PeopleYouMayKnow />
                </div>
            </div>

            <ConfirmationModal
                open={joinModalOpen}
                onCancel={() => setJoinModalOpen(false)}
                onConfirm={handleJoinConfirm}
                title={canShowRequestToJoin ? 'Request to join association?' : 'Join association?'}
                description={association?.name ? `You are about to ${canShowRequestToJoin ? 'request to join' : 'join'} ${association.name}.` : `You are about to ${canShowRequestToJoin ? 'request to join this association' : 'join this association'}.`}
                confirmText={canShowRequestToJoin ? t('actions.requestToJoin') : tActions('join')}
                isLoading={joinLoading}
            />

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
        </div>
    );
}
