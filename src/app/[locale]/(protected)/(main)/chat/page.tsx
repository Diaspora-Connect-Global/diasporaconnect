// Chat.tsx
"use client"
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useChatStore } from "@/store/ChatStore";
import DirectMessageChat from "@/components/chats/DirectMessageChat";
import GroupChat from "@/components/chats/GroupChat";
import { EmptyMessage } from "@/components/chats/EmptyMessage";

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
    const router = useRouter();
    const searchParams = useSearchParams();
    const { activeChat, setActiveChat } = useChatStore();
    
    const [chatInfo, setChatInfo] = useState<ChatInfo>({
        name: "",
        id: "",
        type: 'direct',
        lastMessage: "",
        lastMessageTime: "",
        unread: 0,
        avatar: ""
    });
    const [isMobile, setIsMobile] = useState(false);

    // Get chat type from URL parameter
    const chatTypeFromUrl = searchParams.get('ct') as 'direct' | 'group' | null;

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Sync activeChat with URL parameters and sessionStorage
    useEffect(() => {
        const chatchosen = sessionStorage.getItem('activeChat');

        if (chatTypeFromUrl && chatchosen) {
            try {
                const chatchosenParsed = JSON.parse(chatchosen);

                // Only update if URL param matches sessionStorage type
                if (chatchosenParsed.type === chatTypeFromUrl) {
                    if (!activeChat || activeChat.id !== chatchosenParsed.id) {
                        setActiveChat(chatchosenParsed);
                    }
                }
            } catch (error) {
                console.error('Failed to parse activeChat from sessionStorage:', error);
                // Clear corrupted data
                sessionStorage.removeItem('activeChat');
            }
        } else if (!chatTypeFromUrl && !chatchosen) {
            // Clear active chat if no params and no session storage
            if (activeChat) {
                setActiveChat(null);
            }
        }
    }, [chatTypeFromUrl, activeChat, setActiveChat]);

    useEffect(() => {
        if (activeChat) {
            // Build chat info from the activeChat data
            // For real API conversations, the id is the user/group ID
            setChatInfo({
                id: activeChat.id,
                name: activeChat.id, // Will be resolved by child components
                type: activeChat.type,
                lastMessage: '',
                lastMessageTime: '',
                unread: 0,
                avatar: '',
            });
        } else {
            setChatInfo({
                name: "",
                id: "",
                type: 'direct',
                lastMessage: "",
                lastMessageTime: "",
                unread: 0,
                avatar: ""
            });
        }
    }, [activeChat]);

    const handleBack = () => {
        setActiveChat(null);
        sessionStorage.removeItem('activeChat');
        
        // Remove chat type param but keep tab param
        const params = new URLSearchParams(searchParams.toString());
        params.delete('ct');
        
        const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
        router.push(newUrl, { scroll: false });
    };

    if (!activeChat) {
        return (
            <div className="bg-surface-default rounded-md h-app-inner overflow-hidden">
                <EmptyMessage />
            </div>
        );
    }

    return (
        <div className="rounded-md h-app-inner overflow-hidden flex flex-col">

            
            {/* Chat content */}
            <div className="overflow-hidden h-[96%] my-auto">
                {activeChat.type === 'direct' ? (
                    <DirectMessageChat chat={chatInfo} onBack={handleBack} />
                ) : (
                    <GroupChat />
                )}
            </div>
        </div>
    );
}