// ============================================
// DIRECT MESSAGE CHAT - REAL API INTEGRATION
// ============================================
// File: components/chats/DirectMessageChat.tsx

import { formatChatTimestamp } from "@/macros/time";
import { Check, ChevronRight, InfoIcon, Loader2, X } from "lucide-react";
import { ArrowLeft } from "iconsax-reactjs";
import { useEffect, useRef, useState, useCallback } from "react";
import { MessageInput } from "./MessageInput";
import { MessageAttachments } from "./MessageAttachments";
import { LinkPreviewCard, isLinkOnlyContent } from "./LinkPreviewCard";
import { getFirstUrlInText } from "@/lib/urlPreview";
import { SendingFilesBubble } from "./SendingFilesBubble";
import { useChatStore, ApiMessage } from "@/store/ChatStore";
import { useTranslations } from 'next-intl';
import { ButtonType3 } from "../custom/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ChatInfo } from "@/app/[locale]/(protected)/(main)/chat/page";
import { useMutation, useQuery, useLazyQuery } from "@apollo/client/react";
import { CREATE_CONVERSATION, SEND_MESSAGE, GET_CONVERSATIONS, GET_MESSAGES, MARK_CONVERSATION_AS_READ } from "@/services/gql/messaging";
import { BLOCK_USER } from "@/services/gql/users";
import type { BlockUserResponse } from "@/services/gql/types/users";
import { GET_UPLOAD_URL, chatMediaContentType } from "@/services/gql/upload";
import { ConfirmationModal } from "@/components/custom/confirmationModal";
import type { GetUploadUrlResponse } from "@/services/gql/upload";
import type { Message, MessageMention, CreateConversationData, SendMessageData, GetConversationsData, GetMessagesData, MarkConversationAsReadData } from "@/services/gql/types/messaging";
import { GET_MY_CONNECTIONS } from "@/services/gql/connection";
import { useUserStore } from "@/store/useUserStore";
import { messageService } from "@/services/websocket/messageService";
import { toast } from "sonner";

