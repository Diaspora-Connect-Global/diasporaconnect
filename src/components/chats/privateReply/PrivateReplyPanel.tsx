'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery } from '@apollo/client/react';
import { Loader2, Lock, Plus, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ButtonType3 } from '@/components/custom/button';
import { MessageInput } from '../MessageInput';
import { MessageAttachments } from '../MessageAttachments';
import { TypingDots } from '../TypingDots';
import { formatChatTimestamp } from '@/macros/time';
import { GET_CONVERSATIONS, MARK_CONVERSATION_AS_READ, SEND_MESSAGE } from '@/services/gql/messaging';
import type { SendMessageData } from '@/services/gql/types/messaging';
import {
    PRIVATE_REPLY,
    PRIVATE_REPLY_MESSAGES,
    START_PRIVATE_REPLY,
    type PrivateReply,
    type PrivateReplyData,
    type PrivateReplyMessage,
    type PrivateReplyMessagesData,
    type PrivateReplySettings,
    type StartPrivateReplyData,
} from '@/services/gql/privateReplies';
import {
    audienceText,
    describeSystemEvent,
    personLabel,
    privateReplyErrorKey,
    type NameOf,
} from '@/lib/privateReplies';
import { messageService } from '@/services/websocket/messageService';
import { setViewingConversation } from '@/lib/chatUnread';
import { CONVERSATION_LIST_VARIABLES } from '@/hooks/useChatUnread';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useEnsureMemberNamesLoaded } from '@/hooks/useEnsureMemberNamesLoaded';
import { PeoplePickerDialog, type PickablePerson } from './PeoplePickerDialog';
import { ManagePrivateReplyDialog } from './ManagePrivateReplyDialog';

/** The group message a private reply is attached to, as the panel shows it. */
export interface PrivateReplyAnchorInput {
    id: string;
    senderId: string;
    content: string;
    createdAt?: string | null;
}

export type PrivateReplyTarget =
    | { mode: 'start'; anchor: PrivateReplyAnchorInput; preselected: string[] }
    | { mode: 'open'; privateReplyId: string };

const MESSAGE_LIMIT = 100;
const SILENT = { silentErrors: true } as const;

/**
 * The private-reply side panel inside a group chat.
 *
 * START mode: the person replying picks who is in it (the person they reply
 * to is pre-selected) and writes the first message.
 * OPEN mode: the conversation itself — only its members can load it; the
 * server refuses anyone else. Membership lines ("Kofi added Kwame") come from
 * the server as SYSTEM messages and are rendered with names, never ids.
 */
