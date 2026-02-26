/* eslint-disable @next/next/no-img-element */
"use client"
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Smile, ImageIcon, Send, X } from "lucide-react";
import { ButtonType2 } from "../custom/button";
import { mockConversations, mockMessages, mockUserConversationPreferences } from "@/data/chats";
import { useTranslations } from "next-intl";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";

const TYPING_STOP_DEBOUNCE_MS = 2500;

interface MessageInputProps {
    onSendMessage: (message: string, image?: string) => void;
    placeholder?: string;
    disabled?: boolean;
    conversationId?: string;
    senderId?: string;
    /** Called when user starts or stops typing (debounced). Use to emit typing:start / typing:stop. */
    onTyping?: (isTyping: boolean) => void;
}

export function MessageInput({
    onSendMessage,
    placeholder,
    disabled = false,
    conversationId,
    senderId = 'current-user',
    onTyping,
}: MessageInputProps) {
    const t = useTranslations('chat.direct');
    const [newMessage, setNewMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiButtonRef = useRef<HTMLButtonElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const cursorAfterEmojiRef = useRef<number | null>(null);
    const hasAutoFocusedRef = useRef<string | null>(null);
    const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);
    const { resolvedTheme } = useTheme();

    const notifyTyping = useCallback((isTyping: boolean) => {
        if (!onTyping || isTypingRef.current === isTyping) return;
        isTypingRef.current = isTyping;
        onTyping(isTyping);
    }, [onTyping]);

    const inputPlaceholder = placeholder || t('typeMessage');

    const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });

    const handleEmojiClick = (emojiData: { emoji: string }) => {
        const textarea = textareaRef.current;
        const emoji = emojiData.emoji;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const before = newMessage.slice(0, start);
            const after = newMessage.slice(end);
            const next = before + emoji + after;
            setNewMessage(next);
            cursorAfterEmojiRef.current = before.length + emoji.length;
        } else {
            setNewMessage((prev) => prev + emoji);
        }
        setShowEmojiPicker(false);
    };

    useLayoutEffect(() => {
        if (!showEmojiPicker || !emojiButtonRef.current) return;
        const rect = emojiButtonRef.current.getBoundingClientRect();
        const pickerHeight = 400;
        const gap = 8;
        const top = rect.top - pickerHeight - gap;
        setPickerPosition({
            top: Math.max(8, top),
            left: Math.max(8, Math.min(rect.right - 320, window.innerWidth - 320 - 8)),
        });
    }, [showEmojiPicker]);

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
            notifyTyping(false);
            if (typingStopTimerRef.current) {
                clearTimeout(typingStopTimerRef.current);
                typingStopTimerRef.current = null;
            }
            // Only call the original onSendMessage prop - let the parent handle the logic
            onSendMessage(newMessage, imagePreview || undefined);

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

    // Auto-resize textarea (max 3 lines)
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            // Calculate line height: roughly 1.5rem per line for mobile, 1.75rem for desktop
            const isMobile = window.innerWidth < 640;
            const lineHeight = isMobile ? 24 : 28; // approximate line height in pixels
            const maxHeight = lineHeight * 3; // 3 lines max
            textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
        }
    }, [newMessage]);

    // Restore cursor position after inserting emoji
    useEffect(() => {
        const pos = cursorAfterEmojiRef.current;
        if (pos !== null && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(pos, pos);
            cursorAfterEmojiRef.current = null;
        }
    }, [newMessage]);

    // When chat is ready (conversationId set, not disabled), focus textarea so user can type immediately
    useEffect(() => {
        if (!conversationId || disabled) return;
        if (hasAutoFocusedRef.current === conversationId) return;
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.focus();
            hasAutoFocusedRef.current = conversationId;
        }
    }, [conversationId, disabled]);

    // Typing indicator: notify parent on first keystroke, debounced stop after inactivity
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNewMessage(e.target.value);
        if (!onTyping) return;
        notifyTyping(true);
        if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
        typingStopTimerRef.current = setTimeout(() => {
            typingStopTimerRef.current = null;
            notifyTyping(false);
        }, TYPING_STOP_DEBOUNCE_MS);
    }, [onTyping, notifyTyping]);

    useEffect(() => {
        return () => {
            if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
        };
    }, []);

    // Close emoji picker when clicking outside (button or floating picker)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                showEmojiPicker &&
                emojiButtonRef.current &&
                !emojiButtonRef.current.contains(event.target as Node) &&
                !(event.target as Element).closest('.emoji-picker-float') &&
                !(event.target as Element).closest('.epr-emoji-picker')
            ) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showEmojiPicker]);

    return (
        <>
            {/* Message Input */}
            <div className="border-t border-border-subtle p-2 sm:p-4 ">
                <div className="flex space-x-1 sm:space-x-2 items-center justify-center">
                    {/* Action Buttons Container */}
                    <div className="flex space-x-0.5 sm:space-x-1 flex-shrink-0">
                        {/* Image Upload Button */}
                        <div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={disabled}
                                className="p-1.5 sm:p-2 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Attach image"
                            >
                                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-text-brand" />
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

                        {/* Emoji Button - hidden on mobile, visible from sm and up */}
                        <div className="relative hidden sm:block">
                            <button
                                ref={emojiButtonRef}
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                disabled={disabled}
                                className="p-1.5 sm:p-2 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Add emoji"
                            >
                                <Smile className="w-4 h-4 sm:w-5 sm:h-5 text-text-brand" />
                            </button>
                            {showEmojiPicker &&
                                typeof document !== "undefined" &&
                                createPortal(
                                    <div
                                        className="emoji-picker-float fixed z-[9999] shadow-xl rounded-lg overflow-hidden border border-border-subtle bg-surface-default"
                                        style={{
                                            top: pickerPosition.top,
                                            left: pickerPosition.left,
                                            width: 320,
                                            height: 400,
                                        }}
                                    >
                                        <EmojiPicker
                                            onEmojiClick={handleEmojiClick}
                                            theme={resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT}
                                            width={320}
                                            height={400}
                                        />
                                    </div>,
                                    document.body
                                )}
                        </div>
                    </div>

                    {/* Input Container */}
                    <div className={`border border-border-subtle ${imagePreview ? "rounded-md" : "rounded-full"} p-1.5 sm:p-2 flex-1 flex flex-col min-w-0`}>
                        {/* Image Preview */}
                        {imagePreview && (
                            <div className="p-2 sm:p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center relative">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover"
                                        />
                                        <button
                                            onClick={removeImagePreview}
                                            className="cursor-pointer p-1 bg-surface-brand rounded-full text-text-white transition-colors absolute -top-1 -right-1 sm:-top-2 sm:-right-2"
                                        >
                                            <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Text Input and Send Button */}
                        <div className="flex items-end gap-1 sm:gap-2 relative w-full">
                            <div className="flex-1 min-w-0 relative">
                                <textarea
                                    ref={textareaRef}
                                    value={newMessage}
                                    onChange={handleInputChange}
                                    onKeyPress={handleKeyPress}
                                    placeholder={disabled ? t('cannotSend') : inputPlaceholder}
                                    disabled={disabled}
                                    className="w-full rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base leading-6 sm:leading-7 focus:outline-none focus:border-text-brand resize-none bg-surface-default disabled:opacity-50 disabled:cursor-not-allowed overflow-y-auto"
                                    rows={1}
                                    style={{ wordBreak: 'break-word' }}
                                />
                                <style jsx>{`
                                    textarea::-webkit-scrollbar {
                                        display: none;
                                    }
                                `}</style>
                            </div>
                            {/* Send Button */}
                            <ButtonType2
                                onClick={handleSendMessage}
                                disabled={(!newMessage.trim() && !imagePreview) || disabled}
                                className="flex-shrink-0 p-1.5 sm:px-2 sm:py-2 bg-text-brand text-text-white rounded-full hover:bg-text-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[32px] sm:min-w-[40px] h-[32px] sm:h-[40px]"
                            >
                                <Send className="w-4 h-4 sm:w-5 sm:h-5 text-text-white" />
                            </ButtonType2>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}