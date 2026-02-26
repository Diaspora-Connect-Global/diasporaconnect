// ============================================
// DIRECT MESSAGE CHAT - REAL API INTEGRATION
// ============================================
// File: components/chats/DirectMessageChat.tsx

import { formatChatTimestamp } from "@/macros/time";
import { Check, ChevronRight, InfoIcon, X } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { MessageInput } from "./MessageInput";
import { useChatStore, ApiMessage } from "@/store/ChatStore";
import { ButtonType3 } from "../custom/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ChatInfo } from "@/app/[locale]/(protected)/(main)/chat/page";
import { useTranslations } from 'next-intl';
import { useMutation, useQuery } from "@apollo/client/react";
import { CREATE_CONVERSATION, SEND_MESSAGE, GET_CONVERSATIONS, GET_MESSAGES, MARK_CONVERSATION_AS_READ } from "@/services/gql/messaging";
import type { Message, MessageMention, CreateConversationData, SendMessageData, GetConversationsData, GetMessagesData, MarkConversationAsReadData } from "@/services/gql/types/messaging";
import { GET_MY_CONNECTIONS } from "@/services/gql/connection";
import { useUserStore } from "@/store/useUserStore";
import { messageService } from "@/services/websocket/messageService";

export default function DirectMessageChat({ chat }: { chat: ChatInfo }) {
    const t = useTranslations('chat.direct');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);

    const { addApiMessage, getApiMessagesByConversation, getRealConversation, setRealConversation, setApiMessages } = useChatStore();

    const user = useUserStore((state) => state.user);
    const currentUserId = user?.userId;

    const apiMessages = getApiMessagesByConversation(conversationId || '');

    const [createConversation] = useMutation<CreateConversationData>(CREATE_CONVERSATION);
    const [sendMessageMutation] = useMutation<SendMessageData>(SEND_MESSAGE);
    const [markConversationAsRead] = useMutation<MarkConversationAsReadData>(MARK_CONVERSATION_AS_READ, {
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
    const { data: messagesData } = useQuery<GetMessagesData>(GET_MESSAGES, {
        variables: { conversationId: conversationId || '', limit: 50, offset: 0 },
        skip: !conversationId,
        fetchPolicy: 'network-only',
    });

    const hasLoadedHistoryRef = useRef<string | null>(null);

    useEffect(() => {
        if (messagesData?.getMessages?.messages && conversationId && hasLoadedHistoryRef.current !== conversationId) {
            // Map the raw GraphQL messages to our internal ApiMessage format
            const history = messagesData.getMessages.messages.map((m: Message): ApiMessage => ({
                id: m.id,
                conversationId: m.conversationId,
                senderId: m.senderId,
                type: (m.type || 'TEXT').toUpperCase() as ApiMessage['type'],
                content: m.content || '',
                createdAt: m.createdAt,
                mentions: m.mentions?.map((mn: MessageMention) => mn.userId) || [],
                replyToId: m.replyToId,
                status: 'read', // History is loaded as read
                mediaMetadata: m.mediaMetadata as ApiMessage['mediaMetadata'],
            }));

            // Prepend or bulk-replace into global store
            setApiMessages(conversationId, history);
            hasLoadedHistoryRef.current = conversationId;
        }
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
            }
        });

        return () => {
            unsubConnect();
            unsubDisconnect();
            unsubMessage();
        };
    }, [conversationId, addApiMessage]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [apiMessages]);

    const handleSendMessage = useCallback(async (messageText: string, image?: string) => {
        if ((!messageText.trim() && !image) || !conversationId || !currentUserId) return;

        const idempotencyKey = crypto.randomUUID();
        setIsSending(true);
        try {
            const messageType = image ? 'IMAGE' : 'TEXT';
            const content = messageText?.trim() || (image ? 'Image' : '');

            const { data } = await sendMessageMutation({
                variables: {
                    conversationId,
                    messageType,
                    content,
                    idempotencyKey,
                },
            });

            if (data?.sendMessage) {
                const sentMsg: ApiMessage = {
                    id: data.sendMessage,
                    conversationId,
                    senderId: currentUserId,
                    type: messageType,
                    content,
                    createdAt: new Date().toISOString(),
                    status: 'sent',
                };
                addApiMessage(sentMsg);

                if (isConnected) {
                    messageService.sendMessage({
                        conversationId,
                        type: image ? 'image' : 'text',
                        content,
                        idempotencyKey,
                    });
                }
            }
        } catch (error) {
            console.error('❌ Failed to send message:', error);
        } finally {
            setIsSending(false);
        }
    }, [conversationId, currentUserId, sendMessageMutation, addApiMessage, isConnected]);

    return (
        <div className="flex flex-row h-full w-full space-x-0 md:space-x-2">
            {/* Main Chat Area */}
            <div className={`flex-1 bg-surface-default rounded-none md:rounded-lg border-0 md:border md:border-border-subtle flex flex-col h-full ${isMobile && sidebarOpen ? 'hidden' : 'flex'
                }`}>
                {/* Chat Header - Hidden on mobile (shown in page.tsx) */}
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

                {/* Mobile: top bar with avatar, display name, and info button */}
                <div className="md:hidden flex flex-shrink-0 border-b border-border-subtle p-3 justify-between items-center bg-surface-default">
                    <div className="flex items-center space-x-3 min-w-0">
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
                                    {message.type === 'IMAGE' && message.mediaMetadata?.gcsPath ? (
                                        <div className="mb-2">
                                            <img
                                                src={message.mediaMetadata.gcsPath}
                                                alt="Shared image"
                                                className="rounded-2xl max-w-full h-auto"
                                            />
                                            {message.content && (
                                                <p className="text-sm text-text-primary mt-2">{message.content}</p>
                                            )}
                                        </div>
                                    ) : (
                                        <div
                                            className={`px-4 py-2.5 rounded-2xl sm:rounded-full text-sm ${isMe
                                                ? 'bg-text-brand text-text-white'
                                                : 'bg-surface-success/50 text-text-primary dark:text-text-white'
                                                }`}
                                        >
                                            {message.content}
                                        </div>
                                    )}
                                    <p className={`text-xs mt-1.5 px-1 flex items-center gap-1 justify-end ${isMe ? "text-text-tertiary" : ""}`}>
                                        {formatChatTimestamp(message.createdAt)}
                                        {isMe && (
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

                {/* Message Input */}
                <div className="flex-shrink-0">
                    <MessageInput
                        onSendMessage={handleSendMessage}
                        placeholder={t('typeMessage')}
                        conversationId={conversationId || chat.id}
                        senderId={currentUserId || 'current-user'}
                        disabled={isSending || !conversationId}
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
                                    <ButtonType3 className="px-6">
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

                                <div className="text-text-danger flex justify-between items-center p-3 hover:bg-surface-hover rounded-lg cursor-pointer transition-colors">
                                    <p className="text-sm font-medium">{t('block')}</p>
                                    <ChevronRight className="w-4 h-4" />
                                </div>

                                <div className="text-text-danger flex justify-between items-center p-3 hover:bg-surface-hover rounded-lg cursor-pointer transition-colors">
                                    <p className="text-sm font-medium">{t('deleteConversation')}</p>
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}