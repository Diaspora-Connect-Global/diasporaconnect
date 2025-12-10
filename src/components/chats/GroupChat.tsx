// ============================================
// GROUP CHAT - MOBILE RESPONSIVE
// ============================================
// File: components/chats/GroupChat.tsx

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
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [repliesSidebarOpen, setRepliesSidebarOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<any>(null);
    const [replies, setReplies] = useState<Reply[]>([]);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    const {
        groupMembers,
        sendMessage,
        markAsRead,
        getMessagesByConversation,
        getUserById
    } = useChatStore();

    const conversationMessages = getMessagesByConversation(chat.id);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversationMessages]);

    useEffect(() => {
        markAsRead(chat.id);
    }, [chat.id, markAsRead]);

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

    const handleSendMessage = (messageText: string, image?: string) => {
        if (messageText.trim() || image) {
            if (replyingTo) {
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
                sendMessage(chat.id, messageText, 'current-user', image ? 'image' : 'text');
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

    const membersWithDetails = groupMembers
        .filter(member => member.groupId === chat.id)
        .map(member => ({
            ...member,
            user: getUserById(member.userId)
        }))
        .filter(member => member.user);

    const getSenderName = (senderId: string): string => {
        const user = getUserById(senderId);
        return user?.name || 'Unknown User';
    };

    const handleSideBarToggle = () => {
        setSidebarOpen(!sidebarOpen);
        setRepliesSidebarOpen(false);
    };

    return (
        <div className="flex flex-row  h-app-inner space-x-0 md:space-x-2">
            {/* Main Chat Area */}
            <div className={`flex-1 bg-surface-default rounded-none md:rounded-lg border-0 md:border md:border-border-subtle flex flex-col h-full min-h-0 ${
                isMobile && (sidebarOpen || repliesSidebarOpen) ? 'hidden' : 'flex'
            }`}>
                {/* Group Header - Hidden on mobile */}
                <div className="hidden md:flex flex-shrink-0 border-b border-border-subtle p-4 justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <Avatar className="w-12 h-12">
                                <AvatarImage src={chat.avatar} alt="avatar" />
                                <AvatarFallback>G</AvatarFallback>
                            </Avatar>
                        </div>
                        <div>
                            <h2 className="font-semibold text-text-primary">{chat.name}</h2>
                            <p className="text-sm text-text-secondary">{chat.memberCount} members</p>
                        </div>
                    </div>
                    <button onClick={handleSideBarToggle}>
                        <InfoIcon className={`w-6 h-6 cursor-pointer ${sidebarOpen ? "text-text-white bg-surface-brand rounded-full" : "text-text-brand"}`} />
                    </button>
                </div>

                {/* Mobile Info Button - Floating */}
                <button 
                    onClick={handleSideBarToggle}
                    className="md:hidden fixed top-20 right-4 z-10 p-2 bg-surface-brand rounded-full shadow-lg"
                >
                    <Menu className="w-5 h-5 text-text-white" />
                </button>

                {/* Messages Area */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
                    {conversationMessages.map((message,index) => {
                        const replyCount = getReplyCount(message.id);
                        return (
                            <div
                                key={index}
                                className={`flex ${message.senderId === 'current-user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[85%] sm:max-w-xs lg:max-w-md ${message.senderId === 'current-user' ? 'ml-auto' : ''}`}>
                                    {message.type === 'image' && (message as any).imageUrl ? (
                                        <div className="mb-2">
                                            {message.senderId !== 'current-user' && (
                                                <p className="text-[10px] sm:text-xs text-text-primary mb-1 ml-1 font-medium">
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
                                                <p className="text-xs sm:text-sm text-text-primary mt-2">{message.text}</p>
                                            )}
                                        </div>
                                    ) : (
                                        <div
                                            className={`px-3 py-2 sm:px-4 sm:py-3 rounded-2xl sm:rounded-4xl text-sm sm:text-base ${
                                                message.senderId === 'current-user'
                                                    ? 'bg-text-brand text-text-white'
                                                : 'bg-surface-success/50 text-text-primary dark:text-text-white'
                                            }`}
                                        >
                                            {message.senderId !== 'current-user' && (
                                                <p className="text-[10px] sm:text-xs mb-1 font-medium opacity-80">
                                                    {getSenderName(message.senderId)}
                                                </p>
                                            )}
                                            {message.text}
                                        </div>
                                    )}

                                    <div className="space-x-2 flex items-center justify-start mt-1">
                                        <Avatar className="w-4 h-4 sm:w-6 sm:h-6">
                                            <AvatarImage src={chat.avatar} alt="avatar" />
                                            <AvatarFallback>G</AvatarFallback>
                                        </Avatar>
                                        <p className="text-[10px] sm:text-xs text-text-tertiary">
                                            {formatChatTimestamp(message.timestamp)}
                                        </p>
                                        <button
                                            onClick={() => handleViewReplies(message)}
                                            className="flex items-center space-x-1 text-[10px] sm:text-xs text-text-brand hover:text-text-brand-dark transition-colors"
                                        >
                                            <span>
                                                {replyCount > 0 ? `${replyCount} ${t('replies')} | ` : ''}{t('reply')}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Main Message Input */}
                {!repliesSidebarOpen && (
                    <div className="flex-shrink-0">
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
                                <h3 className="font-semibold text-text-primary">Group Info</h3>
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
                                    <AvatarImage src={chat.avatar} alt="avatar" />
                                    <AvatarFallback>G</AvatarFallback>
                                </Avatar>
                                <h4 className="font-semibold text-text-primary text-base sm:text-lg mt-3">{chat.name}</h4>
                            </div>

                            <div className="flex-shrink-0 flex items-center justify-center mb-6">
                                <ButtonType3 className="text-sm">{t('edit')}</ButtonType3>
                            </div>

                            <div className="flex-1 min-h-0 mb-6">
                                <div className="flex-shrink-0 flex justify-between items-center mb-3">
                                    <h5 className="text-sm font-medium text-text-primary">{t('members')}</h5>
                                    <ButtonType3 className="text-xs py-1 px-2">{t('addPeople')}</ButtonType3>
                                </div>
                                <div className="space-y-2">
                                    {membersWithDetails.map((member) => (
                                        <div key={member.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-surface-hover">
                                            <Avatar className="w-10 h-10">
                                                <AvatarImage src={member.user?.avatar || chat.avatar} alt="avatar" />
                                                <AvatarFallback>{member.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-text-primary truncate">
                                                    {member.user?.name}
                                                    {member.userId === 'current-user' && ' (You)'}
                                                </p>
                                                <p className="text-xs text-text-secondary capitalize">
                                                    {member.role}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex-shrink-0 border-t border-border-subtle p-4">
                            <div className="space-y-2">
                                <div className="text-text-danger flex justify-between items-center p-2 hover:bg-surface-hover rounded-lg cursor-pointer">
                                    <p className="text-sm">{t('leaveGroup')}</p>
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                                <div className="text-text-danger flex justify-between items-center p-2 hover:bg-surface-hover rounded-lg cursor-pointer">
                                    <p className="text-sm">{t('deleteGroup')}</p>
                                    <ChevronRight className="w-4 h-4" />
                                </div>
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
                                        <div className="bg-surface-success/50  rounded-2xl sm:rounded-4xl px-3 py-3 sm:px-4 sm:py-4">
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
                                senderId="current-user"
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}