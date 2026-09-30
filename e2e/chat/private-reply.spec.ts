/**
 * The private-reply panel in a real browser (`/en/dev-harness/private-reply`
 * mounts the real PrivateReplyPanel). GraphQL is answered here by a small
 * in-memory double, so start → open → send → refusal → removed runs end to end
 * on the client.
 */
import { test, expect, type Browser, type Page, type Route } from '@playwright/test';
import { openBrowser } from '../support/browser';

const HARNESS = '/en/dev-harness/private-reply';
const ME = '00000000-0000-4000-8000-0000000000a1';
const AMA = '00000000-0000-4000-8000-0000000000b2';
const ESI = '00000000-0000-4000-8000-0000000000c3';
const PR = '11111111-2222-4333-8444-555555555555';
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser.close();
});

type Body = { query?: string; variables?: Record<string, unknown> };

function fakeServer(opts: { refuseSend?: string } = {}) {
    const calls: { start: Body['variables'][]; send: Body['variables'][]; markRead: string[] } = {
        start: [],
        send: [],
        markRead: [],
    };
    const privateReply = {
        __typename: 'PrivateReply',
        id: PR,
        groupConversationId: 'group-conv',
        anchor: {
            __typename: 'PrivateReplyAnchor',
            messageId: 'anchor',
            senderId: AMA,
            contentSnippet: 'Anyone going to the Accra meetup?',
            createdAt: '2026-09-28T09:00:00.000Z',
        },
        memberUserIds: [ME, AMA, ESI],
        managerUserId: ME,
        isMember: true,
        canManage: true,
        unreadCount: 0,
        createdAt: '2026-09-28T09:01:00.000Z',
        lastMessageAt: '2026-09-28T09:05:00.000Z',
    };
    const line = (id: string, at: string, kind: string, actorUserId: string, targetUserIds: string[]) => ({
        __typename: 'Message',
        id,
        conversationId: PR,
        senderId: '00000000-0000-0000-0000-000000000000',
        type: 'SYSTEM',
        content: 'People were added',
        attachments: [],
        isDeleted: false,
        createdAt: at,
        systemEvent: { __typename: 'MessageSystemEvent', kind, actorUserId, targetUserIds },
    });
    const messages = [
        line('m1', '2026-09-28T09:01:00.000Z', 'STARTED', ME, [AMA]),
        {
            __typename: 'Message',
            id: 'm2',
            conversationId: PR,
            senderId: AMA,
            type: 'TEXT',
            content: 'Yes, I can drive.',
            attachments: [],
            isDeleted: false,
            createdAt: '2026-09-28T09:02:00.000Z',
            systemEvent: null,
        },
        // Esi added; then someone whose account was deleted ('') was added.
        line('m3', '2026-09-28T09:03:00.000Z', 'MEMBERS_ADDED', ME, [ESI]),
        line('m4', '2026-09-28T09:04:00.000Z', 'MEMBERS_ADDED', ME, ['']),
    ];

    async function handle(route: Route) {
        const body = route.request().postDataJSON() as Body;
        const q = body?.query ?? '';
        const reply = (payload: unknown) =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
        if (q.includes('startPrivateReply')) {
            calls.start.push(body.variables);
            return reply({ data: { startPrivateReply: { __typename: 'StartPrivateReplyResult', privateReply, messageId: 'first' } } });
        }
        if (q.includes('privateReply(')) return reply({ data: { privateReply } });
        if (q.includes('getMessages')) {
            return reply({ data: { getMessages: { __typename: 'MessageListResponse', messages, hasMore: false } } });
        }
        if (q.includes('sendMessage')) {
            calls.send.push(body.variables);
            if (opts.refuseSend) {
                return reply({
                    data: null,
                    errors: [{ message: 'raw server text', extensions: { code: opts.refuseSend } }],
                });
            }
            return reply({ data: { sendMessage: 'sent-1' } });
        }
        if (q.includes('markConversationAsRead')) {
            calls.markRead.push(String(body.variables?.conversationId));
            return reply({ data: { markConversationAsRead: true } });
        }
        if (q.includes('getConversations')) return reply({ data: { getConversations: [] } });
        return reply({ data: null });
    }
    return { calls, handle };
}

async function open(server: ReturnType<typeof fakeServer>, query: string): Promise<Page> {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.route('**/graphql', server.handle);
    await page.goto(`${HARNESS}${query}`, { waitUntil: 'load' });
    await expect(page.getByTestId('harness-ready')).toBeVisible();
    await page.waitForFunction(() => !!window.__privateReplyHarness);
    return page;
}

