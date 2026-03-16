/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChevronRight, InfoIcon, MessageCircle, X, Menu, Camera } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageInput } from "./MessageInput";
import { MessageAttachments } from "./MessageAttachments";
import { LinkPreviewCard, isLinkOnlyContent } from "./LinkPreviewCard";
import { getFirstUrlInText } from "@/lib/urlPreview";
import { SendingFilesBubble } from "./SendingFilesBubble";
import { formatChatTimestamp } from "@/macros/time";
import { ChatInfo } from "@/app/[locale]/(protected)/(main)/chat/page";
import { useChatStore } from "@/store/ChatStore";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ButtonType2, ButtonType3, ButtonType4Pill } from "../custom/button";
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useLazyQuery } from "@apollo/client/react";
import {
    GET_GROUP,
    GET_GROUP_MEMBERS,
    GET_MY_GROUPS,
    GetGroupResponse,
    GetGroupMembersResponse,
    LEAVE_GROUP,
    DELETE_GROUP,
    UPDATE_GROUP,
    REMOVE_MEMBER,
    UPDATE_MEMBER_ROLE,
    TRANSFER_GROUP_OWNERSHIP,
    LeaveGroupResponse,
    DeleteGroupResponse,
    UpdateGroupResponse,
    RemoveMemberResponse,
    UpdateMemberRoleResponse,
    TransferGroupOwnershipResponse,
    MemberRole,
    GroupPrivacy
} from "@/services/gql/groups";
import { useRouter, useSearchParams } from "next/navigation";
import { EditGroupModal } from "./modals/EditGroupModal";
import { ManageMemberModal } from "./modals/ManageMemberModal";
import { ConfirmationModal } from "../custom/confirmationModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddMembersModal } from "./modals/AddMembersModal";
import { Check, Loader2 } from "lucide-react";
import { ArrowLeft } from "iconsax-reactjs";
import { useUserStore } from "@/store/useUserStore";
import { messageService, Message as WSMessage, SendMessagePayload } from "@/services/websocket/messageService";
import { useMutation as useGqlMutation } from "@apollo/client/react";
import { CREATE_CONVERSATION, SEND_MESSAGE, GET_MESSAGES, GET_CONVERSATIONS, MARK_CONVERSATION_AS_READ } from "@/services/gql/messaging";
import type { CreateConversationData, SendMessageData, GetMessagesData, GetConversationsData, MarkConversationAsReadData } from "@/services/gql/types/messaging";
import { GET_UPLOAD_URL, chatMediaContentType } from "@/services/gql/upload";
import { useImageUpload } from "@/hooks/useImageUpload";
import { CircularImageCropper } from "@/lib/imagecropper";
import type { GetUploadUrlResponse } from "@/services/gql/upload";
import { ApiMessage } from "@/store/ChatStore";
import { toast } from "sonner";

