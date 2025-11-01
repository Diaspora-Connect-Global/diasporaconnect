"use client"
import { useState, useEffect } from "react";
import { ButtonType2 } from "@/components/custom/button";
import { SquarePen } from "lucide-react";
import { useChatStore } from "@/store/ChatStore";
import DirectMessageChat from "@/components/chats/DirectMessageChat";
import GroupChat from "@/components/chats/GroupChat";



const mockChatMessages = {
    // Direct Messages
    '1': [
        { id: '1', text: 'Hey there!', senderId: '1', timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), type: 'text' as const },
        { id: '2', text: 'Hello! How are you doing?', senderId: 'current-user', timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(), type: 'text' as const },
        { id: '3', text: 'I\'m good, just working on some projects. How about you?', senderId: '1', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), type: 'text' as const },
    ],
    '2': [
        { id: '1', text: 'Meeting scheduled for tomorrow at 10 AM', senderId: '2', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), type: 'text' as const },
        { id: '2', text: 'Got it, I\'ll be there!', senderId: 'current-user', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), type: 'text' as const },
    ],
    '3': [
        { id: '1', text: 'Thanks for helping me with the project!', senderId: '3', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), type: 'text' as const },
        { id: '2', text: 'No problem, happy to help!', senderId: 'current-user', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), type: 'text' as const },
        { id: '3', text: 'Let me know if you need anything else', senderId: 'current-user', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), type: 'text' as const },
    ],
    '7': [
        { id: '1', text: 'See you at the party tonight!', senderId: '7', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), type: 'text' as const },
    ],
    '8': [
        { id: '1', text: 'The project is finally completed!', senderId: '8', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), type: 'text' as const },
    ],

    // Groups
    '4': [
        { id: '1', text: 'Final designs are ready for review', senderId: 'sarah', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), type: 'text' as const },
        { id: '2', text: 'Great work Sarah!', senderId: 'mike', timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(), type: 'text' as const },
        { id: '3', text: 'I\'ll review them this afternoon', senderId: 'current-user', timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), type: 'text' as const },
    ],
    '5': [
        { id: '1', text: 'Deadline has been updated to Friday', senderId: 'mike', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), type: 'text' as const },
        { id: '2', text: 'Thanks for the update!', senderId: 'current-user', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), type: 'text' as const },
    ],
    '6': [
        { id: '1', text: 'Game night this Friday at 7 PM!', senderId: 'alex', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), type: 'text' as const },
        { id: '2', text: 'Count me in!', senderId: 'current-user', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), type: 'text' as const },
        { id: '3', text: 'I\'ll bring the snacks!', senderId: 'sarah', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), type: 'text' as const },
    ],
    '9': [
        { id: '1', text: 'Happy birthday! 🎉', senderId: 'mom', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), type: 'text' as const },
        { id: '2', text: 'Thank you everyone!', senderId: 'current-user', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(), type: 'text' as const },
    ],
    '10': [
        { id: '1', text: 'Reunion next month - who\'s coming?', senderId: 'tom', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), type: 'text' as const },
    ],
};

// Mock chat data (same as your reference)
const mockDirectMessages = [
    {
        id: '1',
        name: 'John Doe',
        type: 'direct' as const,
        lastMessage: 'Hey, how are you doing?',
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        unread: 2,
        online: true,
        avatar: 'JD'
    },
    {
        id: '2',
        name: 'Jane Smith',
        type: 'direct' as const,
        lastMessage: 'Meeting tomorrow at 10 AM',
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        unread: 0,
        online: false,
        avatar: 'JS'
    },
    {
        id: '3',
        name: 'Mike Johnson',
        type: 'direct' as const,
        lastMessage: 'Thanks for the help!',
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        unread: 99,
        online: true,
        avatar: 'MJ'
    },
    {
        id: '7',
        name: 'Sarah Wilson',
        type: 'direct' as const,
        lastMessage: 'See you at the party!',
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        unread: 0,
        online: true,
        avatar: 'SW'
    },
    {
        id: '8',
        name: 'Alex Brown',
        type: 'direct' as const,
        lastMessage: 'The project is completed',
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        unread: 0,
        online: false,
        avatar: 'AB'
    },
];

const mockGroups = [
    {
        id: '4',
        name: 'Design Team',
        type: 'group' as const,
        lastMessage: 'Sarah: Final designs are ready',
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        unread: 5,
        memberCount: 8,
        avatar: 'DT'
    },
    {
        id: '5',
        name: 'Project Alpha',
        type: 'group' as const,
        lastMessage: 'Mike: Deadline updated to Friday',
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        unread: 0,
        memberCount: 12,
        avatar: 'PA'
    },
    {
        id: '6',
        name: 'Gaming Club',
        type: 'group' as const,
        lastMessage: 'Alex: Game night this Friday!',
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        unread: 3,
        memberCount: 25,
        avatar: 'GC'
    },
    {
        id: '9',
        name: 'Family Group',
        type: 'group' as const,
        lastMessage: 'Mom: Happy birthday!',
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        unread: 1,
        memberCount: 6,
        avatar: 'FG'
    },
    {
        id: '10',
        name: 'College Friends',
        type: 'group' as const,
        lastMessage: 'Tom: Reunion next month',
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
        unread: 0,
        memberCount: 15,
        avatar: 'CF'
    },
];



export interface Message {
    id: string;
    text: string;
    senderId: string;
    timestamp: string;
    type: 'text' | 'image' | 'file';
    imageUrl?: string;
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

function EmptyMessage() {
    return (
        <div className="flex flex-col items-center justify-center w-full h-full">
            <p className="font-body-medium my-5 text-center text-text-primary">
                You have no messages here. Start a conversation to see their messages
            </p>
            <ButtonType2 className="px-4 py-3 flex items-center">
                <SquarePen className="mr-2 h-4 w-4" />
                New message
            </ButtonType2>
        </div>
    );
}







export default function Chat() {
    const { activeChat } = useChatStore();
    const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);

    useEffect(() => {
        if (activeChat) {
            const allChats = [...mockDirectMessages, ...mockGroups];
            const chat = allChats.find(c => c.id === activeChat.id && c.type === activeChat.type);

            if (chat) {
                setChatInfo(chat);
                const chatMessages = mockChatMessages[activeChat.id as keyof typeof mockChatMessages] || [];
                setMessages(chatMessages);
            }
        } else {
            setChatInfo(null);
            setMessages([]);
        }
    }, [activeChat]);

    // const addNewMessage = (newMessage: Message) => {
    //     setMessages(prev => [...prev, newMessage]);
    // };

    if (!activeChat || !chatInfo) {
        return (
            <div className="bg-surface-default rounded-md h-full">
                <EmptyMessage />
            </div>
        );
    }

    return (
        <div className="bg-surface-default rounded-md h-full">
            {chatInfo.type === 'direct' ? (
                <DirectMessageChat
                    chat={chatInfo}
                    messages={messages}
                // You would pass addNewMessage here when implementing actual message sending
                />
            ) : (
                <GroupChat
                    chat={chatInfo}
                    messages={messages}
                // You would pass addNewMessage here when implementing actual message sending
                />
            )}
        </div>
    );
}