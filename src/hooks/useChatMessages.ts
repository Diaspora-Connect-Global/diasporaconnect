"use client";

import { useEffect, useRef, useState } from "react";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";

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
import { messageService } from "@/services/websocket/messageService";
import { setViewingConversation } from "@/lib/chatUnread";
import { CONVERSATION_LIST_VARIABLES, clearCachedUnread } from "@/hooks/useChatUnread";

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
    /**
     * True until this conversation's FIRST history page has landed in the store
     * (or failed). Unlike `loading` it stays false on refetches and on a growing
     * page window, so a page-level loader gated on it never flashes back over a
     * chat that is already on screen.
     */
    initialLoading: boolean;
    /** Server says older messages exist beyond the loaded window. */
    hasMore: boolean;
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

    const { data: messagesData, refetch, loading, error } = useQuery<GetMessagesData>(GET_MESSAGES, {
        variables: { conversationId: conversationId || "", limit, offset },
        skip: !conversationId,
        fetchPolicy: "network-only",
    });
    // Which conversation's history has been synced into the store at least once.
    const [historyReadyFor, setHistoryReadyFor] = useState<string | null>(null);

    const client = useApolloClient();
    const [markConversationAsRead] = useMutation<MarkConversationAsReadData>(MARK_CONVERSATION_AS_READ, {
        refetchQueries: [{ query: GET_CONVERSATIONS, variables: CONVERSATION_LIST_VARIABLES }],
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
        setHistoryReadyFor(conversationId);
    }, [messagesData, conversationId, setApiMessages]);

    // Mark as read on open. The mutation's refetchQueries refreshes the sidebar badges.
    useEffect(() => {
        if (!shouldMarkAsRead || !conversationId) return;
        markConversationAsRead({ variables: { conversationId } }).catch((err) => {
            console.warn("markConversationAsRead failed:", err);
        });
    }, [conversationId, shouldMarkAsRead, markConversationAsRead]);

    // While the conversation is on screen, messages that arrive in it are read
    // too. Previously only the OPEN marked read, so a message received while the
    // chat was already open stayed unread, and re-clicking the same chat did not
    // re-run the effect above: a badge the user could not clear without leaving
    // the chat. Tells the nav badge not to count this conversation meanwhile.
    const markTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (!shouldMarkAsRead || !conversationId) return;
        setViewingConversation(conversationId);

        const markReadNow = () => {
            markConversationAsRead({
                variables: { conversationId },
                // Local clear instead of refetching the whole list per message.
                refetchQueries: [],
                update: (cache) => clearCachedUnread(cache, conversationId),
            }).catch((err) => console.warn("markConversationAsRead failed:", err));
        };
        const scheduleMarkRead = () => {
            if (markTimerRef.current) clearTimeout(markTimerRef.current);
            markTimerRef.current = setTimeout(() => {
                markTimerRef.current = null;
                markReadNow();
            }, 750); // coalesce bursts
        };

        const unsubMessage = messageService.onMessage((m) => {
            if (m.conversationId !== conversationId) return;
            if (document.visibilityState !== "visible") return; // read on return instead
            scheduleMarkRead();
        });
        // Back to the tab with this chat open: whatever arrived meanwhile is now seen.
        const onVisible = () => {
            if (document.visibilityState !== "visible") return;
            const cached = client.cache.readQuery<{ getConversations?: Array<{ id: string; unreadCount?: number | null }> }>({
                query: GET_CONVERSATIONS,
                variables: CONVERSATION_LIST_VARIABLES,
            });
            const conv = cached?.getConversations?.find((c) => c.id === conversationId);
            if ((conv?.unreadCount ?? 0) > 0) scheduleMarkRead();
        };
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            unsubMessage();
            document.removeEventListener("visibilitychange", onVisible);
            // Switching chats inside the coalescing window must not drop the
            // pending read: flush it now, or that message stays unread.
            if (markTimerRef.current) {
                clearTimeout(markTimerRef.current);
                markTimerRef.current = null;
                markReadNow();
            }
            setViewingConversation(null);
        };
    }, [conversationId, shouldMarkAsRead, markConversationAsRead, client]);

    const initialLoading = !!conversationId && historyReadyFor !== conversationId && !error;

    return { refetch, loading, initialLoading, hasMore: !!messagesData?.getMessages?.hasMore };
}
