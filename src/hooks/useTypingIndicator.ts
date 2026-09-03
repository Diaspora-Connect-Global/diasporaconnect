"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { messageService } from "@/services/websocket/messageService";

const DEFAULT_EXPIRE_MS = 5000;

interface UseTypingIndicatorParams {
    conversationId: string | null;
    /**
     * UserId to exclude from the typing set. Typically the current user, since
     * the server may echo back our own typing events.
     */
    excludeUserId?: string | null;
    /** Auto-expire typing state if no follow-up start/stop arrives. Default 5000ms. */
    expireMs?: number;
}

interface UseTypingIndicatorResult {
    /** UserIds currently typing in this conversation, excluding excludeUserId. */
    typingUserIds: Set<string>;
    /** Emit typing:start (true) or typing:stop (false) for the current user. */
    emit: (isTyping: boolean) => void;
}

/**
 * Subscribes to typing events for a conversation and exposes:
 *  - a `Set<userId>` of who's currently typing (auto-expiring after `expireMs`)
 *  - an `emit` callback to broadcast the current user's own typing state.
 *
 * In a 1:1 chat, callers can derive `otherIsTyping = typingUserIds.size > 0`.
 * In a group chat, render counts or names from the Set directly.
 */
export function useTypingIndicator({
    conversationId,
    excludeUserId,
    expireMs = DEFAULT_EXPIRE_MS,
}: UseTypingIndicatorParams): UseTypingIndicatorResult {
    const [typingUserIds, setTypingUserIds] = useState<Set<string>>(() => new Set());

    // Keep the latest excludeUserId reachable from inside the long-lived ws callbacks
    // without re-subscribing each time it changes (it normally doesn't).
    const excludeUserIdRef = useRef(excludeUserId);
    excludeUserIdRef.current = excludeUserId;

    useEffect(() => {
        if (!conversationId) {
            setTypingUserIds(new Set());
            return;
        }

        const timeoutsByUser = new Map<string, ReturnType<typeof setTimeout>>();

        const matches = (data: { conversationId: string; userId: string }) =>
            data.conversationId === conversationId && data.userId !== excludeUserIdRef.current;

        const clearUserTimeout = (uid: string) => {
            const existing = timeoutsByUser.get(uid);
            if (existing) {
                clearTimeout(existing);
                timeoutsByUser.delete(uid);
            }
        };

        const unsubStart = messageService.onTypingStart((data) => {
            if (!matches(data)) return;
            const uid = data.userId;
            clearUserTimeout(uid);
            setTypingUserIds((prev) => {
                if (prev.has(uid)) return prev;
                const next = new Set(prev);
                next.add(uid);
                return next;
            });
            const t = setTimeout(() => {
                timeoutsByUser.delete(uid);
                setTypingUserIds((prev) => {
                    if (!prev.has(uid)) return prev;
                    const next = new Set(prev);
                    next.delete(uid);
                    return next;
                });
            }, expireMs);
            timeoutsByUser.set(uid, t);
        });

        const unsubStop = messageService.onTypingStop((data) => {
            if (!matches(data)) return;
            const uid = data.userId;
            clearUserTimeout(uid);
            setTypingUserIds((prev) => {
                if (!prev.has(uid)) return prev;
                const next = new Set(prev);
                next.delete(uid);
                return next;
            });
        });

        return () => {
            timeoutsByUser.forEach((t) => clearTimeout(t));
            timeoutsByUser.clear();
            unsubStart();
            unsubStop();
            setTypingUserIds(new Set());
        };
    }, [conversationId, expireMs]);

    const emit = useCallback(
        (isTyping: boolean) => {
            if (!conversationId) return;
            if (isTyping) messageService.emitTypingStart(conversationId);
            else messageService.emitTypingStop(conversationId);
        },
        [conversationId],
    );

    return { typingUserIds, emit };
}
