'use client';

/**
 * Chat shell harness — the REAL app shell (header + mobile bottom nav) around
 * the REAL chat route (its layout and its page), exactly as `/chat` composes
 * them, so the suite can check that the chat screen fits the viewport at phone
 * sizes. GraphQL is answered by the spec (page.route); nothing here talks to a
 * backend.
 *
 * The chat page reads the same query params here as on `/chat`:
 *   (none)                  the conversation list
 *   ?ct=group&gid=<uuid>    that group's conversation
 *   ?ct=direct&with=<uuid>  a direct conversation with that user (`with` is
 *                           harness-only: it seeds the sessionStorage entry the
 *                           real sidebar writes when a conversation is opened)
 */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/custom/header';
import ChatLayout from '@/app/[locale]/(protected)/(main)/chat/layout';
import ChatPage from '@/app/[locale]/(protected)/(main)/chat/page';
import { useChatStore } from '@/store/ChatStore';
import { useUserStore } from '@/store/useUserStore';
import type { Profile } from '@/services/gql/profile';

const ME = '00000000-0000-4000-8000-0000000000a1';

function Harness() {
    const params = useSearchParams();
    const setUser = useUserStore((s) => s.setUser);
    const setActiveChat = useChatStore((s) => s.setActiveChat);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        setUser({ userId: ME, firstName: 'Test', lastName: 'User' } as unknown as Profile);
        const withUser = params.get('with');
        if (params.get('ct') === 'direct' && withUser) {
            const target = { id: withUser, type: 'direct' as const };
            sessionStorage.setItem('activeChat', JSON.stringify(target));
            setActiveChat(target);
        } else if (!params.get('ct')) {
            sessionStorage.removeItem('activeChat');
            setActiveChat(null);
        }
        setReady(true);
    }, [params, setUser, setActiveChat]);

    if (!ready) return null;
    return (
        <>
            <p data-testid="harness-ready" className="sr-only">ready</p>
            <Header>
                <ChatLayout>
                    <ChatPage />
                </ChatLayout>
            </Header>
        </>
    );
}

export default function ChatShellHarness() {
    return (
        <Suspense fallback={null}>
            <Harness />
        </Suspense>
    );
}
