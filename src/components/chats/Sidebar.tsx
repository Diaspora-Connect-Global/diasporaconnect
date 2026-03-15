"use client"
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchInput } from "../custom/input";
import { Plus, SquarePen } from "lucide-react";
import { formatDateProximity } from "@/macros/time";
import { useChatStore } from "@/store/ChatStore";
import { ButtonType3 } from "../custom/button";
import { StartConversationModal } from "./modals/StartConversationModal";
import { useTranslations } from 'next-intl';
import { useQuery } from "@apollo/client/react";
import { GET_MY_GROUPS } from "@/services/gql/groups";
import { GET_CONVERSATIONS } from "@/services/gql/messaging";
import { GET_MY_CONNECTIONS } from "@/services/gql/connection";
import type { GetConversationsData } from "@/services/gql/types/messaging";
import { useUserStore } from "@/store/useUserStore";
import Image from "next/image";

type TabType = 'direct' | 'groups';

interface ChatItem {
    id: string;
    conversationId?: string;
    name: string;
    type: 'direct' | 'group';
    lastMessage: string;
    lastMessageTime: string;
    unread: number;
    online?: boolean;
    memberCount?: number;
    avatar: string;
}

export default function ChatSideBar() {
    const t = useTranslations('chat');
    const tActions = useTranslations('actions');
    const router = useRouter();
    const searchParams = useSearchParams();

    const [searchQuery, setSearchQuery] = useState('');
    const { activeChat, setActiveChat, setRealConversation } = useChatStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'direct' | 'group'>('direct');
    const [directChats, setDirectChats] = useState<ChatItem[]>([]);

    const user = useUserStore((state) => state.user);
    const currentUserId = user?.userId;

    // Fetch real conversations from API
    const { data: conversationsData, loading: loadingConversations, error: conversationsError } = useQuery<GetConversationsData>(GET_CONVERSATIONS, {
        variables: { limit: 100, offset: 0 },
        fetchPolicy: 'network-only',
    });

    // Fetch user connections to map participant IDs to real names
    const { data: connectionsData, loading: loadingConnections } = useQuery<any>(GET_MY_CONNECTIONS, {
        variables: { limit: 100, offset: 0 },
        fetchPolicy: 'cache-first',
    });

    // Get active tab from URL query param 't', default to 'direct'
    const tabFromUrl = (searchParams.get('t') as TabType) || 'direct';
    const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl);

    // Sync activeTab with URL
    useEffect(() => {
        const urlTab = searchParams.get('t') as TabType;
        if (urlTab && (urlTab === 'direct' || urlTab === 'groups')) {
            setActiveTab(urlTab);
        }
    }, [searchParams]);

    // Compute direct chats from API data
    useEffect(() => {
        if (!conversationsData?.getConversations || !currentUserId) return;

        // Build a Map of connected user IDs to their details
        const connectionMap = new Map<string, any>();
        if (connectionsData?.getConnections?.connections) {
            connectionsData.getConnections.connections.forEach((conn: any) => {
                const otherUser = conn.requesterId === currentUserId ? conn.receiver : conn.requester;
                if (otherUser?.userId) {
                    connectionMap.set(otherUser.userId, otherUser);
                }
            });
        }

        const apiConversations = conversationsData.getConversations;
        console.log("Raw API Conversations:", apiConversations);

        const dmConversations = apiConversations
            .filter((conv: any) => {
                const typeDirect = conv.type === 'DIRECT' || conv.type === 'direct';
                const misclassifiedAsGroup =
                    (conv.type === 'GROUP' || conv.type === 'group') &&
                    (conv.groupId == null || conv.groupId === '') &&
                    (conv.participantIds?.length === 2 || conv.participantCount === 2);
                const isDirect = typeDirect || misclassifiedAsGroup;
                console.log(`Checking conversation ${conv.id}: type=${conv.type}, isActive=${conv.isActive}, isDirect=${isDirect}`);
                return isDirect && conv.isActive;
            })
            .sort((a: any, b: any) => {
                const timeA = a.lastMessage?.createdAt || a.lastMessageAt || a.updatedAt || '';
                const timeB = b.lastMessage?.createdAt || b.lastMessageAt || b.updatedAt || '';
                return new Date(timeB).getTime() - new Date(timeA).getTime();
            })
            .map((conv: any) => {
                // Find the other participant (not the current user)
                const otherParticipantId = conv.participantIds?.find((id: string) => id !== currentUserId) || '';

                // Try to find full profile info from connections
                const otherUserObj = connectionMap.get(otherParticipantId);
                const displayName = otherUserObj
                    ? [otherUserObj.firstName, otherUserObj.lastName].filter(Boolean).join(' ').trim() || `User ${otherParticipantId.substring(0, 8)}`
                    : `User ${otherParticipantId.substring(0, 8)}`;
                const avatar = otherUserObj?.avatarUrl || '';

                // Store the real conversation mapping so DirectMessageChat can look it up by chat.id
                const chatId = otherParticipantId || conv.id;
                if (otherParticipantId) {
                    setRealConversation(otherParticipantId, {
                        conversationId: conv.id,
                        type: 'DIRECT',
                        participantIds: conv.participantIds || [],
                    });
                } else {
                    setRealConversation(conv.id, {
                        conversationId: conv.id,
                        type: 'DIRECT',
                        participantIds: conv.participantIds || [],
                    });
                }

                return {
                    id: chatId,
                    conversationId: conv.id,
                    name: displayName || 'Unknown',
                    type: 'direct' as const,
                    lastMessage: conv.lastMessage?.content || t('empty.title'),
                    lastMessageTime: conv.lastMessage?.createdAt || conv.lastMessageAt || '',
                    unread: conv.unreadCount ?? 0,
                    online: false,
                    avatar: avatar,
                };
            });

        setDirectChats(dmConversations);
    }, [conversationsData, connectionsData, currentUserId, setRealConversation, t]);

    console.log("=== ALL DIRECT MESSAGE CONVERSATION IDS ===", directChats.map(chat => chat.conversationId).filter(Boolean));
    console.log("Raw API Conversations on Render:", conversationsData?.getConversations);

    const directUnreadCount = directChats.reduce((sum, chat) => sum + chat.unread, 0);

    // Filter based on search query
    const filteredDirectMessages = directChats.filter(chat =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Update URL with query params
    const updateUrlParams = (tab?: TabType, chatType?: 'direct' | 'group') => {
        const params = new URLSearchParams(searchParams.toString());

        if (tab) {
            params.set('t', tab);
        }

        if (chatType) {
            params.set('ct', chatType);
        }

        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        updateUrlParams(tab);
    };

    const handleChatClick = (chat: { id: string; type: 'direct' | 'group' }) => {
        setActiveChat(chat);
        sessionStorage.setItem('activeChat', JSON.stringify(chat));

        // Update URL with chat type
        updateUrlParams(undefined, chat.type);
    };

    // Handle opening modal with specific type
    const handleOpenModal = (type: 'direct' | 'group') => {
        setModalType(type);
        setIsModalOpen(true);
    };

    // Handle Create Group button click
    const handleCreateGroup = () => {
        handleOpenModal('group');
    };

    return (
        <>
            <div className="w-full h-app-inner flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center px-4">
                    <p className="text-2xl font-heading-large">{t('chats')}</p>
                    <ButtonType3
                        className="px-4 py-3 flex items-center"
                        onClick={() => handleOpenModal('direct')}
                    >
                        <SquarePen className="mr-2 h-4 w-4" />
                        {t('newMessage')}
                    </ButtonType3>
                </div>

                {/* Search */}
                <div className="w-full px-4 pb-3">
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        onSearch={() => { }}
                        placeholder={t('searchMessages')}
                        id="main-search"
                        bg="bg-surface-default"
                    />
                </div>

                {/* Tabs */}
                <div className="border-b border-border-subtle px-4">
                    <div className="flex">
                        <TabButton
                            active={activeTab === 'direct'}
                            onClick={() => handleTabChange('direct')}
                            label={t('directMessages')}
                            notificationCount={directUnreadCount}
                        />
                        <TabButton
                            active={activeTab === 'groups'}
                            onClick={() => handleTabChange('groups')}
                            label={t('groups')}
                            notificationCount={0}
                        />
                    </div>
                </div>

                {/* Create Group Button - Only show when Groups tab is active */}
                {activeTab === 'groups' && (
                    <div className="px-4 py-3">
                        <div
                            className="text-text-brand flex items-center cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={handleCreateGroup}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            <p>{t('createGroup')}</p>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {conversationsError && (
                        <div className="p-4 text-red-500 text-sm">
                            Error loading conversations: {conversationsError.message}
                        </div>
                    )}
                    {activeTab === 'direct' ? (
                        (loadingConversations || loadingConnections) ? (
                            <div className="p-2 space-y-1">
                                {[...Array(5)].map((_, i) => (
                                    <ChatItemSkeleton key={i} />
                                ))}
                            </div>
                        ) : (
                            <DirectMessagesList
                                chats={filteredDirectMessages}
                                activeChat={activeChat}
                                onChatClick={handleChatClick}
                            />
                        )
                    ) : (
                        <GroupsList
                            searchQuery={searchQuery}
                            activeChat={activeChat}
                            onChatClick={handleChatClick}
                            conversations={conversationsData?.getConversations || []}
                        />
                    )}
                </div>
            </div>

            <StartConversationModal
                isOpen={isModalOpen}
                onOpenChange={setIsModalOpen}
                type={modalType}
            />
        </>
    );
}