export default function DirectMessageChat({ chat, onBack }: { chat: ChatInfo; onBack?: () => void }) {
    const t = useTranslations('chat.direct');
    const tCommon = useTranslations('common');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pendingRevokeRef = useRef<Record<string, string[]>>({});
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [otherUserTyping, setOtherUserTyping] = useState(false);
    const [blockModalOpen, setBlockModalOpen] = useState(false);
    const [deleteConversationModalOpen, setDeleteConversationModalOpen] = useState(false);
    const [isBlocking, setIsBlocking] = useState(false);

    const { addApiMessage, removeApiMessage, getApiMessagesByConversation, getRealConversation, setRealConversation, setApiMessages, clearApiMessages } = useChatStore();

    const user = useUserStore((state) => state.user);
    const currentUserId = user?.userId;

    const apiMessages = getApiMessagesByConversation(conversationId || '');

    const [createConversation] = useMutation<CreateConversationData>(CREATE_CONVERSATION);
    const [sendMessageMutation] = useMutation<SendMessageData>(SEND_MESSAGE);
    const [getUploadUrl] = useLazyQuery<GetUploadUrlResponse>(GET_UPLOAD_URL);
    const [markConversationAsRead] = useMutation<MarkConversationAsReadData>(MARK_CONVERSATION_AS_READ, {
        refetchQueries: [{ query: GET_CONVERSATIONS, variables: { limit: 100, offset: 0 } }],
    });
    const [blockUserMutation] = useMutation<BlockUserResponse>(BLOCK_USER, {
        refetchQueries: [{ query: GET_CONVERSATIONS, variables: { limit: 100, offset: 0 } }],
    });

    // Fetch existing conversations to find one with this participant (variables must match refetchQueries in markConversationAsRead)
    const { data: conversationsData } = useQuery<GetConversationsData>(GET_CONVERSATIONS, {
        variables: { limit: 100, offset: 0 },
    });

    // Resolve other user's display name and avatar from connections (so header/info show name, not userId)
    const { data: connectionsData } = useQuery<{ getConnections?: { connections?: Array<{
        requester: { userId: string; firstName?: string; lastName?: string; avatarUrl?: string };
        receiver: { userId: string; firstName?: string; lastName?: string; avatarUrl?: string };
    }> } }>(GET_MY_CONNECTIONS, { variables: { limit: 200, offset: 0 }, skip: !chat.id });
    const otherUser = connectionsData?.getConnections?.connections?.find(
        (c: { requester: { userId: string }; receiver: { userId: string } }) =>
            c.requester.userId === chat.id || c.receiver.userId === chat.id
    );
    const otherProfile = otherUser
        ? (otherUser.requester.userId === chat.id ? otherUser.requester : otherUser.receiver)
        : null;
    const displayName = otherProfile
        ? [otherProfile.firstName, otherProfile.lastName].filter(Boolean).join(' ').trim() || chat.name || `User ${chat.id.substring(0, 8)}`
        : (chat.name && chat.name !== chat.id ? chat.name : `User ${chat.id.substring(0, 8)}`);
    const otherAvatar = otherProfile?.avatarUrl ?? chat.avatar ?? '';

    // Initialize or retrieve conversation
    useEffect(() => {
        if (!chat.id || !currentUserId) return;

        // Check in-memory store first
        const existing = getRealConversation(chat.id);
        if (existing) {
            setConversationId(existing.conversationId);
            return;
        }

        // Check if conversation already exists from GraphQL query
        if (conversationsData?.getConversations) {
            const isDirectConv = (conv: { type?: string; groupId?: string | null; participantIds?: string[] }) =>
                (conv.type === 'DIRECT' || conv.type === 'direct') ||
                ((conv.type === 'GROUP' || conv.type === 'group') && (conv.groupId == null || conv.groupId === '') && (conv.participantIds?.length === 2));
            const existingConv = conversationsData.getConversations.find(
                (conv) => isDirectConv(conv) && conv.participantIds?.includes(chat.id)
            );
            if (existingConv) {
                setConversationId(existingConv.id);
                setRealConversation(chat.id, {
                    conversationId: existingConv.id,
                    type: 'DIRECT',
                    participantIds: existingConv.participantIds || [currentUserId, chat.id],
                });
                return;
            }
        }

        // Only create if no existing conversation found
        const initConversation = async () => {
            try {
                const { data } = await createConversation({
                    variables: {
                        type: 'DIRECT',
                        participantIds: [chat.id],
                    },
                });

                if (data?.createConversation) {
                    const convId = data.createConversation;
                    setConversationId(convId);
                    setRealConversation(chat.id, {
                        conversationId: convId,
                        type: 'DIRECT',
                        participantIds: [currentUserId, chat.id],
                    });
                }
            } catch (error: unknown) {
                // Handle duplicate key - conversation already exists
                const err = error as { graphQLErrors?: Array<{ message?: string }> };
                const isDuplicate = err?.graphQLErrors?.some(
                    (e: { message?: string }) => e.message?.includes('duplicate key')
                );
                if (isDuplicate) {
                    console.log('Conversation already exists, fetching...');
                    // Conversation exists but we don't have the ID - refetch conversations
                    // The useQuery above will re-run and find it
                } else {
                    console.error('Failed to create conversation:', error);
                }
            }
        };

        initConversation();
    }, [chat.id, currentUserId, conversationsData, getRealConversation, setRealConversation, createConversation]);

    // Fetch message history for this conversation
    const { data: messagesData, refetch: refetchMessages } = useQuery<GetMessagesData>(GET_MESSAGES, {
        variables: { conversationId: conversationId || '', limit: 50, offset: 0 },
        skip: !conversationId,
        fetchPolicy: 'network-only',
    });

    // Sync GraphQL messages to store whenever we have data for the current conversation (initial load + refetch after new message)
    useEffect(() => {
        const messages = messagesData?.getMessages?.messages;
        if (!messages?.length || !conversationId) return;
        const firstConvId = messages[0]?.conversationId;
        if (firstConvId && firstConvId !== conversationId) return;

        const history = messages.map((m: Message): ApiMessage => ({
            id: m.id,
            conversationId: m.conversationId,
            senderId: m.senderId,
            type: (m.type || 'TEXT').toUpperCase() as ApiMessage['type'],
            content: m.content || '',
            createdAt: m.createdAt,
            mentions: m.mentions?.map((mn: MessageMention) => mn.userId) || [],
            replyToId: m.replyToId,
            status: 'read',
            attachments: m.attachments ?? [],
        }));
        setApiMessages(conversationId, history);
    }, [messagesData, conversationId, setApiMessages]);

    // Mark conversation as read when user opens it (resets badge count)
    useEffect(() => {
        if (conversationId) {
            markConversationAsRead({ variables: { conversationId } }).catch((err) => {
                console.warn('markConversationAsRead failed:', err);
            });
        }
    }, [conversationId, markConversationAsRead]);

    // WebSocket: subscribe to events for this conversation (connection is managed by MessageWebSocketProvider)
    useEffect(() => {
        if (!conversationId) return;

        setIsConnected(messageService.isConnected);

        const unsubConnect = messageService.onConnect(() => {
            setIsConnected(true);
        });

        const unsubDisconnect = messageService.onDisconnect(() => {
            setIsConnected(false);
        });

        const unsubMessage = messageService.onMessage((wsMessage) => {
            if (wsMessage.conversationId === conversationId) {
                // Backend sends encryptedData via WebSocket (notification only)
                // Actual decrypted content is fetched via GraphQL
                console.log('📨 New message notification received:', wsMessage.messageId);
                const apiMsg: ApiMessage = {
                    id: wsMessage.messageId,
                    conversationId: wsMessage.conversationId,
                    senderId: wsMessage.senderId,
                    type: (wsMessage.type?.toUpperCase() as ApiMessage['type']) || 'TEXT',
                    content: '[Loading message...]',
                    createdAt: wsMessage.timestamp,
                    mentions: wsMessage.mentions,
                    replyToId: wsMessage.replyToId,
                    status: 'sent',
                };
                addApiMessage(apiMsg);
                refetchMessages();
            }
        });

        return () => {
            unsubConnect();
            unsubDisconnect();
            unsubMessage();
        };
    }, [conversationId, addApiMessage, refetchMessages]);

    // Typing indicator: subscribe to typing:start / typing:stop for the other participant
    useEffect(() => {
        if (!conversationId || !chat.id) return;
        const otherUserId = chat.id;
        let typingTimeout: ReturnType<typeof setTimeout> | null = null;

        const unsubStart = messageService.onTypingStart((data) => {
            if (data.conversationId !== conversationId || data.userId !== otherUserId) return;
            if (typingTimeout) clearTimeout(typingTimeout);
            setOtherUserTyping(true);
            typingTimeout = setTimeout(() => setOtherUserTyping(false), 5000);
        });
        const unsubStop = messageService.onTypingStop((data) => {
            if (data.conversationId !== conversationId || data.userId !== otherUserId) return;
            if (typingTimeout) clearTimeout(typingTimeout);
            typingTimeout = null;
            setOtherUserTyping(false);
        });

        return () => {
            if (typingTimeout) clearTimeout(typingTimeout);
            unsubStart();
            unsubStop();
        };
    }, [conversationId, chat.id]);

    const handleTyping = useCallback((isTyping: boolean) => {
        if (!conversationId) return;
        if (isTyping) messageService.emitTypingStart(conversationId);
        else messageService.emitTypingStop(conversationId);
    }, [conversationId]);

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
        const placeholderId = `pending-${Date.now()}-${idempotencyKey.slice(0, 8)}`;

        try {
            let content: string;
            let messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' = 'TEXT';
            let attachments: Array<{ publicUrl: string; mimeType: string }> = [];

            if (hasFiles && files) {
                const sendingPreviews: Array<{ url?: string; mimeType: string }> = [];
                const urlsToRevoke: string[] = [];
                for (const file of files) {
                    const mime = file.type || 'application/octet-stream';
                    if (mime.startsWith('image/') || mime.startsWith('video/')) {
                        const url = URL.createObjectURL(file);
                        sendingPreviews.push({ url, mimeType: mime });
                        urlsToRevoke.push(url);
                    } else {
                        sendingPreviews.push({ mimeType: mime });
                    }
                }
                pendingRevokeRef.current[placeholderId] = urlsToRevoke;
                addApiMessage({
                    id: placeholderId,
                    conversationId,
                    senderId: currentUserId,
                    type: 'IMAGE',
                    content: messageText.trim(),
                    createdAt: new Date().toISOString(),
                    status: 'sending',
                    attachments: [],
                    sendingPreviews,
                });

                for (const file of files) {
                    const contentType = chatMediaContentType(file.type || 'application/octet-stream');
                    const { data: uploadData } = await getUploadUrl({
                        variables: { contentType, category: 'chat' },
                    });
                    if (!uploadData?.getUploadUrl?.uploadUrl) {
                        (pendingRevokeRef.current[placeholderId] ?? []).forEach(URL.revokeObjectURL);
                        delete pendingRevokeRef.current[placeholderId];
                        removeApiMessage(placeholderId);
                        toast.error('Could not get upload URL. Please try again.');
                        setIsSending(false);
                        return;
                    }
                    const { uploadUrl, publicUrl } = uploadData.getUploadUrl;
                    const uploadRes = await fetch(uploadUrl, {
                        method: 'PUT',
                        body: file,
                        headers: { 'Content-Type': contentType },
                    });
                    if (!uploadRes.ok) {
                        (pendingRevokeRef.current[placeholderId] ?? []).forEach(URL.revokeObjectURL);
                        delete pendingRevokeRef.current[placeholderId];
                        removeApiMessage(placeholderId);
                        toast.error(`Upload failed for ${file.name}. Please try again.`);
                        setIsSending(false);
                        return;
                    }
                    attachments.push({ publicUrl, mimeType: contentType });
                }

                const firstMime = attachments[0]?.mimeType ?? '';
                if (firstMime.startsWith('image/')) messageType = 'IMAGE';
                else if (firstMime.startsWith('video/')) messageType = 'VIDEO';
                else if (firstMime.startsWith('audio/')) messageType = 'AUDIO';
                else messageType = 'FILE';
                content = messageText.trim() || (attachments[0]?.publicUrl ?? '');
            } else {
                content = messageText.trim();
            }

            const { data } = await sendMessageMutation({
                variables: {
                    conversationId,
                    messageType,
                    content,
                    ...(attachments.length && {
                        attachments: attachments.map((a) => ({ publicUrl: a.publicUrl, mimeType: a.mimeType })),
                    }),
                    idempotencyKey,
                },
            });

            if (data?.sendMessage) {
                if (hasFiles && files) {
                    (pendingRevokeRef.current[placeholderId] ?? []).forEach(URL.revokeObjectURL);
                    delete pendingRevokeRef.current[placeholderId];
                    removeApiMessage(placeholderId);
                }
                const sentMsg: ApiMessage = {
                    id: data.sendMessage,
                    conversationId,
                    senderId: currentUserId,
                    type: messageType,
                    content,
                    createdAt: new Date().toISOString(),
                    status: 'sent',
                    ...(attachments.length && {
                        attachments: attachments.map((a, i) => ({
                            gcsPath: a.publicUrl,
                            mimeType: a.mimeType,
                            fileName: files?.[i]?.name,
                            fileSize: files?.[i]?.size,
                        })),
                    }),
                };
                addApiMessage(sentMsg);

                if (isConnected) {
                    const wsType = messageType === 'IMAGE' ? 'image' : messageType === 'VIDEO' ? 'video' : messageType === 'AUDIO' ? 'audio' : 'file';
                    messageService.sendMessage({
                        conversationId,
                        type: messageType === 'TEXT' ? 'text' : wsType,
                        content,
                        idempotencyKey,
                    });
                }
            }
        } catch (error) {
            if (hasFiles && files) {
                (pendingRevokeRef.current[placeholderId] ?? []).forEach(URL.revokeObjectURL);
                delete pendingRevokeRef.current[placeholderId];
                removeApiMessage(placeholderId);
            }
            console.error('❌ Failed to send message:', error);
            toast.error('Failed to send message. Please try again.');
        } finally {
            setIsSending(false);
        }
    }, [conversationId, currentUserId, sendMessageMutation, addApiMessage, removeApiMessage, isConnected, getUploadUrl]);

    const handleBlockConfirm = async () => {
        setIsBlocking(true);
        try {
            const { data } = await blockUserMutation({
                variables: { input: { blockedId: chat.id } },
            });
            if (data?.blockUser?.success) {
                toast.success(t('blockSuccess') || 'User blocked.');
                setBlockModalOpen(false);
                onBack?.();
            } else {
                toast.error(data?.blockUser?.message || 'Failed to block user.');
            }
        } catch (err) {
            console.error('Block user error:', err);
            toast.error('Failed to block user.');
        } finally {
            setIsBlocking(false);
        }
    };

    const handleDeleteConversationConfirm = () => {
        if (conversationId) {
            clearApiMessages(conversationId);
        }
        setDeleteConversationModalOpen(false);
        onBack?.();
    };

    return (
        <div className="flex flex-row h-full w-full space-x-0 md:space-x-2">
            {/* Main Chat Area */}
            <div className={`flex-1 bg-surface-default rounded-none md:rounded-lg border-0 md:border md:border-border-subtle flex flex-col h-full ${isMobile && sidebarOpen ? 'hidden' : 'flex'
                }`}>
                {/* Chat Header - Desktop */}
                <div className="hidden md:flex flex-shrink-0 border-b border-border-subtle p-4 justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <Avatar className="w-12 h-12">
                                <AvatarImage src={otherAvatar} alt="" />
                                <AvatarFallback>{displayName.slice(0, 1).toUpperCase() || 'U'}</AvatarFallback>
                            </Avatar>
                            {chat.online && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-text-success border-2 border-white rounded-full" />
                            )}
                        </div>
                        <div>
                            <h2 className="font-semibold text-text-primary">{displayName}</h2>
                            <p className="text-sm text-text-secondary">
                                {chat.online ? t('online') : t('lastSeen', { time: formatChatTimestamp(chat.lastMessageTime) })}
                            </p>
                        </div>
                    </div>

                    <button onClick={() => setSidebarOpen(!sidebarOpen)}>
                        <InfoIcon className={`w-6 h-6 cursor-pointer transition-colors ${sidebarOpen ? "text-text-white bg-surface-brand rounded-full p-1" : "text-text-brand"
                            }`} />
                    </button>
                </div>

                {/* Mobile: back button, avatar, display name, and info button */}
                <div className="md:hidden flex flex-shrink-0 border-b border-border-subtle p-3 justify-between items-center bg-surface-default">
                    <div className="flex items-center space-x-3 min-w-0">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="p-2 hover:bg-surface-hover rounded-lg transition-colors flex-shrink-0"
                                aria-label={tCommon('backToChats')}
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <Avatar className="w-10 h-10 flex-shrink-0">
                            <AvatarImage src={otherAvatar} alt="" />
                            <AvatarFallback>{displayName.slice(0, 1).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <h2 className="font-semibold text-text-primary truncate">{displayName}</h2>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="flex-shrink-0 p-2 rounded-full hover:bg-surface-subtle transition-colors"
                        aria-label={t('viewProfile')}
                    >
                        <InfoIcon className="w-6 h-6 text-text-brand" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
                    {apiMessages.length === 0 && !conversationId && (
                        <div className="flex items-center justify-center h-full text-text-secondary">
                            <p className="text-sm">{t('typeMessage')}</p>
                        </div>
                    )}
                    {apiMessages.map((message) => {
                        const isMe = message.senderId === currentUserId;
                        return (
                            <div
                                key={message.id}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[85%] sm:max-w-xs lg:max-w-md ${isMe ? 'ml-auto' : ''}`}>
                                    {message.status === 'sending' ? (
                                        message.sendingPreviews?.length ? (
                                            <>
                                                <SendingFilesBubble sendingPreviews={message.sendingPreviews} />
                                                {message.content && (
                                                    <div className={`mt-2 px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-text-brand text-text-white' : 'bg-surface-success/50 text-text-primary dark:text-text-white'}`}>
                                                        {message.content}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl ${isMe ? 'bg-text-brand/80 text-text-white' : 'bg-surface-success/50 text-text-primary'}`}>
                                                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                                                <span className="text-sm">Sending...</span>
                                            </div>
                                        )
                                    ) : message.attachments?.length ? (
                                        (() => {
                                            const attachmentUrls = (message.attachments ?? []).map((a) => a.gcsPath).filter(Boolean) as string[];
                                            const contentUrl = message.content?.trim();
                                            const firstUrl = getFirstUrlInText(message.content);
                                            const contentIsAttachmentUrl = contentUrl && attachmentUrls.some((u) => u === contentUrl);
                                            const firstUrlIsAttachmentUrl = firstUrl && attachmentUrls.some((u) => u === firstUrl);
                                            return (
                                                <>
                                                    <MessageAttachments attachments={message.attachments} />
                                                    {isLinkOnlyContent(message.content) && !contentIsAttachmentUrl && (
                                                        <div className="mt-2">
                                                            <LinkPreviewCard url={message.content!.trim()} />
                                                        </div>
                                                    )}
                                                    {message.content && !isLinkOnlyContent(message.content) && (
                                                        <>
                                                            <div className={`mt-2 px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-text-brand text-text-white' : 'bg-surface-success/50 text-text-primary dark:text-text-white'}`}>
                                                                {message.content}
                                                            </div>
                                                            {firstUrl && !firstUrlIsAttachmentUrl && (
                                                                <div className="mt-2">
                                                                    <LinkPreviewCard url={firstUrl} />
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </>
                                            );
                                        })()
                                    ) : isLinkOnlyContent(message.content) ? (
                                        <div className={isMe ? 'flex justify-end' : ''}>
                                            <LinkPreviewCard url={message.content.trim()} />
                                        </div>
                                    ) : (
                                        <>
                                            <div
                                                className={`px-4 py-2.5 rounded-2xl sm:rounded-full text-sm ${isMe
                                                    ? 'bg-text-brand text-text-white'
                                                    : 'bg-surface-success/50 text-text-primary dark:text-text-white'
                                                    }`}
                                            >
                                                {message.content}
                                            </div>
                                            {getFirstUrlInText(message.content) && (
                                                <div className="mt-2">
                                                    <LinkPreviewCard url={getFirstUrlInText(message.content)!} />
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <p className={`text-xs mt-1.5 px-1 flex items-center gap-1 justify-end ${isMe ? "text-text-tertiary" : ""}`}>
                                        {formatChatTimestamp(message.createdAt)}
                                        {isMe && message.status !== 'sending' && (
                                            <span className={message.status === "read" ? "text-[#34B7F1]" : "text-text-tertiary"}>
                                                {message.status === "read" || message.status === "delivered" ? (
                                                    <span className="inline-flex"><Check className="w-3 h-3 -ml-0.5" /><Check className="w-3 h-3 -ml-1" /></span>
                                                ) : (
                                                    <Check className="w-3 h-3" />
                                                )}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Typing indicator */}
                {otherUserTyping && (
                    <div className="flex-shrink-0 px-3 md:px-4 py-1 text-sm text-text-secondary italic">
                        {displayName} {t('typing')}
                    </div>
                )}

                {/* Message Input */}
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
            </div>

            {/* Sidebar - Mobile Overlay */}
            {sidebarOpen && (
                <>
                    {/* Mobile Backdrop */}
                    {isMobile && (
                        <div
                            className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-200"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}

                    {/* Sidebar Content */}
                    <div className={`
                        ${isMobile ? 'fixed inset-y-0 right-0 z-50 w-[85%] max-w-sm animate-in slide-in-from-right duration-300' : 'w-80'} 
                        bg-surface-default border-l border-border-subtle flex flex-col h-full
                        ${isMobile ? 'rounded-l-2xl shadow-2xl' : 'rounded-lg'}
                    `}>
                        {/* Mobile Close Button */}
                        {isMobile && (
                            <div className="flex justify-between items-center p-4 border-b border-border-subtle md:hidden">
                                <h3 className="font-semibold text-text-primary text-base">{t('viewProfile')}</h3>
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto">
                            <div className="p-4">
                                {/* User Info */}
                                <div className="flex flex-col items-center mb-6">
                                    <Avatar className="w-20 h-20 mb-3">
                                        <AvatarImage src={otherAvatar} alt="avatar" />
                                        <AvatarFallback className="text-2xl">U</AvatarFallback>
                                    </Avatar>
                                    <h4 className="font-semibold text-text-primary text-lg">{displayName}</h4>
                                    {chat.online ? (
                                        <p className="text-sm text-text-success font-medium">{t('online')}</p>
                                    ) : (
                                        <p className="text-sm text-text-secondary">
                                            {t('lastSeen', { time: formatChatTimestamp(chat.lastMessageTime) })}
                                        </p>
                                    )}
                                </div>

                                {/* View Profile Button */}
                                <div className="flex items-center justify-center mb-6">
                                    <ButtonType3 size="lg">
                                        {t('viewProfile')}
                                    </ButtonType3>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex-shrink-0 border-t border-border-subtle p-4 bg-surface-default">
                            <div className="space-y-1">
                                <div className="text-text-danger flex justify-between items-center p-3 hover:bg-surface-hover rounded-lg cursor-pointer transition-colors">
                                    <p className="text-sm font-medium">{t('report')}</p>
                                    <ChevronRight className="w-4 h-4" />
                                </div>

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
                title={t('deleteConversationConfirmTitle') || 'Delete this conversation?'}
                description={t('deleteConversationConfirmDescription') || 'Messages will be removed from your view. This cannot be undone.'}
                confirmText={t('deleteConversation') || tCommon('delete') || 'Delete'}
                confirmVariant="destructive"
            />
        </div>
    );
}