/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChevronRight, InfoIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MessageInput } from "./MessageInput";
import { formatDateProximity } from "@/macros/time";
import Image from "next/image";
import { ChatInfo } from "@/app/[locale]/(protected)/(main)/chat/page";
import { useChatStore } from "@/store/ChatStore";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ButtonType3 } from "../custom/button";


export default function GroupChat({ chat }: { chat: ChatInfo }) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

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

    const handleSendMessage = (messageText: string, image?: string) => {
        if (messageText.trim() || image) {
            sendMessage(chat.id, messageText, 'current-user', image ? 'image' : 'text');
        }
    };



    // Get group members with user details
    const membersWithDetails = groupMembers
        .filter(member => member.groupId === chat.id)
        .map(member => ({
            ...member,
            user: getUserById(member.userId)
        }))
        .filter(member => member.user); // Filter out members without user data

    // Helper function to get sender names for groups
    const getSenderName = (senderId: string): string => {
        const user = getUserById(senderId);
        return user?.name || 'Unknown User';
    };

    return (
        <div className="flex flex-row h-full w-full space-x-2">
            {/* Main Chat Area */}
            <div className="lg:min-w-[30rem] bg-surface-default rounded-lg border border-border-subtle flex flex-col h-full flex-1 ">
                {/* Group Header */}
                <div className="border-b border-border-subtle p-4 flex justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="relative">


                            <Avatar className="w-12 h-12">
                                <AvatarImage src={chat.avatar} alt="avator" />
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
                    <button onClick={() => setSidebarOpen(!sidebarOpen)}>
                        <InfoIcon className={`w-6 h-6 cursor-pointer  ${sidebarOpen ? "text-text-white bg-surface-brand rounded-full" : "text-text-brand "}`} />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {conversationMessages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.senderId === 'current-user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-xs lg:max-w-md ${message.senderId === 'current-user' ? 'ml-auto' : ''}`}>
                                {message.senderId !== 'current-user' && (
                                    <p className="text-xs text-text-secondary mb-1 ml-1">
                                        {getSenderName(message.senderId)}
                                    </p>
                                )}

                                {message.type === 'image' && (message as any).imageUrl ? (
                                    <div className="mb-2">
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
                                        className={`px-4 py-2 rounded-full ${message.senderId === 'current-user'
                                            ? 'bg-text-brand text-white '
                                            : 'bg-surface-brand-light text-text-primary '
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
                    conversationId={chat.id}
                    senderId="current-user"
                />
            </div>

            {/* Sidebar */}
            {sidebarOpen && (
                <div className="lg:min-w-[20rem] bg-surface-default border rounded-lg border-border-subtle flex flex-col">
                    <div className="p-4 flex-1 flex flex-col">
                        {/* Group Info */}
                        <div className="flex flex-col items-center mb-6">
                            <Avatar className="w-20 h-20">
                                <AvatarImage src={chat.avatar} alt="avatar" />
                                <AvatarFallback>U</AvatarFallback>
                            </Avatar>
                            <h4 className="font-semibold text-text-primary text-lg">{chat.name}</h4>
                        </div>

                        <div className="flex items-center justify-center mb-6">
                            <ButtonType3>
                                Edit
                            </ButtonType3>
                        </div>

                        {/* Group Members */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-3">
                                <h5 className="text-sm font-medium text-text-primary">
                                    Members
                                </h5>
                                <ButtonType3 className="text-xs py-1 px-2">
                                    Add people
                                </ButtonType3>
                            </div>
                            <div className="space-y-1  h-80 overflow-y-auto scrollbar-hide">
                                {membersWithDetails.map((member) => (
                                    <div key={member.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-surface-hover">
                                        <Avatar className="w-12 h-12">
                                            <AvatarImage src={member.user?.avatar || chat.avatar} alt="avatar" />
                                            <AvatarFallback>{member.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-text-primary truncate">
                                                {member.user?.name}
                                                {member.userId === 'current-user' && ' (You)'}
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
                    <div className="mt-auto border-t border-border-subtle p-4">
                        <div className="space-y-3">
                            <div className="text-text-danger flex justify-between items-center p-2 hover:bg-surface-hover rounded-lg cursor-pointer transition-colors">
                                <p className="text-sm">Leave Group</p>
                                <ChevronRight className="w-4 h-4" />
                            </div>

                            <div className="text-text-danger flex justify-between items-center p-2 hover:bg-surface-hover rounded-lg cursor-pointer transition-colors">
                                <p className="text-sm">Delete Group</p>
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </div>
            )}



        </div>
    );
}