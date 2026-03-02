"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/ChatStore";
import { messageService } from "@/services/websocket/messageService";
import type { ApiMessage } from "@/store/ChatStore";

/**
 * Connects the message WebSocket as soon as the user is authenticated,
 * and pushes every incoming message into the chat store so the UI updates
 * in real time (even if the user has another conversation or the list open).
 */
export default function MessageWebSocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const tokens = useAuthStore((s) => s.tokens);
  const accessToken = tokens?.accessToken;
  const addApiMessage = useChatStore((s) => s.addApiMessage);
  const updateApiMessageStatus = useChatStore((s) => s.updateApiMessageStatus);

  // Connect when we have a token; disconnect only when token is gone (logout).
  // We do not disconnect in effect cleanup, so the WebSocket is not closed before
  // the connection is established (avoids "WebSocket is closed before the connection
  // is established" when React re-runs effects or unmounts/remounts quickly).
  useEffect(() => {
    if (!accessToken?.trim()) {
      messageService.disconnect();
      return;
    }
    messageService.connect(accessToken);
  }, [accessToken]);

  useEffect(() => {
    const unsub = messageService.onMessage((wsMessage) => {
      const apiMsg: ApiMessage = {
        id: wsMessage.messageId,
        conversationId: wsMessage.conversationId,
        senderId: wsMessage.senderId,
        type: (wsMessage.type?.toUpperCase() as ApiMessage["type"]) || "TEXT",
        content: "[Loading message...]",
        createdAt: wsMessage.timestamp,
        mentions: wsMessage.mentions,
        replyToId: wsMessage.replyToId,
        status: "sent",
      };
      addApiMessage(apiMsg);
    });
    return unsub;
  }, [addApiMessage]);

  // Delivery/read receipts — only sender receives these; update message status (single → double check, etc.)
  useEffect(() => {
    const unsubDelivery = messageService.onMessageDelivered((data) => {
      updateApiMessageStatus(data.messageId, "delivered");
    });
    const unsubRead = messageService.onMessageRead((data) => {
      updateApiMessageStatus(data.messageId, "read");
    });
    return () => {
      unsubDelivery();
      unsubRead();
    };
  }, [updateApiMessageStatus]);

  // Another participant read the conversation — e.g. for "read by" in group chats (no-op until that UI exists)
  useEffect(() => {
    return messageService.onConversationRead((_data) => {
      // conversationId, userId — can be used to update read-by indicators when implemented
    });
  }, []);

  return <>{children}</>;
}
