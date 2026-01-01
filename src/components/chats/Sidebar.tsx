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
import Image from "next/image";

type TabType = 'direct' | 'groups';

interface ChatItem {
    id: string;
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
    const { activeChat, setActiveChat, conversations, preferences, messages, initializeFromMockData } = useChatStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'direct' | 'group'>('direct');
    const [directChats, setDirectChats] = useState<ChatItem[]>([]);

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

    // Initialize store and compute chat lists
    useEffect(() => {
        initializeFromMockData();
    }, [initializeFromMockData]);

    useEffect(() => {
        // Compute direct messages from store data
        const computedDirectChats = computeDirectChats();
        setDirectChats(computedDirectChats);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversations, preferences, messages]);

    const computeDirectChats = (): ChatItem[] => {
        return conversations
            .filter(conv => conv.type === 'direct')
            .map(conv => {
                const convMessages = messages.filter(m => m.conversationId === conv.id);
                const lastMessage = convMessages[convMessages.length - 1];
                const preference = preferences.find(p => p.conversationId === conv.id && p.userId === 'current-user');
                
                const user = useChatStore.getState().users?.find(u => u.id === conv.id) || {
                    id: conv.id,
                    name: 'Unknown User',
                    avatar: 'UU',
                    status: 'offline' as const,
                    email: '',
                    lastSeen: new Date().toISOString()
                };

                return {
                    id: conv.id,
                    name: user.name,
                    type: 'direct' as const,
                    lastMessage: lastMessage?.text || t('empty.title'),
                    lastMessageTime: lastMessage?.timestamp || conv.createdAt,
                    unread: preference?.unreadCount || 0,
                    online: user.status === 'online',
                    avatar: user.avatar
                };
            });
    };

    // Calculate total unread counts
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
        
        // Reset unread count when chat is clicked
        const preference = preferences.find(p => 
            p.conversationId === chat.id && p.userId === 'current-user'
        );
        if (preference && preference.unreadCount > 0) {
            useChatStore.getState().updatePreference(chat.id, 'current-user', {
                unreadCount: 0
            });
        }
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
                    {activeTab === 'direct' ? (
                        <DirectMessagesList
                            chats={filteredDirectMessages}
                            activeChat={activeChat}
                            onChatClick={handleChatClick}
                        />
                    ) : (
                        <GroupsList
                            searchQuery={searchQuery}
                            activeChat={activeChat}
                            onChatClick={handleChatClick}
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
            className={`flex-1 py-1 text-center font-medium transition-colors cursor-pointer ${
                active
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
    src: string;
    name: string;
    size?: 'sm' | 'md' | 'lg';
    online?: boolean;
}

function Avatar({ src, name, size = 'md', online }: AvatarProps) {
    const [imageError, setImageError] = useState(false);
    const isUrl = isValidUrl(src);
    
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
                        src={src}
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
            className={`flex items-center border-b space-x-3 p-3 hover:bg-surface-hover cursor-pointer transition-colors group ${
                isActive ? 'bg-surface-default border border-surface-brand-light rounded-lg' : ''
                }`}
        >
            {/* Avatar with online status */}
            <Avatar 
                src={chat.avatar} 
                name={chat.name}
                online={chat.online}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-text-primary truncate">{chat.name}</h3>
                <p className="text-sm text-text-secondary truncate">{chat.lastMessage}</p>
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
    limit?: number;
    offset?: number;
}

function GroupsList({ searchQuery, activeChat, onChatClick, limit = 50, offset = 0 }: GroupsListProps) {
    const t = useTranslations('chat');
    
    const { data, loading, error } = useQuery<GetMyGroupsResponse>(GET_MY_GROUPS, {
        variables: { limit, offset },
        fetchPolicy: 'network-only',
    });

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

    if (filteredGroups.length === 0) {
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
            {filteredGroups.map((group) => {
                return (
                    <ChatItem
                        key={group.id}
                        chat={{
                            id: group.id,
                            name: group.name,
                            avatar: group.avatarUrl || getInitials(group.name),
                            lastMessage: group.description || `${group.memberCount} members`,
                            lastMessageTime: group.createdAt,
                            unread: 0,
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