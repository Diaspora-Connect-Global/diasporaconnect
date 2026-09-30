'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@apollo/client/react';
import { Loader2, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ButtonType1 } from '@/components/custom/button';
import {
    GROUP_PRIVATE_REPLIES,
    type GroupPrivateRepliesData,
    type PrivateReply,
    type PrivateReplySettings,
} from '@/services/gql/privateReplies';
import { audienceText, personLabel, type NameOf } from '@/lib/privateReplies';
import { useEnsureMemberNamesLoaded } from '@/hooks/useEnsureMemberNamesLoaded';
import { ManagePrivateReplyDialog } from './ManagePrivateReplyDialog';
import type { PickablePerson } from './PeoplePickerDialog';

const ADMIN_PAGE = 20;

/**
 * "Private replies in this group": the viewer's own (open one), and — only
 * while the platform lets group admins manage them and the viewer is one — a
 * management tab listing every private reply's members. That tab never shows
 * or links to messages.
 */
export function PrivateRepliesListDialog({
    open,
    groupConversationId,
    replies,
    settings,
    currentUserId,
    isGroupAdmin,
    people,
    nameOf,
    avatarOf,
    membersHasMore,
    membersLoadingMore,
    onLoadMoreMembers,
    onOpenReply,
    onClose,
    onChanged,
}: {
    open: boolean;
    groupConversationId: string;
    replies: PrivateReply[];
    settings: PrivateReplySettings;
    currentUserId: string;
    isGroupAdmin: boolean;
    people: PickablePerson[];
    nameOf: NameOf;
    avatarOf: (userId: string) => string | undefined;
    /** More group members exist beyond the pages loaded so far. */
    membersHasMore: boolean;
    /** A page of more group members is currently being fetched. */
    membersLoadingMore: boolean;
    /** Fetch the next page of group members — also how the admin tab's unresolved names get found. */
    onLoadMoreMembers: () => void;
    onOpenReply: (privateReplyId: string) => void;
    onClose: () => void;
    onChanged: () => void;
}) {
    const t = useTranslations('chat.group.privateReply');
    const locale = useLocale();
    const tIdentity = useTranslations('common.identity');
    const labels = useMemo(
        () => ({ you: t('you'), formerMember: t('formerMember'), unknown: tIdentity('aMember') }),
        [t, tIdentity],
    );
    const showAdminTab = isGroupAdmin && settings.memberManagement === 'GROUP_ADMINS';
    const [tab, setTab] = useState<'mine' | 'admin'>('mine');
    const [managing, setManaging] = useState<PrivateReply | null>(null);

    const { data, loading, fetchMore, refetch } = useQuery<GroupPrivateRepliesData>(GROUP_PRIVATE_REPLIES, {
        variables: { groupConversationId, limit: ADMIN_PAGE },
        skip: !open || !showAdminTab || tab !== 'admin',
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
        context: { silentErrors: true },
    });
    const adminItems = useMemo(() => data?.groupPrivateReplies?.items ?? [], [data]);
    const nextCursor = data?.groupPrivateReplies?.nextCursor ?? '';

    // The admin tab lists every private reply in the group, not just the
    // viewer's own — a different id set than GroupChat's markers/mine tab, so
    // it needs its own pass at paging in unresolved names.
    const adminNamesNeeded = useMemo(
        () => adminItems.flatMap((reply) => [...reply.memberUserIds, reply.anchor?.senderId]),
        [adminItems],
    );
    useEnsureMemberNamesLoaded(adminNamesNeeded, nameOf, currentUserId, membersHasMore, membersLoadingMore, onLoadMoreMembers);

    const snippet = (reply: PrivateReply) =>
        reply.anchor
            ? `${personLabel(reply.anchor.senderId, currentUserId, nameOf, labels)}: ${reply.anchor.contentSnippet}`
            : t('anchorDeleted');

    const tabClass = (active: boolean) =>
        `px-3 py-1.5 rounded-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-brand ${
            active ? 'bg-surface-brand text-text-white' : 'text-text-secondary hover:bg-surface-hover'
        }`;

    return (
        <>
            <Dialog open={open && !managing} onOpenChange={(next) => !next && onClose()}>
                <DialogContent className="max-w-md w-[90vw] max-h-[85dvh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-1.5">
                            <Lock className="w-4 h-4" aria-hidden="true" />
                            {t('listTitle')}
                        </DialogTitle>
                        <DialogDescription>
                            {tab === 'admin' ? t('adminTabHint') : t('listHint')}
                        </DialogDescription>
                    </DialogHeader>

                    {showAdminTab ? (
                        <div role="tablist" aria-label={t('listTitle')} className="flex gap-1 overflow-x-auto">
                            <button type="button" role="tab" aria-selected={tab === 'mine'} className={`shrink-0 whitespace-nowrap ${tabClass(tab === 'mine')}`} onClick={() => setTab('mine')}>
                                {t('tabMine')}
                            </button>
                            <button type="button" role="tab" aria-selected={tab === 'admin'} className={`shrink-0 whitespace-nowrap ${tabClass(tab === 'admin')}`} onClick={() => setTab('admin')}>
                                {t('tabAdmin')}
                            </button>
                        </div>
                    ) : null}

                    <ul className="flex-1 min-h-0 overflow-y-auto space-y-2">
                        {tab === 'mine' ? (
                            replies.length === 0 ? (
                                <li className="py-6 text-center text-sm text-text-secondary">{t('noneYet')}</li>
                            ) : (
                                replies.map((reply) => (
                                    <li key={reply.id}>
                                        <button
                                            type="button"
                                            onClick={() => onOpenReply(reply.id)}
                                            className="w-full text-left rounded-lg border border-border-subtle p-3 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-brand"
                                        >
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="truncate text-sm font-medium text-text-primary">
                                                    {audienceText(reply.memberUserIds, currentUserId, nameOf, labels, locale)}
                                                </span>
                                                {reply.unreadCount > 0 ? (
                                                    <span className="flex-shrink-0 rounded-full bg-surface-brand px-2 py-0.5 text-[11px] text-text-white">
                                                        {t('newCount', { count: reply.unreadCount })}
                                                    </span>
                                                ) : null}
                                            </span>
                                            <span className="mt-1 block truncate text-xs text-text-secondary">{snippet(reply)}</span>
                                        </button>
                                    </li>
                                ))
                            )
                        ) : loading && adminItems.length === 0 ? (
                            <li className="flex justify-center py-6">
                                <Loader2 className="w-5 h-5 animate-spin text-text-secondary" aria-label={t('loading')} />
                            </li>
                        ) : adminItems.length === 0 ? (
                            <li className="py-6 text-center text-sm text-text-secondary">{t('noneInGroup')}</li>
                        ) : (
                            adminItems.map((reply) => (
                                <li key={reply.id} className="rounded-lg border border-border-subtle p-3">
                                    <p className="truncate text-sm font-medium text-text-primary">
                                        {audienceText(reply.memberUserIds, currentUserId, nameOf, labels, locale)}
                                    </p>
                                    <p className="mt-1 truncate text-xs text-text-secondary">{snippet(reply)}</p>
                                    <div className="mt-2 flex justify-end">
                                        <ButtonType1 onClick={() => setManaging(reply)}>
                                            {t('manage')}
                                        </ButtonType1>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>

                    {tab === 'admin' && nextCursor ? (
                        <ButtonType1
                            onClick={() =>
                                void fetchMore({
                                    variables: { groupConversationId, cursor: nextCursor, limit: ADMIN_PAGE },
                                    updateQuery: (prev, { fetchMoreResult }) => {
                                        if (!fetchMoreResult?.groupPrivateReplies) return prev;
                                        const seen = new Set(prev.groupPrivateReplies.items.map((i) => i.id));
                                        return {
                                            groupPrivateReplies: {
                                                items: [
                                                    ...prev.groupPrivateReplies.items,
                                                    ...fetchMoreResult.groupPrivateReplies.items.filter((i) => !seen.has(i.id)),
                                                ],
                                                nextCursor: fetchMoreResult.groupPrivateReplies.nextCursor,
                                            },
                                        };
                                    },
                                })
                            }
                        >
                            {t('loadMore')}
                        </ButtonType1>
                    ) : null}
                </DialogContent>
            </Dialog>

            {managing ? (
                <ManagePrivateReplyDialog
                    open
                    privateReply={managing}
                    settings={settings}
                    currentUserId={currentUserId}
                    people={people}
                    isGroupAdmin={isGroupAdmin}
                    nameOf={nameOf}
                    avatarOf={avatarOf}
                    membersHasMore={membersHasMore}
                    membersLoadingMore={membersLoadingMore}
                    onLoadMoreMembers={onLoadMoreMembers}
                    onClose={() => setManaging(null)}
                    onChanged={() => {
                        setManaging(null);
                        void refetch().catch(() => undefined);
                        onChanged();
                    }}
                    onLeft={() => {
                        setManaging(null);
                        onChanged();
                    }}
                />
            ) : null}
        </>
    );
}
