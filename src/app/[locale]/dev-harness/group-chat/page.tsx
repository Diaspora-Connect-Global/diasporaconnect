'use client';

/**
 * Group chat harness — the REAL GroupChat screen for one group, with GraphQL
 * answered by the spec (page.route); nothing here talks to a backend. Used to
 * check the private-reply entry points in their real context: the
 * "Reply privately" action, the markers under a message, the header list and
 * the side panel.
 */

import { useEffect, useState } from 'react';
import GroupChat from '@/components/chats/GroupChat';
import { useChatStore } from '@/store/ChatStore';
import { useUserStore } from '@/store/useUserStore';
import type { Profile } from '@/services/gql/profile';

const ME = '00000000-0000-4000-8000-0000000000a1';
const GROUP_ID = '00000000-0000-4000-8000-00000000a000';

export default function GroupChatHarness() {
    const setUser = useUserStore((s) => s.setUser);
    const setActiveChat = useChatStore((s) => s.setActiveChat);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        setUser({ userId: ME, firstName: 'Test', lastName: 'User' } as unknown as Profile);
        setActiveChat({ id: GROUP_ID, type: 'group' });
        setReady(true);
    }, [setUser, setActiveChat]);

    return (
        <main style={{ height: '100vh', padding: 8 }}>
            <p data-testid="harness-ready">ready</p>
            <div style={{ height: 'calc(100vh - 40px)' }}>{ready ? <GroupChat /> : null}</div>
        </main>
    );
}
