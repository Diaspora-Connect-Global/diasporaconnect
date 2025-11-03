"use client"
import { useState, useEffect } from "react";

import { useChatStore } from "@/store/ChatStore";
import DirectMessageChat from "@/components/chats/DirectMessageChat";
import GroupChat from "@/components/chats/GroupChat";
import { EmptyMessage } from "@/components/chats/EmptyMessage";
import {  mockDirectMessages, mockGroups } from "@/data/chats";

export interface Message {
    id: string;
    text: string;
    senderId: string;
    timestamp: string;
    type: 'text' | 'image' | 'file';
    imageUrl?: string;
    conversationId?: string;
    status?:string;
}

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
    const { activeChat } = useChatStore();
    const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);

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

  
    // const addNewMessage = (newMessage: Message) => {
    //     setMessages(prev => [...prev, newMessage]);
    // };

    if (!activeChat || !chatInfo) {
        return (
            <div className="bg-surface-default rounded-md h-full">
                <EmptyMessage
                    />
            </div>
        );
    }

    return (
        <div className="bg-surface-default rounded-md h-full">
            {chatInfo.type === 'direct' ? (
                <DirectMessageChat
                    chat={chatInfo}
                />
            ) : (
                <GroupChat
                    chat={chatInfo}
                />
            )}
        </div>
    );
}