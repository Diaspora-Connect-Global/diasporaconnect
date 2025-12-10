/* eslint-disable @next/next/no-img-element */
"use client"
import { useState, useRef, useEffect } from "react";
import { Smile, ImageIcon, Send, X } from "lucide-react";
import { ButtonType2 } from "../custom/button";
import { mockConversations, mockMessages, mockUserConversationPreferences } from "@/data/chats";


interface MessageInputProps {
    onSendMessage: (message: string, image?: string) => void;
    placeholder?: string;
    disabled?: boolean;
    conversationId?: string;
    senderId?: string;
    reversed?:boolean;
    reversedText?:string;
}

export default function MessageInputGlobal({
    onSendMessage,
    placeholder = "Type a message...",
    disabled = false,
    conversationId,
    senderId = 'current-user',
    reversed= true,
    reversedText="Text"
}: MessageInputProps) {
    const [newMessage, setNewMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiButtonRef = useRef<HTMLButtonElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const updateMockData = (messageText: string, image?: string) => {
        if (!conversationId) return;

        // Create new message object
        const newMessageObj = {
            id: Date.now().toString(),
            conversationId: conversationId,
            senderId: senderId,
            text: messageText,
            type: image ? 'image' as const : 'text' as const,
            timestamp: new Date().toISOString(),
            status: 'sent' as const
        };

        // Add to mockMessages array
        mockMessages.push(newMessageObj);

        // Update conversation's updatedAt timestamp
        const conversation = mockConversations.find(conv => conv.id === conversationId);
        if (conversation) {
            conversation.updatedAt = new Date().toISOString();
        }

        // Update user conversation preferences (reset unread count for current user)
        const preference = mockUserConversationPreferences.find(pref => 
            pref.conversationId === conversationId && pref.userId === senderId
        );
        if (preference) {
            preference.unreadCount = 0;
            preference.lastReadMessageId = newMessageObj.id;
        }

        // Update other users' unread counts in the conversation
        if (conversation?.type === 'direct') {
            // For direct messages, increment unread count for the other user
            const otherUserPreference = mockUserConversationPreferences.find(pref => 
                pref.conversationId === conversationId && pref.userId !== senderId
            );
            if (otherUserPreference) {
                otherUserPreference.unreadCount += 1;
            }
        } else if (conversation?.type === 'group') {
            // For group messages, increment unread count for all other members
            mockUserConversationPreferences
                .filter(pref => 
                    pref.conversationId === conversationId && 
                    pref.userId !== senderId
                )
                .forEach(pref => {
                    pref.unreadCount += 1;
                });
        }

        // Dispatch custom event to notify other components about the data update
        window.dispatchEvent(new CustomEvent('chatDataUpdated', {
            detail: { 
                conversationId, 
                newMessage: newMessageObj,
                updatedConversations: mockConversations,
                updatedPreferences: mockUserConversationPreferences
            }
        }));

        console.log('Message added to mock data:', newMessageObj);
    };

    const handleSendMessage = () => {
        if ((newMessage.trim() || imagePreview) && !disabled) {
            // Call the original onSendMessage prop
            onSendMessage(newMessage, imagePreview || undefined);
            
            // Update mock data
            updateMockData(newMessage, imagePreview || undefined);
            
            // Reset state
            setNewMessage('');
            setImagePreview(null);
            setShowEmojiPicker(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && !disabled) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && !disabled) {
            // Check file size (e.g., 5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                return;
            }

            // Check file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImagePreview = () => {
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const newHeight = Math.min(textarea.scrollHeight, 72); // 72px = 3 lines (24px per line)
            textarea.style.height = newHeight + 'px';
        }
    }, [newMessage]);

    // Close emoji picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showEmojiPicker &&
                emojiButtonRef.current &&
                !emojiButtonRef.current.contains(event.target as Node) &&
                !(event.target as Element).closest('.epr-emoji-picker')) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showEmojiPicker]);

    return (
        <div className="w-full">
            <div className={`flex ${reversed ? "flex-row-reverse" : ""} gap-2 items-end`}>
                <div className={`flex ${reversed ? "flex-row-reverse" : ""} gap-1 shrink-0 pb-1`}>
                    {/* Image Upload Button */}
                    <div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={disabled}
                            className="p-2 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-full hover:bg-surface-subtle"
                            title="Attach image"
                        >
                            <ImageIcon className="w-5 h-5 text-text-brand" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageSelect}
                            accept="image/*"
                            className="hidden"
                            disabled={disabled}
                        />
                    </div>

                    {/* Emoji Button */}
                    <div className="relative">
                        <button
                            ref={emojiButtonRef}
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            disabled={disabled}
                            className="p-2 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-full hover:bg-surface-subtle"
                            title="Add emoji"
                        >
                            <Smile className="w-5 h-5 text-text-brand" />
                        </button>
                        {showEmojiPicker && (
                            <div className="absolute bottom-full mb-2 z-50 shadow-xl rounded-lg overflow-hidden">
                                {/* Emoji picker content */}
                            </div>
                        )}
                    </div>
                </div>

                <div className={`border border-border-subtle bg-surface-default ${imagePreview ? "rounded-xl" : "rounded-xl"} px-3 py-2 flex-1 min-w-0 overflow-hidden`}>
                    {/* Image Preview */}
                    {imagePreview && (
                        <div className="mb-2">
                            <div className="relative inline-block">
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-16 h-16 rounded-lg object-cover"
                                />
                                <button
                                    onClick={removeImagePreview}
                                    className="cursor-pointer p-1 bg-surface-brand rounded-full text-text-white transition-colors absolute -top-2 -right-2 hover:bg-opacity-90"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className=" gap-2 items-center">
                        <textarea
                            ref={textareaRef}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={disabled ? "Cannot send messages..." : placeholder}
                            disabled={disabled}
                            className="flex-1 min-w-0 bg-transparent focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed text-text-primary placeholder:text-text-secondary max-h-[4.5rem]"
                            rows={1}
                            style={{ lineHeight: '1.5rem' }}
                        />
                        <style jsx>{`
                            textarea::-webkit-scrollbar {
                                display: none;
                            }
                        `}</style>
                        {/* Send Button */}
                        <div className="flex justify-end">
                        <ButtonType2
                            onClick={handleSendMessage}
                            disabled={(!newMessage.trim() && !imagePreview) || disabled}
                            className="shrink-0 px-3 py-2 bg-text-brand text-white rounded-lg hover:bg-text-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[40px]"
                        >
                            {reversed ? (
                                <>
                                    <span className="hidden lg:inline text-sm font-medium">{reversedText}</span>
                                    <Send className="lg:hidden w-3 h-3" />
                                </>
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </ButtonType2>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}