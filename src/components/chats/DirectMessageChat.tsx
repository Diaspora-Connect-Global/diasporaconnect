// ============================================
// DIRECT MESSAGE CHAT - REDESIGNED UI
// ============================================
// File: components/chats/DirectMessageChat.tsx

import { ChevronRight, Info, Loader2, Moon, MoreVertical, Sun, X } from "lucide-react";
import { ArrowLeft } from "iconsax-reactjs";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { MessageInput } from "./MessageInput";
import { MessageAttachments } from "./MessageAttachments";
import { LinkPreviewCard, isLinkOnlyContent } from "./LinkPreviewCard";
import { getFirstUrlInText } from "@/lib/urlPreview";
import { SendingFilesBubble } from "./SendingFilesBubble";
import { MessageStatusIcon } from "./MessageStatusIcon";
import { TypingDots } from "./TypingDots";
import { useChatStore, ApiMessage } from "@/store/ChatStore";
import { useTranslations, useLocale } from 'next-intl';
import { ButtonType3 } from "../custom/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ChatInfo } from "@/app/[locale]/(protected)/(main)/chat/page";
import { useRouter } from "@/i18n/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import { SEND_MESSAGE, GET_CONVERSATIONS } from "@/services/gql/messaging";
import { useChatConversation } from "@/hooks/useChatConversation";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { BLOCK_USER } from "@/services/gql/users";
import type { BlockUserResponse } from "@/services/gql/types/users";
import { GET_USER_PROFILE } from "@/services/gql/profile";
import type { GetProfileResponse } from "@/services/gql/profile";
import { ConfirmationModal } from "@/components/custom/confirmationModal";
import { TimeDetailsModal } from "@/components/chats/modals/TimeDetailsModal";
import type { SendMessageData } from "@/services/gql/types/messaging";
import { GET_MY_CONNECTIONS } from "@/services/gql/connection";
import { useUserStore } from "@/store/useUserStore";
import { messageService } from "@/services/websocket/messageService";
import { toast } from "sonner";
import { resolveCountryName, getCountryTimezone, isGoodTimeToMessage, formatCurrentTime, isMultiTimezoneCountry } from '@/lib/countryTimezone';
import { formatTimeOnly, getDateLabel, getMessageDateKey } from "@/lib/chatTime";
import { DateSeparator } from "./DateSeparator";
import { UserBadge } from "@/components/custom/userBadge";
import { resolveUserTier } from "@/lib/userTier";
import { toCdnUrl } from "@/lib/cdn";

// ---- Main Component ----

