import { InfoIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MessageInput } from "./MessageInput";
import { formatDateProximity } from "@/macros/time";
import Image from "next/image";
import { ChatInfo, Message } from "@/app/[locale]/(protected)/(main)/chat/page";

export default function GroupChat({ chat, messages }: { chat: ChatInfo; messages: Message[] }) {
    const [newMessage, setNewMessage] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);


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
        <div className="flex flex-row h-full w-full">

            <div className="lg:min-w-[30rem] flex flex-col h-full flex-1">

                {/* Group Header */}
                <div className="border-b border-border-subtle p-4 bg-surface-default  flex justify-between">
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

                    <button onClick={() => setSidebarOpen(!sidebarOpen)}>

                        <InfoIcon className="w-5 h-5  cursor-pointer text-text-primary" />
                    </button>
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

            {/* Sidebar - Now this will show properly */}
            {sidebarOpen && (
                <div className="lg:min-w-[20rem] bg-surface-default border-l border-border-subtle">
                    <div className="p-4">
                        <h3 className="font-semibold text-text-primary">Group Info</h3>
                        {/* Sidebar content */}
                    </div>
                </div>
            )}
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
