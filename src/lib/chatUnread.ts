/**
 * Chat unread counts — the ONE place that decides what counts.
 *
 * The nav "Chat" badge, the chat page's "Direct messages" tab, its "Groups"
 * tab and each row's pill are all derived from the same `getConversations`
 * result (one Apollo cache entry) through these functions, so they cannot
 * disagree. Before this, the Groups tab summed every GROUP-typed conversation
 * while the Groups list only rendered group-service groups, and the nav badge
 * was a copy the chat page pushed into a store — it read 0 until the chat page
 * had been opened, and kept counting chats the user could not see.
 *
 * Counted:
 *   direct  a DIRECT conversation that is active (what the DM list renders)
 *   group   a GROUP conversation backed by a group-service group (`groupId`) —
 *           the backend lists only groups the user is still a member of
 * Not counted ("other"): GROUP conversations with no `groupId` — owner-keyed
 * chats such as circle chats, which live on the circles page with their own
 * unread pill and appear in neither chat tab.
 */

export type ChatConversationKind = 'direct' | 'group' | 'other';

export interface UnreadConversationLike {
    id: string;
    type?: string | null;
    groupId?: string | null;
    isActive?: boolean | null;
    unreadCount?: number | null;
}

export interface ChatUnreadTotals {
    direct: number;
    groups: number;
    total: number;
}

export function conversationKind(conv: UnreadConversationLike): ChatConversationKind {
    const type = String(conv.type ?? '').toUpperCase();
    if (type === 'DIRECT') return 'direct';
    if (type === 'GROUP' && conv.groupId) return 'group';
    return 'other';
}

/** Kind to show in the chat page lists; `null` when the chat lists do not render it. */
export function listedKind(conv: UnreadConversationLike): 'direct' | 'group' | null {
    const kind = conversationKind(conv);
    if (kind === 'direct') return conv.isActive === false ? null : 'direct';
    if (kind === 'group') return 'group';
    return null;
}

function unreadOf(conv: UnreadConversationLike): number {
    const n = Number(conv.unreadCount ?? 0);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function computeChatUnread(
    conversations: readonly UnreadConversationLike[] | null | undefined,
): ChatUnreadTotals {
    let direct = 0;
    let groups = 0;
    for (const conv of conversations ?? []) {
        const kind = listedKind(conv);
        if (kind === 'direct') direct += unreadOf(conv);
        else if (kind === 'group') groups += unreadOf(conv);
    }
    return { direct, groups, total: direct + groups };
}

/** Badge text: nothing for 0, "99+" above 99. */
export function formatBadgeCount(count: number): string {
    if (!Number.isFinite(count) || count <= 0) return '';
    return count > 99 ? '99+' : String(Math.floor(count));
}

export interface IncomingChatMessage {
    conversationId: string;
    senderId?: string | null;
}

/**
 * Applies a live `message:new` to the cached conversation list without a
 * network round trip. Returns:
 *   - the same array when nothing changes (own message, or the conversation is
 *     open and visible — it is being marked read),
 *   - a new array with that conversation's unread bumped by one,
 *   - `null` when the conversation is not in the list (new chat) and the
 *     caller must refetch.
 */
export function applyIncomingMessage<T extends UnreadConversationLike>(
    conversations: readonly T[],
    message: IncomingChatMessage,
    opts: { currentUserId?: string | null; viewingConversationId?: string | null },
): readonly T[] | null {
    if (!message?.conversationId) return conversations;
    if (opts.currentUserId && message.senderId === opts.currentUserId) return conversations;
    const index = conversations.findIndex((c) => c.id === message.conversationId);
    if (index === -1) return null;
    if (opts.viewingConversationId === message.conversationId) return conversations;
    const next = conversations.slice();
    next[index] = { ...next[index], unreadCount: unreadOf(next[index]) + 1 };
    return next;
}

/** Sets one conversation's unread to 0 (after it was marked read). */
export function clearConversationUnread<T extends UnreadConversationLike>(
    conversations: readonly T[],
    conversationId: string,
): readonly T[] {
    const index = conversations.findIndex((c) => c.id === conversationId);
    if (index === -1 || unreadOf(conversations[index]) === 0) return conversations;
    const next = conversations.slice();
    next[index] = { ...next[index], unreadCount: 0 };
    return next;
}

// ── Which conversation is on screen right now ────────────────────────────────
// Set by the open chat (useChatMessages). A message arriving in it is marked
// read immediately, so the badge must not count it in the meantime.

let viewingConversationId: string | null = null;

export function setViewingConversation(id: string | null): void {
    viewingConversationId = id;
}

/** The open conversation — only while the tab is actually visible. */
export function getViewingConversation(): string | null {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return null;
    return viewingConversationId;
}
