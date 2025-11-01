import { formatDateProximity } from "@/macros/time";
import { InfoIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MessageInput } from "./MessageInput";
import { ChatInfo, Message } from "@/app/[locale]/(protected)/(main)/chat/page";
import Image from "next/image";


export default function DirectMessageChat({ chat, messages }: { chat: ChatInfo; messages: Message[] }) {
    const [newMessage, setNewMessage] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [sidebarOpen, setSidebarOpen] = useState(false);
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

            console.log('New message:', newMsg);

            setNewMessage('');
            setImagePreview(null);
        }
    };

    return (
        // Change to flex-row for horizontal layout
        <div className="flex flex-row h-full w-full">
            {/* Main Chat Area */}
            <div className="lg:min-w-[30rem] flex flex-col h-full flex-1">
                {/* Chat Header */}
                <div className="border-b border-border-subtle p-4 bg-surface-default flex justify-between">
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

            {/* Sidebar - Now this will show properly */}
            {sidebarOpen && (
                <div className="lg:min-w-[20rem] bg-surface-default border-l border-border-subtle">
                    <div className="p-4">
                        <h3 className="font-semibold text-text-primary">Chat Info</h3>
                        {/* Sidebar content */}
                    </div>
                </div>
            )}

        </div>
    );
}
