import { ChevronRight, ChevronDown, MessageCircle, MoreVertical, X, Camera, Sparkles } from "lucide-react";
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
import { useQuery, useMutation } from "@apollo/client/react";
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
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { EditGroupModal } from "./modals/EditGroupModal";
import { ManageMemberModal } from "./modals/ManageMemberModal";
import { MessageStatusIcon } from "./MessageStatusIcon";
import { TypingDots } from "./TypingDots";
import { ConfirmationModal } from "../custom/confirmationModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddMembersModal } from "./modals/AddMembersModal";
import { Loader2 } from "lucide-react";
import { ArrowLeft } from "iconsax-reactjs";
import { useUserStore } from "@/store/useUserStore";
import { messageService } from "@/services/websocket/messageService";
import { useMutation as useGqlMutation } from "@apollo/client/react";
import { SEND_MESSAGE, GET_CONVERSATIONS, GROUP_CHAT_DAILY_SUMMARY } from "@/services/gql/messaging";
import type { SendMessageData, GroupChatDailySummaryData, GroupChatDailySummaryVariables } from "@/services/gql/types/messaging";
import { useChatConversation } from "@/hooks/useChatConversation";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { formatCurrentTime, getCountryTimezone } from "@/lib/countryTimezone";
import { useImageUpload } from "@/hooks/useImageUpload";
import { CircularImageCropper } from "@/lib/imagecropper";
import { ApiMessage } from "@/store/ChatStore";
import { toast } from "sonner";
import { UserBadge } from "@/components/custom/userBadge";
import { mapTrustScoreToTier } from "@/lib/userTier";

type ManageableGroupMember = {
    id: string;
    userId: string;
    role: MemberRole;
    profile: {
        firstName: string;
        lastName: string;
        avatarUrl?: string;
    };
};

