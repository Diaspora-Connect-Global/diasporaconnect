// Chat.tsx
"use client"
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useChatStore } from "@/store/ChatStore";
import DirectMessageChat from "@/components/chats/DirectMessageChat";
import GroupChat from "@/components/chats/GroupChat";
import { EmptyMessage } from "@/components/chats/EmptyMessage";
import { mockDirectMessages, mockGroups } from "@/data/chats";

export interface ChatInfo {
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

export default function Chat() {
    const { activeChat, setActiveChat } = useChatStore();
    const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (activeChat) {
            const allChats = [...mockDirectMessages, ...mockGroups];
            const chat = allChats.find(c => c.id === activeChat.id && c.type === activeChat.type);

            if (chat) {
                setChatInfo(chat);
            }
        } else {
            setChatInfo(null);
        }
    }, [activeChat]);

    const handleBack = () => {
        setActiveChat(null);
    };

    if (!activeChat || !chatInfo) {
        return (
            <div className="bg-surface-default rounded-md h-full overflow-hidden">
                <EmptyMessage />
            </div>
        );
    }

    return (
        <div className="rounded-md h-full overflow-hidden flex flex-col">
            {/* Mobile back button header */}
            {isMobile && (
                <div className="flex items-center gap-3 p-4 border-b border-border-subtle bg-surface-default md:hidden">
                    <button 
                        onClick={handleBack}
                        className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
                        aria-label="Back to chats"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">{chatInfo.avatar}</span>
                        </div>
                        <div>
                            <h2 className="font-semibold text-text-primary">{chatInfo.name}</h2>
                            {chatInfo.type === 'direct' && chatInfo.online && (
                                <p className="text-xs text-text-success">Online</p>
                            )}
                            {chatInfo.type === 'group' && chatInfo.memberCount && (
                                <p className="text-xs text-text-secondary">{chatInfo.memberCount} members</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Chat content */}
            <div className="flex-1 overflow-hidden">
                {chatInfo.type === 'direct' ? (
                    <DirectMessageChat chat={chatInfo} />
                ) : (
                    <GroupChat chat={chatInfo} />
                )}
            </div>
        </div>
    );
}