/* eslint-disable @typescript-eslint/no-explicit-any */
import { InfoIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MessageInput } from "./MessageInput";
import { formatDateProximity } from "@/macros/time";
import Image from "next/image";
import { ChatInfo } from "@/app/[locale]/(protected)/(main)/chat/page";
import { useChatStore } from "@/store/ChatStore";

export default function GroupChat({ chat }: { chat: ChatInfo }) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    // Use Zustand store
    const { 
        groupMembers,
        sendMessage,
        markAsRead,
        getMessagesByConversation,
        getGroupById,
        getUserById
    } = useChatStore();

    // Get messages for current conversation
    const conversationMessages = getMessagesByConversation(chat.id);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversationMessages]);

    // Mark as read when opening the chat
    useEffect(() => {
        markAsRead(chat.id);
    }, [chat.id, markAsRead]);

    const handleSendMessage = (messageText: string, image?: string) => {
        if (messageText.trim() || image) {
            sendMessage(chat.id, messageText, 'current-user', image ? 'image' : 'text');
        }
    };

    // Get group info
    const groupInfo = getGroupById(chat.id);
    
    // Get group members with user details
    const membersWithDetails = groupMembers
        .filter(member => member.groupId === chat.id)
        .map(member => ({
            ...member,
            user: getUserById(member.userId)
        }))
        .filter(member => member.user); // Filter out members without user data

    // Helper function to get sender names for groups
    const getSenderName = (senderId: string): string => {
        const user = getUserById(senderId);
        return user?.name || 'Unknown User';
    };

    return (
        <div className="flex flex-row h-full w-full">
            {/* Main Chat Area */}
            <div className="lg:min-w-[30rem] flex flex-col h-full flex-1">
                {/* Group Header */}
                <div className="border-b border-border-subtle p-4 bg-surface-default flex justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-white">{chat.avatar}</span>
                            </div>
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center border-2 border-white">
                                <span className="text-white text-xs">👥</span>
                            </div>
                        </div>
                        <div>
                            <h2 className="font-semibold text-text-primary">{chat.name}</h2>
                            <p className="text-sm text-text-secondary">{membersWithDetails.length} members</p>
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
                                {message.senderId !== 'current-user' && (
                                    <p className="text-xs text-text-secondary mb-1 ml-1">
                                        {getSenderName(message.senderId)}
                                    </p>
                                )}

                                {message.type === 'image' && (message as any).imageUrl ? (
                                    <div className="mb-2">
                                        <Image
                                            src={(message as any).imageUrl}
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
                    placeholder={`Message ${chat.name}`}
                    conversationId={chat.id}
                    senderId="current-user"
                />
            </div>

            {/* Sidebar */}
            {sidebarOpen && (
                <div className="lg:min-w-[20rem] bg-surface-default border-l border-border-subtle">
                    <div className="p-4">
                        <h3 className="font-semibold text-text-primary mb-4">Group Info</h3>
                        
                        {/* Group Info */}
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mb-3 relative">
                                <span className="text-lg font-medium text-white">{chat.avatar}</span>
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center border-2 border-surface-default">
                                    <span className="text-white text-xs">👥</span>
                                </div>
                            </div>
                            <h4 className="font-semibold text-text-primary text-lg">{chat.name}</h4>
                            {groupInfo?.description && (
                                <p className="text-sm text-text-secondary mt-2 text-center">
                                    {groupInfo.description}
                                </p>
                            )}
                            <div className="flex items-center mt-2">
                                <div className="w-2 h-2 bg-text-success rounded-full mr-2" />
                                <span className="text-sm text-text-secondary">
                                    {membersWithDetails.filter(m => m.user?.status === 'online').length} online
                                </span>
                            </div>
                        </div>

                        {/* Group Members */}
                        <div className="mb-6">
                            <h5 className="text-sm font-medium text-text-primary mb-3">
                                Members ({membersWithDetails.length})
                            </h5>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {membersWithDetails.map((member) => (
                                    <div key={member.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-surface-hover">
                                        <div className="relative">
                                            <div className="w-8 h-8 bg-surface-hover rounded-full flex items-center justify-center">
                                                <span className="text-xs font-medium text-text-primary">
                                                    {member.user?.avatar || 'UU'}
                                                </span>
                                            </div>
                                            {member.user?.status === 'online' && (
                                                <div className="absolute bottom-0 right-0 w-2 h-2 bg-text-success border border-surface-default rounded-full" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-text-primary truncate">
                                                {member.user?.name}
                                                {member.userId === 'current-user' && ' (You)'}
                                            </p>
                                            <p className="text-xs text-text-secondary capitalize">
                                                {member.role} • {member.user?.status || 'offline'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Group Statistics */}
                        <div className="space-y-4">
                            <div>
                                <h5 className="text-sm font-medium text-text-primary mb-2">Group Details</h5>
                                <div className="text-sm text-text-secondary space-y-1">
                                    <p>Messages: {conversationMessages.length}</p>
                                    <p>Created: {formatDateProximity(groupInfo?.createdAt || '')}</p>
                                    <p>Last active: {formatDateProximity(chat.lastMessageTime)}</p>
                                    <p>Type: {groupInfo?.isPublic ? 'Public' : 'Private'}</p>
                                </div>
                            </div>

                            {/* Group Actions */}
                            <div>
                                <h5 className="text-sm font-medium text-text-primary mb-2">Actions</h5>
                                <div className="space-y-2">
                                    <button className="w-full text-left text-sm text-text-secondary hover:text-text-primary p-2 rounded-lg hover:bg-surface-hover transition-colors">
                                        Invite people
                                    </button>
                                    <button className="w-full text-left text-sm text-text-error hover:text-text-error p-2 rounded-lg hover:bg-surface-hover transition-colors">
                                        Leave group
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}