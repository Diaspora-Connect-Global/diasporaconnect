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
import { useTranslations } from 'next-intl';

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
    const t = useTranslations('chat.group');
    const tActions = useTranslations('actions');
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

    // Mock replies data
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
        setSidebarOpen(false)

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


    const handleSideBarToggle = () =>{
        setSidebarOpen(!sidebarOpen)
        setRepliesSidebarOpen(false)
    }


    return (
        <div className="flex flex-row h-full min-h-0 space-x-2"> {/* Changed to h-full min-h-0 */}
            {/* Main Chat Area */}
            <div className="flex-1 bg-surface-default rounded-lg border border-border-subtle flex flex-col h-full min-h-0"> {/* Removed fixed width, added min-h-0 */}
                {/* Group Header */}
                <div className="flex-shrink-0 border-b border-border-subtle p-4 flex justify-between"> {/* Added flex-shrink-0 */}
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
                    <button onClick={handleSideBarToggle}>
                        <InfoIcon className={`w-6 h-6 cursor-pointer ${sidebarOpen ? "text-text-white bg-surface-brand rounded-full" : "text-text-brand"}`} />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4"> {/* Added min-h-0 */}
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

                                    <div className="space-x-2 flex items-center justify-start mt-1">
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
                                                {replyCount > 0 ? t('repliesCount', { count: replyCount }) + ' | ' + t('reply') : t('reply')}
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
                    <div className="flex-shrink-0"> {/* Added flex-shrink-0 wrapper */}
                        <MessageInput
                            onSendMessage={handleSendMessage}
                            placeholder={t('message', { name: chat.name })}
                            conversationId={chat.id}
                            senderId="current-user"
                        />
                    </div>
                )}
            </div>

            {/* Group Info Sidebar */}
            {sidebarOpen && (
                <div className="w-80 bg-surface-default border rounded-lg border-border-subtle flex flex-col min-h-0"> {/* Fixed width, added min-h-0 */}
                    <div className="p-4 flex-1 min-h-0 flex flex-col"> {/* Added min-h-0 */}
                        {/* Group Info */}
                        <div className="flex-shrink-0 flex flex-col items-center mb-6"> {/* Added flex-shrink-0 */}
                            <Avatar className="w-20 h-20">
                                <AvatarImage src={chat.avatar} alt="avatar" />
                                <AvatarFallback>U</AvatarFallback>
                            </Avatar>
                            <h4 className="font-semibold text-text-primary text-lg">{chat.name}</h4>
                        </div>

                        <div className="flex-shrink-0 flex items-center justify-center mb-6"> {/* Added flex-shrink-0 */}
                            <ButtonType3>
                                {t('edit')}
                            </ButtonType3>
                        </div>

                        {/* Group Members */}
                        <div className="flex-1 min-h-0 mb-6"> {/* Added flex-1 min-h-0 */}
                            <div className="flex-shrink-0 flex justify-between items-center mb-3"> {/* Added flex-shrink-0 */}
                                <h5 className="text-sm font-medium text-text-primary">
                                    {t('members')}
                                </h5>
                                <ButtonType3 className="text-xs py-1 px-2">
                                    {t('addPeople')}
                                </ButtonType3>
                            </div>
                            <div className="h-full min-h-0 overflow-y-auto scrollbar-hide"> {/* Changed to h-full min-h-0 */}
                                {membersWithDetails.map((member) => (
                                    <div key={member.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-surface-hover">
                                        <Avatar className="w-12 h-12">
                                            <AvatarImage src={member.user?.avatar || chat.avatar} alt="avatar" />
                                            <AvatarFallback>{member.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-text-primary truncate">
                                                {member.user?.name}
                                                {member.userId === 'current-user' && t('you')}
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
                    <div className="flex-shrink-0 border-t border-border-subtle p-4"> {/* Added flex-shrink-0 */}
                        <div className="space-y-3">
                            <div className="text-text-danger flex justify-between items-center p-2 hover:bg-surface-hover rounded-lg cursor-pointer transition-colors">
                                <p className="text-sm">{t('leaveGroup')}</p>
                                <ChevronRight className="w-4 h-4" />
                            </div>

                            <div className="text-text-danger flex justify-between items-center p-2 hover:bg-surface-hover rounded-lg cursor-pointer transition-colors">
                                <p className="text-sm">{t('deleteGroup')}</p>
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Replies Sidebar */}
            {repliesSidebarOpen && (
                <div className="w-80 bg-surface-default border rounded-lg border-border-subtle flex flex-col min-h-0"> {/* Fixed width, added min-h-0 */}
                    {/* Replies Header */}
                    <div className="flex-shrink-0 p-4 flex justify-between items-center"> {/* Added flex-shrink-0 */}
                        <div>
                            <h3 className="font-semibold text-text-primary">{t('replies')}</h3>
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
                        <div className="flex-shrink-0 p-4 border-b border-border-subtle bg-surface-hover"> {/* Added flex-shrink-0 */}
                            <div className="bg-surface-brand-light px-4 py-4 rounded-4xl items-center min-w-0 mb-2">
                                <span className="text-sm font-medium text-text-primary">
                                    {getSenderName(selectedMessage.senderId)}
                                </span>
                                <p className="text-sm text-text-primary">{selectedMessage.text}</p>
                            </div>
                            <p className="text-xs text-text-tertiary flex items-center space-x-4 mt-1">
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
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4"> {/* Added min-h-0 */}
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
                                                <p className="text-sm text-text-primary bg-surface-hover rounded-lg">
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
                                <p className="text-sm">{t('noReplies')}</p>
                                <p className="text-xs">{t('beFirstToReply')}</p>
                            </div>
                        )}
                    </div>

                    {/* Reply Input in Replies Sidebar */}
                    <div className="flex-shrink-0"> {/* Added flex-shrink-0 */}
                        <MessageInput
                            onSendMessage={handleSendMessage}
                            placeholder={t('writeReply')}
                            conversationId={chat.id}
                            senderId="current-user"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}