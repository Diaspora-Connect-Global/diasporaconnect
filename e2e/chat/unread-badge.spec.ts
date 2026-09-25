/**
 * The nav "Chat" badge in a real browser, on a page that is NOT /chat
 * (`/en/dev-harness/chat-unread` mounts the real app header). GraphQL is
 * answered here with a small in-memory server so the flow is end to end on the
 * client: load → live message → open the chat (mark read) → cleared.
 */
import { test, expect, type Browser, type Page, type Route } from '@playwright/test';
import { openBrowser } from '../support/browser';

const HARNESS = '/en/dev-harness/chat-unread';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser.close();
});

type Conv = { id: string; type: 'DIRECT' | 'GROUP'; groupId: string | null; unreadCount: number };

/** Minimal GraphQL double: getConversations + markConversationAsRead + messages. */
function fakeServer(initial: Conv[]) {
    const convs = initial.map((c) => ({ ...c }));
    const calls = { getConversations: 0, markRead: [] as string[] };
    const conversationPayload = (c: Conv) => ({
        __typename: 'Conversation',
        id: c.id,
        type: c.type,
        groupId: c.groupId,
        participantIds: [],
        participantCount: 2,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
        lastMessageAt: '2026-09-01T00:00:00.000Z',
        lastMessage: null,
        unreadCount: c.unreadCount,
        isActive: true,
    });
    async function handle(route: Route) {
        const body = route.request().postDataJSON() as { operationName?: string; query?: string; variables?: Record<string, unknown> };
        const q = body?.query ?? '';
        let data: unknown = null;
        if (q.includes('getConversations')) {
            calls.getConversations++;
            data = { getConversations: convs.map(conversationPayload) };
        } else if (q.includes('markConversationAsRead')) {
            const id = String(body.variables?.conversationId);
            calls.markRead.push(id);
            const c = convs.find((x) => x.id === id);
            if (c) c.unreadCount = 0;
            data = { markConversationAsRead: true };
        } else if (q.includes('getMessages')) {
            data = { getMessages: { __typename: 'MessageListResponse', messages: [], total: 0, hasMore: false } };
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data }) });
    }
    return {
        convs,
        calls,
        /** The server records a new unread message, as message-service would. */
        receive(id: string) {
            const c = convs.find((x) => x.id === id);
            if (c) c.unreadCount++;
        },
        handle,
    };
}

async function open(server: ReturnType<typeof fakeServer>, viewport = { width: 1280, height: 900 }): Promise<Page> {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport });
    const page = await context.newPage();
    await page.route('**/graphql', server.handle);
    await page.goto(HARNESS, { waitUntil: 'load' });
    await expect(page.getByTestId('harness-ready')).toBeVisible();
    await page.waitForFunction(() => !!window.__chatUnreadHarness);
    return page;
}

const badges = (p: Page) => p.getByTestId('chat-nav-badge');

for (const [label, viewport] of Object.entries({
    desktop: { width: 1280, height: 900 },
    mobile: { width: 390, height: 844 },
})) {
    test(`${label}: badge shows the unread total without visiting /chat, goes live, and clears after reading`, async () => {
        const server = fakeServer([
            { id: 'dm-1', type: 'DIRECT', groupId: null, unreadCount: 1 },
            { id: 'grp-1', type: 'GROUP', groupId: 'g-1', unreadCount: 2 },
            // A circle chat: not in either chat tab, so never on the Chat badge.
            { id: 'cir-1', type: 'GROUP', groupId: null, unreadCount: 7 },
        ]);
        const page = await open(server, viewport);
        const visibleBadge = badges(page).locator('visible=true').first();

        // 1) App-level load: correct total on a non-chat page, one list query.
        await expect(visibleBadge).toHaveText('3');
        expect(server.calls.getConversations).toBe(1);

        // 2) Live: a websocket message bumps the badge with no refetch.
        server.receive('grp-1');
        await page.evaluate(() =>
            window.__chatUnreadHarness!.emitMessage({ conversationId: 'grp-1', senderId: 'someone-else', messageId: 'm-1' }),
        );
        await expect(visibleBadge).toHaveText('4');
        expect(server.calls.getConversations).toBe(1);

        // Own messages never count.
        await page.evaluate(() =>
            window.__chatUnreadHarness!.emitMessage({
                conversationId: 'grp-1',
                senderId: '00000000-0000-4000-8000-000000000001',
                messageId: 'm-2',
            }),
        );
        await expect(visibleBadge).toHaveText('4');

        // 3) Open the group chat: marked read → badge drops to the DM's 1.
        await page.evaluate(() => window.__chatUnreadHarness!.openChat('grp-1'));
        await expect(visibleBadge).toHaveText('1');
        expect(server.calls.markRead).toContain('grp-1');

        // 4) A message arriving in the OPEN chat is read on arrival, never counted.
        // (Dev StrictMode may run the open-effect twice, so count from here.)
        const readsBefore = server.calls.markRead.length;
        server.receive('grp-1');
        await page.evaluate(() =>
            window.__chatUnreadHarness!.emitMessage({ conversationId: 'grp-1', senderId: 'someone-else', messageId: 'm-3' }),
        );
        await expect.poll(() => server.calls.markRead.length).toBeGreaterThan(readsBefore);
        expect(server.convs.find((c) => c.id === 'grp-1')!.unreadCount).toBe(0);
        await expect(visibleBadge).toHaveText('1');

        // 5) Read the DM → no badge at all.
        await page.evaluate(() => window.__chatUnreadHarness!.openChat('dm-1'));
        await expect.poll(() => server.calls.markRead).toContain('dm-1');
        await expect(badges(page).locator('visible=true'), JSON.stringify({ calls: server.calls, convs: server.convs })).toHaveCount(0);
        await page.context().close();
    });
}

test('caps the display at 99+', async () => {
    const server = fakeServer([{ id: 'grp-1', type: 'GROUP', groupId: 'g-1', unreadCount: 150 }]);
    const page = await open(server);
    await expect(badges(page).locator('visible=true').first()).toHaveText('99+');
    await page.context().close();
});
