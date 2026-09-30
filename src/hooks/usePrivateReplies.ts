'use client';

import { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import {
    MY_PRIVATE_REPLIES,
    PRIVATE_REPLY_SETTINGS,
    type MyPrivateRepliesData,
    type PrivateReply,
    type PrivateReplySettings,
    type PrivateReplySettingsData,
} from '@/services/gql/privateReplies';
import { messageService } from '@/services/websocket/messageService';

/**
 * The viewer's private replies inside one group chat, plus the platform rules.
 *
 * `available` is false until the gateway answers the settings query — before
 * the backend ships (or while it errors) the whole feature stays hidden rather
 * than showing buttons that can't work.
 *
 * Kept live by: `private_reply:updated/removed` for this group, and any
 * `message:new` from one of its private replies (unread counts).
 */
export function usePrivateReplies(groupConversationId: string | null | undefined): {
    replies: PrivateReply[];
    settings: PrivateReplySettings | null;
    available: boolean;
    refetch: () => void;
} {
    // Silent: until the gateway knows these operations they error, and the
    // feature must simply stay hidden rather than toast on every group chat.
    const { data: settingsData } = useQuery<PrivateReplySettingsData>(PRIVATE_REPLY_SETTINGS, {
        fetchPolicy: 'cache-first',
        errorPolicy: 'all',
        context: { silentErrors: true },
    });
    const settings = settingsData?.privateReplySettings ?? null;

    const { data, refetch } = useQuery<MyPrivateRepliesData>(MY_PRIVATE_REPLIES, {
        variables: { groupConversationId: groupConversationId ?? '' },
        skip: !groupConversationId || !settings,
        fetchPolicy: 'cache-and-network',
        errorPolicy: 'all',
        context: { silentErrors: true },
    });

    useEffect(() => {
        if (!groupConversationId || !settings) return;
        const refresh = () => {
            void refetch().catch(() => undefined);
        };
        const forThisGroup = (e: { parentConversationId?: string }) =>
            e?.parentConversationId === groupConversationId;
        const unsubUpdated = messageService.onPrivateReplyUpdated((e) => forThisGroup(e) && refresh());
        const unsubRemoved = messageService.onPrivateReplyRemoved((e) => forThisGroup(e) && refresh());
        const unsubMessage = messageService.onMessage((m) => forThisGroup(m) && refresh());
        return () => {
            unsubUpdated();
            unsubRemoved();
            unsubMessage();
        };
    }, [groupConversationId, settings, refetch]);

    return {
        replies: data?.myPrivateReplies ?? [],
        settings,
        available: !!settings,
        refetch: () => {
            void refetch().catch(() => undefined);
        },
    };
}
