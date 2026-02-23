/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChevronRight, InfoIcon, MessageCircle, X, Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MessageInput } from "./MessageInput";
import { formatChatTimestamp } from "@/macros/time";
import Image from "next/image";
import { ChatInfo } from "@/app/[locale]/(protected)/(main)/chat/page";
import { useChatStore } from "@/store/ChatStore";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ButtonType3 } from "../custom/button";
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
    LeaveGroupResponse,
    DeleteGroupResponse,
    UpdateGroupResponse,
    RemoveMemberResponse,
    UpdateMemberRoleResponse,
    MemberRole,
    GroupPrivacy
} from "@/services/gql/groups";
import { useRouter, useSearchParams } from "next/navigation";
import { EditGroupModal } from "./modals/EditGroupModal";
import { ManageMemberModal } from "./modals/ManageMemberModal";
import { ConfirmationModal } from "../custom/confirmationModal";
import { AddMembersModal } from "./modals/AddMembersModal";
import { ArrowLeft } from "iconsax-reactjs";
import { useUserStore } from "@/store/useUserStore";
import { useAuthStore } from "@/store/useAuthStore";
import { messageService, Message as WSMessage, SendMessagePayload } from "@/services/websocket/messageService";
import { useMutation as useGqlMutation } from "@apollo/client/react";
import { CREATE_CONVERSATION, SEND_MESSAGE } from "@/services/gql/messaging";
import type { CreateConversationData, SendMessageData } from "@/services/gql/types/messaging";
import { ApiMessage } from "@/store/ChatStore";

interface Reply {
    id: string;
    messageId: string;
    senderId: string;
    text: string;
    timestamp: string;
    type: 'text' | 'image';
    imageUrl?: string;
}

