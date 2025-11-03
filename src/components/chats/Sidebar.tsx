"use client"
import { useState, useEffect } from "react";
import { SearchInput } from "../custom/input";
import { Plus, SquarePen } from "lucide-react";
import { formatDateProximity } from "@/macros/time";
import { useChatStore } from "@/store/ChatStore";
import { ButtonType3 } from "../custom/button";
import { StartConversationModal } from "./modals/StartConversationModal";

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
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('direct');
    const { activeChat, setActiveChat, conversations, preferences, messages, initializeFromMockData } = useChatStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [directChats, setDirectChats] = useState<ChatItem[]>([]);
    const [groupChats, setGroupChats] = useState<ChatItem[]>([]);

    // Initialize store and compute chat lists
    useEffect(() => {
        initializeFromMockData();
    }, [initializeFromMockData]);

    useEffect(() => {
        // Compute direct messages and groups from store data
        const computedDirectChats = computeDirectChats();
        const computedGroupChats = computeGroupChats();
        
        setDirectChats(computedDirectChats);
        setGroupChats(computedGroupChats);
    }, [conversations, preferences, messages]);

    const computeDirectChats = (): ChatItem[] => {
        return conversations
            .filter(conv => conv.type === 'direct')
            .map(conv => {
                const convMessages = messages.filter(m => m.conversationId === conv.id);
                const lastMessage = convMessages[convMessages.length - 1];
                const preference = preferences.find(p => p.conversationId === conv.id && p.userId === 'current-user');
                
                // For direct messages, the conversation ID corresponds to the user ID
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
                    lastMessage: lastMessage?.text || 'No messages yet',
                    lastMessageTime: lastMessage?.timestamp || conv.createdAt,
                    unread: preference?.unreadCount || 0,
                    online: user.status === 'online',
                    avatar: user.avatar
                };
            });
    };

    const computeGroupChats = (): ChatItem[] => {
        return conversations
            .filter(conv => conv.type === 'group')
            .map(conv => {
                const convMessages = messages.filter(m => m.conversationId === conv.id);
                const lastMessage = convMessages[convMessages.length - 1];
                const preference = preferences.find(p => p.conversationId === conv.id && p.userId === 'current-user');
                const group = useChatStore.getState().groups?.find(g => g.id === conv.groupId);
                const memberCount = useChatStore.getState().groupMembers?.filter(m => m.groupId === conv.groupId).length || 0;

                return {
                    id: conv.id,
                    name: group?.name || 'Unknown Group',
                    type: 'group' as const,
                    lastMessage: lastMessage?.text || 'No messages yet',
                    lastMessageTime: lastMessage?.timestamp || conv.createdAt,
                    unread: preference?.unreadCount || 0,
                    memberCount,
                    avatar: group?.avatar || 'UG'
                };
            });
    };

    // Calculate total unread counts
    const directUnreadCount = directChats.reduce((sum, chat) => sum + chat.unread, 0);
    const groupsUnreadCount = groupChats.reduce((sum, chat) => sum + chat.unread, 0);

    // Filter based on search query
    const filteredDirectMessages = directChats.filter(chat =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredGroups = groupChats.filter(chat =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleChatClick = (chat: { id: string; type: 'direct' | 'group' }) => {
        setActiveChat(chat);
        
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

    return (
        <>
            <div className="w-full h-full flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-4">
                    <p className="text-2xl font-heading-large">Chats</p>
                    <ButtonType3
                        className="px-4 py-3 flex items-center"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <SquarePen className="mr-2 h-4 w-4" />
                        New message
                    </ButtonType3>
                </div>

                {/* Search */}
                <div className="w-full px-4 pb-3">
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        onSearch={() => { }}
                        placeholder={"Search messages"}
                        id="main-search"
                        bg="bg-surface-default"
                    />
                </div>

                {/* Tabs */}
                <div className="border-b border-border-subtle px-4">
                    <div className="flex">
                        <TabButton
                            active={activeTab === 'direct'}
                            onClick={() => setActiveTab('direct')}
                            label="Direct Messages"
                            notificationCount={directUnreadCount}
                        />
                        <TabButton
                            active={activeTab === 'groups'}
                            onClick={() => setActiveTab('groups')}
                            label="Groups"
                            notificationCount={groupsUnreadCount}
                        />
                    </div>
                </div>

                {/* Create Group Button - Only show when Groups tab is active */}
                {activeTab === 'groups' && (
                    <div className="px-4 py-3">
                        <div className="text-text-brand flex items-center cursor-pointer">
                            <Plus className="mr-2 h-4 w-4" />
                            <p>Create Group</p>
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
                            groups={filteredGroups}
                            activeChat={activeChat}
                            onChatClick={handleChatClick}
                        />
                    )}
                </div>
            </div>

            <StartConversationModal
                isOpen={isModalOpen}
                onOpenChange={setIsModalOpen}
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
            className={`flex items-center border-b space-x-3 p-3 hover:bg-surface-hover cursor-pointer transition-colors group ${isActive ? 'bg-surface-default border border-surface-brand-light rounded-lg' : ''
                }`}
        >
            {/* Avatar with online status */}
            <div className="relative flex-shrink-0">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-text-primary">{chat.avatar}</span>
                </div>
                {chat.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-text-success border-2 border-text-white rounded-full" />
                )}
            </div>

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
    if (chats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary p-4">
                <p className="text-center">No direct messages found</p>
                <p className="text-sm text-text-tertiary mt-2">Try adjusting your search</p>
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

// Groups List Component
interface GroupsListProps {
    groups: ChatItem[];
    activeChat: { id: string; type: 'direct' | 'group' } | null;
    onChatClick: (chat: { id: string; type: 'direct' | 'group' }) => void;
}

function GroupsList({ groups, activeChat, onChatClick }: GroupsListProps) {
    if (groups.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary p-4">
                <p className="text-center">No groups found</p>
                <p className="text-sm text-text-tertiary mt-2">Try adjusting your search</p>
            </div>
        );
    }

    return (
        <div className="space-y-1 p-2">
            {groups.map((group) => (
                <ChatItem
                    key={group.id}
                    chat={group}
                    isActive={activeChat?.id === group.id && activeChat?.type === 'group'}
                    onClick={() => onChatClick({ id: group.id, type: 'group' })}
                />
            ))}
        </div>
    );
}