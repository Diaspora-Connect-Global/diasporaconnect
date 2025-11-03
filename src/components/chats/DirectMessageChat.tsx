import { formatChatTimestamp } from "@/macros/time";
import { ChevronRight, InfoIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MessageInput } from "./MessageInput";
import { ChatInfo, Message } from "@/app/[locale]/(protected)/(main)/chat/page";
import Image from "next/image";
import { mockUsers } from "@/data/chats";
import { useChatStore } from "@/store/ChatStore";
import { ButtonType3 } from "../custom/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

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
        <div className="flex flex-row h-full w-full space-x-2">
            {/* Main Chat Area */}
            <div className="lg:min-w-[30rem] bg-surface-default rounded-lg border border-border-subtle flex flex-col h-full flex-1 ">
                {/* Chat Header */}
                <div className="border-b border-border-subtle p-4  flex justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                          

                            <Avatar className="w-12 h-12">
                                <AvatarImage src={chat.avatar} alt="avator" />
                                <AvatarFallback>U</AvatarFallback>
                            </Avatar>
                            {chat.online && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-text-success border-2 border-white rounded-full" />
                            )}
                        </div>
                        <div>
                            <h2 className="font-semibold text-text-primary">{chat.name}</h2>
                            <p className="text-sm text-text-secondary">
                                {chat.online ? 'Online' : `Last seen ${formatChatTimestamp(userInfo?.lastSeen || chat.lastMessageTime)}`}
                            </p>
                        </div>
                    </div>

                    <button onClick={() => setSidebarOpen(!sidebarOpen)}>
                        <InfoIcon className={`w-6 h-6 cursor-pointer  ${sidebarOpen ? "text-text-white bg-surface-brand rounded-full" : "text-text-brand "}`} />
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
                                        className={`px-4 py-4 rounded-full ${message.senderId === 'current-user'
                                            ? 'bg-text-brand text-white '
                                            : 'bg-surface-brand-light text-text-primary '
                                            }`}
                                    >
                                        {message.text}
                                    </div>
                                )}
                                <p className="text-xs text-text-tertiary mt-1 text-right">
                                    {formatChatTimestamp(message.timestamp)}
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
                <div className="lg:min-w-[20rem] bg-surface-default border rounded-lg border-border-subtle flex flex-col">
                    <div className="p-4 flex-1">
                        {/* User/Group Info */}
                        <div className="flex flex-col items-center mb-6">
                            
                            <Avatar className="w-20 h-20">
                                <AvatarImage src={chat.avatar} alt="avator" />
                                <AvatarFallback>U</AvatarFallback>
                            </Avatar>
                            <h4 className="font-semibold text-text-primary text-lg">{chat.name}</h4>
                        </div>

                        <div className="flex items-center justify-center">
                            <ButtonType3>
                                View profile
                            </ButtonType3>
                        </div>
                    </div>

                    {/* Quick Actions - Now at the bottom */}
                    <div className="mt-auto border-t border-border-subtle p-4">
                        <div className="space-y-3">
                            <div className="text-text-danger flex justify-between items-center p-2 hover:bg-surface-hover rounded-lg cursor-pointer transition-colors">
                                <p className="text-sm">Report</p>
                                <ChevronRight className="w-4 h-4" />
                            </div>

                            <div className="text-text-danger flex justify-between items-center p-2 hover:bg-surface-hover rounded-lg cursor-pointer transition-colors">
                                <p className="text-sm">Block</p>
                                <ChevronRight className="w-4 h-4" />
                            </div>

                            <div className="text-text-danger flex justify-between items-center p-2 hover:bg-surface-hover rounded-lg cursor-pointer transition-colors">
                                <p className="text-sm">Delete Conversation</p>
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}