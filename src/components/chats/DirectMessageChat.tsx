import { formatDateProximity } from "@/macros/time";
import { InfoIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MessageInput } from "./MessageInput";
import { ChatInfo, Message } from "@/app/[locale]/(protected)/(main)/chat/page";
import Image from "next/image";
import { mockUsers } from "@/data/chats";
import { useChatStore } from "@/store/ChatStore";

export default function DirectMessageChat({ chat }: { chat: ChatInfo }) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    // Use Zustand store
    const { 
        addMessage, 
        updateConversation, 
        updatePreference,
        getMessagesByConversation,
        initializeFromMockData 
    } = useChatStore();

    // Get messages for current conversation
    const conversationMessages = getMessagesByConversation(chat.id);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversationMessages]);

    // Initialize store with mock data on component mount
    useEffect(() => {
        initializeFromMockData();
    }, [initializeFromMockData]);

    const handleSendMessage = (messageText: string, image?: string) => {
        if (messageText.trim() || image) {
            // Create new message object
            const newMsg: Message = {
                id: Date.now().toString(),
                conversationId: chat.id,
                senderId: 'current-user',
                text: messageText,
                type: image ? 'image' as const : 'text' as const,
                timestamp: new Date().toISOString(),
                status: 'sent' as const,
                imageUrl: image, 
            };

            addMessage(newMsg);

            // Update conversation's updatedAt timestamp
            updateConversation(chat.id, {
                updatedAt: new Date().toISOString()
            });

            // Update user conversation preferences (reset unread count for current user)
            updatePreference(chat.id, 'current-user', {
                unreadCount: 0,
                lastReadMessageId: newMsg.id
            });

            // For direct messages, increment unread count for the other user
            const otherUserPreference = useChatStore.getState().preferences.find(pref => 
                pref.conversationId === chat.id && pref.userId !== 'current-user'
            );
            if (otherUserPreference) {
                updatePreference(chat.id, otherUserPreference.userId, {
                    unreadCount: otherUserPreference.unreadCount + 1
                });
            }

            console.log('New message added:', newMsg);
        }
    };

    // Get user info for the chat
    const getUserInfo = () => {
        if (chat.type === 'direct') {
            return mockUsers.find(user => user.id === chat.id);
        }
        return null;
    };

    const userInfo = getUserInfo();

    return (
        <div className="flex flex-row h-full w-full">
            {/* Main Chat Area */}
            <div className="lg:min-w-[30rem] flex flex-col h-full flex-1">
                {/* Chat Header */}
                <div className="border-b border-border-subtle p-4 bg-surface-default flex justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-text-primary">{chat.avatar}</span>
                            </div>
                            {chat.online && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-text-success border-2 border-white rounded-full" />
                            )}
                        </div>
                        <div>
                            <h2 className="font-semibold text-text-primary">{chat.name}</h2>
                            <p className="text-sm text-text-secondary">
                                {chat.online ? 'Online' : `Last seen ${formatDateProximity(userInfo?.lastSeen || chat.lastMessageTime)}`}
                            </p>
                        </div>
                    </div>

                    <button onClick={() => setSidebarOpen(!sidebarOpen)}>
                        <InfoIcon className="w-5 h-5 cursor-pointer text-text-primary" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {conversationMessages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.senderId === 'current-user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-xs lg:max-w-md ${message.senderId === 'current-user' ? 'ml-auto' : ''}`}>
                                {message.type === 'image' && message.imageUrl ? (
                                    <div className="mb-2">
                                        <Image
                                            src={message.imageUrl}
                                            alt="Shared image"
                                            width={300}
                                            height={200}
                                            className="rounded-2xl max-w-full h-auto"
                                        />
                                        {message.text && (
                                            <p className="text-sm text-text-primary mt-2">{message.text}</p>
                                        )}
                                    </div>
                                ) : (
                                    <div
                                        className={`px-4 py-2 rounded-2xl ${message.senderId === 'current-user'
                                            ? 'bg-text-brand text-white rounded-br-none'
                                            : 'bg-surface-hover text-text-primary rounded-bl-none'
                                            }`}
                                    >
                                        {message.text}
                                    </div>
                                )}
                                <p className="text-xs text-text-tertiary mt-1 text-right">
                                    {formatDateProximity(message.timestamp)}
                                </p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <MessageInput
                    onSendMessage={handleSendMessage}
                    placeholder="Type a message..."
                    conversationId={chat.id}
                    senderId="current-user"
                />
            </div>

            {/* Sidebar */}
            {sidebarOpen && (
                <div className="lg:min-w-[20rem] bg-surface-default border-l border-border-subtle">
                    <div className="p-4">
                        <h3 className="font-semibold text-text-primary mb-4">Chat Info</h3>
                        
                        {/* User/Group Info */}
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center mb-3">
                                <span className="text-lg font-medium text-text-primary">{chat.avatar}</span>
                            </div>
                            <h4 className="font-semibold text-text-primary text-lg">{chat.name}</h4>
                            {userInfo && (
                                <>
                                    <p className="text-sm text-text-secondary mt-1">{userInfo.email}</p>
                                    <div className="flex items-center mt-2">
                                        <div className={`w-2 h-2 rounded-full mr-2 ${
                                            userInfo.status === 'online' ? 'bg-text-success' :
                                            'bg-text-tertiary'
                                        }`} />
                                        <span className="text-sm text-text-secondary capitalize">{userInfo.status}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Chat Statistics */}
                        <div className="space-y-4">
                            <div>
                                <h5 className="text-sm font-medium text-text-primary mb-2">Chat Details</h5>
                                <div className="text-sm text-text-secondary space-y-1">
                                    <p>Messages: {conversationMessages.length}</p>
                                    <p>Last active: {formatDateProximity(chat.lastMessageTime)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}