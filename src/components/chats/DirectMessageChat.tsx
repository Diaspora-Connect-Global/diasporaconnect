// ============================================
// DIRECT MESSAGE CHAT - MOBILE RESPONSIVE (FIXED)
// ============================================
// File: components/chats/DirectMessageChat.tsx

import { formatChatTimestamp } from "@/macros/time";
import { ChevronRight, InfoIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MessageInput } from "./MessageInput";
import Image from "next/image";
import { Message, mockUsers } from "@/data/chats";
import { useChatStore } from "@/store/ChatStore";
import { ButtonType3 } from "../custom/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ChatInfo } from "@/app/[locale]/(protected)/(main)/chat/page";
import { useTranslations } from 'next-intl';

export default function DirectMessageChat({ chat }: { chat: ChatInfo }) {
    const t = useTranslations('chat.direct');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const {
        addMessage,
        updateConversation,
        updatePreference,
        getMessagesByConversation,
        initializeFromMockData
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
        initializeFromMockData();
    }, [initializeFromMockData]);

    const handleSendMessage = (messageText: string, image?: string) => {
        if (messageText.trim() || image) {
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
            updateConversation(chat.id, {
                updatedAt: new Date().toISOString()
            });
            updatePreference(chat.id, 'current-user', {
                unreadCount: 0,
                lastReadMessageId: newMsg.id
            });

            const otherUserPreference = useChatStore.getState().preferences.find(pref =>
                pref.conversationId === chat.id && pref.userId !== 'current-user'
            );
            if (otherUserPreference) {
                updatePreference(chat.id, otherUserPreference.userId, {
                    unreadCount: otherUserPreference.unreadCount + 1
                });
            }
        }
    };

    const getUserInfo = () => {
        if (chat.type === 'direct') {
            return mockUsers.find(user => user.id === chat.id);
        }
        return null;
    };

    const userInfo = getUserInfo();

    return (
        <div className="flex flex-row h-full w-full space-x-0 md:space-x-2">
            {/* Main Chat Area */}
            <div className={`flex-1 bg-surface-default rounded-none md:rounded-lg border-0 md:border md:border-border-subtle flex flex-col h-full ${
                isMobile && sidebarOpen ? 'hidden' : 'flex'
            }`}>
                {/* Chat Header - Hidden on mobile (shown in page.tsx) */}
                <div className="hidden md:flex flex-shrink-0 border-b border-border-subtle p-4 justify-between items-center">
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
                            <p className="text-sm text-text-secondary">
                                {chat.online ? t('online') : t('lastSeen', { time: formatChatTimestamp(userInfo?.lastSeen || chat.lastMessageTime) })}
                            </p>
                        </div>
                    </div>

                    <button onClick={() => setSidebarOpen(!sidebarOpen)}>
                        <InfoIcon className={`w-6 h-6 cursor-pointer transition-colors ${
                            sidebarOpen ? "text-text-white bg-surface-brand rounded-full p-1" : "text-text-brand"
                        }`} />
                    </button>
                </div>

                {/* Mobile Info Button - Floating */}
                <button 
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="md:hidden fixed top-20 right-4 z-10 p-2.5 bg-surface-brand rounded-full shadow-lg hover:bg-surface-brand-dark transition-colors"
                >
                    <InfoIcon className="w-5 h-5 text-text-white" />
                </button>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
                    {conversationMessages.map((message, index) => (
                        <div
                            key={index}
                            className={`flex ${message.senderId === 'current-user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[85%] sm:max-w-xs lg:max-w-md ${message.senderId === 'current-user' ? 'ml-auto' : ''}`}>
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
                                        className={`px-4 py-2.5 rounded-2xl sm:rounded-full text-sm ${
                                            message.senderId === 'current-user'
                                                ? 'bg-text-brand text-white'
                                                : 'bg-surface-brand-light text-text-primary'
                                        }`}
                                    >
                                        {message.text}
                                    </div>
                                )}
                                <p className="text-xs text-text-tertiary mt-1.5 px-1 text-right">
                                    {formatChatTimestamp(message.timestamp)}
                                </p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="flex-shrink-0">
                    <MessageInput
                        onSendMessage={handleSendMessage}
                        placeholder={t('typeMessage')}
                        conversationId={chat.id}
                        senderId="current-user"
                    />
                </div>
            </div>

            {/* Sidebar - Mobile Overlay */}
            {sidebarOpen && (
                <>
                    {/* Mobile Backdrop */}
                    {isMobile && (
                        <div 
                            className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-200"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}
                    
                    {/* Sidebar Content */}
                    <div className={`
                        ${isMobile ? 'fixed inset-y-0 right-0 z-50 w-[85%] max-w-sm animate-in slide-in-from-right duration-300' : 'w-80'} 
                        bg-surface-default border-l border-border-subtle flex flex-col h-full
                        ${isMobile ? 'rounded-l-2xl shadow-2xl' : 'rounded-lg'}
                    `}>
                        {/* Mobile Close Button */}
                        {isMobile && (
                            <div className="flex justify-between items-center p-4 border-b border-border-subtle md:hidden">
                                <h3 className="font-semibold text-text-primary text-base">Profile</h3>
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto">
                            <div className="p-4">
                                {/* User Info */}
                                <div className="flex flex-col items-center mb-6">
                                    <Avatar className="w-20 h-20 mb-3">
                                        <AvatarImage src={chat.avatar} alt="avatar" />
                                        <AvatarFallback className="text-2xl">U</AvatarFallback>
                                    </Avatar>
                                    <h4 className="font-semibold text-text-primary text-lg">{chat.name}</h4>
                                    {chat.online ? (
                                        <p className="text-sm text-text-success font-medium">Online</p>
                                    ) : (
                                        <p className="text-sm text-text-secondary">
                                            Last seen {formatChatTimestamp(userInfo?.lastSeen || chat.lastMessageTime)}
                                        </p>
                                    )}
                                </div>

                                {/* View Profile Button */}
                                <div className="flex items-center justify-center mb-6">
                                    <ButtonType3 className="px-6">
                                        {t('viewProfile')}
                                    </ButtonType3>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex-shrink-0 border-t border-border-subtle p-4 bg-surface-default">
                            <div className="space-y-1">
                                <div className="text-text-danger flex justify-between items-center p-3 hover:bg-surface-hover rounded-lg cursor-pointer transition-colors">
                                    <p className="text-sm font-medium">{t('report')}</p>
                                    <ChevronRight className="w-4 h-4" />
                                </div>

                                <div className="text-text-danger flex justify-between items-center p-3 hover:bg-surface-hover rounded-lg cursor-pointer transition-colors">
                                    <p className="text-sm font-medium">{t('block')}</p>
                                    <ChevronRight className="w-4 h-4" />
                                </div>

                                <div className="text-text-danger flex justify-between items-center p-3 hover:bg-surface-hover rounded-lg cursor-pointer transition-colors">
                                    <p className="text-sm font-medium">{t('deleteConversation')}</p>
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}