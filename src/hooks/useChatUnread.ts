'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import type { ApolloCache } from '@apollo/client';
import { GET_CONVERSATIONS } from '@/services/gql/messaging';
import type { GetConversationsData } from '@/services/gql/types/messaging';
import { messageService } from '@/services/websocket/messageService';
import { useUserStore } from '@/store/useUserStore';
import {
    applyIncomingMessage,
    clearConversationUnread,
    computeChatUnread,
    getViewingConversation,
    type ChatUnreadTotals,
} from '@/lib/chatUnread';

/**
 * The variables every consumer of the conversation list uses. Sharing them is
 * what makes the nav badge and the chat page read ONE Apollo cache entry.
 */
export const CONVERSATION_LIST_VARIABLES = { limit: 100, offset: 0 } as const;

/** A background refresh on focus/reconnect is skipped if the list is this fresh. */
const FOCUS_REFETCH_MIN_INTERVAL_MS = 30_000;
/** Coalesces bursts of "unknown conversation" messages into one refetch. */
const UNKNOWN_CONVERSATION_REFETCH_DEBOUNCE_MS = 1_000;

type ConversationList = GetConversationsData['getConversations'];

/** Rewrites the cached conversation list in place (no network). */
export function updateCachedConversations(
    cache: ApolloCache,
    update: (list: ConversationList) => ConversationList | readonly ConversationList[number][],
): void {
    cache.updateQuery<GetConversationsData>(
        { query: GET_CONVERSATIONS, variables: CONVERSATION_LIST_VARIABLES },
        (data) => {
            if (!data?.getConversations) return data;
            const next = update(data.getConversations);
            return next === data.getConversations ? data : { ...data, getConversations: [...next] };
        },
    );
}

/** Sets one conversation's cached unread to 0 — after the server marked it read. */
export function clearCachedUnread(cache: ApolloCache, conversationId: string): void {
    updateCachedConversations(cache, (list) => clearConversationUnread(list, conversationId));
}

/**
 * App-level chat unread totals for the nav badge (and the chat page tabs,
 * which read the same cache entry).
 *
 * Cost: ONE `getConversations` per app load (the header lives in the
 * authenticated layout, so it does not refetch per page). Live updates are
 * applied to the cache locally from websocket events — no polling. A refetch
 * happens only on reconnect, on returning to the tab (at most every 30s), and
 * when a message arrives for a conversation the list does not know yet.
 */
export function useChatUnread(): ChatUnreadTotals & { loading: boolean } {
    const client = useApolloClient();
    const currentUserId = useUserStore((s) => s.user?.userId ?? null);

    const { data, loading, refetch } = useQuery<GetConversationsData>(GET_CONVERSATIONS, {
        variables: CONVERSATION_LIST_VARIABLES,
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
    });

    const lastFetchAtRef = useRef(Date.now());
    const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const refresh = useCallback(() => {
        lastFetchAtRef.current = Date.now();
        void refetch().catch(() => undefined);
    }, [refetch]);

    // New message → bump that conversation locally; refetch only for a chat the
    // list has never seen.
    useEffect(() => {
        const unsub = messageService.onMessage((message) => {
            let unknown = false;
            updateCachedConversations(client.cache, (list) => {
                const next = applyIncomingMessage(list, message, {
                    currentUserId,
                    viewingConversationId: getViewingConversation(),
                });
                if (next === null) {
                    unknown = true;
                    return list;
                }
                return next;
            });
            if (unknown) {
                if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
                refetchTimerRef.current = setTimeout(refresh, UNKNOWN_CONVERSATION_REFETCH_DEBOUNCE_MS);
            }
        });
        return () => {
            unsub();
            if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
        };
    }, [client, currentUserId, refresh]);

    // Read on another device/tab (or via the websocket path) → clear locally.
    useEffect(
        () =>
            messageService.onConversationReadAck(({ conversationId }) => {
                clearCachedUnread(client.cache, conversationId);
            }),
        [client],
    );

    // Fallbacks for events missed while offline or in the background.
    useEffect(() => {
        const refreshIfStale = () => {
            if (Date.now() - lastFetchAtRef.current >= FOCUS_REFETCH_MIN_INTERVAL_MS) refresh();
        };
        const onVisibility = () => {
            if (document.visibilityState === 'visible') refreshIfStale();
        };
        let wasDisconnected = false;
        const unsubDisconnect = messageService.onDisconnect(() => {
            wasDisconnected = true;
        });
        const unsubConnect = messageService.onConnect(() => {
            if (wasDisconnected) refresh(); // reconnect: messages may have been missed
            wasDisconnected = false;
        });
        window.addEventListener('focus', refreshIfStale);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            unsubDisconnect();
            unsubConnect();
            window.removeEventListener('focus', refreshIfStale);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [refresh]);

    const totals = useMemo(() => computeChatUnread(data?.getConversations), [data]);
    return { ...totals, loading };
}
