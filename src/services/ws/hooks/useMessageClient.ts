'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MessageClient } from '../messageClient';
import {
  IncomingMessage,
  DeliveryStatus,
  ReadStatus,
  PresenceUpdate,
  MessageData,
  MessageSentResponse,
} from '../types';

interface UseMessageClientOptions {
  jwtToken: string;
  currentUserId: string;
  onNewMessage?: (message: IncomingMessage) => void;
  onDelivery?: (status: DeliveryStatus) => void;
  onRead?: (status: ReadStatus) => void;
  onPresenceUpdate?: (update: PresenceUpdate) => void;
  autoConnect?: boolean;
}

export const useMessageClient = ({
  jwtToken,
  currentUserId,
  onNewMessage,
  onDelivery,
  onRead,
  onPresenceUpdate,
  autoConnect = true,
}: UseMessageClientOptions) => {
  const clientRef = useRef<MessageClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!jwtToken) return;

    // Initialize client
    const client = new MessageClient(jwtToken);
    client.setCurrentUserId(currentUserId);
    clientRef.current = client;

    // Setup event listeners
    if (onNewMessage) {
      client.onNewMessage(onNewMessage);
    }

    if (onDelivery) {
      client.onDeliveryUpdate(onDelivery);
    }

    if (onRead) {
      client.onReadUpdate(onRead);
    }

    if (onPresenceUpdate) {
      client.onPresenceUpdate(onPresenceUpdate);
    }

    // Start heartbeat
    heartbeatRef.current = client.startHeartbeat(30000);

    // Track connection status
    const checkConnection = setInterval(() => {
      setIsConnected(client.isConnected());
    }, 1000);

    if (autoConnect) {
      client.connect();
    }

    // Cleanup
    return () => {
      clearInterval(checkConnection);
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      client.destroy();
    };
  }, [jwtToken, currentUserId, autoConnect]);

  // Memoized helper functions
  const sendMessage = useCallback(
    async (data: MessageData): Promise<MessageSentResponse> => {
      if (!clientRef.current) {
        throw new Error('Message client not initialized');
      }
      return clientRef.current.sendMessage(data);
    },
    []
  );

  const sendMediaMessage = useCallback(
    async (
      file: File,
      conversationId: string,
      type: 'image' | 'video' | 'audio' | 'file'
    ): Promise<MessageSentResponse> => {
      if (!clientRef.current) {
        throw new Error('Message client not initialized');
      }
      return clientRef.current.sendMediaMessage(file, conversationId, type);
    },
    []
  );

  const markAsRead = useCallback(
    (data: { messageId: string; userId: string; conversationId: string }) => {
      if (!clientRef.current) {
        throw new Error('Message client not initialized');
      }
      clientRef.current.markAsRead(data);
    },
    []
  );

  const markAsDelivered = useCallback(
    (data: { messageId: string; userId: string; conversationId: string }) => {
      if (!clientRef.current) {
        throw new Error('Message client not initialized');
      }
      clientRef.current.markAsDelivered(data);
    },
    []
  );

  const queryPresence = useCallback(async (userId: string) => {
    if (!clientRef.current) {
      throw new Error('Message client not initialized');
    }
    return clientRef.current.queryPresence(userId);
  }, []);

  const queryOnlineUsers = useCallback(async () => {
    if (!clientRef.current) {
      throw new Error('Message client not initialized');
    }
    return clientRef.current.queryOnlineUsers();
  }, []);

  return {
    client: clientRef.current,
    isConnected,
    sendMessage,
    sendMediaMessage,
    markAsRead,
    markAsDelivered,
    queryPresence,
    queryOnlineUsers,
  };
};
