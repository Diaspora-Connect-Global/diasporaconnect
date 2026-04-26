/* eslint-disable @next/next/no-img-element */
"use client"
import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Smile, ImageIcon, Send, X, Loader2 } from "lucide-react";
import { ButtonType2, ButtonType3 } from "../custom/button";
import { mockConversations, mockMessages, mockUserConversationPreferences } from "@/data/chats";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";
import type { MentionMap } from "@/components/custom/richTextRenderer";


export interface MentionUser {
    id: string;
    name: string;
    avatarUrl?: string;
}

interface MessageInputProps {
    onSendMessage: (message: string, image?: string, mentionMap?: MentionMap) => void | Promise<void>;
    placeholder?: string;
    disabled?: boolean;
    conversationId?: string;
    senderId?: string;
    reversed?:boolean;
    reversedText?:string;
    /** When provided, enables @mention suggestions. Called with the text after @. */
    onMentionSearch?: (query: string) => Promise<MentionUser[]>;
}

export default function MessageInputGlobal({
    onSendMessage,
    placeholder = "Type a message...",
    disabled = false,
    conversationId,
    senderId = 'current-user',
    reversed= true,
    reversedText="Text",
    onMentionSearch,
}: MessageInputProps) {
    const [newMessage, setNewMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiButtonRef = useRef<HTMLButtonElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const cursorAfterEmojiRef = useRef<number | null>(null);
    const { resolvedTheme } = useTheme();

    const [mentionSuggestions, setMentionSuggestions] = useState<MentionUser[]>([]);
    const [mentionStartIndex, setMentionStartIndex] = useState(-1);
    const [insertedMentions, setInsertedMentions] = useState<MentionMap>({});
    const mentionDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

    const handleSendMessage = async () => {
        if (!(newMessage.trim() || imagePreview) || disabled || isSending) return;

        setIsSending(true);
        const mentionMapSnapshot = Object.keys(insertedMentions).length > 0 ? { ...insertedMentions } : undefined;
        try {
            await onSendMessage(newMessage, imagePreview || undefined, mentionMapSnapshot);
            updateMockData(newMessage, imagePreview || undefined);
            setNewMessage('');
            setImagePreview(null);
            setShowEmojiPicker(false);
            setInsertedMentions({});
        } finally {
            setIsSending(false);
        }
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setNewMessage(val);

        if (!onMentionSearch) return;
        const cursor = e.target.selectionStart ?? val.length;
        const before = val.slice(0, cursor);
        const match = before.match(/@(\w*)$/);
        if (match) {
            setMentionStartIndex(cursor - match[0].length);
            const query = match[1];
            clearTimeout(mentionDebounce.current);
            mentionDebounce.current = setTimeout(async () => {
                const results = await onMentionSearch(query).catch(() => [] as MentionUser[]);
                setMentionSuggestions(results);
            }, 250);
        } else {
            setMentionSuggestions([]);
        }
    };

    const handleSelectMention = (user: MentionUser) => {
        const textarea = textareaRef.current;
        const cursor = textarea?.selectionStart ?? newMessage.length;
        const before = newMessage.slice(0, mentionStartIndex);
        const after = newMessage.slice(cursor);
        // ​ delimits the mention so renderRichText regex correctly stops at multi-word names
        const inserted = `@${user.name}​ `;
        const newText = before + inserted + after;
        setNewMessage(newText);
        setInsertedMentions(prev => ({ ...prev, [user.name]: user.id }));
        setMentionSuggestions([]);
        setTimeout(() => {
            if (textarea) {
                const pos = before.length + inserted.length;
                textarea.focus();
                textarea.setSelectionRange(pos, pos);
            }
        }, 0);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && !disabled && !isSending) {
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
                    {/* Image Upload Button - input overlays button for mobile tap */}
                    <div className="relative group">
                        <ButtonType3
                            type="button"
                            disabled={disabled}
                            className="p-2 text-text-secondary group-hover:text-text-primary disabled:opacity-30 rounded-full group-hover:bg-surface-subtle pointer-events-none border-0 bg-transparent min-w-0"
                            title="Attach image"
                            aria-hidden
                        >
                            <ImageIcon className="w-5 h-5 text-text-brand" />
                        </ButtonType3>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageSelect}
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:pointer-events-none"
                            disabled={disabled}
                            title="Attach image"
                        />
                    </div>

                    {/* Emoji Button - hidden on mobile, visible from sm and up */}
                    <div className="relative hidden sm:block">
                        <ButtonType3
                            ref={emojiButtonRef}
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            disabled={disabled}
                            className="p-2 text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors rounded-full hover:bg-surface-subtle border-0 bg-transparent min-w-0"
                            title="Add emoji"
                        >
                            <Smile className="w-5 h-5 text-text-brand" />
                        </ButtonType3>
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
                                <ButtonType2
                                    onClick={removeImagePreview}
                                    className="p-1 min-w-0 rounded-full absolute -top-2 -right-2 hover:opacity-90"
                                >
                                    <X className="w-4 h-4" />
                                </ButtonType2>
                            </div>
                        </div>
                    )}

                    <div className="relative gap-2 items-center">
                        {mentionSuggestions.length > 0 && (
                            <div className="absolute bottom-full left-0 right-0 mb-1 bg-surface-default border border-border-subtle rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                                {mentionSuggestions.map(user => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        onMouseDown={e => { e.preventDefault(); handleSelectMention(user); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-subtle text-left"
                                    >
                                        {user.avatarUrl
                                            ? <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                                            : <div className="w-7 h-7 rounded-full bg-surface-subtle flex-shrink-0" />}
                                        <span className="text-sm text-text-primary truncate">{user.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        <textarea
                            ref={textareaRef}
                            value={newMessage}
                            onChange={handleTextChange}
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
                            disabled={(!newMessage.trim() && !imagePreview) || disabled || isSending}
                            className="shrink-0 px-3 py-2 bg-text-brand text-white rounded-lg hover:bg-text-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[40px]"
                        >
                            {isSending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : reversed ? (
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