export default function GroupChat() {
    const t = useTranslations('chat.group');
    const tCommon = useTranslations('common');
    const router = useRouter();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [repliesSidebarOpen, setRepliesSidebarOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<any>(null);
    const [replies, setReplies] = useState<Reply[]>([]);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    // Modal states
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddMembersModal, setShowAddMembersModal] = useState(false);
    const [showManageMemberModal, setShowManageMemberModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any>(null);

    // Loading states
    const [isLeavingGroup, setIsLeavingGroup] = useState(false);
    const [isDeletingGroup, setIsDeletingGroup] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

    const { messages, users, setActiveChat, addMessage, addApiMessage, getApiMessagesByConversation, getRealConversation, setRealConversation } = useChatStore();

    const tokens = useAuthStore((state) => state.tokens);
    const sessionToken = tokens?.accessToken; // Use accessToken for WebSocket (JWT)

    const [conversationId, setConversationId] = useState<string | null>(null);

    const [createConversationMutation] = useGqlMutation<CreateConversationData>(CREATE_CONVERSATION);
    const [sendMessageMutation] = useGqlMutation<SendMessageData>(SEND_MESSAGE);

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

    const group = groupData?.getGroup?.group;
    const groupMembers = membersData?.getGroupMembers?.members || [];
    const groupMembersCount = membersData?.getGroupMembers?.total || 0;
    const user = useUserStore((state) => state.user);

    const currentUserId = user?.userId;
    const currentUserMember = groupMembers.find(m => m.userId === currentUserId);
    const isOwner = group?.ownerId === currentUserId;
    const isAdmin = currentUserMember?.role === MemberRole.ADMIN || isOwner;
    const searchParams = useSearchParams();

    const apiMessages = getApiMessagesByConversation(conversationId || '');
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
    }, [apiMessages]);

    // Create or retrieve group conversation
    useEffect(() => {
        if (!chat?.id || !currentUserId || !groupMembers.length) return;

        const existing = getRealConversation(chat.id);
        if (existing) {
            setConversationId(existing.conversationId);
            return;
        }

        const initGroupConversation = async () => {
            try {
                const memberIds = groupMembers.map(m => m.userId).filter(id => id !== currentUserId);
                const { data } = await createConversationMutation({
                    variables: {
                        type: 'GROUP',
                        participantIds: memberIds,
                        groupId: chat.id,
                    },
                });

                if (data?.createConversation) {
                    const convId = data.createConversation;
                    setConversationId(convId);
                    setRealConversation(chat.id, {
                        conversationId: convId,
                        type: 'GROUP',
                        participantIds: [currentUserId, ...memberIds],
                    });
                }
            } catch (error) {
                console.error('Failed to create group conversation:', error);
            }
        };

        initGroupConversation();
    }, [chat?.id, currentUserId, groupMembers, getRealConversation, setRealConversation, createConversationMutation]);

    // WebSocket connection and message handling
    useEffect(() => {
        if (!sessionToken || !conversationId) return;

        messageService.connect(sessionToken);

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
                // For now, we'll add a placeholder and refetch messages
                console.log('📨 New message notification received:', wsMessage.messageId);

                // TODO: Fetch message content via GraphQL query
                // For now, trigger a refetch of conversation messages
                // or add placeholder message until content is fetched

                // Placeholder implementation - shows notification received
                const apiMsg: ApiMessage = {
                    id: wsMessage.messageId,
                    conversationId: wsMessage.conversationId,
                    senderId: wsMessage.senderId,
                    type: (wsMessage.type?.toUpperCase() as ApiMessage['type']) || 'TEXT',
                    content: '[Loading message...]', // Placeholder until GraphQL fetch
                    createdAt: wsMessage.timestamp,
                    mentions: wsMessage.mentions,
                    replyToId: wsMessage.replyToId,
                    status: 'sent',
                };
                addApiMessage(apiMsg);
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
    }, [sessionToken, conversationId, addApiMessage]);

    const handleMBack = () => {
        setActiveChat(null);
        sessionStorage.removeItem('activeChat');
        const params = new URLSearchParams(searchParams.toString());
        params.delete('ct');
        const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
        router.push(newUrl, { scroll: false });
    };

    const mockReplies: Reply[] = [
        {
            id: '1',
            messageId: '11',
            senderId: '1',
            text: 'I agree with this!',
            timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
            type: 'text'
        },
        {
            id: '2',
            messageId: '11',
            senderId: '3',
            text: 'Great point!',
            timestamp: new Date(Date.now() - 1000 * 60).toISOString(),
            type: 'text'
        },
    ];

    const getReplyCount = (messageId: string): number => {
        return mockReplies.filter(reply => reply.messageId === messageId).length;
    };

    const getRepliesForMessage = (messageId: string): Reply[] => {
        return mockReplies.filter(reply => reply.messageId === messageId);
    };

    const getUserById = (userId: string) => {
        return users?.find(u => u.id === userId);
    };

    const handleSendMessage = async (messageText: string, image?: string) => {
        if (!messageText.trim() && !image) return;
        if (!currentUserId || !conversationId) {
            console.warn('Cannot send: missing userId or conversationId');
            return;
        }

        if (replyingTo) {
            // Handle reply via GraphQL
            try {
                const messageType = image ? 'IMAGE' : 'TEXT';
                const { data } = await sendMessageMutation({
                    variables: {
                        conversationId,
                        messageType,
                        content: messageText || 'Image',
                        replyToId: replyingTo,
                    },
                });

                if (data?.sendMessage) {
                    const sentMsg: ApiMessage = {
                        id: data.sendMessage,
                        conversationId,
                        senderId: currentUserId,
                        type: messageType,
                        content: messageText,
                        createdAt: new Date().toISOString(),
                        status: 'sent',
                        replyToId: replyingTo,
                    };
                    addApiMessage(sentMsg);

                    // Also add to replies sidebar
                    const newReply: Reply = {
                        id: data.sendMessage,
                        messageId: replyingTo,
                        senderId: currentUserId,
                        text: messageText,
                        timestamp: new Date().toISOString(),
                        type: image ? 'image' : 'text',
                        imageUrl: image
                    };
                    setReplies(prev => [...prev, newReply]);
                }
            } catch (error) {
                console.error('Failed to send reply:', error);
            }
            setReplyingTo(null);
        } else {
            // Send via GraphQL mutation
            try {
                const messageType = image ? 'IMAGE' : 'TEXT';
                const { data } = await sendMessageMutation({
                    variables: {
                        conversationId,
                        messageType,
                        content: messageText || 'Image',
                    },
                });

                if (data?.sendMessage) {
                    const sentMsg: ApiMessage = {
                        id: data.sendMessage,
                        conversationId,
                        senderId: currentUserId,
                        type: messageType,
                        content: messageText,
                        createdAt: new Date().toISOString(),
                        status: 'sent',
                    };
                    addApiMessage(sentMsg);
                }

                // Also send via WebSocket for real-time delivery
                if (isConnected) {
                    const encryptedData = encryptMessage(messageText);
                    const payload: SendMessagePayload = {
                        conversationId,
                        type: image ? 'image' : 'text',
                        encryptedData,
                        ...(image && {
                            metadata: {
                                fileName: 'image.jpg',
                                fileSize: 0,
                                mimeType: 'image/jpeg',
                                gcsPath: image
                            }
                        }),
                    };
                    messageService.sendMessage(payload);
                }
            } catch (error) {
                console.error('Failed to send message:', error);
            }
        }
    };

    const handleViewReplies = (message: any) => {
        setSelectedMessage(message);
        setReplies(getRepliesForMessage(message.id));
        setRepliesSidebarOpen(true);
        setReplyingTo(message.id);
        setSidebarOpen(false);
    };

    const handleCloseReplies = () => {
        setRepliesSidebarOpen(false);
        setSelectedMessage(null);
        setReplyingTo(null);
    };

    const getSenderName = (senderId: string): string => {
        const user = getUserById(senderId);
        return user?.name || 'Unknown User';
    };

    const handleSideBarToggle = () => {
        setSidebarOpen(!sidebarOpen);
        setRepliesSidebarOpen(false);
    };

    const handleLeaveGroup = async () => {
        setIsLeavingGroup(true);
        try {
            const { data } = await leaveGroup({ variables: { leaveGroupId: chat.id } });
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
            const { data } = await deleteGroup({ variables: { deleteGroupId: chat.id } });
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
                variables: { updateInput: { groupId: chat.id, ...updates } }
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

    const handleMemberClick = (member: any) => {
        if (isAdmin && member.userId !== currentUserId) {
            setSelectedMember(member);
            setShowManageMemberModal(true);
        }
    };

    const handleRemoveMember = async (userId: string) => {
        try {
            const { data } = await removeMember({
                variables: { removeInput: { groupId: chat.id, userId } }
            });
            if (data?.removeMember.success) {
                setShowManageMemberModal(false);
                setSelectedMember(null);
            } else {
                console.error('Failed to remove member:', data?.removeMember.message);
            }
        } catch (error) {
            console.error('Error removing member:', error);
        }
    };

    const handleUpdateMemberRole = async (userId: string, role: MemberRole) => {
        try {
            const { data } = await updateMemberRole({
                variables: { roleInput: { groupId: chat.id, userId, role } }
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
                            <button
                                onClick={handleMBack}
                                className="p-2 hover:bg-surface-hover rounded-lg transition-colors md:hidden"
                                aria-label={tCommon('backToChats')}
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="relative">
                                <Avatar className="w-12 h-12">
                                    <AvatarImage src={group.avatarUrl || chat.avatar} alt="avatar" />
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
                        <button onClick={handleSideBarToggle}>
                            <InfoIcon className={`hidden md:block w-6 h-6 cursor-pointer ${sidebarOpen ? "text-text-white bg-surface-brand rounded-full" : "text-text-brand"}`} />
                        </button>
                    </div>

                    {/* Mobile Info Button */}
                    <button
                        onClick={handleSideBarToggle}
                        className="md:hidden fixed top-20 right-4 z-10 p-2 bg-surface-brand rounded-full shadow-lg"
                    >
                        <Menu className="w-5 h-5 text-text-white" />
                    </button>

                    {/* Messages Area */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
                        {apiMessages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-text-secondary">
                                <MessageCircle className="w-12 h-12 mb-4 opacity-50" />
                                <p>{t('noMessages')}</p>
                            </div>
                        ) : (
                            apiMessages.map((message) => {
                                const isMe = message.senderId === currentUserId;
                                return (
                                    <div
                                        key={message.id}
                                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[85%] sm:max-w-xs lg:max-w-md ${isMe ? 'ml-auto' : ''}`}>
                                            {message.type === 'IMAGE' && message.mediaMetadata?.gcsPath ? (
                                                <div className="mb-2">
                                                    {!isMe && (
                                                        <p className="text-[10px] sm:text-xs text-text-primary mb-1 ml-1 font-medium">
                                                            {getSenderName(message.senderId)}
                                                        </p>
                                                    )}
                                                    <Image
                                                        src={message.mediaMetadata.gcsPath}
                                                        alt="Shared image"
                                                        width={300}
                                                        height={200}
                                                        className="rounded-2xl max-w-full h-auto"
                                                    />
                                                    {message.content && (
                                                        <p className="text-xs sm:text-sm text-text-primary mt-2">{message.content}</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div
                                                    className={`px-3 py-2 sm:px-4 sm:py-3 rounded-2xl sm:rounded-4xl text-sm sm:text-base ${
                                                        isMe
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
                                            )}

                                            <div className="space-x-2 flex items-center justify-start mt-1">
                                                <Avatar className="w-4 h-4 sm:w-6 sm:h-6">
                                                    <AvatarImage src={getUserById(message.senderId)?.avatar} alt="avatar" />
                                                    <AvatarFallback>{getSenderName(message.senderId).charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <p className="text-[10px] sm:text-xs text-text-tertiary">
                                                    {formatChatTimestamp(message.createdAt)}
                                                </p>
                                                <button
                                                    onClick={() => handleViewReplies({ ...message, text: message.content, timestamp: message.createdAt })}
                                                    className="flex items-center space-x-1 text-[10px] sm:text-xs text-text-brand hover:text-text-brand-dark transition-colors"
                                                >
                                                    <span>{t('reply')}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Main Message Input */}
                    {!repliesSidebarOpen && (
                        <div className="flex-shrink-0">
                            <MessageInput
                                onSendMessage={handleSendMessage}
                                placeholder={t('message', { name: group.name })}
                                conversationId={conversationId || chat.id}
                                senderId={currentUserId ?? 'current-user'}
                                disabled={!conversationId}
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
                                    <button
                                        onClick={() => setSidebarOpen(false)}
                                        className="p-2 hover:bg-surface-hover rounded-lg"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            )}

                            <div className="p-4 flex-1 min-h-0 flex flex-col overflow-y-auto">
                                <div className="flex-shrink-0 flex flex-col items-center mb-6">
                                    <Avatar className="w-16 h-16 sm:w-20 sm:h-20">
                                        <AvatarImage src={group.avatarUrl} alt="avatar" />
                                        <AvatarFallback>{group.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
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
                                                className={`flex items-center space-x-3 p-2 rounded-lg ${
                                                    isAdmin && member.userId !== currentUserId
                                                        ? 'hover:bg-surface-hover cursor-pointer'
                                                        : ''
                                                }`}
                                                onClick={() => handleMemberClick(member)}
                                            >
                                                <Avatar className="w-10 h-10">
                                                    <AvatarImage src={member?.profile?.avatarUrl} alt="avatar" />
                                                    <AvatarFallback>U</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-text-primary truncate">
                                                        {`${member.profile?.firstName} ${member.profile?.lastName}`}
                                                    </p>
                                                    <p className="text-xs text-text-secondary capitalize">
                                                        {member.role.toLowerCase()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-shrink-0 border-t border-border-subtle p-4">
                                <div className="space-y-2">
                                    <button
                                        onClick={() => setShowLeaveModal(true)}
                                        className="w-full text-text-danger flex justify-between items-center p-2 hover:bg-surface-hover rounded-lg cursor-pointer"
                                    >
                                        <p className="text-sm">{t('leaveGroup')}</p>
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                    {isOwner && (
                                        <button
                                            onClick={() => setShowDeleteModal(true)}
                                            className="w-full text-text-danger flex justify-between items-center p-2 hover:bg-surface-hover rounded-lg cursor-pointer"
                                        >
                                            <p className="text-sm">{t('deleteGroup')}</p>
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
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
                                <button
                                    onClick={handleCloseReplies}
                                    className="p-1 hover:bg-surface-hover rounded-full transition-colors"
                                >
                                    <X className="w-4 h-4 text-text-secondary" />
                                </button>
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
                                            <AvatarImage src={getUserById(selectedMessage.senderId)?.avatar} alt="avatar" />
                                            <AvatarFallback>{getSenderName(selectedMessage.senderId).charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span>{formatChatTimestamp(selectedMessage.timestamp)}</span>
                                    </p>
                                </div>
                            )}

                            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                                {replies.length > 0 ? (
                                    replies.map((reply) => (
                                        <div key={reply.id}>
                                            <div className="bg-surface-success/50 rounded-2xl sm:rounded-4xl px-3 py-3 sm:px-4 sm:py-4">
                                                <span className="text-xs sm:text-sm font-medium text-text-primary dark:text-text-white">
                                                    {getSenderName(reply.senderId)}
                                                </span>
                                                <p className="text-xs sm:text-sm text-text-primary dark:text-text-white">{reply.text}</p>
                                            </div>
                                            <div className="flex space-x-2 items-center mt-1">
                                                <Avatar className="w-3 h-3 sm:w-4 sm:h-4">
                                                    <AvatarImage src={getUserById(reply.senderId)?.avatar} alt="avatar" />
                                                    <AvatarFallback>{getSenderName(reply.senderId).charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-[10px] sm:text-xs text-text-tertiary">
                                                    {formatChatTimestamp(reply.timestamp)}
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
                                    conversationId={chat.id}
                                    senderId={currentUserId ?? 'current-user'}
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

            {showEditModal && group && (
                <EditGroupModal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    onSave={handleEditGroup}
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
                    groupId={chat.id}
                    onMembersAdded={refetchMembers}
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
        </>
    );
}