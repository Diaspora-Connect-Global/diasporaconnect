'use client';

import { createContext, useContext } from 'react';

/**
 * The header's unread totals, shared with pages rendered inside it (the More
 * page rail shows the same numbers as the header icons).
 *
 * The header is the ONE place that computes them: `useChatUnread` subscribes to
 * the message socket and rewrites the conversation cache on every message, so a
 * second instance would count each new message twice. Pages read the context
 * instead of calling the hooks again.
 */
export type UnreadCounts = { notifications: number; messages: number };

const UnreadCountsContext = createContext<UnreadCounts>({ notifications: 0, messages: 0 });

export const UnreadCountsProvider = UnreadCountsContext.Provider;

export function useUnreadCounts(): UnreadCounts {
  return useContext(UnreadCountsContext);
}
