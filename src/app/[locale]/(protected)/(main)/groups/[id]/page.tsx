'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client/react';
import { ArrowLeft, Lock, Globe, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { ButtonType1, ButtonType3 } from '@/components/custom/button';
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import { EmptyState } from '@/components/feedback';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link, useRouter } from '@/i18n/navigation';
import { toCdnUrl } from '@/lib/cdn';
import { cn } from '@/lib/utils';
import {
    GET_GROUP,
    GET_GROUP_MEMBERS,
    GET_MY_GROUPS,
    CHECK_GROUP_MEMBERSHIP,
    JOIN_GROUP,
    LEAVE_GROUP,
    REQUEST_TO_JOIN_GROUP,
    GroupPrivacy,
    MemberRole,
    type GetGroupResponse,
    type GetGroupMembersResponse,
    type CheckGroupMembershipResponse,
    type JoinGroupResponse,
    type LeaveGroupResponse,
    type RequestToJoinGroupResponse,
} from '@/services/gql/groups';
import { useUserStore } from '@/store/useUserStore';

export default function GroupDetailPage() {
    const params = useParams();
    const groupId = Array.isArray(params.id) ? params.id[0] : (params.id ?? '');

    const t = useTranslations('community');
    const tActions = useTranslations('actions');
    const router = useRouter();

    const currentUserId = useUserStore((s) => s.user?.userId);

    const [leaveModalOpen, setLeaveModalOpen] = useState(false);

    const {
        data: groupData,
        loading: groupLoading,
        error: groupError,
    } = useQuery<GetGroupResponse>(GET_GROUP, {
        variables: { groupId },
        skip: !groupId,
        fetchPolicy: 'cache-and-network',
    });

    const { data: membershipData, refetch: refetchMembership } =
        useQuery<CheckGroupMembershipResponse>(CHECK_GROUP_MEMBERSHIP, {
            variables: { groupId },
            skip: !groupId,
            fetchPolicy: 'cache-and-network',
        });

    const { data: membersData, refetch: refetchMembers } =
        useQuery<GetGroupMembersResponse>(GET_GROUP_MEMBERS, {
            variables: { groupId, membersLimit: 50, membersOffset: 0 },
            skip: !groupId,
            fetchPolicy: 'cache-and-network',
        });

    const [joinGroup, { loading: joinLoading }] = useMutation<JoinGroupResponse>(JOIN_GROUP);
    const [leaveGroup, { loading: leaveLoading }] = useMutation<LeaveGroupResponse>(LEAVE_GROUP);
    const [requestToJoin, { loading: requestLoading }] =
        useMutation<RequestToJoinGroupResponse>(REQUEST_TO_JOIN_GROUP);

    const group = groupData?.getGroup?.group;
    const membership = membershipData?.checkGroupMembership;
    const members = useMemo(
        () => membersData?.getGroupMembers?.members ?? [],
        [membersData],
    );

    const isOwner = !!group && !!currentUserId && group.ownerId === currentUserId;
    const isMember = !!membership?.isMember && membership?.status !== 'PENDING';
    const isPending = membership?.status === 'PENDING';
    const isPrivate = group?.privacy === GroupPrivacy.PRIVATE;

    const refreshAll = () => {
        void refetchMembership();
        void refetchMembers();
    };

    const handleJoin = async () => {
        try {
            const { data } = await joinGroup({
                variables: { joinGroupId: groupId },
                refetchQueries: [{ query: GET_MY_GROUPS, variables: { limit: 20, offset: 0 } }],
            });
            const payload = data?.joinGroup;
            if (payload?.success) {
                toast.success(payload.message ?? t('groups.joinedToast'));
                refreshAll();
            } else {
                toast.error(payload?.message ?? t('groups.joinFailed'));
            }
        } catch (err) {
            console.error('Failed to join group:', err);
            toast.error(t('groups.joinFailed'));
        }
    };

    const handleRequest = async () => {
        try {
            const { data } = await requestToJoin({
                variables: { requestInput: { groupId } },
            });
            const payload = data?.requestToJoinGroup;
            if (payload?.success) {
                toast.success(payload.message ?? t('groups.detail.requestedToast'));
                refreshAll();
            } else {
                toast.error(payload?.message ?? t('groups.detail.requestFailed'));
            }
        } catch (err) {
            console.error('Failed to request to join group:', err);
            toast.error(t('groups.detail.requestFailed'));
        }
    };

    const handleLeave = async () => {
        try {
            const { data } = await leaveGroup({
                variables: { leaveGroupId: groupId },
                refetchQueries: [{ query: GET_MY_GROUPS, variables: { limit: 20, offset: 0 } }],
            });
            const payload = data?.leaveGroup;
            if (payload?.success) {
                toast.success(payload.message ?? t('groups.detail.leftToast'));
                setLeaveModalOpen(false);
                refreshAll();
            } else {
                toast.error(payload?.message ?? t('groups.detail.leaveFailed'));
            }
        } catch (err) {
            console.error('Failed to leave group:', err);
            toast.error(t('groups.detail.leaveFailed'));
        }
    };

    const memberName = (first?: string, last?: string) =>
        [first, last].filter(Boolean).join(' ').trim();

    if (groupLoading && !group) {
        return (
            <div className="lg:w-[60vw] h-app-inner px-4 py-6 overflow-y-auto scrollbar-hide">
                <div className="text-center py-16 text-gray-500">{t('groups.detail.loading')}</div>
            </div>
        );
    }

    if (groupError || !group) {
        return (
            <div className="lg:w-[60vw] h-app-inner px-4 py-6 overflow-y-auto scrollbar-hide">
                <EmptyState
                    size="lg"
                    icon={Users}
                    title={t('groups.detail.notFoundTitle')}
                    description={t('groups.detail.notFoundBody')}
                    action={
                        <ButtonType1 onClick={() => router.push('/community?tab=groups')}>
                            {t('groups.detail.browse')}
                        </ButtonType1>
                    }
                />
            </div>
        );
    }

    return (
        <div className="lg:w-[60vw] h-app-inner px-4 py-4 overflow-y-auto scrollbar-hide">
            <button
                type="button"
                onClick={() => router.push('/community?tab=groups')}
                className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-4"
            >
                <ArrowLeft className="w-4 h-4" />
                {t('groups.detail.back')}
            </button>

            {/* Header */}
            <div className="bg-surface-default rounded-2xl border border-border-subtle p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Avatar className="w-20 h-20 border border-border-subtle">
                        <AvatarImage src={toCdnUrl(group.avatarUrl) || undefined} alt={group.name} />
                        <AvatarFallback>{group.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                        <h1 className="heading-medium text-2xl text-text-primary truncate">{group.name}</h1>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                                className={cn(
                                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
                                    isPrivate
                                        ? 'bg-surface-hover text-text-secondary'
                                        : 'bg-text-brand/10 text-text-brand',
                                )}
                            >
                                {isPrivate ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                                {isPrivate ? t('groups.detail.private') : t('groups.detail.public')}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                                <Users className="w-3 h-3" />
                                {group.memberCount ?? 0} {t('members')}
                            </span>
                        </div>
                    </div>

                    {/* Membership action */}
                    <div className="flex-shrink-0">
                        {isOwner ? (
                            <span className="inline-flex items-center rounded-full bg-surface-hover px-3 py-1.5 text-sm text-text-secondary">
                                {t('groups.detail.owner')}
                            </span>
                        ) : isMember ? (
                            <ButtonType3
                                onClick={() => setLeaveModalOpen(true)}
                                className="text-text-danger"
                            >
                                {t('groups.detail.leave')}
                            </ButtonType3>
                        ) : isPending ? (
                            <ButtonType1 disabled>{t('groups.detail.requested')}</ButtonType1>
                        ) : isPrivate ? (
                            <ButtonType1 onClick={handleRequest} disabled={requestLoading}>
                                {t('groups.detail.requestToJoin')}
                            </ButtonType1>
                        ) : (
                            <ButtonType1 onClick={handleJoin} disabled={joinLoading}>
                                {tActions('join')}
                            </ButtonType1>
                        )}
                    </div>
                </div>

                {group.description && (
                    <p className="mt-4 body-medium text-text-primary whitespace-pre-line">
                        {group.description}
                    </p>
                )}
            </div>

            {/* Members */}
            <h2 className="heading-medium text-xl my-5">{t('groups.detail.membersTitle')}</h2>

            <div className="bg-surface-default rounded-2xl border border-border-subtle p-2">
                {members.length ? (
                    <ul className="flex flex-col divide-y divide-border-subtle">
                        {members.map((m) => {
                            const name = memberName(m.profile?.firstName, m.profile?.lastName) || m.userId;
                            const location = [m.profile?.city, m.profile?.residenceCountry]
                                .filter(Boolean)
                                .join(', ');
                            return (
                                <li key={m.id}>
                                    <Link
                                        href={`/${m.userId}`}
                                        className="flex items-center gap-3 py-3 px-2 rounded-md hover:bg-surface-hover transition-colors"
                                    >
                                        <Avatar className="w-10 h-10 flex-shrink-0">
                                            <AvatarImage
                                                src={toCdnUrl(m.profile?.avatarUrl) || undefined}
                                                alt={name}
                                            />
                                            <AvatarFallback>
                                                {name.slice(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="label-large text-text-primary truncate">{name}</p>
                                            {location && (
                                                <p className="body-small text-text-secondary truncate">
                                                    {location}
                                                </p>
                                            )}
                                        </div>
                                        {m.role && m.role !== MemberRole.MEMBER && (
                                            <span className="flex-shrink-0 inline-flex items-center rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                                                {t(`groups.detail.roles.${m.role}`)}
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="py-8">
                        <EmptyState size="sm" icon={Users} title={t('groups.detail.noMembers')} />
                    </div>
                )}
            </div>

            <ConfirmationModal
                open={leaveModalOpen}
                onCancel={() => setLeaveModalOpen(false)}
                onConfirm={handleLeave}
                title={t('groups.detail.leaveTitle')}
                description={t('groups.detail.leaveBody')}
                confirmText={t('groups.detail.leave')}
                confirmVariant="destructive"
                isLoading={leaveLoading}
            />
        </div>
    );
}
