/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChevronRight, InfoIcon, MessageCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MessageInput } from "./MessageInput";
import { formatChatTimestamp } from "@/macros/time";
import Image from "next/image";
import { ChatInfo } from "@/app/[locale]/(protected)/(main)/chat/page";
import { useChatStore } from "@/store/ChatStore";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ButtonType3 } from "../custom/button";

interface Reply {
    id: string;
    messageId: string;
    senderId: string;
    text: string;
    timestamp: string;
    type: 'text' | 'image';
    imageUrl?: string;
}

export default function GroupChat({ chat }: { chat: ChatInfo }) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [repliesSidebarOpen, setRepliesSidebarOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<any>(null);
    const [replies, setReplies] = useState<Reply[]>([]);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);

    // Use Zustand store
    const {
        groupMembers,
        sendMessage,
        markAsRead,
        getMessagesByConversation,
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

    // Mock replies data - in a real app, this would come from your store/API
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
        {
            id: '3',
            messageId: '16',
            senderId: '4',
            text: "Can't wait!",
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            type: 'text'
        }
    ];

    // Get reply count for a message
    const getReplyCount = (messageId: string): number => {
        return mockReplies.filter(reply => reply.messageId === messageId).length;
    };

    // Get replies for a specific message
    const getRepliesForMessage = (messageId: string): Reply[] => {
        return mockReplies.filter(reply => reply.messageId === messageId);
    };

    const handleSendMessage = (messageText: string, image?: string) => {
        if (messageText.trim() || image) {
            if (replyingTo) {
                // Send a reply
                const newReply: Reply = {
                    id: Date.now().toString(),
                    messageId: replyingTo,
                    senderId: 'current-user',
                    text: messageText,
                    timestamp: new Date().toISOString(),
                    type: image ? 'image' : 'text',
                    imageUrl: image
                };
                setReplies(prev => [...prev, newReply]);
                setReplyingTo(null);
            } else {
                // Send a regular message
                sendMessage(chat.id, messageText, 'current-user', image ? 'image' : 'text');
            }
        }
    };

    const handleViewReplies = (message: any) => {
        setSelectedMessage(message);
        setReplies(getRepliesForMessage(message.id));
        setRepliesSidebarOpen(true);
        setReplyingTo(message.id);
    };

    const handleCloseReplies = () => {
        setRepliesSidebarOpen(false);
        setSelectedMessage(null);
        setReplyingTo(null);
    };

    // Get group members with user details
    const membersWithDetails = groupMembers
        .filter(member => member.groupId === chat.id)
        .map(member => ({
            ...member,
            user: getUserById(member.userId)
        }))
        .filter(member => member.user);

    // Helper function to get sender names for groups
    const getSenderName = (senderId: string): string => {
        const user = getUserById(senderId);
        return user?.name || 'Unknown User';
    };

    return (
        <div className="flex flex-row h-full w-full space-x-2">
            {/* Main Chat Area */}
            <div className="lg:min-w-[30rem] bg-surface-default rounded-lg border border-border-subtle flex flex-col h-full flex-1">
                {/* Group Header */}
                <div className="border-b border-border-subtle p-4 flex justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <Avatar className="w-12 h-12">
                                <AvatarImage src={chat.avatar} alt="avatar" />
                                <AvatarFallback>U</AvatarFallback>
                            </Avatar>
                            {chat.online && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-text-success border-2 border-white rounded-full" />
                            )}
                        </div>
                        <div>
                            <h2 className="font-semibold text-text-primary">{chat.name}</h2>
                        </div>
                    </div>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)}>
                        <InfoIcon className={`w-6 h-6 cursor-pointer ${sidebarOpen ? "text-text-white bg-surface-brand rounded-full" : "text-text-brand"}`} />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {conversationMessages.map((message) => {
                        const replyCount = getReplyCount(message.id);
                        return (
                            <div
                                key={message.id}
                                className={`flex ${message.senderId === 'current-user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-xs lg:max-w-md ${message.senderId === 'current-user' ? 'ml-auto' : ''}`}>
                                   

                                    {message.type === 'image' && (message as any).imageUrl ? (
                                        <div className="mb-2">
                                             {message.senderId !== 'current-user' && (
                                        <p className="text-xs text-text-primary mb-1 ml-1">
                                            {getSenderName(message.senderId)}
                                        </p>
                                    )}
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
                                            className={`px-4 py-2 rounded-4xl ${message.senderId === 'current-user'
                                                ? 'bg-text-brand text-white'
                                                : 'bg-surface-brand-light text-text-primary'
                                                }`}
                                        >
                                             {message.senderId !== 'current-user' && (
                                        <p className="text-xs text-text-primary mb-1 ml-1">
                                            {getSenderName(message.senderId)}
                                        </p>
                                    )}
                                            {message.text}
                                        </div>
                                    )}

                                    <div className=" space-x-2 flex items-center justify-start mt-1">

                                         <Avatar className="w-6 h-6">
                                <AvatarImage src={chat.avatar} alt="avatar" />
                                <AvatarFallback>U</AvatarFallback>
                            </Avatar>
                                        <p className="text-xs text-text-tertiary">
                                            {formatChatTimestamp(message.timestamp)}
                                        </p>
                                        <button
                                            onClick={() => handleViewReplies(message)}
                                            className="flex items-center space-x-1 text-xs text-text-brand hover:text-text-brand-dark transition-colors ml-2"
                                        >
                                          
                                            <span>
                                                {replyCount > 0 ? `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'} | reply` : 'Reply'}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Main Message Input - Hidden when replies sidebar is open */}
                {!repliesSidebarOpen && (
                    <MessageInput
                        onSendMessage={handleSendMessage}
                        placeholder={`Message ${chat.name}`}
                        conversationId={chat.id}
                        senderId="current-user"
                    />
                )}
            </div>

            {/* Group Info Sidebar */}
            {sidebarOpen && (
                <div className="lg:min-w-[20rem] bg-surface-default border rounded-lg border-border-subtle flex flex-col">
                    <div className="p-4 flex-1 flex flex-col">
                        {/* Group Info */}
                        <div className="flex flex-col items-center mb-6">
                            <Avatar className="w-20 h-20">
                                <AvatarImage src={chat.avatar} alt="avatar" />
                                <AvatarFallback>U</AvatarFallback>
                            </Avatar>
                            <h4 className="font-semibold text-text-primary text-lg">{chat.name}</h4>
                        </div>

                        <div className="flex items-center justify-center mb-6">
                            <ButtonType3>
                                Edit
                            </ButtonType3>
                        </div>

                        {/* Group Members */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-3">
                                <h5 className="text-sm font-medium text-text-primary">
                                    Members
                                </h5>
                                <ButtonType3 className="text-xs py-1 px-2">
                                    Add people
                                </ButtonType3>
                            </div>
                            <div className="space-y-1 h-80 overflow-y-auto scrollbar-hide">
                                {membersWithDetails.map((member) => (
                                    <div key={member.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-surface-hover">
                                        <Avatar className="w-12 h-12">
                                            <AvatarImage src={member.user?.avatar || chat.avatar} alt="avatar" />
                                            <AvatarFallback>{member.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                                        </Avatar>

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
                    </div>

                    {/* Quick Actions - At the bottom */}
                    <div className="mt-auto border-t border-border-subtle p-4">
                        <div className="space-y-3">
                            <div className="text-text-danger flex justify-between items-center p-2 hover:bg-surface-hover rounded-lg cursor-pointer transition-colors">
                                <p className="text-sm">Leave Group</p>
                                <ChevronRight className="w-4 h-4" />
                            </div>

                            <div className="text-text-danger flex justify-between items-center p-2 hover:bg-surface-hover rounded-lg cursor-pointer transition-colors">
                                <p className="text-sm">Delete Group</p>
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Replies Sidebar */}
            {repliesSidebarOpen && (
                <div className="lg:min-w-[20rem] bg-surface-default border rounded-lg border-border-subtle flex flex-col">
                    {/* Replies Header */}
                    <div className=" p-4 flex justify-between items-center">
                        <div>
                            <h3 className="font-semibold text-text-primary">Replies</h3>

                        </div>
                        <button
                            onClick={handleCloseReplies}
                            className="p-1 hover:bg-surface-hover rounded-full transition-colors"
                        >
                            <X className="w-4 h-4 text-text-secondary" />
                        </button>
                    </div>

                    {/* Original Message */}
                    {selectedMessage && (
                        <div className="p-4 border-b border-border-subtle bg-surface-hover">
                            <div className="bg-surface-brand-light px-4 py-4 rounded-4xl items-center min-w-0 mb-2">
                                <span className="text-sm font-medium text-text-primary">
                                    {getSenderName(selectedMessage.senderId)}
                                </span>
                                <p className="text-sm text-text-primary">{selectedMessage.text}</p>
                            </div>
                            <p className="text-xs text-text-tertiary flex  items-center space-x-4 mt-1">
                                <Avatar className="w-6 h-6">
                                    <AvatarImage src={getUserById(selectedMessage.senderId)?.avatar} alt="avatar" />
                                    <AvatarFallback>{getSenderName(selectedMessage.senderId).charAt(0)}</AvatarFallback>
                                </Avatar>
                                {formatChatTimestamp(selectedMessage.timestamp)}
                                <p className="text-text-brand"> 4 replies </p>
                            </p>
                        </div>
                    )}

                    {/* Replies List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {replies.length > 0 ? (
                            replies.map((reply) => (
                                <div key={reply.id} className="">

                                    <div className="flex-1 min-w-0 bg-surface-brand-light rounded-4xl px-4 py-4">
                                        <div className="mb-1">
                                            <span className="text-sm font-medium text-text-primary">
                                                {getSenderName(reply.senderId)}
                                            </span>
                                            {reply.type === 'image' && reply.imageUrl ? (
                                                <div className="mb-2">
                                                    <Image
                                                        src={reply.imageUrl}
                                                        alt="Reply image"
                                                        width={200}
                                                        height={150}
                                                        className="rounded-xl max-w-full h-auto"
                                                    />
                                                    {reply.text && (
                                                        <p className="text-sm text-text-primary mt-2">{reply.text}</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-text-primary bg-surface-hover rounded-lg ">
                                                    {reply.text}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex space-x-3 items-center">
                                        <Avatar className="w-3 h-3 flex-shrink-0">
                                            <AvatarImage src={getUserById(reply.senderId)?.avatar} alt="avatar" />
                                            <AvatarFallback>{getSenderName(reply.senderId).charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs text-text-tertiary">
                                            {formatChatTimestamp(reply.timestamp)}
                                        </span>
                                    </div>

                                </div>
                            ))
                        ) : (
                            <div className="text-center text-text-secondary py-8">
                                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No replies yet</p>
                                <p className="text-xs">Be the first to reply</p>
                            </div>
                        )}
                    </div>

                    {/* Reply Input in Replies Sidebar */}
                    <div className="">
                        <MessageInput
                            onSendMessage={handleSendMessage}
                            placeholder="Write a reply..."
                            conversationId={chat.id}
                            senderId="current-user"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}