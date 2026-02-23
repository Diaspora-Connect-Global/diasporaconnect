'use client';

import { useState, useCallback } from 'react';
import { useMessageClient } from './useMessageClient';
import type { IncomingMessage, MessageSentResponse } from '../types';

interface UseConversationOptions {
  conversationId: string;
  jwtToken: string;
  currentUserId: string;
  autoMarkAsRead?: boolean;
}

export const useConversation = ({
  conversationId,
  jwtToken,
  currentUserId,
  autoMarkAsRead = true,
}: UseConversationOptions) => {
  const [messages, setMessages] = useState<IncomingMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  const {
    isConnected,
    sendMessage,
    sendMediaMessage,
    markAsRead,
  } = useMessageClient({
    jwtToken,
    currentUserId,
    onNewMessage: (message) => {
      // Only add messages from this conversation
      if (message.conversationId === conversationId) {
        setMessages((prev) => [...prev, message]);

        // Auto-mark as read if enabled
        if (autoMarkAsRead) {
          markAsRead({
            messageId: message.messageId,
            userId: currentUserId,
            conversationId: message.conversationId,
          });
        }
      }
    },
  });

  /**
   * Send a plain-text message via WebSocket.
   * Per spec, we send plaintext content — the server handles encryption.
   */
  const sendTextMessage = useCallback(
    async (
      text: string,
      replyToId?: string
    ): Promise<MessageSentResponse> => {
      setIsSending(true);
      try {
        return await sendMessage({
          conversationId,
          type: 'text',
          content: text,
          replyToId,
        });
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, sendMessage]
  );

  /**
   * Upload a media file and send the associated WebSocket notification.
   */
  const sendFile = useCallback(
    async (
      file: File,
      type: 'image' | 'video' | 'audio' | 'file'
    ): Promise<MessageSentResponse> => {
      setIsSending(true);
      try {
        return await sendMediaMessage(file, conversationId, type);
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, sendMediaMessage]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isConnected,
    isSending,
    sendTextMessage,
    sendFile,
    clearMessages,
  };
};
