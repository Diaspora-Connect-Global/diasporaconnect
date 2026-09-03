"use client";

import { useEffect } from "react";
import { useMutation, useQuery } from "@apollo/client/react";

import {
    GET_CONVERSATIONS,
    GET_MESSAGES,
    MARK_CONVERSATION_AS_READ,
} from "@/services/gql/messaging";
import type {
    GetMessagesData,
    MarkConversationAsReadData,
    Message,
    MessageMention,
} from "@/services/gql/types/messaging";
import { useChatStore, type ApiMessage } from "@/store/ChatStore";

interface UseChatMessagesParams {
    conversationId: string | null;
    limit?: number;
    offset?: number;
    /** Mark the conversation as read on open. Default true. */
    markAsRead?: boolean;
}

interface UseChatMessagesResult {
    /** Refetch GraphQL message history. Wired into WebSocket onMessage listeners. */
    refetch: () => Promise<unknown>;
    loading: boolean;
}

/**
 * Fetches conversation message history via GraphQL, syncs it into the chat store,
 * and (optionally) marks the conversation as read when it opens.
 */
export function useChatMessages({
    conversationId,
    limit = 50,
    offset = 0,
    markAsRead: shouldMarkAsRead = true,
}: UseChatMessagesParams): UseChatMessagesResult {
    const setApiMessages = useChatStore((s) => s.setApiMessages);

    const { data: messagesData, refetch, loading } = useQuery<GetMessagesData>(GET_MESSAGES, {
        variables: { conversationId: conversationId || "", limit, offset },
        skip: !conversationId,
        fetchPolicy: "network-only",
    });

    const [markConversationAsRead] = useMutation<MarkConversationAsReadData>(MARK_CONVERSATION_AS_READ, {
        refetchQueries: [{ query: GET_CONVERSATIONS, variables: { limit: 100, offset: 0 } }],
    });

    // Sync GraphQL messages into the store. Handles empty results correctly
    // (the store entry for this conversation is cleared if the server returns []).
    useEffect(() => {
        if (!conversationId) return;
        const result = messagesData?.getMessages;
        if (result === undefined) return;

        const messages = result.messages ?? [];
        const firstConvId = messages[0]?.conversationId;
        // Guard against stale payloads belonging to a previously-opened conversation
        if (messages.length > 0 && firstConvId && firstConvId !== conversationId) return;

        const history = messages.map((m: Message): ApiMessage => ({
            id: m.id,
            conversationId: m.conversationId,
            senderId: m.senderId,
            type: (m.type || "TEXT").toUpperCase() as ApiMessage["type"],
            content: m.content || "",
            createdAt: m.createdAt,
            mentions: m.mentions?.map((mn: MessageMention) => mn.userId) || [],
            replyToId: m.replyToId,
            status: m.status ? (m.status.toLowerCase() as ApiMessage["status"]) : "sent",
            attachments: m.attachments ?? [],
        }));

        setApiMessages(conversationId, history);
    }, [messagesData, conversationId, setApiMessages]);

    // Mark as read on open. The mutation's refetchQueries refreshes the sidebar badges.
    useEffect(() => {
        if (!shouldMarkAsRead || !conversationId) return;
        markConversationAsRead({ variables: { conversationId } }).catch((err) => {
            console.warn("markConversationAsRead failed:", err);
        });
    }, [conversationId, shouldMarkAsRead, markConversationAsRead]);

    return { refetch, loading };
}