export default function GroupChat() {
    const t = useTranslations('chat.group');
    const tCommon = useTranslations('common');
    const router = useRouter();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [repliesSidebarOpen, setRepliesSidebarOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<ApiMessage | null>(null);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    // Modal states
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddMembersModal, setShowAddMembersModal] = useState(false);
    const [showManageMemberModal, setShowManageMemberModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<ManageableGroupMember | null>(null);
    const [showTransferModal, setShowTransferModal] = useState(false);

    // Loading states
    const [isLeavingGroup, setIsLeavingGroup] = useState(false);
    const [isDeletingGroup, setIsDeletingGroup] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

    // Tick every minute so per-member local times stay fresh without a page refresh.
    const [, setTimeTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTimeTick(n => n + 1), 60_000);
        return () => clearInterval(id);
    }, []);

    const { activeChat, users, setActiveChat, addApiMessage, getApiMessagesByConversation } = useChatStore();
    const { uploadFiles, finalizeUpload } = useMediaUpload();

    /** Lock conversationId + replyToId when reply panel opens so refetches don't change them mid-reply */
    const replyContextRef = useRef<{ conversationId: string; replyToId: string } | null>(null);
    const isSendingReplyRef = useRef(false);

    const [sendMessageMutation] = useGqlMutation<SendMessageData>(SEND_MESSAGE, {
        refetchQueries: [{ query: GET_CONVERSATIONS, variables: { limit: 100, offset: 0 } }],
    });

    const params = useParams<{ locale?: string }>();
    const chat = activeChat?.type === 'group' ? (activeChat as ChatInfo) : null;
    const localePrefix = params?.locale ? `/${params.locale}` : '';

    const { data: groupData, loading: loadingGroup, refetch: refetchGroup } = useQuery<GetGroupResponse>(GET_GROUP, {
        variables: { groupId: chat?.id || '' },
        skip: !chat?.id,
    });

    const { data: membersData, loading: loadingMembers, refetch: refetchMembers } = useQuery<GetGroupMembersResponse>(GET_GROUP_MEMBERS, {
        variables: { groupId: chat?.id || '', membersLimit: 100, membersOffset: 0 },
        skip: !chat?.id,
    });

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
    const userTimeZone = user?.timezone || user?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    const currentUserId = user?.userId;
    const currentUserMember = groupMembers.find(m => m.userId === currentUserId);
    const isOwner = group?.ownerId === currentUserId;
    const isAdmin = currentUserMember?.role === MemberRole.ADMIN || isOwner;

    const { conversationId } = useChatConversation({
        chatId: chat?.id ?? null,
        type: 'group',
        currentUserId,
        participantIds: groupMembers.map(m => m.userId),
        enabled: groupMembers.length > 0,
    });

    // AI "Daily summary" digest of the group chat. Non-blocking: absence (or a
    // backend/ai-service hiccup) simply renders no card. Latest digest only
    // (no `date` arg). Skipped until we have both the group + conversation id.
    const [showDailySummary, setShowDailySummary] = useState(false);
    const { data: dailySummaryData } = useQuery<
        GroupChatDailySummaryData,
        GroupChatDailySummaryVariables
    >(GROUP_CHAT_DAILY_SUMMARY, {
        variables: { groupId: chat?.id || '', conversationId: conversationId || '' },
        skip: !chat?.id || !conversationId,
        fetchPolicy: 'cache-and-network',
        errorPolicy: 'all',
    });
    const dailySummary = dailySummaryData?.groupChatDailySummary ?? null;

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
    useEffect(() => {
        setRepliesSidebarOpen(false);
        setSidebarOpen(false);
    }, [activeChat?.id, activeChat?.type]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [mainThreadMessages]);

    const { refetch: refetchMessages } = useChatMessages({ conversationId });

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
                // New messages are already added globally by MessageWebSocketProvider.
                // Here we only refresh this conversation's plaintext payload.
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
    }, [conversationId, refetchMessages]);

    const { typingUserIds, emit: handleTyping } = useTypingIndicator({
        conversationId,
        excludeUserId: currentUserId,
    });

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

        let upload: Awaited<ReturnType<typeof uploadFiles>> = null;
        if (hasFiles && files) {
            upload = await uploadFiles({
                files,
                conversationId,
                senderId: currentUserId,
                messageText,
            });
            if (!upload) return;
        }

        const attachments = upload?.attachments ?? [];
        const messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' = upload?.messageType ?? 'TEXT';
        const content = attachments[0]
            ? (hasText ? messageText.trim() : attachments[0].publicUrl)
            : messageText.trim();

        const attachmentInput = attachments.length
            ? attachments.map((a) => ({ publicUrl: a.publicUrl, mimeType: a.mimeType }))
            : undefined;
        const sendContent = content;

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
                    if (upload) finalizeUpload(upload.placeholderId);
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
                if (upload) finalizeUpload(upload.placeholderId);
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
                    if (upload) finalizeUpload(upload.placeholderId);
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
                }
            } catch (error) {
                console.error('Failed to send message:', error);
                if (upload) finalizeUpload(upload.placeholderId);
                toast.error('Failed to send message. Please try again.');
            }
        }
    };

    const handleViewReplies = (message: ApiMessage) => {
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
                router.push(`${localePrefix}/chat?t=groups`);
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
                router.push(`${localePrefix}/chat?t=groups`);
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

    const handleMemberClick = (member: ManageableGroupMember) => {
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
                <div className={`flex-1 min-w-0 bg-surface-default rounded-none md:rounded-lg border-0 md:border md:border-border-subtle flex flex-col h-full min-h-0 overflow-hidden ${isMobile && (sidebarOpen || repliesSidebarOpen) ? 'hidden' : 'flex'}`}>
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
                                            <div className="w-2 h-2 bg-chat-online-dot rounded-full"></div>
                                            <span className="text-xs text-chat-online-text">Online</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleSideBarToggle}
                            aria-label={t('groupInfo')}
                            aria-expanded={sidebarOpen}
                            className="hidden md:flex items-center justify-center p-2 rounded-full hover:bg-surface-hover transition-colors flex-shrink-0"
                        >
                            <MoreVertical className="w-5 h-5 text-text-secondary" aria-hidden="true" />
                        </button>
                    </div>

                    {/* Mobile Info Button */}
                    <button
                        type="button"
                        onClick={handleSideBarToggle}
                        aria-label={t('groupInfo')}
                        aria-expanded={sidebarOpen}
                        className="md:hidden fixed top-20 right-4 z-10 flex items-center justify-center p-2 rounded-full hover:bg-surface-hover transition-colors"
                    >
                        <MoreVertical className="w-5 h-5 text-text-secondary" aria-hidden="true" />
                    </button>

                    {/* Messages Area - only top-level messages; replies show in Reply section */}
                    <div
                        className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-3 md:p-4 space-y-3 md:space-y-4"
                        style={{ scrollbarGutter: 'stable' }}
                    >
                        {/* AI Daily summary card — collapsible, non-blocking. Renders
                            only when a digest exists for this group. */}
                        {dailySummary && (
                            <div className="rounded-2xl border border-border bg-bg-secondary/60 overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setShowDailySummary((v) => !v)}
                                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
                                    aria-expanded={showDailySummary}
                                >
                                    <span className="flex items-center gap-2 min-w-0">
                                        <Sparkles className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                                        <span className="flex flex-col min-w-0">
                                            <span className="text-sm font-medium text-text-primary truncate">
                                                Daily summary
                                            </span>
                                            <span className="text-xs text-text-secondary truncate">
                                                {dailySummary.digestDate}
                                                {dailySummary.messageCount > 0
                                                    ? ` · ${dailySummary.messageCount} messages`
                                                    : ''}
                                            </span>
                                        </span>
                                    </span>
                                    {showDailySummary ? (
                                        <ChevronDown className="w-4 h-4 text-text-secondary shrink-0" aria-hidden="true" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" aria-hidden="true" />
                                    )}
                                </button>
                                {showDailySummary && (
                                    <div className="px-3 pb-3 pt-1 space-y-3 text-sm text-text-primary">
                                        {dailySummary.summary && (
                                            <p className="leading-relaxed whitespace-pre-line">
                                                {dailySummary.summary}
                                            </p>
                                        )}
                                        {dailySummary.keyPoints.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold text-text-secondary mb-1">
                                                    Key points
                                                </p>
                                                <ul className="list-disc pl-5 space-y-0.5">
                                                    {dailySummary.keyPoints.map((kp, i) => (
                                                        <li key={`kp-${i}`}>{kp}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {dailySummary.actionItems.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold text-text-secondary mb-1">
                                                    Action items
                                                </p>
                                                <ul className="list-disc pl-5 space-y-0.5">
                                                    {dailySummary.actionItems.map((ai, i) => (
                                                        <li key={`ai-${i}`}>{ai}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
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
                                        className={`flex min-w-0 ${isMe ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[85%] sm:max-w-xs lg:max-w-md min-w-0 ${isMe ? 'ml-auto' : ''}`}>
                                            {message.status === 'sending' ? (
                                                message.sendingPreviews?.length ? (
                                                    <>
                                                        <SendingFilesBubble sendingPreviews={message.sendingPreviews} />
                                                        {message.content && (
                                                            <div className={`mt-2 px-3 py-2 sm:px-4 sm:py-3 rounded-2xl sm:rounded-4xl text-sm sm:text-base ${isMe ? 'bg-chat-bubble-me-bg text-chat-bubble-me-text' : 'bg-chat-bubble-them-bg text-chat-bubble-them-text'}`}>
                                                                {message.content}
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 rounded-2xl ${isMe ? 'bg-chat-bubble-me-bg-sending text-chat-bubble-me-text' : 'bg-chat-bubble-them-bg text-chat-bubble-them-text'}`}>
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
                                                                    <div className={`mt-2 px-3 py-2 sm:px-4 sm:py-3 rounded-2xl sm:rounded-4xl text-sm sm:text-base ${isMe ? 'bg-chat-bubble-me-bg text-chat-bubble-me-text' : 'bg-chat-bubble-them-bg text-chat-bubble-them-text'}`}>
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
                                                            ? 'bg-chat-bubble-me-bg text-chat-bubble-me-text'
                                                            : 'bg-chat-bubble-them-bg text-chat-bubble-them-text'
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
                                                    {formatChatTimestamp(message.createdAt, { timeZone: userTimeZone })}
                                                    {isMe && <MessageStatusIcon status={message.status} unreadClassName="text-text-tertiary" />}
                                                </p>
                                                <ButtonType3
                                                    onClick={() => handleViewReplies(message)}
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
                                <TypingDots dotClassName="bg-text-tertiary" />
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
                                        {groupMembers.map((member) => {
                                            const memberTz = member?.profile?.residenceCountry
                                                ? getCountryTimezone(member.profile.residenceCountry)
                                                : null;
                                            const memberTime = memberTz ? formatCurrentTime(memberTz) : null;
                                            // Defensive cast — group-member profile gains `trustScore`
                                            // in a parallel GQL sweep; types may not be updated yet.
                                            const memberTrustScore = (member?.profile as { trustScore?: number } | undefined)?.trustScore;
                                            const memberTier = mapTrustScoreToTier(memberTrustScore);
                                            return (
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
                                                        <div className="inline-flex items-center gap-1 max-w-full">
                                                            <p className="text-sm font-medium text-text-primary truncate">
                                                                {[member?.profile?.firstName, member?.profile?.lastName].filter(Boolean).join(' ').trim() || group?.name || 'Unknown'}
                                                            </p>
                                                            {memberTier && <UserBadge tier={memberTier} size="xs" />}
                                                        </div>
                                                        <p className="text-xs text-text-secondary capitalize">
                                                            {member.role?.toLowerCase() ?? 'member'}
                                                        </p>
                                                    </div>
                                                    {memberTime && (
                                                        <div className="flex-shrink-0 text-right">
                                                            <p className="text-xs font-medium text-text-primary whitespace-nowrap">{memberTime}</p>
                                                            {member.profile?.city && (
                                                                <p className="text-[10px] text-text-tertiary truncate max-w-[80px]">{member.profile.city}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
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
                                    <div className="bg-chat-parent-bg text-chat-parent-text px-3 py-3 sm:px-4 sm:py-4 rounded-2xl sm:rounded-4xl mb-2">
                                        <span className="text-xs sm:text-sm font-medium text-chat-parent-text">
                                            {getSenderName(selectedMessage.senderId)}
                                        </span>
                                        <p className="text-xs sm:text-sm text-chat-parent-text">{selectedMessage.content}</p>
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-text-tertiary flex items-center space-x-2">
                                        <Avatar className="w-4 h-4 sm:w-6 sm:h-6">
                                            <AvatarImage src={getUserById(selectedMessage.senderId)?.avatar || undefined} alt="avatar" />
                                            <AvatarFallback>{getSenderName(selectedMessage.senderId).charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span>{formatChatTimestamp(selectedMessage.createdAt, { timeZone: userTimeZone })}</span>
                                    </p>
                                </div>
                            )}

                            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                                {repliesForSidebar.length > 0 ? (
                                    repliesForSidebar.map((reply) => (
                                        <div key={reply.id}>
                                            <div className="bg-chat-bubble-them-bg rounded-2xl sm:rounded-4xl px-3 py-3 sm:px-4 sm:py-4">
                                                <span className="text-xs sm:text-sm font-medium text-chat-bubble-them-text">
                                                    {getSenderName(reply.senderId)}
                                                </span>
                                                {reply.attachments?.length ? (
                                                    <>
                                                        <MessageAttachments attachments={reply.attachments} />
                                                        {reply.content && <p className="text-xs sm:text-sm text-chat-bubble-them-text mt-1">{reply.content}</p>}
                                                    </>
                                                ) : (
                                                    <p className="text-xs sm:text-sm text-chat-bubble-them-text">{reply.content}</p>
                                                )}
                                            </div>
                                            <div className="flex space-x-2 items-center mt-1">
                                                <Avatar className="w-3 h-3 sm:w-4 sm:h-4">
                                                    <AvatarImage src={getUserById(reply.senderId)?.avatar || undefined} alt="avatar" />
                                                    <AvatarFallback>{getSenderName(reply.senderId).charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-[10px] sm:text-xs text-text-tertiary">
                                                    {formatChatTimestamp(reply.createdAt, { timeZone: userTimeZone })}
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
                            .map((member) => {
                                const memberTrustScore = (member?.profile as { trustScore?: number } | undefined)?.trustScore;
                                const memberTier = mapTrustScoreToTier(memberTrustScore);
                                return (
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
                                            <div className="inline-flex items-center gap-1 max-w-full">
                                                <p className="text-sm font-medium text-text-primary truncate">
                                                    {[member?.profile?.firstName, member?.profile?.lastName].filter(Boolean).join(' ').trim() || group?.name || 'Unknown'}
                                                </p>
                                                {memberTier && <UserBadge tier={memberTier} size="xs" />}
                                            </div>
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
                                );
                            })}
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
