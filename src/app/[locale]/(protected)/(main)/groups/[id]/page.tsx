'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client/react';
import { ArrowLeft, CalendarDays, Clock, Globe, Lock, LogOut, MessageCircle, UserPlus, Users } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { ButtonType1 } from '@/components/custom/button';
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import PageLoader from '@/components/custom/PageLoader';
import { EmptyState } from '@/components/feedback';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link, useRouter } from '@/i18n/navigation';
import { toCdnUrl } from '@/lib/cdn';
import { displayName as personName } from '@/lib/displayName';
import { profileUrl } from '@/lib/profileUrl';
import { cn } from '@/lib/utils';
import {
    GET_GROUP,
    GET_GROUP_PAGE_MEMBERS,
    GET_MY_GROUPS,
    CHECK_GROUP_MEMBERSHIP,
    JOIN_GROUP,
    LEAVE_GROUP,
    REQUEST_TO_JOIN_GROUP,
    GroupPrivacy,
    MemberRole,
    MemberStatus,
    type GetGroupResponse,
    type GetGroupMembersResponse,
    type CheckGroupMembershipResponse,
    type JoinGroupResponse,
    type LeaveGroupResponse,
    type RequestToJoinGroupResponse,
} from '@/services/gql/groups';
import { useUserStore } from '@/store/useUserStore';

const ROLE_TONE: Record<string, string> = {
    OWNER: 'bg-surface-brand-light/60 text-text-brand',
    ADMIN: 'bg-surface-info text-text-info',
    MODERATOR: 'bg-surface-success text-text-success',
};

/** How many members to request per page (matches the backend default cap head-room). */
const MEMBERS_PAGE_SIZE = 50;

