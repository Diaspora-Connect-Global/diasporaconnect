'use client';

/**
 * Chat unread badge harness — the REAL app header (desktop nav + mobile bottom
 * nav) on a page that is NOT the chat page, so the suite can prove the "Chat"
 * badge is loaded app-wide. GraphQL is answered by the spec (page.route);
 * nothing here talks to a backend.
 *
 * `window.__chatUnreadHarness`:
 *   emitMessage(msg)   deliver a websocket `message:new` to every subscriber,
 *                      exactly as the socket would
 *   openChat(id)       mount the real useChatMessages for a conversation (what
 *                      opening a chat does: fetch + mark as read)
 *   closeChat()        unmount it
 */

import { useEffect, useState } from 'react';
import Header from '@/components/custom/header';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useUserStore } from '@/store/useUserStore';
import { messageService } from '@/services/websocket/messageService';
import type { Profile } from '@/services/gql/profile';

type HarnessApi = {
    emitMessage: (msg: { conversationId: string; senderId: string; messageId: string }) => void;
    openChat: (conversationId: string) => void;
    closeChat: () => void;
};

declare global {
    interface Window {
        __chatUnreadHarness?: HarnessApi;
    }
}

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000000001';

function OpenChat({ conversationId }: { conversationId: string }) {
    useChatMessages({ conversationId });
    return <p data-testid="open-chat">chat open</p>;
}

export default function ChatUnreadHarness() {
    const setUser = useUserStore((s) => s.setUser);
    const [openId, setOpenId] = useState<string | null>(null);

    useEffect(() => {
        setUser({ userId: HARNESS_USER_ID, firstName: 'Test', lastName: 'User' } as unknown as Profile);
        window.__chatUnreadHarness = {
            emitMessage: (msg) => {
                const callbacks = (messageService as unknown as {
                    messageCallbacks: Array<(m: unknown) => void>;
                }).messageCallbacks;
                callbacks.forEach((cb) =>
                    cb({ ...msg, type: 'text', timestamp: new Date().toISOString() }),
                );
            },
            openChat: (id) => setOpenId(id),
            closeChat: () => setOpenId(null),
        };
    }, [setUser]);

    return (
        <Header>
            <main style={{ padding: 16 }}>
                <p data-testid="harness-ready">Home page (not /chat)</p>
                {openId ? <OpenChat conversationId={openId} /> : null}
            </main>
        </Header>
    );
}
