/* eslint-disable @next/next/no-img-element */
"use client"
import { useState, useRef, useEffect, useLayoutEffect, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { Smile, ImageIcon, Send, X, FileIcon, Video, Music } from "lucide-react";
import { ButtonType2 } from "../custom/button";
import { mockConversations, mockMessages, mockUserConversationPreferences } from "@/data/chats";
import { useTranslations } from "next-intl";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";
import { chatMediaContentType } from "@/services/gql/upload";
import { toast } from "sonner";

const TYPING_STOP_DEBOUNCE_MS = 2500;
const MAX_FILES = 10;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_FILE_BYTES = 10 * 1024 * 1024;   // 10MB per file

/** Accept string for chat attachments: images, video, audio, PDF, CSV, text, Office. */
const CHAT_ACCEPT = "image/*,video/*,audio/*,application/pdf,text/plain,text/csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx";

export type FileWithPreview = { file: File; preview?: string };

interface MessageInputProps {
    /** When files are sent, parent receives the File[] to upload; parent then sends message with the resulting URLs. */
    onSendMessage: (message: string, files?: File[]) => void;
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
    const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const fileInputId = useId();
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
        const filesToSend = selectedFiles.length > 0 ? selectedFiles.map((f) => f.file) : undefined;
        if ((newMessage.trim() || filesToSend?.length) && !disabled) {
            notifyTyping(false);
            if (typingStopTimerRef.current) {
                clearTimeout(typingStopTimerRef.current);
                typingStopTimerRef.current = null;
            }
            onSendMessage(newMessage, filesToSend);

            setNewMessage('');
            setSelectedFiles([]);
            setShowEmojiPicker(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && !disabled) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length || disabled) return;

        const currentTotal = selectedFiles.reduce((sum, f) => sum + f.file.size, 0);
        const next: FileWithPreview[] = [];
        let added = 0;

        for (let i = 0; i < files.length && selectedFiles.length + next.length < MAX_FILES; i++) {
            const file = files[i];
            const contentType = chatMediaContentType(file.type);
            if (contentType === "application/octet-stream") {
                toast.error(`File type not supported: ${file.name}`);
                continue;
            }
            if (file.size > MAX_FILE_BYTES) {
                toast.error(`${file.name} is too large (max 10MB per file)`);
                continue;
            }
            const newTotal = currentTotal + next.reduce((s, f) => s + f.file.size, 0) + file.size;
            if (newTotal > MAX_TOTAL_BYTES) {
                toast.error("Total attachment size would exceed 50MB");
                break;
            }
            const item: FileWithPreview = { file };
            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    setSelectedFiles((prev) => {
                        const idx = prev.findIndex((p) => p.file === file);
                        if (idx === -1) return prev;
                        const next = [...prev];
                        next[idx] = { ...next[idx], preview: ev.target?.result as string };
                        return next;
                    });
                };
                reader.readAsDataURL(file);
            } else if (file.type.startsWith("video/")) {
                const url = URL.createObjectURL(file);
                item.preview = url;
            }
            next.push(item);
            added++;
        }

        if (next.length) {
            setSelectedFiles((prev) => {
                const combined = [...prev, ...next];
                return combined.slice(0, MAX_FILES);
            });
        }
        if (added < files.length && selectedFiles.length + next.length >= MAX_FILES) {
            toast.error(`Maximum ${MAX_FILES} files allowed`);
        }
        e.target.value = "";
    };

    const removeFile = (index: number) => {
        setSelectedFiles((prev) => {
            const item = prev[index];
            if (item?.preview && item.file.type.startsWith("video/")) {
                URL.revokeObjectURL(item.preview);
            }
            return prev.filter((_, i) => i !== index);
        });
    };

    const clearAllFiles = () => {
        selectedFiles.forEach((item) => {
            if (item.preview && item.file.type.startsWith("video/")) {
                URL.revokeObjectURL(item.preview);
            }
        });
        setSelectedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
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
                        {/* Image Upload Button - label triggers file input natively for reliable desktop behavior */}
                        <div>
                            <label
                                htmlFor={fileInputId}
                                className={`inline-flex p-1.5 sm:p-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer ${disabled ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''}`}
                                title="Attach files"
                            >
                                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-text-brand" />
                            </label>
                            <input
                                id={fileInputId}
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept={CHAT_ACCEPT}
                                multiple
                                className="hidden"
                                disabled={disabled}
                                tabIndex={-1}
                                aria-hidden
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
                    <div className={`border border-border-subtle ${selectedFiles.length ? "rounded-md" : "rounded-full"} p-1.5 sm:p-2 flex-1 flex flex-col min-w-0`}>
                        {/* File previews */}
                        {selectedFiles.length > 0 && (
                            <div className="p-2 sm:p-4 flex flex-wrap gap-2">
                                {selectedFiles.map((item, index) => (
                                    <div
                                        key={`${item.file.name}-${index}`}
                                        className="relative flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-hover p-1.5 min-w-0 max-w-[120px] sm:max-w-[140px]"
                                    >
                                        {item.file.type.startsWith("image/") ? (
                                            <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 rounded overflow-hidden bg-surface-default">
                                                {item.preview ? (
                                                    <img src={item.preview} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <ImageIcon className="w-5 h-5 text-text-tertiary" />
                                                    </div>
                                                )}
                                            </div>
                                        ) : item.file.type.startsWith("video/") ? (
                                            <div className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 rounded bg-surface-default flex items-center justify-center">
                                                {item.preview ? (
                                                    <video src={item.preview} className="w-full h-full object-cover rounded" muted playsInline preload="metadata" />
                                                ) : (
                                                    <Video className="w-5 h-5 text-text-tertiary" />
                                                )}
                                            </div>
                                        ) : item.file.type.startsWith("audio/") ? (
                                            <div className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 rounded bg-surface-default flex items-center justify-center">
                                                <Music className="w-5 h-5 text-text-tertiary" />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 rounded bg-surface-default flex items-center justify-center">
                                                <FileIcon className="w-5 h-5 text-text-tertiary" />
                                            </div>
                                        )}
                                        <span className="text-xs text-text-primary truncate flex-1 min-w-0" title={item.file.name}>
                                            {item.file.name}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            className="flex-shrink-0 p-0.5 bg-surface-brand rounded-full text-text-white hover:bg-text-brand-dark transition-colors"
                                            aria-label="Remove file"
                                        >
                                            <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                        </button>
                                    </div>
                                ))}
                                {selectedFiles.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={clearAllFiles}
                                        className="text-xs text-text-brand hover:underline"
                                    >
                                        Clear all
                                    </button>
                                )}
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
                                disabled={(!newMessage.trim() && !selectedFiles.length) || disabled}
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