export default function DirectMessageChat({ chat, onBack }: { chat: ChatInfo; onBack?: () => void }) {
    const router = useRouter();
    const t = useTranslations('chat.direct');
    const tCommon = useTranslations('common');
    const tDates = useTranslations('chat.dateLabels');
    const locale = useLocale();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatAreaRef = useRef<HTMLDivElement>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [blockModalOpen, setBlockModalOpen] = useState(false);
    const [deleteConversationModalOpen, setDeleteConversationModalOpen] = useState(false);
    const [isBlocking, setIsBlocking] = useState(false);
    const [isOnline, setIsOnline] = useState(chat.online ?? false);
    const [timeDetailsOpen, setTimeDetailsOpen] = useState(false);

    const { addApiMessage, getApiMessagesByConversation, clearApiMessages } = useChatStore();
    const { uploadFiles, finalizeUpload } = useMediaUpload();

    const user = useUserStore((state) => state.user);
    const currentUserId = user?.userId;
    const userTimeZone = user?.timezone || user?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    const { conversationId } = useChatConversation({
        chatId: chat.id,
        type: 'direct',
        currentUserId,
        participantIds: currentUserId ? [currentUserId, chat.id] : [],
    });

    const apiMessages = getApiMessagesByConversation(conversationId || '');

    const { refetch: refetchMessages } = useChatMessages({ conversationId });

    const [sendMessageMutation] = useMutation<SendMessageData>(SEND_MESSAGE, {
        refetchQueries: [{ query: GET_CONVERSATIONS, variables: { limit: 100, offset: 0 } }],
    });
    const [blockUserMutation] = useMutation<BlockUserResponse>(BLOCK_USER, {
        refetchQueries: [{ query: GET_CONVERSATIONS, variables: { limit: 100, offset: 0 } }],
    });

    const { data: connectionsData } = useQuery<{ getConnections?: { connections?: Array<{
        requester: { userId: string; firstName?: string; lastName?: string; avatarUrl?: string };
        receiver: { userId: string; firstName?: string; lastName?: string; avatarUrl?: string };
    }> } }>(GET_MY_CONNECTIONS, { variables: { limit: 200, offset: 0 }, skip: !chat.id });

    const otherUser = connectionsData?.getConnections?.connections?.find(
        (c: { requester: { userId: string }; receiver: { userId: string } }) =>
            c.requester.userId === chat.id || c.receiver.userId === chat.id
    );
    const { data: otherUserProfileData } = useQuery<GetProfileResponse>(GET_USER_PROFILE, {
        variables: { userId: chat.id },
        skip: !chat.id,
        fetchPolicy: 'cache-first',
    });

    const otherProfile = otherUser
        ? (otherUser.requester.userId === chat.id ? otherUser.requester : otherUser.receiver)
        : null;
    const profileFallback = otherUserProfileData?.getProfile?.profile;

    const displayName = otherProfile
        ? [otherProfile.firstName, otherProfile.lastName].filter(Boolean).join(' ').trim() || chat.name || t('unknownUser')
        : (
            [profileFallback?.firstName, profileFallback?.lastName].filter(Boolean).join(' ').trim() ||
            (chat.name && chat.name !== chat.id ? chat.name : t('unknownUser'))
        );
    const otherAvatar = toCdnUrl(otherProfile?.avatarUrl ?? profileFallback?.avatarUrl ?? chat.avatar ?? '');

    // Trust badge — sourced from either the connection summary or the full
    // profile fallback. Defensive cast: `trustScore`/`trustTier` land on
    // `ProfileSummary`/full `Profile` via a parallel GQL sweep; types may
    // not be updated yet.
    const otherProfileTrust = otherProfile as (typeof otherProfile & { trustScore?: number; trustTier?: string }) | null;
    const profileFallbackTrust = profileFallback as (typeof profileFallback & { trustScore?: number; trustTier?: string }) | null | undefined;
    const otherTier = resolveUserTier({
        tier: otherProfileTrust?.trustTier ?? profileFallbackTrust?.trustTier,
        trustScore: otherProfileTrust?.trustScore ?? profileFallbackTrust?.trustScore,
    });

    // Tick every minute to keep time-derived values (goodTimeToMessage, otherLocalTime,
    // and the footer "Your time" / "Their time") fresh without a page refresh.
    const [timeTick, setTimeTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTimeTick(n => n + 1), 60_000);
        return () => clearInterval(id);
    }, []);

    // Build "City, Country" — prefer free-text `location`, else combine city + resolved country
    // Wrapped in useMemo: resolveCountryName/isGoodTimeToMessage construct Intl objects internally
    const { otherLocation, otherTimezone, showTimeBadge, goodTimeToMessage, otherLocalTime } = useMemo(() => {
        // Only derive location/timezone for confirmed connections to prevent exposing
        // residenceCountry data to non-connected users who open a chat by userId
        const isConnected = !!otherUser;
        const resolvedCountry = isConnected && profileFallback?.residenceCountry
            ? resolveCountryName(profileFallback.residenceCountry)
            : '';
        const location = isConnected
            ? (profileFallback?.location ||
                [profileFallback?.city, resolvedCountry].filter(Boolean).join(', ') ||
                '')
            : '';
        const timezone = isConnected && profileFallback?.residenceCountry
            ? getCountryTimezone(profileFallback.residenceCountry)
            : null;
        const badge = timezone && !isMultiTimezoneCountry(profileFallback?.residenceCountry ?? '');
        return {
            otherLocation: location,
            otherTimezone: timezone,
            showTimeBadge: badge,
            goodTimeToMessage: badge ? isGoodTimeToMessage(timezone!) : false,
            otherLocalTime: timezone ? formatCurrentTime(timezone) : null,
        };
    // `timeTick` is included so the memo re-derives goodTimeToMessage / otherLocalTime
    // every minute — formatCurrentTime / isGoodTimeToMessage call new Date() internally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [otherUser, profileFallback?.residenceCountry, profileFallback?.city, profileFallback?.location, timeTick]);

    useEffect(() => {
        if (!conversationId) return;
        const unsubMessage = messageService.onMessage((wsMessage) => {
            if (wsMessage.conversationId === conversationId) {
                refetchMessages();
            }
        });
        return () => { unsubMessage(); };
    }, [conversationId, refetchMessages]);

    const { typingUserIds, emit: handleTyping } = useTypingIndicator({
        conversationId,
        excludeUserId: currentUserId,
    });
    const otherUserTyping = typingUserIds.has(chat.id);

    // Track real-time presence for the other user
    useEffect(() => {
        if (!chat.id) return;
        // Reset to prop value when switching chats
        setIsOnline(chat.online ?? false);
        const unsubPresence = messageService.onPresenceUpdate((data) => {
            if (data.userId === chat.id) setIsOnline(data.isOnline);
        });
        const unsubConnect = messageService.onConnect(() => {
            messageService.queryOnlineUsers([chat.id]);
        });
        // Always query unconditionally — service no-ops if disconnected; onConnect handles reconnect
        messageService.queryOnlineUsers([chat.id]);
        return () => { unsubPresence(); unsubConnect(); };
    }, [chat.id, chat.online]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);


    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [apiMessages]);

    const handleSendMessage = useCallback(async (messageText: string, files?: File[]) => {
        const hasText = !!messageText.trim();
        const hasFiles = !!files?.length;
        if ((!hasText && !hasFiles) || !conversationId || !currentUserId) return;

        const idempotencyKey = crypto.randomUUID();
        setIsSending(true);

        let upload: Awaited<ReturnType<typeof uploadFiles>> = null;
        try {
            if (hasFiles && files) {
                upload = await uploadFiles({
                    files,
                    conversationId,
                    senderId: currentUserId,
                    messageText,
                });
                if (!upload) {
                    setIsSending(false);
                    return;
                }
            }

            const messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' = upload?.messageType ?? 'TEXT';
            const content = upload?.attachments[0]
                ? (messageText.trim() || upload.attachments[0].publicUrl)
                : messageText.trim();

            const { data } = await sendMessageMutation({
                variables: {
                    conversationId,
                    messageType,
                    content,
                    ...(upload?.attachments.length && {
                        attachments: upload.attachments.map((a) => ({ publicUrl: a.publicUrl, mimeType: a.mimeType })),
                    }),
                    idempotencyKey,
                },
            });

            if (data?.sendMessage) {
                if (upload) finalizeUpload(upload.placeholderId);
                const sentMsg: ApiMessage = {
                    id: data.sendMessage,
                    conversationId,
                    senderId: currentUserId,
                    type: messageType,
                    content,
                    createdAt: new Date().toISOString(),
                    status: 'sent',
                    ...(upload?.attachments.length && {
                        attachments: upload.attachments.map((a, i) => ({
                            gcsPath: a.publicUrl,
                            mimeType: a.mimeType,
                            fileName: files?.[i]?.name,
                            fileSize: files?.[i]?.size,
                        })),
                    }),
                };
                addApiMessage(sentMsg);
            }
        } catch (error) {
            if (upload) finalizeUpload(upload.placeholderId);
            console.error('❌ Failed to send message:', error);
            toast.error(t('sendFailed'));
        } finally {
            setIsSending(false);
        }
    }, [conversationId, currentUserId, sendMessageMutation, addApiMessage, uploadFiles, finalizeUpload, t]);

    const handleBlockConfirm = async () => {
        setIsBlocking(true);
        try {
            const { data } = await blockUserMutation({
                variables: { input: { blockedId: chat.id } },
            });
            if (data?.blockUser?.success) {
                toast.success(t('blockSuccess'));
                setBlockModalOpen(false);
                onBack?.();
            } else {
                // Backend copy is English-only, so it is logged rather than shown.
                console.error('Block user failed:', data?.blockUser?.message);
                toast.error(t('blockFailed'));
            }
        } catch (err) {
            console.error('Block user error:', err);
            toast.error(t('blockFailed'));
        } finally {
            setIsBlocking(false);
        }
    };

    const handleDeleteConversationConfirm = () => {
        if (conversationId) clearApiMessages(conversationId);
        toast.success(t('conversationCleared') || 'Conversation cleared from this device.');
        setDeleteConversationModalOpen(false);
        onBack?.();
    };

    const handleViewProfile = () => {
        if (!chat.id) return;
        router.push(`/${chat.id}`);
        setSidebarOpen(false);
    };

    // ---- Message bubble renderer ----
    const renderMessage = (message: ApiMessage) => {
        const isMe = message.senderId === currentUserId;
        const timeLabel = formatTimeOnly(message.createdAt, userTimeZone);

        const statusIcon = isMe && <MessageStatusIcon status={message.status} />;

        const myTimestampRow = (
            <div className="flex items-center justify-end gap-1 mt-1.5">
                <span className="text-[10px] text-gray-400 leading-none">{timeLabel}</span>
                {statusIcon}
            </div>
        );

        const theirTimestampRow = (
            <p className="text-[10px] text-text-tertiary mt-1 ml-1 leading-none">{timeLabel}</p>
        );

        // Sending state
        if (message.status === 'sending') {
            if (message.sendingPreviews?.length) {
                return (
                    <>
                        <SendingFilesBubble sendingPreviews={message.sendingPreviews} />
                        {message.content && (
                            <div className="mt-2 bg-chat-bubble-me-bg rounded-2xl px-4 py-2.5">
                                <p className="text-sm text-chat-bubble-me-text break-words">{message.content}</p>
                                <div className="flex items-center justify-end gap-1 mt-1.5">
                                    <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                                    <span className="text-[10px] text-gray-400">{t('sending')}</span>
                                </div>
                            </div>
                        )}
                    </>
                );
            }
            return (
                <div className="bg-chat-bubble-me-bg-sending rounded-2xl px-4 py-2.5">
                    <p className="text-sm text-chat-bubble-me-text break-words">{message.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-1.5">
                        <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                        <span className="text-[10px] text-gray-400">{t('sending')}</span>
                    </div>
                </div>
            );
        }

        // Attachments
        if (message.attachments?.length) {
            const attachmentUrls = (message.attachments ?? []).map((a) => a.gcsPath).filter(Boolean) as string[];
            const contentUrl = message.content?.trim();
            const firstUrl = getFirstUrlInText(message.content);
            const contentIsAttachmentUrl = contentUrl && attachmentUrls.some((u) => u === contentUrl);
            const firstUrlIsAttachmentUrl = firstUrl && attachmentUrls.some((u) => u === firstUrl);

            return (
                <div>
                    <MessageAttachments attachments={message.attachments} />
                    {isLinkOnlyContent(message.content) && !contentIsAttachmentUrl && (
                        <div className="mt-2"><LinkPreviewCard url={message.content!.trim()} /></div>
                    )}
                    {message.content && !isLinkOnlyContent(message.content) && (
                        <div className={`mt-2 rounded-2xl px-4 py-2.5 ${isMe ? 'bg-chat-bubble-me-bg' : 'bg-chat-bubble-them-bg'}`}>
                            <p className={`text-sm break-words ${isMe ? 'text-chat-bubble-me-text' : 'text-text-primary'}`}>
                                {message.content}
                            </p>
                            {firstUrl && !firstUrlIsAttachmentUrl && (
                                <div className="mt-2"><LinkPreviewCard url={firstUrl} /></div>
                            )}
                            {isMe ? myTimestampRow : null}
                        </div>
                    )}
                    {isMe ? (
                        !message.content && (
                            <div className="flex justify-end gap-1 mt-1">
                                <span className="text-[10px] text-gray-400">{timeLabel}</span>
                                {statusIcon}
                            </div>
                        )
                    ) : theirTimestampRow}
                </div>
            );
        }

        // Link-only content
        if (isLinkOnlyContent(message.content)) {
            return (
                <div>
                    <LinkPreviewCard url={message.content.trim()} />
                    {isMe ? myTimestampRow : theirTimestampRow}
                </div>
            );
        }

        // Plain text message
        if (isMe) {
            const firstUrl = getFirstUrlInText(message.content);
            return (
                <div className="bg-chat-bubble-me-bg rounded-2xl px-4 py-2.5">
                    <p className="text-sm text-chat-bubble-me-text break-words">{message.content}</p>
                    {firstUrl && (
                        <div className="mt-2"><LinkPreviewCard url={firstUrl} /></div>
                    )}
                    {myTimestampRow}
                </div>
            );
        }

        const firstUrl = getFirstUrlInText(message.content);
        return (
            <div>
                <div className="bg-chat-bubble-them-bg rounded-2xl px-4 py-2.5">
                    <p className="text-sm text-chat-bubble-them-text break-words">{message.content}</p>
                    {firstUrl && (
                        <div className="mt-2"><LinkPreviewCard url={firstUrl} /></div>
                    )}
                </div>
                {theirTimestampRow}
            </div>
        );
    };

    return (
        <div className="flex flex-row h-full w-full">
            {/* ---- Main Chat Area ---- */}
            <div ref={chatAreaRef} className={`relative flex-1 min-w-0 bg-surface-default rounded-none md:rounded-lg border-0 md:border md:border-border-subtle flex flex-col h-full min-h-0 overflow-hidden ${isMobile && sidebarOpen ? 'hidden' : 'flex'}`}>

                {/* ---- Header ---- */}
                <div className="flex-shrink-0 border-b border-border-subtle px-3 md:px-4 py-3">
                    <div className="flex items-center gap-2 md:gap-3">
                        {/* Back button */}
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors flex-shrink-0"
                                aria-label={tCommon('backToChats')}
                            >
                                <ArrowLeft className="w-5 h-5 text-text-primary" />
                            </button>
                        )}

                        {/* Avatar with online dot */}
                        <div className="relative flex-shrink-0">
                            <Avatar className="w-12 h-12 md:w-14 md:h-14">
                                <AvatarImage src={otherAvatar || undefined} alt="" />
                                <AvatarFallback className="text-base font-semibold">
                                    {displayName.slice(0, 1).toUpperCase() || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            {isOnline && (
                                <div className="absolute bottom-0.5 right-0.5 w-3 h-3 md:w-3.5 md:h-3.5 bg-chat-online-dot rounded-full border-2 border-white" />
                            )}
                        </div>

                        {/* Name + location + badge */}
                        <div className="flex-1 min-w-0 min-h-[72px]">
                            <div className="flex items-center gap-1.5">
                                <h2 className="font-bold text-text-primary text-sm md:text-base leading-tight truncate">
                                    {displayName}
                                </h2>
                                {otherTier && <UserBadge tier={otherTier} size="xs" />}
                            </div>
                            {(otherLocation || otherLocalTime) && (
                                <p className="text-xs text-text-secondary truncate mt-0.5">
                                    {otherLocation}
                                    {otherLocation && otherLocalTime && <span className="mx-1">&bull;</span>}
                                    {otherLocalTime && <span className="text-text-brand font-medium">{otherLocalTime}</span>}
                                </p>
                            )}
                            {showTimeBadge && (
                                <button
                                    type="button"
                                    onClick={() => setTimeDetailsOpen(true)}
                                    aria-label={t('timeDetails.openLabel')}
                                    className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${goodTimeToMessage
                                        ? 'bg-chat-good-time-bg text-chat-good-time-text hover:bg-chat-good-time-bg-hover'
                                        : 'bg-surface-hover dark:bg-surface-hover text-text-secondary hover:bg-surface-hover/80'
                                        }`}
                                >
                                    {goodTimeToMessage ? (
                                        <Sun className="w-3 h-3" aria-hidden="true" />
                                    ) : (
                                        <Moon className="w-3 h-3" aria-hidden="true" />
                                    )}
                                    {goodTimeToMessage ? t('goodTimeToMessage') : t('notGoodTimeToMessage')}
                                </button>
                            )}
                        </div>

                        {/* Three-dot menu */}
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 hover:bg-surface-hover rounded-full transition-colors flex-shrink-0"
                            aria-label="More options"
                        >
                            <MoreVertical className="w-5 h-5 text-text-secondary" />
                        </button>
                    </div>
                </div>

                {/* ---- Messages Area ---- */}
                <div
                    className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden px-3 md:px-4 py-4"
                    style={{ scrollbarGutter: 'stable' }}
                >
                    {/* Empty state */}
                    {apiMessages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-text-secondary">
                            <Avatar className="w-20 h-20">
                                <AvatarImage src={otherAvatar || undefined} alt="" />
                                <AvatarFallback className="text-2xl font-semibold">
                                    {displayName.slice(0, 1).toUpperCase() || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="text-center">
                                <div className="inline-flex items-center gap-1 justify-center">
                                    <p className="font-semibold text-text-primary">{displayName}</p>
                                    {otherTier && <UserBadge tier={otherTier} size="xs" />}
                                </div>
                                <p className="text-sm mt-1">{t('typeMessage')}</p>
                            </div>
                        </div>
                    )}

                    {/* Messages with date separators */}
                    {(() => {
                        const nodes: React.ReactNode[] = [];
                        let lastDateKey = '';

                        apiMessages.forEach((message) => {
                            const isMe = message.senderId === currentUserId;
                            const dateKey = getMessageDateKey(message.createdAt, userTimeZone);

                            if (dateKey !== lastDateKey) {
                                lastDateKey = dateKey;
                                nodes.push(
                                    <DateSeparator key={`sep-${dateKey}`} label={getDateLabel(message.createdAt, userTimeZone, { today: tDates('today'), yesterday: tDates('yesterday') }, locale)} />
                                );
                            }

                            nodes.push(
                                <div
                                    key={message.id}
                                    className={`flex mb-2 min-w-0 ${isMe ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className="max-w-[75%] sm:max-w-sm lg:max-w-md min-w-0">
                                        {renderMessage(message)}
                                    </div>
                                </div>
                            );
                        });

                        return nodes;
                    })()}

                    {otherUserTyping && (
                        <div className="px-1 py-2 flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-chat-bubble-them-bg px-3 py-2.5 rounded-2xl">
                                <TypingDots />
                            </div>
                            <span className="text-xs text-text-secondary">{displayName} {t('typing')}</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* ---- Message Input ---- */}
                <div className="flex-shrink-0">
                    <MessageInput
                        onSendMessage={handleSendMessage}
                        placeholder={t('typeMessage')}
                        conversationId={conversationId || chat.id}
                        senderId={currentUserId || 'current-user'}
                        disabled={isSending || !conversationId}
                        onTyping={handleTyping}
                    />
                </div>

                {/* ---- Timezone Bar ---- */}
                <div className="flex-shrink-0 bg-chat-bar-bg px-4 py-2 border-t border-chat-bar-border flex items-center justify-center gap-2">
                    <p className="text-[11px] text-text-secondary leading-tight text-center">
                        {t('yourTime')} <span className="font-medium text-text-primary">{formatCurrentTime(userTimeZone)}</span>
                        {otherLocalTime && (
                            <> &bull; {t('theirTime', { name: displayName })} {otherLocalTime}</>
                        )}
                    </p>
                    {otherLocalTime && (
                        <button
                            type="button"
                            onClick={() => setTimeDetailsOpen(true)}
                            aria-label={t('timeDetails.openLabel')}
                            className="flex-shrink-0 rounded-full p-0.5 text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
                        >
                            <Info className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>

            {/* ---- Sidebar Panel ---- */}
            {sidebarOpen && (
                <>
                    {isMobile && (
                        <div
                            className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-200"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}
                    <div className={`
                        ${isMobile ? 'fixed inset-y-0 right-0 z-50 w-[85%] max-w-sm animate-in slide-in-from-right duration-300' : 'w-80'}
                        bg-surface-default border-l border-border-subtle flex flex-col h-full
                        ${isMobile ? 'rounded-l-2xl shadow-2xl' : 'rounded-lg'}
                    `}>
                        {/* Sidebar header */}
                        <div className="flex justify-between items-center p-4 border-b border-border-subtle">
                            <h3 className="font-semibold text-text-primary text-base">{t('viewProfile')}</h3>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <div className="p-4">
                                <div className="flex flex-col items-center mb-6">
                                    <Avatar className="w-20 h-20 mb-3">
                                        <AvatarImage src={otherAvatar || undefined} alt="avatar" />
                                        <AvatarFallback className="text-2xl font-semibold">
                                            {displayName.slice(0, 1).toUpperCase() || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="inline-flex items-center gap-1 justify-center">
                                        <h4 className="font-semibold text-text-primary text-lg">{displayName}</h4>
                                        {otherTier && <UserBadge tier={otherTier} size="xs" />}
                                    </div>
                                    {isOnline && (
                                        <p className="text-sm text-chat-online-text font-medium mt-0.5">{t('online')}</p>
                                    )}
                                    {otherLocation && (
                                        <p className="text-sm text-text-secondary mt-1">{otherLocation}</p>
                                    )}
                                </div>

                                <div className="flex items-center justify-center mb-6">
                                    <ButtonType3 size="lg" onClick={handleViewProfile}>
                                        {t('viewProfile')}
                                    </ButtonType3>
                                </div>
                            </div>
                        </div>

                        <div className="flex-shrink-0 border-t border-border-subtle p-4 bg-surface-default">
                            <div className="space-y-1">
                                <button
                                    className="w-full text-text-danger flex justify-between items-center p-3 hover:bg-surface-hover rounded-lg transition-colors"
                                    onClick={() => toast.info('Reporting is coming soon.')}
                                >
                                    <span className="text-sm font-medium">{t('report')}</span>
                                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                                </button>
                                <div
                                    className="text-text-danger flex justify-between items-center p-3 hover:bg-surface-hover rounded-lg cursor-pointer transition-colors"
                                    onClick={() => setBlockModalOpen(true)}
                                >
                                    <p className="text-sm font-medium">{t('block')}</p>
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                                <div
                                    className="text-text-danger flex justify-between items-center p-3 hover:bg-surface-hover rounded-lg cursor-pointer transition-colors"
                                    onClick={() => setDeleteConversationModalOpen(true)}
                                >
                                    <p className="text-sm font-medium">{t('deleteConversation')}</p>
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ---- Confirmation Modals ---- */}
            <ConfirmationModal
                open={blockModalOpen}
                onCancel={() => setBlockModalOpen(false)}
                onConfirm={handleBlockConfirm}
                title={t('blockConfirmTitle') || 'Block this user?'}
                description={t('blockConfirmDescription') || 'They will no longer be able to message you or see your profile.'}
                confirmText={t('block') || 'Block'}
                confirmVariant="destructive"
                isLoading={isBlocking}
            />
            <ConfirmationModal
                open={deleteConversationModalOpen}
                onCancel={() => setDeleteConversationModalOpen(false)}
                onConfirm={handleDeleteConversationConfirm}
                title={t('clearConversationConfirmTitle') || 'Clear this conversation on this device?'}
                description={t('clearConversationConfirmDescription') || 'This only clears messages locally. It does not delete the server conversation.'}
                confirmText={t('clearConversation') || 'Clear'}
                confirmVariant="destructive"
            />
            <TimeDetailsModal
                open={timeDetailsOpen}
                onOpenChange={setTimeDetailsOpen}
                other={profileFallback ?? otherProfile ?? null}
                otherDisplayName={displayName}
                containerRef={chatAreaRef}
            />
        </div>
    );
}
