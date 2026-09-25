/**
 * Pure unit tests (no browser) for the chat unread rules in src/lib/chatUnread:
 *   E2E_BASE_URL=http://x npx playwright test e2e/chat/unread.spec.ts
 * The nav badge in a real browser is covered by unread-badge.spec.ts.
 */
import { test, expect } from '@playwright/test';
import {
    applyIncomingMessage,
    clearConversationUnread,
    computeChatUnread,
    conversationKind,
    formatBadgeCount,
    listedKind,
} from '../../src/lib/chatUnread';

const ME = 'me';
const dm = { id: 'dm', type: 'DIRECT', isActive: true, unreadCount: 2 };
const group = { id: 'grp', type: 'GROUP', groupId: 'g1', isActive: true, unreadCount: 1 };
// Owner-keyed (circle) chat: GROUP with no groupId. Shown on the circles page,
// in NEITHER chat tab — it must not reach the tabs or the nav badge.
const circle = { id: 'cir', type: 'GROUP', groupId: null, participantIds: ['a', 'b'], isActive: true, unreadCount: 5 };

test.describe('computeChatUnread — one source for tabs and nav badge', () => {
    test('stuck-count repro: a chat the tabs do not list contributes nothing', () => {
        // Before: groups tab summed every GROUP-typed conversation (→ 6) while
        // the Groups list only rendered group-service groups; the circle's 5
        // could never be cleared from the chat page.
        expect(computeChatUnread([dm, group, circle])).toEqual({ direct: 2, groups: 1, total: 3 });
    });

    test('inactive DMs are not listed, so not counted', () => {
        expect(computeChatUnread([{ ...dm, isActive: false }]).total).toBe(0);
    });

    test('tolerates missing/garbage counts and lower-case types', () => {
        expect(
            computeChatUnread([
                { id: 'a', type: 'direct', unreadCount: null },
                { id: 'b', type: 'group', groupId: 'g', unreadCount: -3 },
                { id: 'c', type: 'group', groupId: 'g2', unreadCount: 4 },
            ]),
        ).toEqual({ direct: 0, groups: 4, total: 4 });
        expect(computeChatUnread(undefined).total).toBe(0);
    });

    test('classification', () => {
        expect(conversationKind(dm)).toBe('direct');
        expect(conversationKind(group)).toBe('group');
        expect(conversationKind(circle)).toBe('other');
        expect(listedKind(circle)).toBeNull();
    });
});

test.describe('live updates', () => {
    const list = [dm, group];

    test('a message from someone else bumps that conversation', () => {
        const next = applyIncomingMessage(list, { conversationId: 'grp', senderId: 'x' }, { currentUserId: ME });
        expect(computeChatUnread(next!).total).toBe(4);
    });

    test('own messages and the conversation on screen do not count', () => {
        expect(applyIncomingMessage(list, { conversationId: 'grp', senderId: ME }, { currentUserId: ME })).toBe(list);
        expect(
            applyIncomingMessage(list, { conversationId: 'grp', senderId: 'x' }, { currentUserId: ME, viewingConversationId: 'grp' }),
        ).toBe(list);
    });

    test('unknown conversation asks the caller to refetch', () => {
        expect(applyIncomingMessage(list, { conversationId: 'new', senderId: 'x' }, { currentUserId: ME })).toBeNull();
    });

    test('clearing after read', () => {
        expect(computeChatUnread(clearConversationUnread(list, 'grp'))).toEqual({ direct: 2, groups: 0, total: 2 });
        expect(clearConversationUnread(list, 'missing')).toBe(list);
    });
});

test('formatBadgeCount caps at 99+', () => {
    expect(formatBadgeCount(0)).toBe('');
    expect(formatBadgeCount(7)).toBe('7');
    expect(formatBadgeCount(99)).toBe('99');
    expect(formatBadgeCount(100)).toBe('99+');
});