export default function GroupDetailPage() {
    const params = useParams();
    const groupId = Array.isArray(params.id) ? params.id[0] : (params.id ?? '');

    const t = useTranslations('community');
    const tActions = useTranslations('actions');
    const tIdentity = useTranslations('common.identity');
    const format = useFormatter();
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

    const { data: membershipData, loading: membershipLoading, refetch: refetchMembership } =
        useQuery<CheckGroupMembershipResponse>(CHECK_GROUP_MEMBERSHIP, {
            variables: { groupId },
            skip: !groupId,
            fetchPolicy: 'cache-and-network',
        });

    const group = groupData?.getGroup?.group;
    const membership = membershipData?.checkGroupMembership;

    const isOwner = !!group && !!currentUserId && group.ownerId === currentUserId;
    const isMember = !!membership?.isMember && membership?.status !== 'PENDING';
    const isPending = membership?.status === 'PENDING';
    const isPrivate = group?.privacy === GroupPrivacy.PRIVATE;
    const isPublic = group?.privacy === GroupPrivacy.PUBLIC;
    // Only a PUBLIC group shows its members to everyone. Anything else (PRIVATE,
    // SECRET) keeps the list to its members and owner — the API refuses anyone
    // else — so don't ask for it; the Members section explains instead.
    // `isMember` alone is not enough: it is also true for banned / invited rows.
    const canSeeMembers =
        !!group &&
        (isPublic ||
            isOwner ||
            (!!membership?.isMember && membership?.status === MemberStatus.ACTIVE));

    const {
        data: membersData,
        error: membersError,
        refetch: refetchMembers,
        fetchMore: fetchMoreMembers,
    } = useQuery<GetGroupMembersResponse>(GET_GROUP_PAGE_MEMBERS, {
        variables: { groupId, membersLimit: MEMBERS_PAGE_SIZE, membersOffset: 0 },
        skip: !groupId || !canSeeMembers,
        fetchPolicy: 'cache-and-network',
    });
    const [loadingMoreMembers, setLoadingMoreMembers] = useState(false);

    const [joinGroup, { loading: joinLoading }] = useMutation<JoinGroupResponse>(JOIN_GROUP);
    const [leaveGroup, { loading: leaveLoading }] = useMutation<LeaveGroupResponse>(LEAVE_GROUP);
    const [requestToJoin, { loading: requestLoading }] =
        useMutation<RequestToJoinGroupResponse>(REQUEST_TO_JOIN_GROUP);

    const members = useMemo(
        () => membersData?.getGroupMembers?.members ?? [],
        [membersData],
    );
    // Prefer the backend `hasMore` flag; fall back to comparing loaded rows
    // against the reported total for older gateways that omit it.
    const membersTotal = membersData?.getGroupMembers?.total ?? 0;
    const hasMoreMembers =
        membersData?.getGroupMembers?.hasMore ?? members.length < membersTotal;

    const handleLoadMoreMembers = async () => {
        if (loadingMoreMembers) return;
        setLoadingMoreMembers(true);
        try {
            await fetchMoreMembers({
                variables: { groupId, membersLimit: MEMBERS_PAGE_SIZE, membersOffset: members.length },
                updateQuery: (prev, { fetchMoreResult }) => {
                    if (!fetchMoreResult?.getGroupMembers) return prev;
                    const prevMembers = prev.getGroupMembers?.members ?? [];
                    const seen = new Set(prevMembers.map((m) => m.id));
                    const merged = [
                        ...prevMembers,
                        ...fetchMoreResult.getGroupMembers.members.filter((m) => !seen.has(m.id)),
                    ];
                    return {
                        getGroupMembers: {
                            ...fetchMoreResult.getGroupMembers,
                            members: merged,
                        },
                    };
                },
            });
        } catch (err) {
            console.error('Failed to load more members:', err);
        } finally {
            setLoadingMoreMembers(false);
        }
    };

    const refreshAll = () => {
        void refetchMembership();
        // Apollo runs a refetch even while the query is skipped, so refresh the
        // list only where joining/leaving here changes a list this viewer can
        // read: a PUBLIC group. For other groups, the membership refetch above
        // re-decides `canSeeMembers`, which starts or skips the query itself.
        if (isPublic) void refetchMembers();
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

    // Membership decides the Join / Request / Leave button and the members
    // list is above the fold, so all three gate the page together; otherwise
    // the button flips after the page has appeared.
    if (
        (groupLoading && !group) ||
        (membershipLoading && !membershipData) ||
        // Wait for the list only when it will be fetched. Checking for data
        // rather than `loading` also covers the render in which the query is
        // switched on, so "No members yet" never flashes.
        (canSeeMembers && !membersData && !membersError)
    ) {
        return <PageLoader />;
    }

    if (groupError || !group) {
        return (
            <div className="h-app-inner overflow-y-auto scrollbar-hide">
                <div className="mx-auto w-full px-4 py-6 lg:w-[80vw] lg:px-0">
                    <EmptyState
                        size="lg"
                        icon={Users}
                        title={t('groups.detail.notFoundTitle')}
                        description={t('groups.detail.notFoundBody')}
                        action={
                            <ButtonType1 onClick={() => router.push('/groups')}>
                                {t('groups.detail.browse')}
                            </ButtonType1>
                        }
                    />
                </div>
            </div>
        );
    }

    const memberCount = group.memberCount ?? 0;
    const cap = group.maxMembers && group.maxMembers > 0 ? group.maxMembers : null;
    const created = group.createdAt && !Number.isNaN(new Date(group.createdAt).getTime()) ? new Date(group.createdAt) : null;
    const chatHref = `/chat?ct=group&gid=${encodeURIComponent(group.id)}`;
    const canChat = isOwner || (!!membership?.isMember && membership?.status === MemberStatus.ACTIVE);
    const action = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';
    const primary = `${action} bg-surface-brand text-white hover:opacity-90`;
    const secondary = `${action} border border-border-subtle bg-surface-default text-text-primary hover:bg-surface-subtle`;

    return (
        <div className="h-app-inner overflow-y-auto scrollbar-hide">
          <div className="mx-auto w-full space-y-5 px-4 py-4 pb-10 lg:w-[80vw] lg:px-0 lg:py-6">
            <Link href="/groups" prefetch={false} data-testid="group-back" className="inline-flex items-center gap-2 rounded-md text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
                <ArrowLeft className="size-4" aria-hidden />
                {t('groups.detail.backToGroups')}
            </Link>

            {/* Header: cover band, avatar, name, facts, the one action that matters for this viewer. */}
            <section aria-labelledby="group-title" data-testid="group-header" className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-default shadow-sm">
                <div className="relative h-24 bg-gradient-to-br from-slate-900 via-blue-950 to-[var(--surface-brand)] sm:h-32" aria-hidden>
                    <span className="absolute -right-10 -top-12 size-48 rounded-full bg-white/5" />
                    <span className="absolute right-24 top-10 size-24 rounded-full bg-white/5" />
                </div>
                <div className="px-4 pb-5 sm:px-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
                            <Avatar className="-mt-10 size-20 shrink-0 border-4 border-surface-default bg-surface-default shadow-sm sm:-mt-12 sm:size-24">
                                <AvatarImage src={toCdnUrl(group.avatarUrl) || undefined} alt="" />
                                <AvatarFallback className="bg-surface-brand-light text-xl font-bold text-text-brand">{group.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 pb-0.5">
                                <h1 id="group-title" className="break-words text-2xl font-bold leading-tight text-text-primary">{group.name}</h1>
                                <ul className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                    <li className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium', isPrivate ? 'bg-surface-warning text-text-warning' : 'bg-surface-brand-light/60 text-text-brand')}>
                                        {isPrivate ? <Lock className="size-3" aria-hidden /> : <Globe className="size-3" aria-hidden />}
                                        {isPrivate ? t('groups.detail.private') : t('groups.detail.public')}
                                    </li>
                                    <li className="inline-flex items-center gap-1 rounded-full bg-surface-subtle px-2.5 py-1 font-medium text-text-secondary">
                                        <Users className="size-3" aria-hidden />
                                        {cap ? t('groups.detail.capacity', { count: memberCount, max: cap }) : t('groups.detail.memberCount', { count: memberCount })}
                                    </li>
                                    {created && (
                                        <li className="inline-flex items-center gap-1 rounded-full bg-surface-subtle px-2.5 py-1 font-medium text-text-secondary">
                                            <CalendarDays className="size-3" aria-hidden />
                                            {t('groups.detail.since', { date: format.dateTime(created, { month: 'long', year: 'numeric' }) })}
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>

                        {/* Membership action */}
                        <div className="flex shrink-0 flex-wrap items-center gap-2" data-testid="group-actions">
                            {canChat && (
                                <Link href={chatHref} prefetch={false} className={primary}>
                                    <MessageCircle className="size-4" aria-hidden />
                                    {t('groups.detail.openChat')}
                                </Link>
                            )}
                            {isOwner ? (
                                <span className="inline-flex min-h-10 items-center rounded-full bg-surface-subtle px-4 text-sm font-medium text-text-secondary">
                                    {t('groups.detail.youOwn')}
                                </span>
                            ) : isMember ? (
                                <button type="button" onClick={() => setLeaveModalOpen(true)} className={`${secondary} text-text-danger`}>
                                    <LogOut className="size-4" aria-hidden />
                                    {t('groups.detail.leave')}
                                </button>
                            ) : isPending ? (
                                <button type="button" disabled className={secondary}>
                                    <Clock className="size-4" aria-hidden />
                                    {t('groups.detail.requested')}
                                </button>
                            ) : isPrivate ? (
                                <button type="button" onClick={handleRequest} disabled={requestLoading} className={primary}>
                                    {t('groups.detail.requestToJoin')}
                                </button>
                            ) : (
                                <button type="button" onClick={handleJoin} disabled={joinLoading} className={primary}>
                                    <UserPlus className="size-4" aria-hidden />
                                    {tActions('join')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="min-w-0 space-y-5">
                    {group.description?.trim() && (
                        <section aria-labelledby="group-about" className="rounded-2xl border border-border-subtle bg-surface-default p-5 shadow-sm">
                            <h2 id="group-about" className="text-lg font-bold text-text-primary">{t('groups.detail.about')}</h2>
                            <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-text-primary">{group.description}</p>
                        </section>
                    )}

                    <section aria-labelledby="group-members" data-testid="group-members" className="rounded-2xl border border-border-subtle bg-surface-default p-5 shadow-sm">
                        <div className="mb-3 flex items-baseline justify-between gap-3">
                            <h2 id="group-members" className="text-lg font-bold text-text-primary">{t('groups.detail.membersTitle')}</h2>
                            {canSeeMembers && membersTotal > 0 && <span className="text-sm text-text-secondary">{t('groups.detail.memberCount', { count: membersTotal })}</span>}
                        </div>
                        {!canSeeMembers ? (
                            <div className="py-6">
                                <EmptyState size="sm" icon={Lock} title={t('groups.detail.membersHidden')} />
                            </div>
                        ) : members.length ? (
                            <ul className="-mx-2 divide-y divide-border-subtle">
                                    {members.map((m) => {
                                        const name = personName(m.profile, tIdentity('unknownUser'));
                                        const place = [m.profile?.city, m.profile?.residenceCountry].filter(Boolean).join(', ');
                                        const subtitle = [m.profile?.occupation, place].filter(Boolean).join(' · ');
                                        const role = m.role && m.role !== MemberRole.MEMBER ? m.role : null;
                                        return (
                                            <li key={m.id} className="min-w-0">
                                                <Link
                                                    href={profileUrl({ username: m.profile?.username, userId: m.userId })}
                                                    prefetch={false}
                                                    className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-text-brand"
                                                >
                                                    <Avatar className="size-11 shrink-0">
                                                        <AvatarImage src={toCdnUrl(m.profile?.avatarUrl) || undefined} alt="" />
                                                        <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-sm font-semibold text-text-primary">{name}</span>
                                                        {subtitle && <span className="block truncate text-xs text-text-secondary">{subtitle}</span>}
                                                    </span>
                                                    {role && (
                                                        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', ROLE_TONE[role] ?? 'bg-surface-subtle text-text-secondary')}>
                                                            {t(`groups.detail.roles.${role}`)}
                                                        </span>
                                                    )}
                                                </Link>
                                            </li>
                                        );
                                    })}
                            </ul>
                        ) : (
                            <div className="py-6">
                                <EmptyState size="sm" icon={Users} title={t('groups.detail.noMembers')} />
                            </div>
                        )}
                        {canSeeMembers && hasMoreMembers && (
                            <div className="mt-4 flex justify-center">
                                <button type="button" onClick={handleLoadMoreMembers} disabled={loadingMoreMembers} className={secondary}>
                                    {t('groups.detail.loadMore')}
                                </button>
                            </div>
                        )}
                    </section>
                </div>

                {/* Group info: what the privacy setting means, how full it is, how long it has existed. */}
                <aside aria-labelledby="group-info" data-testid="group-info" className="h-fit space-y-4 rounded-2xl border border-border-subtle bg-surface-default p-5 shadow-sm lg:sticky lg:top-0">
                    <h2 id="group-info" className="text-base font-bold text-text-primary">{t('groups.detail.info')}</h2>
                    <div className="flex items-start gap-3">
                        <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', isPrivate ? 'bg-surface-warning text-text-warning' : 'bg-surface-brand-light/60 text-text-brand')}>
                            {isPrivate ? <Lock className="size-4" aria-hidden /> : <Globe className="size-4" aria-hidden />}
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-text-primary">{isPrivate ? t('groups.detail.private') : t('groups.detail.public')}</p>
                            <p className="text-xs text-text-secondary">{isPrivate ? t('groups.detail.privateHint') : t('groups.detail.publicHint')}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-info text-text-info">
                            <Users className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-text-primary">
                                {cap ? t('groups.detail.capacity', { count: memberCount, max: cap }) : t('groups.detail.memberCount', { count: memberCount })}
                            </p>
                            {cap && (
                                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle" aria-hidden>
                                    <div className="h-full rounded-full bg-surface-brand" style={{ width: `${Math.min(100, Math.round((memberCount / cap) * 100))}%` }} />
                                </div>
                            )}
                        </div>
                    </div>
                    {created && (
                        <div className="flex items-start gap-3">
                            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-success text-text-success">
                                <CalendarDays className="size-4" aria-hidden />
                            </span>
                            <p className="min-w-0 pt-2 text-sm text-text-primary">{t('groups.detail.createdOn', { date: format.dateTime(created, { dateStyle: 'long' }) })}</p>
                        </div>
                    )}
                </aside>
            </div>
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
