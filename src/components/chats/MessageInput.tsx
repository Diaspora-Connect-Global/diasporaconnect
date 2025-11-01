"use client"
import { useState, useRef, useEffect } from "react";
import { Smile, ImageIcon, Send, X } from "lucide-react";
import { ButtonType2 } from "../custom/button";


interface MessageInputProps {
    onSendMessage: (message: string, image?: string) => void;
    placeholder?: string;
    disabled?: boolean;
}



export function MessageInput({
    onSendMessage,

    placeholder = "Type a message...",
    disabled = false
}: MessageInputProps) {
    const [newMessage, setNewMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiButtonRef = useRef<HTMLButtonElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSendMessage = () => {
        if ((newMessage.trim() || imagePreview) && !disabled) {
            onSendMessage(newMessage, imagePreview || undefined);
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
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
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
        <>


            {/* Message Input */}
            <div className="border-t border-border-subtle p-4 bg-surface-default">
                <div className="flex space-x-2 items-center   justify-center">

                    <div className=" flex space-x-1">

                        {/* Image Upload Button */}
                        <div >
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={disabled}
                                className="p-2 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                                className="p-2 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Add emoji"
                            >
                                <Smile className="w-5 h-5 text-text-brand" />
                            </button>
                            {showEmojiPicker && (
                                <div className="absolute bottom-full mb-2 z-50 shadow-xl rounded-lg overflow-hidden">

                                </div>
                            )}
                        </div>

                    </div>

                    <div className={` border border-border-subtle  ${imagePreview ? "rounded-md" : "rounded-full"}  p-2 flex flex-col`}>

                        {/* Image Preview */}
                        {imagePreview && (
                            <div className=" p-4 ">
                                <div className="flex items-center justify-between ">
                                    <div className="flex items-center relative">

                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="w-16 h-16 rounded-lg object-cover"
                                        />

                                        <button
                                            onClick={removeImagePreview}
                                            className=" cursor-pointer p-1 bg-surface-brand rounded-full text-text-white transition-colors absolute -top-2 -right-2 "
                                        >
                                            <X className="w-4 h-4" />
                                        </button>


                                    </div>

                                </div>
                            </div>
                        )}

                        <div className="flex relative   ">
                            <textarea
                                ref={textareaRef}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder={disabled ? "Cannot send messages..." : placeholder}
                                disabled={disabled}
                                className="lg:w-[40rem] rounded-full px-4 py-2 focus:outline-none focus:border-text-brand resize-none bg-surface-default disabled:opacity-50 disabled:cursor-not-allowed"
                                rows={1}
                                style={{
                                    minHeight: '40px',
                                    scrollbarWidth: 'none',
                                    msOverflowStyle: 'none'
                                }}
                            />
                            <style jsx>{`
              textarea::-webkit-scrollbar {
                display: none;
              }
            `}</style>
                            {/* Send Button */}
                            <ButtonType2
                                onClick={handleSendMessage}
                                disabled={(!newMessage.trim() && !imagePreview) || disabled}
                                className="px-2 py-2 bg-text-brand text-white rounded-full hover:bg-text-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[40px]"
                            >
                                <Send className="w-5 h-5" />
                            </ButtonType2>
                        </div>


                    </div>

                    {/* Message Input */}

                </div>
            </div>
        </>
    );
}