'use client';

import { useState, useCallback } from 'react';
import { useMessageClient } from './useMessageClient';
import { IncomingMessage, MessageSentResponse } from '../types';

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

  const sendTextMessage = useCallback(
    async (
      text: string,
      encryptedData: { ciphertext: string; ephemeralKey: string },
      replyToId?: string
    ): Promise<MessageSentResponse> => {
      setIsSending(true);
      try {
        const response = await sendMessage({
          conversationId,
          encryptedData,
          type: 'text',
          replyToId,
        });
        return response;
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, sendMessage]
  );

  const sendFile = useCallback(
    async (
      file: File,
      encryptedData: { ciphertext: string; ephemeralKey: string },
      type: 'image' | 'video' | 'audio' | 'file'
    ): Promise<MessageSentResponse> => {
      setIsSending(true);
      try {
        const response = await sendMediaMessage(
          file,
          conversationId,
          encryptedData,
          type
        );
        return response;
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