// Tab Button Component
interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    label: string;
    notificationCount: number;
}

function TabButton({ active, onClick, label, notificationCount }: TabButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 py-1 text-center font-medium transition-colors cursor-pointer ${active
                ? 'text-text-primary border-b-2 border-text-brand'
                : 'text-text-secondary hover:text-text-secondary'
                }`}
        >
            <div className="flex items-center justify-center space-x-2">
                {label}
                {notificationCount > 0 && (
                    <div className="relative">
                        <span className="-top-3 right-0 text-text-brand text-xs rounded-full min-w-5 h-5 flex items-center justify-center px-1">
                            {notificationCount > 99 ? '99+' : notificationCount}
                        </span>
                    </div>
                )}
            </div>
        </button>
    );
}

// Skeleton Loader Component
function ChatItemSkeleton() {
    return (
        <div className="flex items-center border-b space-x-3 p-3 animate-pulse">
            {/* Avatar skeleton */}
            <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0" />

            {/* Content skeleton */}
            <div className="flex-1 min-w-0 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>

            {/* Time and badge skeleton */}
            <div className="flex flex-col items-end space-y-2">
                <div className="h-3 bg-gray-200 rounded w-12" />
                <div className="w-5 h-5 bg-gray-200 rounded-full" />
            </div>
        </div>
    );
}

// Helper function to generate initials from name
function getInitials(name: string): string {
    const words = name.trim().split(' ').filter(Boolean);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

// Helper function to check if avatar is a URL
function isValidUrl(string: string): boolean {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

// Avatar Component with URL support and fallback
interface AvatarProps {
    src?: string | null;
    name: string;
    size?: 'sm' | 'md' | 'lg';
    online?: boolean;
}

function Avatar({ src, name, size = 'md', online }: AvatarProps) {
    const [imageError, setImageError] = useState(false);
    const url = src && src.trim() ? src : '';
    const isUrl = url ? isValidUrl(url) : false;

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-sm',
        lg: 'w-16 h-16 text-base'
    };

    const onlineIndicatorSize = {
        sm: 'w-2 h-2',
        md: 'w-3 h-3',
        lg: 'w-4 h-4'
    };

    return (
        <div className="relative flex-shrink-0">
            <div className={`${sizeClasses[size]} bg-gray-300 rounded-full flex items-center justify-center overflow-hidden`}>
                {isUrl && !imageError ? (
                    <Image
                        src={url}
                        alt={name}
                        width={size === 'sm' ? 32 : size === 'md' ? 48 : 64}
                        height={size === 'sm' ? 32 : size === 'md' ? 48 : 64}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <span className="font-medium text-text-primary">
                        {getInitials(name)}
                    </span>
                )}
            </div>
            {online && (
                <div className={`absolute bottom-0 right-0 ${onlineIndicatorSize[size]} bg-text-success border-2 border-white rounded-full`} />
            )}
        </div>
    );
}

// Reusable ChatItem component
interface ChatItemProps {
    chat: {
        id: string;
        conversationId?: string;
        name: string;
        lastMessage: string;
        lastMessageTime: string;
        unread: number;
        avatar: string;
        online?: boolean;
        type?: 'direct' | 'group';
        memberCount?: number;
    };
    isActive: boolean;
    onClick: () => void;
}

function ChatItem({ chat, isActive, onClick }: ChatItemProps) {
    return (
        <div
            onClick={onClick}
            className={`flex items-center border-b space-x-3 p-3 hover:bg-surface-hover cursor-pointer transition-colors group ${isActive ? 'bg-surface-default border border-surface-brand-light rounded-lg' : ''
                }`}
        >
            {/* Avatar with online status */}
            <Avatar
                src={chat.avatar || undefined}
                name={chat.name}
                online={chat.online}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-text-primary truncate">{chat.name}</h3>
                <p className="text-sm text-text-secondary truncate">{chat.lastMessage}</p>
                {chat.conversationId && (
                    <p className="text-[10px] text-text-tertiary truncate font-mono mt-0.5">ID: {chat.conversationId}</p>
                )}
            </div>
            <div className="flex flex-col items-end space-y-1">
                <span className={`text-xs ${chat.unread > 0 ? "text-text-brand" : "text-text-secondary"} whitespace-nowrap`}>
                    {formatDateProximity(chat.lastMessageTime)}
                </span>

                {chat.unread > 0 ? (
                    <div className="bg-text-brand text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {chat.unread > 99 ? '99+' : chat.unread}
                    </div>
                ) : (
                    <div className="text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                    </div>
                )}
            </div>
        </div>
    );
}

// Direct Messages List Component
interface DirectMessagesListProps {
    chats: ChatItem[];
    activeChat: { id: string; type: 'direct' | 'group' } | null;
    onChatClick: (chat: { id: string; type: 'direct' | 'group' }) => void;
}

function DirectMessagesList({ chats, activeChat, onChatClick }: DirectMessagesListProps) {
    const t = useTranslations('chat');

    if (chats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary p-4">
                <p className="text-center">{t('noDirectMessages')}</p>
                <p className="text-sm text-text-tertiary mt-2">{t('tryAdjustingSearch')}</p>
            </div>
        );
    }

    return (
        <div className="p-2 scrollbar-hide">
            {chats.map((chat) => (
                <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={activeChat?.id === chat.id && activeChat?.type === 'direct'}
                    onClick={() => onChatClick({ id: chat.id, type: 'direct' })}
                />
            ))}
        </div>
    );
}

// Types
interface Group {
    id: string;
    name: string;
    description: string;
    privacy: string;
    memberCount: number;
    ownerId: string;
    createdAt: string;
    avatarUrl?: string;
}

interface GetMyGroupsResponse {
    getMyGroups: {
        success: boolean;
        message: string;
        total: number;
        groups: Group[];
    };
}

interface GroupsListProps {
    searchQuery: string;
    activeChat: { id: string; type: 'direct' | 'group' } | null;
    onChatClick: (chat: { id: string; type: 'direct' | 'group' }) => void;
    conversations?: any[];
    limit?: number;
    offset?: number;
}

function GroupsList({ searchQuery, activeChat, onChatClick, conversations = [], limit = 50, offset = 0 }: GroupsListProps) {
    const t = useTranslations('chat');
    const setRealConversation = useChatStore((s) => s.setRealConversation);

    const { data, loading, error } = useQuery<GetMyGroupsResponse>(GET_MY_GROUPS, {
        variables: { limit, offset },
        fetchPolicy: 'network-only',
    });

    // Cache groupId -> conversationId so GroupChat can use it without re-fetching or creating duplicates
    useEffect(() => {
        const list = conversations as Array<{ id?: string; type?: string; groupId?: string | null; participantIds?: string[] }>;
        if (!list?.length) return;
        list.forEach((conv) => {
            const isGroup = conv.type === 'GROUP' || conv.type === 'group';
            const groupId = conv.groupId;
            if (isGroup && groupId && conv.id) {
                setRealConversation(groupId, {
                    conversationId: conv.id,
                    type: 'GROUP',
                    participantIds: conv.participantIds ?? [],
                });
            }
        });
    }, [conversations, setRealConversation]);

    if (loading) {
        return (
            <div className="p-2 space-y-1">
                {[...Array(5)].map((_, i) => (
                    <ChatItemSkeleton key={i} />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary p-4">
                <p className="text-center text-red-500">{t('group.groupsNotFound')}</p>
                <p className="text-sm text-text-tertiary mt-2">{error.message}</p>
            </div>
        );
    }

    const groups = data?.getMyGroups.groups || [];

    // Filter groups based on search query
    const filteredGroups = groups.filter(group =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort by latest chat activity (newest first)
    const sortedGroups = [...filteredGroups].sort((a, b) => {
        const convA = conversations.find((c: { type?: string; groupId?: string }) => c.type === 'GROUP' && c.groupId === a.id) as { lastMessageAt?: string; lastMessage?: { createdAt?: string }; createdAt?: string } | undefined;
        const convB = conversations.find((c: { type?: string; groupId?: string }) => c.type === 'GROUP' && c.groupId === b.id) as { lastMessageAt?: string; lastMessage?: { createdAt?: string }; createdAt?: string } | undefined;
        const timeA = convA?.lastMessageAt || convA?.lastMessage?.createdAt || convA?.createdAt || a.createdAt || '';
        const timeB = convB?.lastMessageAt || convB?.lastMessage?.createdAt || convB?.createdAt || b.createdAt || '';
        return new Date(timeB).getTime() - new Date(timeA).getTime();
    });

    if (sortedGroups.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary p-4">
                <p className="text-center">{searchQuery ? t('noGroupsFound') : t('noGroups')}</p>
                <p className="text-sm text-text-tertiary justify-center text-center mt-2">
                    {searchQuery ? t('tryAdjustingSearch') : t('createFirstGroup')}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-1 p-2">
            {sortedGroups.map((group) => {
                const correspondingConversation = conversations.find(
                    (conv: { type?: string; groupId?: string }) => conv.type === 'GROUP' && conv.groupId === group.id
                ) as { id?: string; lastMessage?: { content?: string; replyToId?: string | null }; lastMessageAt?: string; unreadCount?: number } | undefined;

                const lastMsg = correspondingConversation?.lastMessage;
                const isLastMessageReply = !!lastMsg?.replyToId;
                const previewText = (lastMsg && !isLastMessageReply)
                    ? (lastMsg.content ?? group.description ?? t('group.memberCount', { count: group.memberCount }))
                    : (group.description ?? t('group.memberCount', { count: group.memberCount }));

                return (
                    <ChatItem
                        key={group.id}
                        chat={{
                            id: group.id,
                            conversationId: correspondingConversation?.id,
                            name: group.name,
                            avatar: group.avatarUrl || getInitials(group.name),
                            lastMessage: previewText,
                            lastMessageTime: correspondingConversation?.lastMessageAt ?? group.createdAt,
                            unread: correspondingConversation?.unreadCount ?? 0,
                            type: 'group' as const,
                            memberCount: group.memberCount,
                        }}
                        isActive={activeChat?.id === group.id && activeChat?.type === 'group'}
                        onClick={() => onChatClick({ id: group.id, type: 'group' })}
                    />
                );
            })}
        </div>
    );
}