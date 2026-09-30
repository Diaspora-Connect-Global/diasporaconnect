'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation } from '@apollo/client/react';
import { Loader2, UserMinus, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ButtonType1 } from '@/components/custom/button';
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import {
    ADD_PRIVATE_REPLY_MEMBERS,
    LEAVE_PRIVATE_REPLY,
    REMOVE_PRIVATE_REPLY_MEMBER,
    type AddPrivateReplyMembersData,
    type LeavePrivateReplyData,
    type PrivateReply,
    type PrivateReplySettings,
    type RemovePrivateReplyMemberData,
} from '@/services/gql/privateReplies';
import { personLabel, privateReplyErrorKey, remainingSlots, type NameOf } from '@/lib/privateReplies';
import { PeoplePickerDialog, type PickablePerson } from './PeoplePickerDialog';

const SILENT = { silentErrors: true } as const;

/**
 * Who is in a private reply, and — when the platform setting allows the
 * viewer — adding and removing people. Leaving is always offered to members.
 * Group admins managing it (GROUP_ADMINS mode) see only this member list,
 * never its messages, and can't add themselves (the server refuses anyway).
 */
export function ManagePrivateReplyDialog({
    open,
    privateReply,
    settings,
    currentUserId,
    people,
    isGroupAdmin,
    nameOf,
    avatarOf,
    membersHasMore,
    membersLoadingMore,
    onLoadMoreMembers,
    onClose,
    onChanged,
    onLeft,
}: {
    open: boolean;
    privateReply: PrivateReply;
    settings: PrivateReplySettings;
    currentUserId: string;
    /** Group members other than the current user. */
    people: PickablePerson[];
    isGroupAdmin: boolean;
    nameOf: NameOf;
    avatarOf: (userId: string) => string | undefined;
    /** More group members exist beyond the pages loaded so far. */
    membersHasMore: boolean;
    /** A page of more group members is currently being fetched. */
    membersLoadingMore: boolean;
    /** Fetch the next page of group members, for the "add people" picker. */
    onLoadMoreMembers: () => void;
    onClose: () => void;
    onChanged: () => void;
    onLeft: () => void;
}) {
    const t = useTranslations('chat.group.privateReply');
    const tIdentity = useTranslations('common.identity');
    const labels = useMemo(
        () => ({ you: t('you'), formerMember: t('formerMember'), unknown: tIdentity('aMember') }),
        [t, tIdentity],
    );
    const name = (id: string) => personLabel(id, currentUserId, nameOf, labels);

    const [pickerOpen, setPickerOpen] = useState(false);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);

    const [addMembers] = useMutation<AddPrivateReplyMembersData>(ADD_PRIVATE_REPLY_MEMBERS, { context: SILENT });
    const [removeMember] = useMutation<RemovePrivateReplyMemberData>(REMOVE_PRIVATE_REPLY_MEMBER, { context: SILENT });
    const [leave] = useMutation<LeavePrivateReplyData>(LEAVE_PRIVATE_REPLY, { context: SILENT });

    const members = privateReply.memberUserIds;
    const slots = remainingSlots(members.length, settings.maxMembers);
    const canManage = privateReply.canManage;
    // Nobody already in it, and never yourself when managing as a group admin.
    const candidates = people.filter((p) => !members.includes(p.userId));

    const note = (() => {
        switch (settings.memberManagement) {
            case 'NOBODY':
                return t('manageNoteNobody');
            case 'GROUP_ADMINS':
                return t('manageNoteGroupAdmins');
            default:
                return canManage
                    ? t('manageNoteStarterYou')
                    : privateReply.managerUserId
                      ? t('manageNoteStarter', { name: name(privateReply.managerUserId) })
                      : t('manageNoteNobodyLeft');
        }
    })();

    const reportRefusal = (error: unknown) => toast.error(t(`errors.${privateReplyErrorKey(error)}`));

    const handleAdd = async (userIds: string[]) => {
        setPickerOpen(false);
        if (userIds.length === 0) return;
        setBusy('add');
        try {
            const result = await addMembers({ variables: { privateReplyId: privateReply.id, userIds } });
            if (!result.data?.addPrivateReplyMembers) return reportRefusal(result.error);
            toast.success(settings.newMembersSeeHistory ? t('addedWithHistory') : t('addedFromNow'));
            onChanged();
        } catch (error) {
            reportRefusal(error);
        } finally {
            setBusy(null);
        }
    };

    const handleRemove = async (userId: string) => {
        setBusy(userId);
        try {
            const result = await removeMember({ variables: { privateReplyId: privateReply.id, userId } });
            if (result.error) return reportRefusal(result.error);
            toast.success(t('removed', { name: name(userId) }));
            onChanged();
        } catch (error) {
            reportRefusal(error);
        } finally {
            setBusy(null);
        }
    };

    const handleLeave = async () => {
        setBusy('leave');
        try {
            const result = await leave({ variables: { privateReplyId: privateReply.id } });
            if (!result.data?.leavePrivateReply) return reportRefusal(result.error);
            toast.success(t('youLeft'));
            setConfirmLeave(false);
            onLeft();
        } catch (error) {
            reportRefusal(error);
        } finally {
            setBusy(null);
        }
    };

    return (
        <>
            <Dialog open={open && !pickerOpen && !confirmLeave} onOpenChange={(next) => !next && onClose()}>
                <DialogContent className="max-w-md w-[90vw] max-h-[85dvh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{t('manageTitle')}</DialogTitle>
                        <DialogDescription>{note}</DialogDescription>
                    </DialogHeader>

                    <p className="text-xs text-text-secondary">
                        {t('memberCountOfMax', { count: members.length, max: settings.maxMembers })}
                    </p>

                    <ul className="flex-1 min-h-0 overflow-y-auto space-y-1" aria-label={t('peopleInIt')}>
                        {members.map((id) => (
                            <li key={id} className="flex items-center gap-3 rounded-lg border border-border-subtle p-2">
                                <Avatar className="w-8 h-8">
                                    <AvatarImage src={avatarOf(id) || undefined} alt="" />
                                    <AvatarFallback>{name(id).charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="truncate text-sm text-text-primary">{name(id)}</p>
                                    {settings.memberManagement === 'STARTER' && id === privateReply.managerUserId ? (
                                        <p className="text-[11px] text-text-tertiary">{t('managesWhoIsIn')}</p>
                                    ) : null}
                                </div>
                                {canManage && id !== currentUserId ? (
                                    <button
                                        type="button"
                                        onClick={() => void handleRemove(id)}
                                        disabled={busy !== null}
                                        aria-label={t('removePerson', { name: name(id) })}
                                        className="rounded-full p-1.5 text-text-secondary hover:bg-surface-hover disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-brand"
                                    >
                                        {busy === id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                        ) : (
                                            <UserMinus className="w-4 h-4" aria-hidden="true" />
                                        )}
                                    </button>
                                ) : null}
                            </li>
                        ))}
                    </ul>

                    <div className="flex flex-wrap justify-between gap-2 pt-2">
                        {canManage ? (
                            <ButtonType1
                                onClick={() => setPickerOpen(true)}
                                disabled={busy !== null || slots === 0 || candidates.length === 0}
                                className="inline-flex items-center gap-1"
                            >
                                <UserPlus className="w-4 h-4" aria-hidden="true" />
                                {t('addPeople')}
                            </ButtonType1>
                        ) : (
                            <span />
                        )}
                        {privateReply.isMember ? (
                            <button
                                type="button"
                                onClick={() => setConfirmLeave(true)}
                                disabled={busy !== null}
                                className="rounded-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                            >
                                {t('leave')}
                            </button>
                        ) : null}
                    </div>
                    {canManage && slots === 0 ? (
                        <p className="text-xs text-text-secondary" role="status">
                            {t('limitReached', { max: settings.maxMembers })}
                        </p>
                    ) : null}
                    {!privateReply.isMember && isGroupAdmin ? (
                        <p className="text-xs text-text-tertiary">{t('adminCantAddSelf')}</p>
                    ) : null}
                </DialogContent>
            </Dialog>

            <PeoplePickerDialog
                open={pickerOpen}
                title={t('addPeople')}
                description={settings.newMembersSeeHistory ? t('addHintWithHistory') : t('addHintFromNow')}
                people={candidates}
                initialSelected={[]}
                maxSelectable={slots}
                limitMax={settings.maxMembers}
                confirmLabel={t('add')}
                hasMore={membersHasMore}
                loadingMore={membersLoadingMore}
                onLoadMore={onLoadMoreMembers}
                onConfirm={(ids) => void handleAdd(ids)}
                onClose={() => setPickerOpen(false)}
            />

            <ConfirmationModal
                open={confirmLeave}
                onCancel={() => setConfirmLeave(false)}
                onConfirm={() => void handleLeave()}
                title={t('leaveTitle')}
                description={t('leaveConfirm')}
                confirmText={t('leave')}
                cancelText={t('cancel')}
                confirmVariant="destructive"
                isLoading={busy === 'leave'}
            />
        </>
    );
}
