'use client';

/**
 * Private reply panel harness — the REAL PrivateReplyPanel (start and open
 * modes) with fixed group members and settings. GraphQL is answered by the
 * spec (page.route); nothing here talks to a backend.
 *
 * Query params: `?mode=start` (default) or `?mode=open&id=<privateReplyId>`,
 * `&manage=STARTER|GROUP_ADMINS|NOBODY`, `&max=<n>`.
 *
 * `window.__privateReplyHarness`:
 *   removed(id)   deliver `private_reply:removed` for that private reply, as the socket would
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PrivateReplyPanel, type PrivateReplyTarget } from '@/components/chats/privateReply/PrivateReplyPanel';
import type { PrivateReplyMemberManagement } from '@/services/gql/privateReplies';
import { messageService } from '@/services/websocket/messageService';
import { useUserStore } from '@/store/useUserStore';
import type { Profile } from '@/services/gql/profile';

const ME = '00000000-0000-4000-8000-0000000000a1';
const AMA = '00000000-0000-4000-8000-0000000000b2';
const ESI = '00000000-0000-4000-8000-0000000000c3';
const KWAME = '00000000-0000-4000-8000-0000000000d4';
const GROUP_CONVERSATION = '00000000-0000-4000-8000-0000000000e5';
const ANCHOR = '00000000-0000-4000-8000-0000000000f6';

const NAMES: Record<string, string> = { [AMA]: 'Ama Mensah', [ESI]: 'Esi Owusu', [KWAME]: 'Kwame Boateng' };

declare global {
    interface Window {
        __privateReplyHarness?: { removed: (id: string) => void };
    }
}

export default function PrivateReplyHarness() {
    const params = useSearchParams();
    const setUser = useUserStore((s) => s.setUser);
    const initial: PrivateReplyTarget = useMemo(
        () =>
            params.get('mode') === 'open'
                ? { mode: 'open', privateReplyId: params.get('id') ?? '' }
                : {
                      mode: 'start',
                      anchor: { id: ANCHOR, senderId: AMA, content: 'Anyone going to the Accra meetup?', createdAt: '2026-09-28T09:00:00.000Z' },
                      preselected: [AMA],
                  },
        [params],
    );
    const [target, setTarget] = useState<PrivateReplyTarget>(initial);
    const [opened, setOpened] = useState<string | null>(null);

    useEffect(() => {
        setUser({ userId: ME, firstName: 'Test', lastName: 'User' } as unknown as Profile);
        window.__privateReplyHarness = {
            removed: (id) => {
                const callbacks = (messageService as unknown as {
                    privateReplyRemovedCallbacks: Array<(e: unknown) => void>;
                }).privateReplyRemovedCallbacks;
                callbacks.forEach((cb) => cb({ privateReplyId: id, parentConversationId: GROUP_CONVERSATION }));
            },
        };
    }, [setUser]);

    const nameOf = useCallback((id: string) => NAMES[id] ?? null, []);
    const settings = {
        maxMembers: Number(params.get('max') ?? 3),
        memberManagement: (params.get('manage') ?? 'STARTER') as PrivateReplyMemberManagement,
        newMembersSeeHistory: false,
    };

    return (
        <main style={{ display: 'flex', height: '100vh', padding: 16 }}>
            <p data-testid="harness-ready">{opened ? `opened:${opened}` : 'ready'}</p>
            <PrivateReplyPanel
                target={target}
                groupConversationId={GROUP_CONVERSATION}
                currentUserId={ME}
                settings={settings}
                people={[AMA, ESI, KWAME].map((id) => ({ userId: id, name: NAMES[id] }))}
                isGroupAdmin={false}
                nameOf={nameOf}
                avatarOf={() => undefined}
                timeZone="UTC"
                isMobile={false}
                membersHasMore={false}
                membersLoadingMore={false}
                onLoadMoreMembers={() => undefined}
                onClose={() => undefined}
                onOpened={(id) => {
                    setOpened(id);
                    setTarget({ mode: 'open', privateReplyId: id });
                }}
                onChanged={() => undefined}
            />
        </main>
    );
}
