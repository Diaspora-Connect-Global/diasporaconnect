"use client"
import { useState, useEffect, useRef } from "react";
import { ButtonType2 } from "@/components/custom/button";
import { SquarePen } from "lucide-react";
import { formatDateProximity } from "@/macros/time";
import { useChatStore } from "@/store/ChatStore";
import Image from "next/image";
import { MessageInput } from "@/components/chats/MessageInput";



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



interface Message {
    id: string;
    text: string;
    senderId: string;
    timestamp: string;
    type: 'text' | 'image' | 'file';
    imageUrl?: string;
}

interface ChatInfo {
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



// Direct Message Component
function DirectMessageChat({ chat, messages }: { chat: ChatInfo; messages: Message[] }) {
    const [newMessage, setNewMessage] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = () => {
        if (newMessage.trim() || imagePreview) {
            const newMsg: Message = {
                id: Date.now().toString(),
                text: newMessage,
                senderId: 'current-user',
                timestamp: new Date().toISOString(),
                type: imagePreview ? 'image' : 'text',
                imageUrl: imagePreview || undefined,
            };

            // Update messages in parent component (you'll need to pass a callback)
            // For now, we'll just log it
            console.log('New message:', newMsg);

            setNewMessage('');
            setImagePreview(null);
        }
    };

   

    return (
        <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="border-b border-border-subtle p-4 bg-surface-default">
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-text-primary">{chat.avatar}</span>
                        </div>
                        {chat.online && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-text-success border-2 border-white rounded-full" />
                        )}
                    </div>
                    <div>
                        <h2 className="font-semibold text-text-primary">{chat.name}</h2>
                        <p className="text-sm text-text-secondary">
                            {chat.online ? 'Online' : 'Last seen ' + formatDateProximity(chat.lastMessageTime)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
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
                placeholder="Type a message..."
            />
        </div>
    );
}

// Group Chat Component (similar updates as DirectMessageChat)
function GroupChat({ chat, messages }: { chat: ChatInfo; messages: Message[] }) {
    const [newMessage, setNewMessage] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = () => {
        if (newMessage.trim() || imagePreview) {
            const newMsg: Message = {
                id: Date.now().toString(),
                text: newMessage,
                senderId: 'current-user',
                timestamp: new Date().toISOString(),
                type: imagePreview ? 'image' : 'text',
                imageUrl: imagePreview || undefined,
            };

            console.log('New message:', newMsg);

            setNewMessage('');
            setImagePreview(null);
        }
    };



    return (
        <div className="flex flex-col h-full">
            {/* Group Header */}
            <div className="border-b border-border-subtle p-4 bg-surface-default">
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
                        <p className="text-sm text-text-secondary">{chat.memberCount} members</p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.senderId === 'current-user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-xs lg:max-w-md ${message.senderId === 'current-user' ? 'ml-auto' : ''}`}>
                            {message.senderId !== 'current-user' && (
                                <p className="text-xs text-text-secondary mb-1 ml-1">{getSenderName(message.senderId)}</p>
                            )}

                            {message.type === 'image' && message.imageUrl ? (
                                <div className="mb-2">
                                    <Image
                                        src={message.imageUrl}
                                        alt="Shared image"
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
            />
        </div>
    );
}

// Helper function to get sender names for groups
function getSenderName(senderId: string): string {
    const senderNames: { [key: string]: string } = {
        'sarah': 'Sarah',
        'mike': 'Mike',
        'alex': 'Alex',
        'tom': 'Tom',
        'mom': 'Mom',
        '1': 'John Doe',
        '2': 'Jane Smith',
        '3': 'Mike Johnson',
        '7': 'Sarah Wilson',
        '8': 'Alex Brown',
    };
    return senderNames[senderId] || 'Unknown';
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

    const addNewMessage = (newMessage: Message) => {
        setMessages(prev => [...prev, newMessage]);
    };

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