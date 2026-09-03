"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";

import {
    CREATE_CONVERSATION,
    GET_CONVERSATIONS,
} from "@/services/gql/messaging";
import type {
    CreateConversationData,
    GetConversationsData,
} from "@/services/gql/types/messaging";
import { useChatStore } from "@/store/ChatStore";

export type ChatType = "direct" | "group";

interface UseChatConversationParams {
    /** For direct chats: the other user's ID. For group chats: the groupId. */
    chatId: string | null | undefined;
    type: ChatType;
    currentUserId: string | null | undefined;
    /**
     * All participants of the conversation INCLUDING the current user.
     * For direct: [currentUserId, otherUserId].
     * For group: every member's userId.
     * Used both as the store cache value and (with self filtered out) as mutation input.
     */
    participantIds: string[];
    /**
     * Gate the effect until prerequisites are ready. Default true.
     * Pass `groupMembers.length > 0` for group chats so we don't create before members load.
     */
    enabled?: boolean;
}

interface UseChatConversationResult {
    conversationId: string | null;
}

/**
 * Resolves (or creates) the conversation ID for a chat:
 * 1. Read from the chat store cache keyed by chatId.
 * 2. Search the GET_CONVERSATIONS list for a match.
 * 3. Otherwise call CREATE_CONVERSATION.
 *
 * Caches the result in the chat store so future opens skip the network.
 * Dedups concurrent creates per (chatId, participant set).
 */
export function useChatConversation({
    chatId,
    type,
    currentUserId,
    participantIds,
    enabled = true,
}: UseChatConversationParams): UseChatConversationResult {
    const [conversationId, setConversationId] = useState<string | null>(null);

    const getRealConversation = useChatStore((s) => s.getRealConversation);
    const setRealConversation = useChatStore((s) => s.setRealConversation);

    const [createConversation] = useMutation<CreateConversationData>(CREATE_CONVERSATION);

    const { data: conversationsData } = useQuery<GetConversationsData>(GET_CONVERSATIONS, {
        variables: { limit: 100, offset: 0 },
        skip: !chatId || !enabled,
    });

    // Dedup in-flight creates per (chatId + sorted participant set)
    const creationInFlightRef = useRef<string | null>(null);

    // Stable key for the participant set (string, safe for dep arrays)
    const participantsKey = participantIds.length
        ? [...participantIds].sort().join(",")
        : "";

    // Keep latest participantIds array available to the async closure without
    // forcing the effect to re-run on every render's new array reference.
    const participantIdsRef = useRef(participantIds);
    participantIdsRef.current = participantIds;

    useEffect(() => {
        if (!chatId || !currentUserId || !enabled) return;

        // 1. Try the store cache first
        const existing = getRealConversation(chatId);
        if (existing) {
            setConversationId(existing.conversationId);
            return;
        }

        // 2. Try resolving from the GET_CONVERSATIONS payload
        const list = conversationsData?.getConversations;
        if (list?.length) {
            const found = list.find((conv) => {
                if (type === "direct") {
                    const typeDirect = conv.type === "DIRECT" || (conv.type as string) === "direct";
                    const misclassifiedAsGroup =
                        (conv.type === "GROUP" || (conv.type as string) === "group") &&
                        (conv.groupId == null || conv.groupId === "") &&
                        (conv.participantIds?.length === 2 || conv.participantCount === 2);
                    return (typeDirect || misclassifiedAsGroup) && conv.participantIds?.includes(chatId);
                }
                // group
                const isGroup = conv.type === "GROUP" || (conv.type as string) === "group";
                return isGroup && conv.groupId === chatId;
            });

            if (found) {
                setConversationId(found.id);
                const finalParticipantIds =
                    found.participantIds?.length ? found.participantIds : participantIdsRef.current;
                setRealConversation(chatId, {
                    conversationId: found.id,
                    type: type === "direct" ? "DIRECT" : "GROUP",
                    participantIds: finalParticipantIds,
                });
                return;
            }
        }

        // 3. Create it. Dedup concurrent creates for the same (chat, participants) tuple.
        const dedupKey = `${chatId}::${participantsKey}`;
        if (creationInFlightRef.current === dedupKey) return;
        creationInFlightRef.current = dedupKey;

        const allParticipants = participantIdsRef.current;
        const otherParticipants = allParticipants.filter((id) => id !== currentUserId);

        void (async () => {
            try {
                const { data } = await createConversation({
                    variables:
                        type === "direct"
                            ? { type: "DIRECT", participantIds: otherParticipants }
                            : { type: "GROUP", participantIds: otherParticipants, groupId: chatId },
                });

                if (data?.createConversation) {
                    const convId = data.createConversation;
                    setConversationId(convId);
                    setRealConversation(chatId, {
                        conversationId: convId,
                        type: type === "direct" ? "DIRECT" : "GROUP",
                        participantIds: allParticipants,
                    });
                }
            } catch (error: unknown) {
                const err = error as { graphQLErrors?: Array<{ message?: string }> };
                const isDuplicate = err?.graphQLErrors?.some((e) =>
                    e.message?.includes("duplicate key"),
                );
                if (!isDuplicate) {
                    console.error(`Failed to create ${type} conversation:`, error);
                }
            } finally {
                creationInFlightRef.current = null;
            }
        })();
    }, [
        chatId,
        type,
        currentUserId,
        enabled,
        participantsKey,
        conversationsData,
        getRealConversation,
        setRealConversation,
        createConversation,
    ]);

    return { conversationId };
}