export default function GroupChat() {
    const t = useTranslations('chat.group');
    const tCommon = useTranslations('common');
    const router = useRouter();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pendingRevokeRef = useRef<Record<string, string[]>>({});
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [repliesSidebarOpen, setRepliesSidebarOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<any>(null);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    // Modal states
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddMembersModal, setShowAddMembersModal] = useState(false);
    const [showManageMemberModal, setShowManageMemberModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [showTransferModal, setShowTransferModal] = useState(false);

    // Loading states
    const [isLeavingGroup, setIsLeavingGroup] = useState(false);
    const [isDeletingGroup, setIsDeletingGroup] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());

    const { messages, users, setActiveChat, addMessage, addApiMessage, removeApiMessage, getApiMessagesByConversation, getRealConversation, setRealConversation, setApiMessages } = useChatStore();

    const [conversationId, setConversationId] = useState<string | null>(null);

    /** Lock conversationId + replyToId when reply panel opens so refetches don't change them mid-reply */
    const replyContextRef = useRef<{ conversationId: string; replyToId: string } | null>(null);
    const isSendingReplyRef = useRef(false);

    const [createConversationMutation] = useGqlMutation<CreateConversationData>(CREATE_CONVERSATION);
    const [sendMessageMutation] = useGqlMutation<SendMessageData>(SEND_MESSAGE, {
        refetchQueries: [{ query: GET_CONVERSATIONS, variables: { limit: 100, offset: 0 } }],
    });
    const [getUploadUrl] = useLazyQuery<GetUploadUrlResponse>(GET_UPLOAD_URL);
    const [markConversationAsRead] = useGqlMutation<MarkConversationAsReadData>(MARK_CONVERSATION_AS_READ, {
        refetchQueries: [{ query: GET_CONVERSATIONS, variables: { limit: 100, offset: 0 } }],
    });

    const chatData = sessionStorage.getItem('activeChat');
    let chat: ChatInfo | null = null;

    try {
        chat = chatData ? JSON.parse(chatData) : null;
    } catch (error) {
        console.error('Failed to parse activeChat in GroupChat:', error);
        sessionStorage.removeItem('activeChat');
    }

    const { data: groupData, loading: loadingGroup, refetch: refetchGroup } = useQuery<GetGroupResponse>(GET_GROUP, {
        variables: { groupId: chat?.id || '' },
        skip: !chat?.id,
    });

    const { data: membersData, loading: loadingMembers, refetch: refetchMembers } = useQuery<GetGroupMembersResponse>(GET_GROUP_MEMBERS, {
        variables: { groupId: chat?.id || '', membersLimit: 100, membersOffset: 0 },
        skip: !chat?.id,
    });

    const { data: conversationsData } = useQuery<GetConversationsData>(GET_CONVERSATIONS, {
        variables: { limit: 100, offset: 0 },
        skip: !chat?.id,
    });

    // Stable id for this group's conversation from API (avoids effect re-running on every GET_CONVERSATIONS refetch)
    const resolvedGroupConvId = useMemo(() => {
        const list = conversationsData?.getConversations;
        if (!list?.length || !chat?.id) return null;
        const c = list.find((x: { type?: string; groupId?: string | null }) =>
            (x.type === 'GROUP' || x.type === 'group') && x.groupId === chat.id
        );
        return c?.id ?? null;
    }, [conversationsData?.getConversations, chat?.id]);

    const creationInFlightRef = useRef<string | null>(null);
    const creationMemberIdsKeyRef = useRef<string | null>(null);

    const [leaveGroup] = useMutation<LeaveGroupResponse>(LEAVE_GROUP, {
        refetchQueries: [{ query: GET_MY_GROUPS, variables: { limit: 50, offset: 0 } }],
        awaitRefetchQueries: true,
    });

    const [deleteGroup] = useMutation<DeleteGroupResponse>(DELETE_GROUP, {
        refetchQueries: [{ query: GET_MY_GROUPS, variables: { limit: 50, offset: 0 } }],
        awaitRefetchQueries: true,
    });

    const [updateGroup] = useMutation<UpdateGroupResponse>(UPDATE_GROUP, {
        onCompleted: () => refetchGroup(),
    });

    const [removeMember] = useMutation<RemoveMemberResponse>(REMOVE_MEMBER, {
        onCompleted: () => refetchMembers(),
    });

    const [updateMemberRole] = useMutation<UpdateMemberRoleResponse>(UPDATE_MEMBER_ROLE, {
        onCompleted: () => refetchMembers(),
    });

    const [transferOwnership] = useMutation<TransferGroupOwnershipResponse>(TRANSFER_GROUP_OWNERSHIP, {
        onCompleted: () => {
            refetchGroup();
            refetchMembers();
        },
    });

    const group = groupData?.getGroup?.group;
    const groupMembers = membersData?.getGroupMembers?.members || [];
    const groupMembersCount = membersData?.getGroupMembers?.total || 0;
    const user = useUserStore((state) => state.user);

    const currentUserId = user?.userId;
    const currentUserMember = groupMembers.find(m => m.userId === currentUserId);
    const isOwner = group?.ownerId === currentUserId;
    const isAdmin = currentUserMember?.role === MemberRole.ADMIN || isOwner;

    // Group avatar upload (info sidebar)
    const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
    const {
        uploading: avatarUploading,
        rawImage: avatarRawImage,
        croppedImage: avatarCroppedImage,
        showCropper: showAvatarCropper,
        handleFileSelect: handleAvatarFileSelect,
        handleCropConfirm: handleAvatarCropConfirm,
        handleCropCancel: handleAvatarCropCancel,
        uploadImage: uploadGroupAvatar,
        reset: resetGroupAvatarUpload,
    } = useImageUpload({
        category: "group_avatar",
        contentType: "image/jpeg",
        onSuccess: async (publicUrl) => {
            await handleGroupAvatarUpload(publicUrl);
            resetGroupAvatarUpload();
        },
        onError: () => {
            toast.error(t('updateFailed'));
        },
    });
    const searchParams = useSearchParams();

    const apiMessages = getApiMessagesByConversation(conversationId || '');
    const mainThreadMessages = useMemo(
        () => apiMessages.filter((m) => !m.replyToId),
        [apiMessages]
    );
    const repliesForSidebar = useMemo(() => {
        if (!selectedMessage?.id) return [];
        return apiMessages
            .filter((m) => m.replyToId === selectedMessage.id)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }, [apiMessages, selectedMessage?.id]);
    const getReplyCount = useCallback((messageId: string) => apiMessages.filter((m) => m.replyToId === messageId).length, [apiMessages]);
    const chatchosen = sessionStorage.getItem('activeChat');

    useEffect(() => {
        setRepliesSidebarOpen(false);
        setSidebarOpen(false);
    }, [chatchosen]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [mainThreadMessages]);

    // Create or retrieve group conversation (resolve from store, then GET_CONVERSATIONS, then create)
    useEffect(() => {
        if (!chat?.id || !currentUserId || !groupMembers.length) return;

        const existing = getRealConversation(chat.id);
        if (existing) {
            setConversationId(existing.conversationId);
            return;
        }

        // Resolve from existing conversations (same as DM) so we get messages on first load / after refresh
        if (resolvedGroupConvId) {
            const list = conversationsData?.getConversations;
            const groupConv = list?.find(
                (c: { type?: string; groupId?: string | null; id?: string }) =>
                    (c.type === 'GROUP' || c.type === 'group') && c.groupId === chat.id && c.id === resolvedGroupConvId
            );
            if (groupConv) {
                setConversationId(groupConv.id);
                const participantIds = (groupConv as { participantIds?: string[] }).participantIds ?? [];
                setRealConversation(chat.id, {
                    conversationId: groupConv.id,
                    type: 'GROUP',
                    participantIds,
                });
                return;
            }
            // ID was resolved earlier but not in current list (e.g. refetched list is stale/incomplete).
            // Use the known id and set store to avoid creating a duplicate conversation.
            const fallbackParticipantIds = groupMembers.map(m => m.userId);
            setConversationId(resolvedGroupConvId);
            setRealConversation(chat.id, {
                conversationId: resolvedGroupConvId,
                type: 'GROUP',
                participantIds: fallbackParticipantIds,
            });
            return;
        }

        const memberIds = groupMembers.map(m => m.userId).filter(id => id !== currentUserId);
        const memberIdsKey = memberIds.slice().sort().join(',');

        // Prevent duplicate create for the same chat+members; if members changed during in-flight create, allow new create
        if (creationInFlightRef.current === chat.id && creationMemberIdsKeyRef.current === memberIdsKey) return;
        creationInFlightRef.current = chat.id;
        creationMemberIdsKeyRef.current = memberIdsKey;

        const initGroupConversation = async () => {
            try {
                const { data } = await createConversationMutation({
                    variables: {
                        type: 'GROUP',
                        participantIds: memberIds,
                        groupId: chat?.id,
                    },
                });

                if (data?.createConversation) {
                    const convId = data.createConversation;
                    setConversationId(convId);
                    setRealConversation(chat?.id, {
                        conversationId: convId,
                        type: 'GROUP',
                        participantIds: [currentUserId, ...memberIds],
                    });
                }
            } catch (error) {
                console.error('Failed to create group conversation:', error);
            } finally {
                creationInFlightRef.current = null;
                creationMemberIdsKeyRef.current = null;
            }
        };

        initGroupConversation();
    }, [chat?.id, currentUserId, groupMembers, resolvedGroupConvId, conversationsData?.getConversations, getRealConversation, setRealConversation, createConversationMutation]);

    // Fetch message history for this group conversation
    const { data: messagesData, refetch: refetchMessages } = useQuery<GetMessagesData>(GET_MESSAGES, {
        variables: { conversationId: conversationId || '', limit: 50, offset: 0 },
        skip: !conversationId,
        fetchPolicy: 'network-only',
    });

    // Sync GraphQL messages to store whenever we have data for the current conversation (initial load, refetch, or refresh)
    useEffect(() => {
        if (!conversationId) return;
        const getMessagesResult = messagesData?.getMessages;
        if (getMessagesResult === undefined) return;

        const messages = getMessagesResult.messages ?? [];
        const firstConvId = messages[0]?.conversationId;
        if (messages.length > 0 && firstConvId && firstConvId !== conversationId) return;

        const history = messages.map((m: any): ApiMessage => ({
            id: m.id,
            conversationId: m.conversationId,
            senderId: m.senderId,
            type: (m.type || 'TEXT').toUpperCase() as ApiMessage['type'],
            content: m.content || '',
            createdAt: m.createdAt,
            mentions: m.mentions?.map((mn: any) => mn.userId) || [],
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

        const unsubMessage = messageService.onMessage((wsMessage: WSMessage) => {
            if (wsMessage.conversationId === conversationId) {
                // Backend sends encryptedData via WebSocket (notification only)
                // Actual decrypted content should be fetched via GraphQL
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

        const unsubPresence = messageService.onPresenceUpdate((data) => {
            setOnlineUsers(prev => {
                const newSet = new Set(prev);
                data.isOnline ? newSet.add(data.userId) : newSet.delete(data.userId);
                return newSet;
            });
        });

        return () => {
            unsubConnect();
            unsubDisconnect();
            unsubMessage();
            unsubPresence();
        };
    }, [conversationId, addApiMessage, refetchMessages]);

    // Typing indicator: subscribe to typing:start / typing:stop (exclude current user)
    useEffect(() => {
        if (!conversationId || !currentUserId) return;
        const timeoutsByUser = new Map<string, ReturnType<typeof setTimeout>>();

        const unsubStart = messageService.onTypingStart((data) => {
            if (data.conversationId !== conversationId || data.userId === currentUserId) return;
            const uid = data.userId;
            if (timeoutsByUser.has(uid)) {
                clearTimeout(timeoutsByUser.get(uid)!);
                timeoutsByUser.delete(uid);
            }
            setTypingUserIds((prev) => new Set(prev).add(uid));
            const t = setTimeout(() => {
                timeoutsByUser.delete(uid);
                setTypingUserIds((prev) => {
                    const next = new Set(prev);
                    next.delete(uid);
                    return next;
                });
            }, 5000);
            timeoutsByUser.set(uid, t);
        });
        const unsubStop = messageService.onTypingStop((data) => {
            if (data.conversationId !== conversationId || data.userId === currentUserId) return;
            const uid = data.userId;
            if (timeoutsByUser.has(uid)) {
                clearTimeout(timeoutsByUser.get(uid)!);
                timeoutsByUser.delete(uid);
            }
            setTypingUserIds((prev) => {
                const next = new Set(prev);
                next.delete(uid);
                return next;
            });
        });

        return () => {
            timeoutsByUser.forEach((t) => clearTimeout(t));
            unsubStart();
            unsubStop();
        };
    }, [conversationId, currentUserId]);

    const handleTyping = useCallback((isTyping: boolean) => {
        if (!conversationId) return;
        if (isTyping) messageService.emitTypingStart(conversationId);
        else messageService.emitTypingStop(conversationId);
    }, [conversationId]);

    const handleMBack = () => {
        setActiveChat(null);
        sessionStorage.removeItem('activeChat');
        const params = new URLSearchParams(searchParams.toString());
        params.delete('ct');
        const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
        router.push(newUrl, { scroll: false });
    };

    const getUserById = (userId: string) => {
        const member = groupMembers.find((m) => m.userId === userId);
        if (member?.profile) {
            const name = [member.profile.firstName, member.profile.lastName].filter(Boolean).join(' ').trim();
            return { id: member.userId, name: name || 'Unknown User', avatar: member.profile.avatarUrl };
        }
        return users?.find((u) => u.id === userId);
    };

    const getSenderName = (senderId: string): string => getUserById(senderId)?.name ?? 'Unknown User';

    const handleSendMessage = async (messageText: string, files?: File[]) => {
        const hasText = !!messageText.trim();
        const hasFiles = !!files?.length;
        if (!hasText && !hasFiles) return;
        if (!currentUserId || !conversationId) {
            console.warn('Cannot send: missing userId or conversationId');
            return;
        }

        const idempotencyKey = crypto.randomUUID();
        const placeholderId = `pending-${Date.now()}-${idempotencyKey.slice(0, 8)}`;
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

            try {
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
                        return;
                    }
                    attachments.push({ publicUrl, mimeType: contentType });
                }
            } catch (err) {
                console.error('Upload failed:', err);
                (pendingRevokeRef.current[placeholderId] ?? []).forEach(URL.revokeObjectURL);
                delete pendingRevokeRef.current[placeholderId];
                removeApiMessage(placeholderId);
                toast.error('Upload failed. Please try again.');
                return;
            }

            const firstMime = attachments[0]?.mimeType ?? '';
            if (firstMime.startsWith('image/')) messageType = 'IMAGE';
            else if (firstMime.startsWith('video/')) messageType = 'VIDEO';
            else if (firstMime.startsWith('audio/')) messageType = 'AUDIO';
            else messageType = 'FILE';
            content = hasText ? messageText.trim() : (attachments[0]?.publicUrl ?? '');
        } else {
            content = messageText.trim();
        }

        const attachmentInput = attachments.length
            ? attachments.map((a) => ({ publicUrl: a.publicUrl, mimeType: a.mimeType }))
            : undefined;
        const sendContent = attachments.length ? (hasText ? messageText.trim() : content) : content;

        if (replyingTo) {
            if (isSendingReplyRef.current) {
                toast.error('Please wait for the previous reply to send.');
                return;
            }
            const replyCtx = replyContextRef.current?.replyToId === replyingTo ? replyContextRef.current : null;
            const replyConvId = replyCtx?.conversationId ?? conversationId;
            const replyTargetId = replyCtx?.replyToId ?? replyingTo;
            const messagesInConv = getApiMessagesByConversation(replyConvId);
            const targetInConv = messagesInConv.some((m) => m.id === replyTargetId);
            if (!targetInConv) {
                toast.error('Reply target is no longer in this conversation. Send as a new message or reopen the reply.');
                setReplyingTo(null);
                replyContextRef.current = null;
                return;
            }
            isSendingReplyRef.current = true;
            try {
                const { data } = await sendMessageMutation({
                    variables: {
                        conversationId: replyConvId,
                        messageType,
                        content: sendContent,
                        attachments: attachmentInput,
                        replyToId: replyTargetId,
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
                        conversationId: replyConvId,
                        senderId: currentUserId,
                        type: messageType,
                        content: sendContent,
                        createdAt: new Date().toISOString(),
                        status: 'sent',
                        replyToId: replyTargetId,
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
                }
            } catch (error) {
                console.error('Failed to send reply:', error);
                if (hasFiles && files) {
                    (pendingRevokeRef.current[placeholderId] ?? []).forEach(URL.revokeObjectURL);
                    delete pendingRevokeRef.current[placeholderId];
                    removeApiMessage(placeholderId);
                }
                toast.error('Failed to send reply. Please try again.');
            } finally {
                isSendingReplyRef.current = false;
            }
            // Keep replyingTo set so further replies in the same section still send as replies; cleared when user closes Reply section
        } else {
            try {
                const { data } = await sendMessageMutation({
                    variables: {
                        conversationId,
                        messageType,
                        content: sendContent,
                        attachments: attachmentInput,
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
                        content: sendContent,
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
                            content: sendContent,
                            idempotencyKey,
                        });
                    }
                }
            } catch (error) {
                console.error('Failed to send message:', error);
                if (hasFiles && files) {
                    (pendingRevokeRef.current[placeholderId] ?? []).forEach(URL.revokeObjectURL);
                    delete pendingRevokeRef.current[placeholderId];
                    removeApiMessage(placeholderId);
                }
                toast.error('Failed to send message. Please try again.');
            }
        }
    };

    const handleViewReplies = (message: any) => {
        setSelectedMessage(message);
        setRepliesSidebarOpen(true);
        setReplyingTo(message.id);
        setSidebarOpen(false);
        if (conversationId && message?.id) {
            replyContextRef.current = { conversationId, replyToId: message.id };
        }
    };

    const handleCloseReplies = () => {
        setRepliesSidebarOpen(false);
        setSelectedMessage(null);
        setReplyingTo(null);
        replyContextRef.current = null;
    };

    const handleSideBarToggle = () => {
        setSidebarOpen(!sidebarOpen);
        setRepliesSidebarOpen(false);
    };

    const handleLeaveGroup = async () => {
        setIsLeavingGroup(true);
        try {
            const { data } = await leaveGroup({ variables: { leaveGroupId: chat?.id } });
            if (data?.leaveGroup.success) {
                setActiveChat(null);
                sessionStorage.removeItem('activeChat');
                router.push('/chat?t=groups');
                setShowLeaveModal(false);
            } else {
                console.error('Failed to leave group:', data?.leaveGroup.message);
            }
        } catch (error) {
            console.error('Error leaving group:', error);
        } finally {
            setIsLeavingGroup(false);
        }
    };

    const handleDeleteGroup = async () => {
        setIsDeletingGroup(true);
        try {
            const { data } = await deleteGroup({ variables: { deleteGroupId: chat?.id } });
            if (data?.deleteGroup.success) {
                setActiveChat(null);
                sessionStorage.removeItem('activeChat');
                router.push('/chat?t=groups');
                setShowDeleteModal(false);
            } else {
                console.error('Failed to delete group:', data?.deleteGroup.message);
            }
        } catch (error) {
            console.error('Error deleting group:', error);
        } finally {
            setIsDeletingGroup(false);
        }
    };

    const handleEditGroup = async (updates: {
        name?: string;
        description?: string;
        avatarUrl?: string;
        privacy?: GroupPrivacy
    }) => {
        try {
            const { data } = await updateGroup({
                variables: { updateInput: { groupId: chat?.id, ...updates } }
            });
            if (data?.updateGroup.success) {
                setShowEditModal(false);
            } else {
                console.error('Failed to update group:', data?.updateGroup.message);
            }
        } catch (error) {
            console.error('Error updating group:', error);
        }
    };

    const handleGroupAvatarUpload = async (publicUrl: string) => {
        if (!chat?.id) return;
        try {
            const { data } = await updateGroup({
                variables: { updateInput: { groupId: chat.id, avatarUrl: publicUrl } }
            });
            if (data?.updateGroup.success) {
                toast.success(t('groupPhotoUpdated'));
            } else {
                toast.error(data?.updateGroup.message ?? t('updateFailed'));
            }
        } catch (error) {
            toast.error(t('updateFailed'));
        }
    };

    const handleMemberClick = (member: any) => {
        if (isAdmin && member.userId !== currentUserId) {
            setSelectedMember(member);
            setShowManageMemberModal(true);
        }
    };

    const handleRemoveMember = async (userId: string) => {
        try {
            const { data } = await removeMember({
                variables: { removeInput: { groupId: chat?.id, userId } }
            });
            if (data?.removeGroupMember.success) {
                setShowManageMemberModal(false);
                setSelectedMember(null);
            } else {
                console.error('Failed to remove member:', data?.removeGroupMember.message);
            }
        } catch (error) {
            console.error('Error removing member:', error);
        }
    };

    const handleUpdateMemberRole = async (userId: string, role: MemberRole) => {
        try {
            const { data } = await updateMemberRole({
                variables: { roleInput: { groupId: chat?.id, userId, role } }
            });
            if (data?.updateMemberRole.success) {
                setShowManageMemberModal(false);
                setSelectedMember(null);
            } else {
                console.error('Failed to update member role:', data?.updateMemberRole.message);
            }
        } catch (error) {
            console.error('Error updating member role:', error);
        }
    };

    if (!chat) {
        return (
            <div className="flex items-center justify-center h-full text-text-secondary">
                <p>{t('selectChat')}</p>
            </div>
        );
    }

    if (loadingGroup || loadingMembers) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!group) {
        return (
            <div className="flex items-center justify-center h-full text-text-secondary">
                <p>{t('groupNotFound')}</p>
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-row h-full space-x-0 md:space-x-2">

                {/* Main Chat Area */}
                <div className={`flex-1 bg-surface-default rounded-none md:rounded-lg border-0 md:border md:border-border-subtle flex flex-col h-full min-h-0 ${isMobile && (sidebarOpen || repliesSidebarOpen) ? 'hidden' : 'flex'}`}>
                    {/* Group Header */}
                    <div className="md:flex flex-shrink-0 border-b border-border-subtle p-4 justify-between">
                        <div className="flex items-center space-x-3">
                            <ButtonType3
                                onClick={handleMBack}
                                className="p-2 hover:bg-surface-hover rounded-lg md:hidden border-0 bg-transparent min-w-0"
                                aria-label={tCommon('backToChats')}
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </ButtonType3>
                            <div className="relative">
                                <Avatar className="w-12 h-12">
                                    <AvatarImage src={group.avatarUrl || chat.avatar || undefined} alt="avatar" />
                                    <AvatarFallback>{group.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </div>
                            <div>
                                <h2 className="font-semibold text-text-primary">{group.name}</h2>
                                <div className="flex items-center space-x-2">
                                    <p className="text-sm text-text-secondary">{t('memberCount', { count: group.memberCount })}</p>
                                    {isConnected && (
                                        <div className="flex items-center space-x-1">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <span className="text-xs text-green-600">Online</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <ButtonType3 onClick={handleSideBarToggle} className="p-0 min-w-0 border-0 bg-transparent">
                            <InfoIcon className={`hidden md:block w-6 h-6 cursor-pointer ${sidebarOpen ? "text-text-white bg-surface-brand rounded-full" : "text-text-brand"}`} />
                        </ButtonType3>
                    </div>

                    {/* Mobile Info Button */}
                    <ButtonType3
                        onClick={handleSideBarToggle}
                        className="md:hidden fixed top-20 right-4 z-10 p-2 bg-surface-brand rounded-full shadow-lg border-0"
                    >
                        <Menu className="w-5 h-5 text-text-white" />
                    </ButtonType3>

                    {/* Messages Area - only top-level messages; replies show in Reply section */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
                        {mainThreadMessages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-text-secondary">
                                <MessageCircle className="w-12 h-12 mb-4 opacity-50" />
                                <p>{t('noMessages')}</p>
                            </div>
                        ) : (
                            mainThreadMessages.map((message) => {
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
                                                            <div className={`mt-2 px-3 py-2 sm:px-4 sm:py-3 rounded-2xl sm:rounded-4xl text-sm sm:text-base ${isMe ? 'bg-text-brand text-text-white' : 'bg-surface-success/50 text-text-primary dark:text-text-white'}`}>
                                                                {message.content}
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 rounded-2xl ${isMe ? 'bg-text-brand/80 text-text-white' : 'bg-surface-success/50 text-text-primary'}`}>
                                                        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                                                        <span className="text-sm sm:text-base">Sending...</span>
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
                                                            {!isMe && (
                                                                <p className="text-[10px] sm:text-xs text-text-primary mb-1 ml-1 font-medium">
                                                                    {getSenderName(message.senderId)}
                                                                </p>
                                                            )}
                                                            <MessageAttachments attachments={message.attachments} />
                                                            {isLinkOnlyContent(message.content) && !contentIsAttachmentUrl && (
                                                                <div className="mt-2">
                                                                    <LinkPreviewCard url={message.content!.trim()} />
                                                                </div>
                                                            )}
                                                            {message.content && !isLinkOnlyContent(message.content) && (
                                                                <>
                                                                    <div className={`mt-2 px-3 py-2 sm:px-4 sm:py-3 rounded-2xl sm:rounded-4xl text-sm sm:text-base ${isMe ? 'bg-text-brand text-text-white' : 'bg-surface-success/50 text-text-primary dark:text-text-white'}`}>
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
                                                <>
                                                    {!isMe && (
                                                        <p className="text-[10px] sm:text-xs text-text-primary mb-1 ml-1 font-medium">
                                                            {getSenderName(message.senderId)}
                                                        </p>
                                                    )}
                                                    <div className={isMe ? 'flex justify-end' : ''}>
                                                        <LinkPreviewCard url={message.content.trim()} />
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div
                                                        className={`px-3 py-2 sm:px-4 sm:py-3 rounded-2xl sm:rounded-4xl text-sm sm:text-base ${isMe
                                                            ? 'bg-text-brand text-text-white'
                                                            : 'bg-surface-success/50 text-text-primary dark:text-text-white'
                                                            }`}
                                                    >
                                                        {!isMe && (
                                                            <p className="text-[10px] sm:text-xs mb-1 font-medium opacity-80">
                                                                {getSenderName(message.senderId)}
                                                            </p>
                                                        )}
                                                        {message.content}
                                                    </div>
                                                    {getFirstUrlInText(message.content) && (
                                                        <div className="mt-2">
                                                            <LinkPreviewCard url={getFirstUrlInText(message.content)!} />
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            <div className={`space-x-2 flex items-center mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                                                {!isMe && (
                                                    <Avatar className="w-4 h-4 sm:w-6 sm:h-6 flex-shrink-0">
                                                        <AvatarImage src={getUserById(message.senderId)?.avatar || undefined} alt="avatar" />
                                                        <AvatarFallback>{getSenderName(message.senderId).charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                )}
                                                <p className="text-[10px] sm:text-xs text-text-tertiary flex items-center gap-1">
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
                                                <ButtonType3
                                                    onClick={() => handleViewReplies({ ...message, text: message.content, timestamp: message.createdAt })}
                                                    className="flex items-center space-x-1 text-[10px] sm:text-xs p-0 min-w-0 border-0 bg-transparent"
                                                >
                                                    <span>{t('reply')}</span>
                                                </ButtonType3>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                        {typingUserIds.size > 0 && (
                            <div className="flex-shrink-0 px-3 py-1.5 flex items-center gap-2 text-text-tertiary text-xs sm:text-sm">
                                <span className="inline-flex gap-0.5">
                                    {[0, 1, 2].map((i) => (
                                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                    ))}
                                </span>
                                {typingUserIds.size === 1
                                    ? `${getSenderName([...typingUserIds][0])} is typing...`
                                    : `${typingUserIds.size} people are typing...`}
                            </div>
                        )}
                    </div>

                    {/* Main Message Input */}
                    {!repliesSidebarOpen && (
                        <div className="flex-shrink-0">
                            <MessageInput
                                onSendMessage={handleSendMessage}
                                placeholder={t('message', { name: group.name })}
                                conversationId={conversationId || chat?.id}
                                senderId={currentUserId ?? 'current-user'}
                                disabled={!conversationId}
                                onTyping={handleTyping}
                            />
                        </div>
                    )}
                </div>

                {/* Group Info Sidebar */}
                {sidebarOpen && (
                    <>
                        {isMobile && (
                            <div
                                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                                onClick={() => setSidebarOpen(false)}
                            />
                        )}

                        <div className={`
                            ${isMobile ? 'fixed inset-y-0 right-0 z-50 w-[85%] max-w-sm' : 'w-80'} 
                            bg-surface-default border-l border-border-subtle flex flex-col min-h-0
                            ${isMobile ? 'rounded-l-2xl' : 'rounded-lg'}
                        `}>
                            {isMobile && (
                                <div className="flex justify-between items-center p-4 border-b border-border-subtle">
                                    <h3 className="font-semibold text-text-primary">{t('groupInfo')}</h3>
                                    <ButtonType3
                                        onClick={() => setSidebarOpen(false)}
                                        className="p-2 hover:bg-surface-hover rounded-lg border-0 bg-transparent min-w-0"
                                    >
                                        <X className="w-5 h-5" />
                                    </ButtonType3>
                                </div>
                            )}

                            <div className="p-4 flex-1 min-h-0 flex flex-col overflow-y-auto">
                                <div className="flex-shrink-0 flex flex-col items-center mb-6">
                                    <div className="relative">
                                        <Avatar className="w-16 h-16 sm:w-20 sm:h-20">
                                            <AvatarImage src={group.avatarUrl || undefined} alt="avatar" />
                                            <AvatarFallback>{group.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        {avatarUploading && (
                                            <div
                                                className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center"
                                                aria-hidden
                                            >
                                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                                            </div>
                                        )}
                                        {isAdmin && (
                                            <>
                                                <input
                                                    ref={avatarFileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            handleAvatarFileSelect(file);
                                                        }
                                                        e.target.value = "";
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => avatarFileInputRef.current?.click()}
                                                    disabled={avatarUploading}
                                                    className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-primary-foreground shadow hover:opacity-90 disabled:opacity-50"
                                                    title={t('changeGroupPhoto')}
                                                >
                                                    <Camera className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <h4 className="font-semibold text-text-primary text-base sm:text-lg mt-3">{group.name}</h4>
                                    {group.description && (
                                        <p className="text-sm text-text-secondary mt-1 text-center">{group.description}</p>
                                    )}
                                </div>

                                {isAdmin && (
                                    <div className="flex-shrink-0 flex items-center justify-center mb-6">
                                        <ButtonType3
                                            className="text-sm"
                                            onClick={() => setShowEditModal(true)}
                                        >
                                            {t('edit')}
                                        </ButtonType3>
                                    </div>
                                )}

                                <div className="flex-1 min-h-0 mb-6">
                                    <div className="flex-shrink-0 flex justify-between items-center mb-3">
                                        <h5 className="text-sm font-medium text-text-primary">
                                            {t('members')} ({groupMembersCount})
                                        </h5>
                                        {isAdmin && (
                                            <ButtonType3
                                                className="text-xs py-1 px-2"
                                                onClick={() => setShowAddMembersModal(true)}
                                            >
                                                {t('addPeople')}
                                            </ButtonType3>
                                        )}
                                    </div>
                                    <div className="space-y-2 overflow-y-auto">
                                        {groupMembers.map((member) => (
                                            <div
                                                key={member.id}
                                                className={`flex items-center space-x-3 p-2 rounded-lg ${isAdmin && member.userId !== currentUserId
                                                    ? 'hover:bg-surface-hover cursor-pointer'
                                                    : ''
                                                    }`}
                                                onClick={() => handleMemberClick(member)}
                                            >
                                                <Avatar className="w-10 h-10">
                                                    <AvatarImage src={member?.profile?.avatarUrl || undefined} alt="avatar" />
                                                    <AvatarFallback>U</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-text-primary truncate">
                                                        {[member?.profile?.firstName, member?.profile?.lastName].filter(Boolean).join(' ').trim() || group?.name || 'Unknown'}
                                                    </p>
                                                    <p className="text-xs text-text-secondary capitalize">
                                                        {member.role?.toLowerCase() ?? 'member'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-shrink-0 border-t border-border-subtle p-4">
                                <div className="space-y-2">
                                    <ButtonType4Pill
                                        onClick={() => setShowLeaveModal(true)}
                                        className="w-full flex justify-between items-center p-2 hover:bg-surface-hover rounded-lg"
                                    >
                                        <p className="text-sm">{t('leaveGroup')}</p>
                                        <ChevronRight className="w-4 h-4" />
                                    </ButtonType4Pill>
                                    {isOwner && (
                                        <>
                                            <ButtonType4Pill
                                                onClick={() => setShowTransferModal(true)}
                                                className="w-full flex justify-between items-center p-2 hover:bg-surface-hover rounded-lg"
                                            >
                                                <p className="text-sm">{t('transferOwnership')}</p>
                                                <ChevronRight className="w-4 h-4" />
                                            </ButtonType4Pill>
                                            <ButtonType4Pill
                                                onClick={() => setShowDeleteModal(true)}
                                                className="w-full flex justify-between items-center p-2 hover:bg-surface-hover rounded-lg"
                                            >
                                                <p className="text-sm">{t('deleteGroup')}</p>
                                                <ChevronRight className="w-4 h-4" />
                                            </ButtonType4Pill>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Replies Sidebar */}
                {repliesSidebarOpen && (
                    <>
                        {isMobile && (
                            <div
                                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                                onClick={handleCloseReplies}
                            />
                        )}

                        <div className={`
                            ${isMobile ? 'fixed inset-y-0 right-0 z-50 w-[85%] max-w-sm' : 'w-80'} 
                            bg-surface-default border-l border-border-subtle flex flex-col min-h-0
                            ${isMobile ? 'rounded-l-2xl' : 'rounded-lg'}
                        `}>
                            <div className="flex-shrink-0 p-4 flex justify-between items-center border-b border-border-subtle">
                                <h3 className="font-semibold text-text-primary text-sm sm:text-base">{t('replies')}</h3>
                                <ButtonType3
                                    onClick={handleCloseReplies}
                                    className="p-1 hover:bg-surface-hover rounded-full border-0 bg-transparent min-w-0"
                                >
                                    <X className="w-4 h-4 text-text-secondary" />
                                </ButtonType3>
                            </div>

                            {selectedMessage && (
                                <div className="flex-shrink-0 p-3 sm:p-4 border-b border-border-subtle bg-surface-hover">
                                    <div className="bg-surface-brand text-text-white px-3 py-3 sm:px-4 sm:py-4 rounded-2xl sm:rounded-4xl mb-2">
                                        <span className="text-xs sm:text-sm font-medium text-text-white">
                                            {getSenderName(selectedMessage.senderId)}
                                        </span>
                                        <p className="text-xs sm:text-sm text-text-white">{selectedMessage.text}</p>
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-text-tertiary flex items-center space-x-2">
                                        <Avatar className="w-4 h-4 sm:w-6 sm:h-6">
                                            <AvatarImage src={getUserById(selectedMessage.senderId)?.avatar || undefined} alt="avatar" />
                                            <AvatarFallback>{getSenderName(selectedMessage.senderId).charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span>{formatChatTimestamp(selectedMessage.timestamp)}</span>
                                    </p>
                                </div>
                            )}

                            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                                {repliesForSidebar.length > 0 ? (
                                    repliesForSidebar.map((reply) => (
                                        <div key={reply.id}>
                                            <div className="bg-surface-success/50 rounded-2xl sm:rounded-4xl px-3 py-3 sm:px-4 sm:py-4">
                                                <span className="text-xs sm:text-sm font-medium text-text-primary dark:text-text-white">
                                                    {getSenderName(reply.senderId)}
                                                </span>
                                                {reply.attachments?.length ? (
                                                    <>
                                                        <MessageAttachments attachments={reply.attachments} />
                                                        {reply.content && <p className="text-xs sm:text-sm text-text-primary dark:text-text-white mt-1">{reply.content}</p>}
                                                    </>
                                                ) : (
                                                    <p className="text-xs sm:text-sm text-text-primary dark:text-text-white">{reply.content}</p>
                                                )}
                                            </div>
                                            <div className="flex space-x-2 items-center mt-1">
                                                <Avatar className="w-3 h-3 sm:w-4 sm:h-4">
                                                    <AvatarImage src={getUserById(reply.senderId)?.avatar || undefined} alt="avatar" />
                                                    <AvatarFallback>{getSenderName(reply.senderId).charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-[10px] sm:text-xs text-text-tertiary">
                                                    {formatChatTimestamp(reply.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-text-secondary py-8">
                                        <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-xs sm:text-sm">{t('noReplies')}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex-shrink-0">
                                <MessageInput
                                    onSendMessage={handleSendMessage}
                                    placeholder={t('writeReply')}
                                    conversationId={conversationId ?? chat?.id}
                                    senderId={currentUserId ?? 'current-user'}
                                    onTyping={handleTyping}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Confirmation Modals */}
            <ConfirmationModal
                open={showLeaveModal}
                onCancel={() => setShowLeaveModal(false)}
                onConfirm={handleLeaveGroup}
                title={t('leaveGroup')}
                description={t('leaveGroupConfirmation', { groupName: group.name })}
                confirmText={t('leave')}
                cancelText={t('cancel')}
                confirmVariant="destructive"
                isLoading={isLeavingGroup}
            />
            <ConfirmationModal
                open={showDeleteModal}
                onCancel={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteGroup}
                title={t('deleteGroup')}
                description={t('deleteGroupConfirmation', { groupName: group.name })}
                confirmText={t('delete')}
                cancelText={t('cancel')}
                confirmVariant="destructive"
                isLoading={isDeletingGroup}
            />

            <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('transferOwnership')}</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-text-secondary mb-4">{t('transferOwnershipDescription')}</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {groupMembers
                            .filter((m) => m.userId !== currentUserId)
                            .map((member) => (
                                <div
                                    key={member.userId}
                                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border-subtle hover:bg-surface-hover"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Avatar className="w-10 h-10 flex-shrink-0">
                                            <AvatarImage src={member?.profile?.avatarUrl || undefined} alt="avatar" />
                                            <AvatarFallback>U</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-text-primary truncate">
                                                {[member?.profile?.firstName, member?.profile?.lastName].filter(Boolean).join(' ').trim() || group?.name || 'Unknown'}
                                            </p>
                                            <p className="text-xs text-text-secondary capitalize">{member.role?.toLowerCase() ?? 'member'}</p>
                                        </div>
                                    </div>
                                    <ButtonType2
                                        className="text-xs px-3 py-1.5"
                                        onClick={async () => {
                                            if (!chat?.id) return;
                                            try {
                                                const { data } = await transferOwnership({
                                                    variables: { input: { groupId: chat.id, newOwnerId: member.userId } },
                                                });
                                                if (data?.transferGroupOwnership?.success) {
                                                    setShowTransferModal(false);
                                                } else {
                                                    toast.error(data?.transferGroupOwnership?.message ?? 'Failed to transfer ownership');
                                                }
                                            } catch (e) {
                                                console.error(e);
                                                toast.error('Failed to transfer ownership');
                                            }
                                        }}
                                    >
                                        {t('transferOwnership')}
                                    </ButtonType2>
                                </div>
                            ))}
                    </div>
                </DialogContent>
            </Dialog>

            {showEditModal && group && (
                <EditGroupModal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    onSave={handleEditGroup}
                    onAvatarUpload={handleGroupAvatarUpload}
                    initialData={{
                        name: group.name,
                        description: group.description || '',
                        avatarUrl: group.avatarUrl || '',
                        privacy: group.privacy
                    }}
                />
            )}

            {showAddMembersModal && (
                <AddMembersModal
                    isOpen={showAddMembersModal}
                    onClose={() => setShowAddMembersModal(false)}
                    groupId={chat?.id}
                    onMembersAdded={refetchMembers}
                    existingMemberIds={groupMembers.map((m) => m.userId)}
                />
            )}

            {showManageMemberModal && selectedMember && (
                <ManageMemberModal
                    isOpen={showManageMemberModal}
                    onClose={() => {
                        setShowManageMemberModal(false);
                        setSelectedMember(null);
                    }}
                    member={selectedMember}
                    onRemove={() => handleRemoveMember(selectedMember.userId)}
                    onUpdateRole={(role) => handleUpdateMemberRole(selectedMember.userId, role)}
                    isOwner={isOwner}
                />
            )}

            {showAvatarCropper && avatarRawImage && (
                <CircularImageCropper
                    open={showAvatarCropper}
                    src={avatarRawImage}
                    onCancel={() => {
                        handleAvatarCropCancel();
                        resetGroupAvatarUpload();
                    }}
                    onConfirm={async (cropped) => {
                        handleAvatarCropConfirm(cropped);
                        await uploadGroupAvatar(cropped);
                    }}
                />
            )}
        </>
    );
}