test('start: the person replied to is pre-selected, the limit is enforced, and it opens once started', async () => {
    const server = fakeServer();
    const page = await open(server, '?mode=start&max=3');
    const panel = page.getByRole('region', { name: 'Private reply' });

    await expect(panel.getByRole('heading', { name: 'Private reply to Ama Mensah' })).toBeVisible({ timeout: 60_000 });
    await expect(panel.getByText('Only Ama Mensah and you will see this.')).toBeVisible();

    // Add Esi; with a maximum of 3 (you included) Kwame can no longer be ticked.
    await panel.getByRole('button', { name: 'Add people' }).click();
    const picker = page.getByRole('dialog', { name: 'Choose people' });
    await picker.getByLabel('Esi Owusu').click();
    await expect(picker.getByLabel('Kwame Boateng')).toBeDisabled();
    // Names the platform maximum the admin set (3, the starter included), not
    // the 2 others this picker can add.
    await expect(picker.getByText('You have reached the limit of 3 people.')).toBeVisible();
    await picker.getByRole('button', { name: 'Done' }).click();
    await expect(panel.getByText('Only Ama Mensah, Esi Owusu, and you will see this.')).toBeVisible();

    await panel.getByRole('textbox').fill('Can we share a ride?');
    await panel.getByRole('textbox').press('Enter');

    await expect(page.getByTestId('harness-ready')).toHaveText(`opened:${PR}`);
    expect(server.calls.start).toHaveLength(1);
    const input = (server.calls.start[0] as { input: Record<string, unknown> }).input;
    expect(input).toMatchObject({ anchorMessageId: expect.any(String), memberUserIds: [AMA, ESI], content: 'Can we share a ride?' });
    expect(String(input.clientRequestId)).toMatch(UUID_RE);
});

test('open: membership lines read as sentences with names, and no id ever reaches the screen', async () => {
    const server = fakeServer();
    const page = await open(server, `?mode=open&id=${PR}`);
    const panel = page.getByRole('region', { name: 'Private reply' });

    await expect(panel.getByText('You started this private reply')).toBeVisible({ timeout: 60_000 });
    await expect(panel.getByText('You added Esi Owusu')).toBeVisible();
    await expect(panel.getByText('You added a former member')).toBeVisible();
    await expect(panel.getByText('Yes, I can drive.')).toBeVisible();
    await expect(panel.getByText('Only Ama Mensah, Esi Owusu, and you can see this.')).toBeVisible();
    await expect(panel.getByText('Anyone going to the Accra meetup?')).toBeVisible();

    // Opening it marks it read.
    await expect.poll(() => server.calls.markRead).toContain(PR);

    const text = await panel.innerText();
    expect(text).not.toMatch(UUID_RE);
});

test('a refusal shows its own translated message — and no generic "Something went wrong" beside it', async () => {
    const server = fakeServer({ refuseSend: 'PRIVATE_REPLY_FORBIDDEN' });
    const page = await open(server, `?mode=open&id=${PR}`);
    const panel = page.getByRole('region', { name: 'Private reply' });
    await expect(panel.getByText('Yes, I can drive.')).toBeVisible({ timeout: 60_000 });

    await panel.getByRole('textbox').fill('hello');
    await panel.getByRole('textbox').press('Enter');

    await expect(page.getByText('You cannot do that in this private reply.')).toBeVisible();
    // The app's own DOM only (page + toasts): in `next dev` the framework's
    // error overlay echoes console errors, which is not something users see.
    const appDom = page.locator('main, section[aria-label^="Notifications"]');
    await expect(appDom.getByText('Something went wrong. Please try again.')).toHaveCount(0);
    await expect(appDom.getByText('raw server text')).toHaveCount(0);
});

test('being removed closes it: the messages and the composer go away', async () => {
    const server = fakeServer();
    const page = await open(server, `?mode=open&id=${PR}`);
    const panel = page.getByRole('region', { name: 'Private reply' });
    await expect(panel.getByText('Yes, I can drive.')).toBeVisible({ timeout: 60_000 });

    await page.evaluate((id) => window.__privateReplyHarness!.removed(id), PR);

    await expect(panel.getByText('You are no longer in this private reply.')).toBeVisible();
    await expect(panel.getByText('Yes, I can drive.')).toHaveCount(0);
    await expect(panel.getByRole('textbox')).toHaveCount(0);
});