export function PrivateReplyPanel({
    target,
    groupConversationId,
    currentUserId,
    settings,
    people,
    isGroupAdmin,
    nameOf,
    avatarOf,
    timeZone,
    isMobile,
    membersHasMore,
    membersLoadingMore,
    onLoadMoreMembers,
    onClose,
    onOpened,
    onChanged,
}: {
    target: PrivateReplyTarget;
    groupConversationId: string;
    currentUserId: string;
    settings: PrivateReplySettings;
    /** Group members other than the current user, names already resolved. */
    people: PickablePerson[];
    isGroupAdmin: boolean;
    nameOf: NameOf;
    avatarOf: (userId: string) => string | undefined;
    timeZone: string;
    isMobile: boolean;
    /** More group members exist beyond the pages loaded so far. */
    membersHasMore: boolean;
    /** A page of more group members is currently being fetched. */
    membersLoadingMore: boolean;
    /** Fetch the next page of group members (the people picker's "load more", and how an unresolved name gets found). */
    onLoadMoreMembers: () => void;
    onClose: () => void;
    onOpened: (privateReplyId: string) => void;
    onChanged: () => void;
}) {
    const t = useTranslations('chat.group.privateReply');
    const tFeedback = useTranslations('feedback.error');
    const locale = useLocale();
    const tIdentity = useTranslations('common.identity');
    const labels = useMemo(
        () => ({ you: t('you'), formerMember: t('formerMember'), unknown: tIdentity('aMember') }),
        [t, tIdentity],
    );
    const nameOrFormer = useCallback(
        (userId: string) => personLabel(userId, currentUserId, nameOf, labels),
        [currentUserId, nameOf, labels],
    );

    const privateReplyId = target.mode === 'open' ? target.privateReplyId : null;

    // ── OPEN: the private reply + its messages ───────────────────────────────
    const {
        data: replyData,
        error: replyError,
        refetch: refetchReply,
    } = useQuery<PrivateReplyData>(PRIVATE_REPLY, {
        variables: { id: privateReplyId ?? '' },
        skip: !privateReplyId,
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
        context: SILENT,
    });
    const privateReply: PrivateReply | null = replyData?.privateReply ?? null;

    const {
        data: messagesData,
        loading: messagesLoading,
        refetch: refetchMessages,
    } = useQuery<PrivateReplyMessagesData>(PRIVATE_REPLY_MESSAGES, {
        variables: { conversationId: privateReplyId ?? '', limit: MESSAGE_LIMIT },
        // Only members may read it; a group admin's management view never loads messages.
        skip: !privateReplyId || (!!privateReply && !privateReply.isMember),
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
        context: SILENT,
    });
    const messages = useMemo(
        () =>
            [...(messagesData?.getMessages?.messages ?? [])]
                .filter((m) => !m.isDeleted)
                .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)),
        [messagesData],
    );

    const [removed, setRemoved] = useState(false);
    // Only a NOT_FOUND means "you're not in it"; an outage or anything else is a
    // retryable load failure, not a verdict about membership.
    const loadErrorKey = privateReplyId && replyError && !privateReply ? privateReplyErrorKey(replyError) : null;
    const notFound = loadErrorKey === 'notFound';
    const loadFailed = !!loadErrorKey && !notFound;

    // Live: new messages, membership changes, and being removed.
    useEffect(() => {
        if (!privateReplyId) return;
        setRemoved(false);
        const unsubMessage = messageService.onMessage((m) => {
            if (m.conversationId === privateReplyId) void refetchMessages().catch(() => undefined);
        });
        const unsubUpdated = messageService.onPrivateReplyUpdated((e) => {
            if (e.privateReplyId !== privateReplyId) return;
            void refetchReply().catch(() => undefined);
            void refetchMessages().catch(() => undefined);
        });
        const unsubRemoved = messageService.onPrivateReplyRemoved((e) => {
            if (e.privateReplyId === privateReplyId) setRemoved(true);
        });
        return () => {
            unsubMessage();
            unsubUpdated();
            unsubRemoved();
        };
    }, [privateReplyId, refetchMessages, refetchReply]);

    // Read while on screen; the badge must not count it meanwhile.
    const [markRead] = useMutation(MARK_CONVERSATION_AS_READ, {
        refetchQueries: [{ query: GET_CONVERSATIONS, variables: CONVERSATION_LIST_VARIABLES }],
        context: SILENT,
    });
    const isMember = privateReply?.isMember ?? false;
    useEffect(() => {
        if (!privateReplyId || !isMember) return;
        setViewingConversation(privateReplyId);
        return () => setViewingConversation(groupConversationId);
    }, [privateReplyId, isMember, groupConversationId]);
    const lastSeenCount = useRef(0);
    useEffect(() => {
        if (!privateReplyId || !isMember) return;
        if (messages.length === lastSeenCount.current) return;
        lastSeenCount.current = messages.length;
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
        void markRead({ variables: { conversationId: privateReplyId } })
            .then(() => onChanged())
            .catch(() => undefined);
    }, [messages.length, privateReplyId, isMember, markRead, onChanged]);

    // Keyboard: focus moves into the panel when it opens (it replaces the chat
    // view on phones), and Escape closes it unless a dialog on top is open.
    const panelRef = useRef<HTMLElement>(null);
    useEffect(() => {
        panelRef.current?.focus();
    }, []);

    // Scroll to the newest line.
    const endRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    const { typingUserIds, emit: handleTyping } = useTypingIndicator({
        conversationId: isMember ? privateReplyId : null,
        excludeUserId: currentUserId,
    });

    // ── START: who is in it ──────────────────────────────────────────────────
    const [chosen, setChosen] = useState<string[]>(target.mode === 'start' ? target.preselected : []);
    useEffect(() => {
        if (target.mode === 'start') setChosen(target.preselected);
        // A new anchor means a new start.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target.mode === 'start' ? target.anchor.id : null]);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [manageOpen, setManageOpen] = useState(false);
    const startKeyRef = useRef<string | null>(null);

    // Every id this panel needs to render as a name: the conversation's
    // members, the anchor's sender, and every message sender/system-event
    // actor and target seen so far. Anyone outside the group's loaded member
    // pages pages in automatically (see useEnsureMemberNamesLoaded) — there
    // is no batch "profile by id" lookup to resolve just the missing ones.
    const namesNeeded = useMemo(() => {
        const ids: (string | null | undefined)[] = [...chosen];
        if (target.mode === 'start') ids.push(target.anchor.senderId);
        if (privateReply) {
            ids.push(...privateReply.memberUserIds, privateReply.anchor?.senderId);
        }
        for (const m of messages) {
            ids.push(m.senderId, m.systemEvent?.actorUserId, ...(m.systemEvent?.targetUserIds ?? []));
        }
        return ids;
    }, [chosen, target, privateReply, messages]);
    useEnsureMemberNamesLoaded(namesNeeded, nameOf, currentUserId, membersHasMore, membersLoadingMore, onLoadMoreMembers);

    // ── Sending ──────────────────────────────────────────────────────────────
    const { uploadFiles, finalizeUpload } = useMediaUpload();
    const [sending, setSending] = useState(false);
    const [startPrivateReply] = useMutation<StartPrivateReplyData>(START_PRIVATE_REPLY, { context: SILENT });
    const [sendMessage] = useMutation<SendMessageData>(SEND_MESSAGE, { context: SILENT });

    const sendInto = useCallback(
        async (conversationId: string, text: string, files?: File[]): Promise<boolean> => {
            const idempotencyKey = crypto.randomUUID();
            let upload: Awaited<ReturnType<typeof uploadFiles>> = null;
            if (files?.length) {
                upload = await uploadFiles({ files, conversationId, senderId: currentUserId, messageText: text });
                if (!upload) return false;
            }
            const attachments = upload?.attachments ?? [];
            const content = attachments[0] ? (text.trim() || attachments[0].publicUrl) : text.trim();
            try {
                const result = await sendMessage({
                    variables: {
                        conversationId,
                        messageType: upload?.messageType ?? 'TEXT',
                        content,
                        attachments: attachments.length
                            ? attachments.map((a) => ({ publicUrl: a.publicUrl, mimeType: a.mimeType }))
                            : undefined,
                        idempotencyKey,
                    },
                });
                // errorPolicy 'all': a refused send RESOLVES with no data.
                if (!result.data?.sendMessage) {
                    toast.error(t(`errors.${privateReplyErrorKey(result.error)}`));
                    return false;
                }
                return true;
            } catch (error) {
                toast.error(t(`errors.${privateReplyErrorKey(error)}`));
                return false;
            } finally {
                if (upload) finalizeUpload(upload.placeholderId);
            }
        },
        [currentUserId, finalizeUpload, sendMessage, t, uploadFiles],
    );

    const handleSend = async (text: string, files?: File[]) => {
        if (sending) return;
        if (target.mode === 'open') {
            if (!privateReplyId || (!text.trim() && !files?.length)) return;
            setSending(true);
            try {
                if (await sendInto(privateReplyId, text, files)) void refetchMessages().catch(() => undefined);
            } finally {
                setSending(false);
            }
            return;
        }

        // START: the first message has to be words — files follow it.
        if (!text.trim()) {
            toast.error(t('firstMessageRequired'));
            return;
        }
        if (chosen.length === 0) {
            toast.error(t('choosePeopleFirst'));
            return;
        }
        setSending(true);
        // One key per attempt, reused on retry, so a flaky network can't start two.
        startKeyRef.current ??= crypto.randomUUID();
        try {
            const result = await startPrivateReply({
                variables: {
                    input: {
                        anchorMessageId: target.anchor.id,
                        memberUserIds: chosen,
                        content: text.trim(),
                        clientRequestId: startKeyRef.current,
                    },
                },
            });
            const started = result.data?.startPrivateReply?.privateReply;
            if (!started) {
                toast.error(t(`errors.${privateReplyErrorKey(result.error)}`));
                return;
            }
            startKeyRef.current = null;
            if (files?.length) await sendInto(started.id, '', files);
            onChanged();
            onOpened(started.id);
        } catch (error) {
            toast.error(t(`errors.${privateReplyErrorKey(error)}`));
        } finally {
            setSending(false);
        }
    };

    // ── Rendering helpers ────────────────────────────────────────────────────
    const anchor =
        target.mode === 'start'
            ? { senderId: target.anchor.senderId, content: target.anchor.content, createdAt: target.anchor.createdAt }
            : privateReply?.anchor
              ? {
                    senderId: privateReply.anchor.senderId,
                    content: privateReply.anchor.contentSnippet,
                    createdAt: privateReply.anchor.createdAt,
                }
              : null;

    const audienceIds = target.mode === 'start' ? [currentUserId, ...chosen] : privateReply?.memberUserIds ?? [];
    const audience = audienceText(audienceIds, currentUserId, nameOf, labels, locale);
    const replyingToName =
        target.mode === 'start' ? nameOrFormer(target.anchor.senderId) : '';

    const renderMessage = (m: PrivateReplyMessage) => {
        if (m.systemEvent) {
            const text = describeSystemEvent(m.systemEvent, currentUserId, nameOf, labels, locale, (k, v) => t(k, v));
            if (!text) return null;
            return (
                <p key={m.id} className="text-center text-[11px] sm:text-xs text-text-tertiary px-4">
                    {text}
                </p>
            );
        }
        const isMe = m.senderId === currentUserId;
        return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%] min-w-0">
                    <div
                        className={`px-3 py-2 rounded-2xl text-sm ${
                            isMe ? 'bg-chat-bubble-me-bg text-chat-bubble-me-text' : 'bg-chat-bubble-them-bg text-chat-bubble-them-text'
                        }`}
                    >
                        {!isMe && <p className="text-[11px] font-medium opacity-80 mb-0.5">{nameOrFormer(m.senderId)}</p>}
                        {m.attachments?.length ? <MessageAttachments attachments={m.attachments} /> : null}
                        {m.content && !(m.attachments?.length && m.attachments.some((a) => a.gcsPath === m.content)) ? (
                            <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        ) : null}
                    </div>
                    <p className={`mt-0.5 text-[10px] text-text-tertiary ${isMe ? 'text-right' : ''}`}>
                        {formatChatTimestamp(m.createdAt, { timeZone })}
                    </p>
                </div>
            </div>
        );
    };

    const managementNote =
        settings.memberManagement === 'GROUP_ADMINS' ? t('groupAdminsCanSeeWho') : null;

    return (
        <>
            {isMobile && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} aria-hidden="true" />}
            <section
                ref={panelRef}
                tabIndex={-1}
                onKeyDown={(e) => {
                    if (e.key === 'Escape' && !pickerOpen && !manageOpen) {
                        e.stopPropagation();
                        onClose();
                    }
                }}
                aria-label={t('panelLabel')}
                className={`${isMobile ? 'fixed inset-y-0 right-0 z-50 w-[90%] max-w-sm rounded-l-2xl' : 'w-80 rounded-lg'} bg-surface-default border-l border-border-subtle flex flex-col min-h-0 focus:outline-none`}
            >
                {/* Header */}
                <div className="flex-shrink-0 p-4 flex items-start justify-between gap-2 border-b border-border-subtle">
                    <div className="min-w-0">
                        <h3 className="flex items-center gap-1.5 font-semibold text-text-primary text-sm sm:text-base">
                            <Lock className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                            <span className="truncate">
                                {target.mode === 'start' ? t('startTitle', { name: replyingToName }) : t('title')}
                            </span>
                        </h3>
                        {audience ? <p className="text-xs text-text-secondary truncate">{audience}</p> : null}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {target.mode === 'open' && privateReply ? (
                            <button
                                type="button"
                                onClick={() => setManageOpen(true)}
                                className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-text-brand hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-brand"
                            >
                                <Users className="w-4 h-4" aria-hidden="true" />
                                {t('manage')}
                            </button>
                        ) : null}
                        <ButtonType3
                            onClick={onClose}
                            aria-label={t('close')}
                            className="p-1 hover:bg-surface-hover rounded-full border-0 bg-transparent min-w-0"
                        >
                            <X className="w-4 h-4 text-text-secondary" aria-hidden="true" />
                        </ButtonType3>
                    </div>
                </div>

                {/* Who can see it */}
                <div className="flex-shrink-0 px-4 py-2 bg-surface-hover border-b border-border-subtle">
                    <p className="flex items-start gap-1.5 text-xs text-text-secondary">
                        <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <span>
                            {target.mode === 'start'
                                ? t('onlyTheseWillSee', { names: audience })
                                : t('onlyTheseCanSee', { names: audience })}
                            {managementNote ? ` ${managementNote}` : ''}
                        </span>
                    </p>
                </div>

                {/* The group message it started from */}
                <div className="flex-shrink-0 p-3 border-b border-border-subtle">
                    {anchor ? (
                        <div className="bg-chat-parent-bg text-chat-parent-text px-3 py-2 rounded-2xl">
                            <span className="text-xs font-medium">{nameOrFormer(anchor.senderId)}</span>
                            <p className="text-xs line-clamp-3 break-words">{anchor.content}</p>
                        </div>
                    ) : target.mode === 'open' && privateReply ? (
                        <p className="text-xs italic text-text-tertiary">{t('anchorDeleted')}</p>
                    ) : null}
                </div>

                {/* Body */}
                {target.mode === 'start' ? (
                    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
                        <p className="text-xs font-medium text-text-primary">{t('peopleInIt')}</p>
                        <ul className="flex flex-wrap gap-2" aria-label={t('peopleInIt')}>
                            {chosen.map((id) => (
                                <li key={id}>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface-default pl-1 pr-1.5 py-0.5 text-xs text-text-primary">
                                        <Avatar className="w-5 h-5">
                                            <AvatarImage src={avatarOf(id) || undefined} alt="" />
                                            <AvatarFallback>{nameOrFormer(id).charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        {nameOrFormer(id)}
                                        <button
                                            type="button"
                                            onClick={() => setChosen((prev) => prev.filter((p) => p !== id))}
                                            aria-label={t('removeFromSelection', { name: nameOrFormer(id) })}
                                            className="rounded-full p-0.5 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-brand"
                                        >
                                            <X className="w-3 h-3" aria-hidden="true" />
                                        </button>
                                    </span>
                                </li>
                            ))}
                            <li>
                                <button
                                    type="button"
                                    onClick={() => setPickerOpen(true)}
                                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-border-subtle px-2 py-0.5 text-xs text-text-brand hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-brand"
                                >
                                    <Plus className="w-3 h-3" aria-hidden="true" />
                                    {t('addPeople')}
                                </button>
                            </li>
                        </ul>
                        <p className="text-[11px] text-text-tertiary">
                            {t('maxPeopleHint', { max: settings.maxMembers })}
                        </p>
                    </div>
                ) : removed || notFound ? (
                    <div className="flex-1 min-h-0 flex items-center justify-center p-6 text-center" role="status">
                        <p className="text-sm text-text-secondary">{t('noLongerIn')}</p>
                    </div>
                ) : loadFailed && loadErrorKey ? (
                    <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
                        <p className="text-sm text-text-secondary">{t(`errors.${loadErrorKey}`)}</p>
                        <button
                            type="button"
                            onClick={() => void refetchReply().catch(() => undefined)}
                            className="rounded-full border border-border-subtle px-3 py-1 text-sm text-text-brand hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-brand"
                        >
                            {tFeedback('retry')}
                        </button>
                    </div>
                ) : privateReply && !privateReply.isMember ? (
                    <div className="flex-1 min-h-0 flex items-center justify-center p-6 text-center">
                        <p className="text-sm text-text-secondary">{t('adminViewNoMessages')}</p>
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
                        {messagesLoading && messages.length === 0 ? (
                            <div className="flex justify-center py-6">
                                <Loader2 className="w-5 h-5 animate-spin text-text-secondary" aria-label={t('loading')} />
                            </div>
                        ) : (
                            messages.map(renderMessage)
                        )}
                        {typingUserIds.size > 0 && (
                            <div className="flex items-center gap-2 text-text-tertiary text-xs">
                                <TypingDots dotClassName="bg-text-tertiary" />
                                {t('typing', { name: nameOrFormer([...typingUserIds][0]) })}
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>
                )}

                {/* Composer */}
                {target.mode === 'start' || (privateReply?.isMember && !removed) ? (
                    <div className="flex-shrink-0">
                        <MessageInput
                            onSendMessage={handleSend}
                            placeholder={target.mode === 'start' ? t('writeFirstMessage') : t('writeMessage')}
                            conversationId={privateReplyId ?? groupConversationId}
                            senderId={currentUserId}
                            disabled={sending || (target.mode === 'start' && chosen.length === 0)}
                            onTyping={target.mode === 'open' ? handleTyping : undefined}
                        />
                    </div>
                ) : null}
            </section>

            {target.mode === 'start' ? (
                <PeoplePickerDialog
                    open={pickerOpen}
                    title={t('choosePeople')}
                    description={t('choosePeopleHint', { max: settings.maxMembers })}
                    people={people}
                    initialSelected={chosen}
                    maxSelectable={Math.max(0, settings.maxMembers - 1)}
                    limitMax={settings.maxMembers}
                    confirmLabel={t('done')}
                    hasMore={membersHasMore}
                    loadingMore={membersLoadingMore}
                    onLoadMore={onLoadMoreMembers}
                    onConfirm={(ids) => {
                        setChosen(ids);
                        setPickerOpen(false);
                    }}
                    onClose={() => setPickerOpen(false)}
                />
            ) : null}

            {privateReply ? (
                <ManagePrivateReplyDialog
                    open={manageOpen}
                    privateReply={privateReply}
                    settings={settings}
                    currentUserId={currentUserId}
                    people={people}
                    isGroupAdmin={isGroupAdmin}
                    nameOf={nameOf}
                    avatarOf={avatarOf}
                    membersHasMore={membersHasMore}
                    membersLoadingMore={membersLoadingMore}
                    onLoadMoreMembers={onLoadMoreMembers}
                    onClose={() => setManageOpen(false)}
                    onChanged={() => {
                        void refetchReply().catch(() => undefined);
                        void refetchMessages().catch(() => undefined);
                        onChanged();
                    }}
                    onLeft={() => {
                        setManageOpen(false);
                        onChanged();
                        onClose();
                    }}
                />
            ) : null}
        </>
    );
}
