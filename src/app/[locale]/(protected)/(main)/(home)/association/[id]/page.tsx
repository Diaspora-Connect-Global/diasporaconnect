'use client';

import { useState } from 'react';
import AboutAssociation from "@/components/cards/association/AboutAssociation";
import { ButtonType1 } from "@/components/custom/button";
import { PeopleYouMayKnow } from "@/components/home/PeopleYouMayKnow";
import { useParams, useRouter } from 'next/navigation';
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import FeedCardWithReply from "@/components/cards/FeedCardWithReply";
import { useQuery, useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import {
    GET_ASSOCIATION_DETAILS,
    REQUEST_JOIN_ASSOCIATION,
    LEAVE_ASSOCIATION,
    CANCEL_JOIN_REQUEST,
    type AssociationJoinPolicy,
} from '@/services/gql/associations';
import { GET_FEED } from '@/services/gql/postsFeed';

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
const MEMBER = 'MEMBER'; // legacy

/* ------------------------------------------------------------------ */
/* Component */
/* ------------------------------------------------------------------ */
export default function AssociationPage() {
    const params = useParams();
    const router = useRouter();
    const associationId = params.id as string;

    const t = useTranslations("home.associations");
    const tActions = useTranslations("actions");

    const { data: detailsData, loading: detailsLoading } = useQuery<GetAssociationDetailsResponse>(
        GET_ASSOCIATION_DETAILS,
        { variables: { associationId } }
    );

    const { data: feedData, loading: feedLoading } = useQuery<GetFeedResponse>(GET_FEED, {
        variables: {
            input: {
                type: 'association',
                associationId,
                limit: 20,
                offset: 0,
            },
        },
    });

    const [requestJoin, { loading: joinLoading }] = useMutation(REQUEST_JOIN_ASSOCIATION, {
        variables: { associationId },
        refetchQueries: [{ query: GET_ASSOCIATION_DETAILS, variables: { associationId } }],
    });

    const [leaveAssociation, { loading: leaveLoading }] = useMutation(LEAVE_ASSOCIATION, {
        refetchQueries: [{ query: GET_ASSOCIATION_DETAILS, variables: { associationId } }],
    });

    const [cancelJoinRequest, { loading: cancelLoading }] = useMutation(CANCEL_JOIN_REQUEST, {
        refetchQueries: [{ query: GET_ASSOCIATION_DETAILS, variables: { associationId } }],
    });

    const [leaveModalOpen, setLeaveModalOpen] = useState(false);
    const association = detailsData?.getAssociation;
    const posts = feedData?.feed?.posts || [];

    const status = association?.membershipStatus;
    const joinPolicy = association?.joinPolicy ?? 'OPEN';
    const isActive = status === ACTIVE || status === MEMBER;
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
                toast.success(t('toasts.youAreNowMember', { name: association?.name ?? '' }));
            } else if (result?.status === PENDING) {
                toast.success(t('toasts.requestSubmitted'));
            } else if (result?.message) {
                toast.info(result.message);
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
                                        onClick={handleJoin}
                                        disabled={actionLoading}
                                    >
                                        {joinLoading ? tActions("joining") : tActions("join")}
                                    </ButtonType1>
                                )}
                                {canShowRequestToJoin && (
                                    <ButtonType1
                                        className="py-1 px-3 label-medium"
                                        onClick={handleJoin}
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
                                category={association.name}
                                postDate={post.createdAt}
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
                        />
                    </div>
                    <PeopleYouMayKnow />
                </div>
            </div>

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
        </div>
    );
}
