"use client";

import { useEffect, useRef } from "react";
import { useApolloClient } from "@apollo/client/react";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/ChatStore";
import { messageService } from "@/services/websocket/messageService";
import type { ApiMessage } from "@/store/ChatStore";
import { GET_MESSAGES } from "@/services/gql/messaging";
import type { GetMessagesData, Message, MessageMention } from "@/services/gql/types/messaging";

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
  const apolloClient = useApolloClient();
  const tokens = useAuthStore((s) => s.tokens);
  const accessToken = tokens?.accessToken;
  const addApiMessage = useChatStore((s) => s.addApiMessage);
  const updateApiMessageStatus = useChatStore((s) => s.updateApiMessageStatus);
  const inFlightHydrationRef = useRef<Set<string>>(new Set());

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
      if (inFlightHydrationRef.current.has(wsMessage.messageId)) return;
      inFlightHydrationRef.current.add(wsMessage.messageId);

      void apolloClient
        .query<GetMessagesData>({
          query: GET_MESSAGES,
          variables: { conversationId: wsMessage.conversationId, limit: 20, offset: 0 },
          fetchPolicy: "network-only",
        })
        .then(({ data }) => {
          const matched = data?.getMessages?.messages?.find((m: Message) => m.id === wsMessage.messageId);

          const apiMsg: ApiMessage = {
            id: wsMessage.messageId,
            conversationId: wsMessage.conversationId,
            senderId: wsMessage.senderId,
            type: (matched?.type?.toUpperCase() as ApiMessage["type"]) || (wsMessage.type?.toUpperCase() as ApiMessage["type"]) || "TEXT",
            content: matched?.content || "",
            createdAt: matched?.createdAt || wsMessage.timestamp,
            mentions: matched?.mentions?.map((mn: MessageMention) => mn.userId) || wsMessage.mentions,
            replyToId: matched?.replyToId || wsMessage.replyToId,
            status: matched?.status ? (matched.status.toLowerCase() as ApiMessage["status"]) : "sent",
            attachments: matched?.attachments ?? wsMessage.attachments,
          };
          addApiMessage(apiMsg);
        })
        .catch(() => {
          const fallbackMsg: ApiMessage = {
            id: wsMessage.messageId,
            conversationId: wsMessage.conversationId,
            senderId: wsMessage.senderId,
            type: (wsMessage.type?.toUpperCase() as ApiMessage["type"]) || "TEXT",
            content: "",
            createdAt: wsMessage.timestamp,
            mentions: wsMessage.mentions,
            replyToId: wsMessage.replyToId,
            status: "sent",
            attachments: wsMessage.attachments,
          };
          addApiMessage(fallbackMsg);
        })
        .finally(() => {
          inFlightHydrationRef.current.delete(wsMessage.messageId);
        });
    });
    return unsub;
  }, [addApiMessage, apolloClient]);

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
