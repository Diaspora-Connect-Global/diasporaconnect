/**
 * The chat screen fits a phone exactly (`/en/dev-harness/chat-shell` mounts the
 * REAL app header + bottom nav around the REAL chat route).
 *
 * The bug this guards: on an iPhone the chat page ended up "a bit bigger than
 * the screen". The layout itself always fitted; the message box was 14px on
 * phones, and iOS Safari zooms the whole page (by 16/14) whenever a text field
 * under 16px gains focus, then stays zoomed. Chromium never does that, so no
 * geometry check here can see the zoom itself — the check that does catch it is
 * the condition Safari acts on: every text field on the chat screen is at least
 * 16px at phone widths.
 *
 * Alongside it, the geometry the screen must keep: the page never scrolls in
 * either direction, and the message box sits fully on screen, above the fixed
 * bottom nav, not under it (the messages scroll inside their own pane).
 *
 * Checked at a small (360x640) and a common (390x844) phone, for the
 * conversation list, a group chat and a direct chat, plus the private-reply
 * people picker. GraphQL is answered by a small in-memory server; nothing here
 * talks to a backend.
 */
import { test, expect, type Browser, type Page, type Route } from '@playwright/test';
import { openBrowser } from '../support/browser';

const HARNESS = '/en/dev-harness/chat-shell';
const ME = '00000000-0000-4000-8000-0000000000a1';
const AMA = '00000000-0000-4000-8000-0000000000b2';
const GROUP_ID = '00000000-0000-4000-8000-00000000a000';
const GROUP_CONV = '00000000-0000-4000-8000-00000000c000';
const DIRECT_CONV = '00000000-0000-4000-8000-00000000c111';

const VIEWPORTS = [
    { width: 360, height: 640 },
    { width: 390, height: 844 },
];
const VIEWS = {
    list: HARNESS,
    group: `${HARNESS}?ct=group&gid=${GROUP_ID}`,
    direct: `${HARNESS}?ct=direct&with=${AMA}`,
} as const;

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser.close();
});

const person = (userId: string, firstName: string, lastName: string) => ({
    __typename: 'ProfileSummary',
    userId,
    firstName,
    lastName,
    email: null,
    avatarUrl: null,
    sector: null,
    trustScore: null,
    trustTier: null,
});

/** Enough messages to overflow any phone, plus one long unbroken URL. */
function messages(conversationId: string) {
    return Array.from({ length: 30 }, (_, i) => ({
        __typename: 'Message',
        id: `00000000-0000-4000-8000-${(0xd000 + i).toString(16).padStart(12, '0')}`,
        conversationId,
        senderId: i % 2 ? ME : AMA,
        type: 'TEXT',
        content:
            i === 3
                ? `https://example.com/a/very/long/unbroken/link/${'x'.repeat(80)}`
                : `Message ${i}: long enough to wrap onto a second line on a phone screen.`,
        mentions: [],
        replyToId: null,
        attachments: [],
        isEdited: false,
        editedAt: null,
        isDeleted: false,
        createdAt: new Date(Date.UTC(2026, 8, 28, 9, i)).toISOString(),
    }));
}

async function fakeServer(route: Route) {
    const body = route.request().postDataJSON() as { query?: string; variables?: Record<string, unknown> };
    const q = body?.query ?? '';
    const ok = (data: unknown) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data }) });
    const conversation = (id: string, type: 'GROUP' | 'DIRECT', groupId: string | null) => ({
        __typename: 'Conversation',
        id,
        type,
        groupId,
        participantIds: [ME, AMA],
        participantCount: 2,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
        lastMessageAt: '2026-09-28T09:00:00.000Z',
        lastMessage: null,
        unreadCount: 1,
        isActive: true,
    });
    if (q.includes('getConversations')) {
        return ok({ getConversations: [conversation(GROUP_CONV, 'GROUP', GROUP_ID), conversation(DIRECT_CONV, 'DIRECT', null)] });
    }
    if (q.includes('getMessages')) {
        const cid = String(body.variables?.conversationId ?? GROUP_CONV);
        return ok({ getMessages: { __typename: 'MessageListResponse', messages: messages(cid), total: 30, hasMore: false } });
    }
    if (q.includes('getMyGroups')) {
        return ok({
            getMyGroups: {
                __typename: 'GroupsResponse',
                success: true,
                message: 'ok',
                total: 1,
                groups: [{ __typename: 'Group', id: GROUP_ID, name: 'Accra Techies', description: '', privacy: 'PUBLIC', memberCount: 2, ownerId: ME, createdAt: '2026-09-01T00:00:00.000Z', avatarUrl: null }],
            },
        });
    }
    if (q.includes('getConnections')) {
        return ok({
            getConnections: {
                __typename: 'ConnectionsResponse',
                success: true,
                message: 'ok',
                connections: [
                    {
                        __typename: 'Connection',
                        id: 'conn-1',
                        requesterId: ME,
                        receiverId: AMA,
                        status: 'ACCEPTED',
                        createdAt: '2026-09-01T00:00:00.000Z',
                        acceptedAt: '2026-09-01T00:00:00.000Z',
                        requester: person(ME, 'Test', 'User'),
                        receiver: person(AMA, 'Ama', 'Mensah'),
                    },
                ],
            },
        });
    }
    if (q.includes('getGroupMembers')) {
        const member = (userId: string, firstName: string, lastName: string, role: string) => ({
            __typename: 'GroupMember',
            id: `gm-${userId.slice(-4)}`,
            groupId: GROUP_ID,
            userId,
            role,
            status: 'ACTIVE',
            joinedAt: '2026-09-01T00:00:00.000Z',
            createdAt: '2026-09-01T00:00:00.000Z',
            profile: { __typename: 'MemberProfile', avatarUrl: null, firstName, lastName, residenceCountry: null, city: null, trustScore: null },
        });
        return ok({
            getGroupMembers: {
                __typename: 'GroupMembersResponse',
                success: true,
                message: 'ok',
                total: 2,
                hasMore: false,
                members: [member(ME, 'Test', 'User', 'OWNER'), member(AMA, 'Ama', 'Mensah', 'MEMBER')],
            },
        });
    }
    if (q.includes('getGroup(')) {
        return ok({
            getGroup: {
                __typename: 'GroupResponse',
                success: true,
                message: 'ok',
                group: { __typename: 'Group', id: GROUP_ID, name: 'Accra Techies', description: '', avatarUrl: null, privacy: 'PUBLIC', maxMembers: 100, memberCount: 2, ownerId: ME, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' },
            },
        });
    }
    if (q.includes('myAiSummaryPreferences')) {
        return ok({ myAiSummaryPreferences: { __typename: 'AiSummaryPreferences', includeMyMessages: true, showSummaries: false } });
    }
    if (q.includes('privateReplySettings')) {
        return ok({ privateReplySettings: { __typename: 'PrivateReplySettings', maxMembers: 10, memberManagement: 'STARTER', newMembersSeeHistory: false } });
    }
    if (q.includes('myPrivateReplies')) return ok({ myPrivateReplies: [] });
    return ok(null);
}

async function open(url: string, viewport: { width: number; height: number }): Promise<Page> {
    const context = await browser.newContext({
        baseURL: test.info().project.use.baseURL,
        viewport,
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.route('**/graphql', fakeServer);
    await page.goto(url, { waitUntil: 'load' });
    await expect(page.getByTestId('harness-ready')).toBeAttached({ timeout: 90_000 });
    return page;
}

/** The page's own scroll size against the viewport, read in one go. */
function pageSize(page: Page) {
    return page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
    }));
}

/**
 * Every visible text field of the chat screen (the app header's own search is
 * not part of it) with its computed font size — anything under 16px makes iOS
 * Safari zoom the page on focus.
 */
function textFieldSizes(page: Page) {
    return page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('textarea, input'))
            .filter((el) => {
                const type = (el.getAttribute('type') ?? 'text').toLowerCase();
                if (!['text', 'search', 'email', 'tel', 'url', 'number', 'password'].includes(type) && el.tagName !== 'TEXTAREA') return false;
                if (el.closest('.h-app-top-down')) return false;
                return el.offsetWidth > 0 && el.offsetHeight > 0;
            })
            .map((el) => ({
                field: el.getAttribute('placeholder') || el.getAttribute('aria-label') || el.tagName.toLowerCase(),
                px: parseFloat(getComputedStyle(el).fontSize),
            })),
    );
}

async function expectNoZoomOnFocus(page: Page) {
    const fields = await textFieldSizes(page);
    expect(fields.length, 'the screen has at least one text field').toBeGreaterThan(0);
    for (const f of fields) {
        expect(f.px, `"${f.field}" is at least 16px, so iOS Safari does not zoom the page when it is focused`).toBeGreaterThanOrEqual(16);
    }
}

for (const viewport of VIEWPORTS) {
    for (const [view, url] of Object.entries(VIEWS)) {
        test(`${view} at ${viewport.width}x${viewport.height}: no focus zoom, the page never scrolls and the message box sits above the bottom nav`, async () => {
            const page = await open(url, viewport);
            const nav = page.getByRole('navigation').last();

            if (view === 'list') {
                await expect(page.getByText('Ama Mensah').first()).toBeVisible({ timeout: 90_000 });
            } else {
                const box = page.locator('textarea');
                await expect(box).toBeVisible({ timeout: 90_000 });
                await expect(page.getByText(/Message 29:/).first()).toBeVisible({ timeout: 90_000 });

                const b = (await box.boundingBox())!;
                const n = (await nav.boundingBox())!;
                // Fully on screen…
                expect(b.x).toBeGreaterThanOrEqual(0);
                expect(b.y).toBeGreaterThanOrEqual(0);
                expect(b.x + b.width).toBeLessThanOrEqual(viewport.width);
                expect(b.y + b.height).toBeLessThanOrEqual(viewport.height);
                // …and above the fixed bottom nav, not under it.
                expect(b.y + b.height).toBeLessThanOrEqual(n.y);
                const hit = await box.evaluate((el) => {
                    const r = el.getBoundingClientRect();
                    const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                    return at === el || el.contains(at);
                });
                expect(hit, 'the message box is the element under its own centre').toBe(true);
            }

            const size = await pageSize(page);
            expect(size.scrollWidth, 'no sideways page scroll').toBeLessThanOrEqual(size.innerWidth);
            expect(size.scrollHeight, 'no vertical page scroll').toBeLessThanOrEqual(size.innerHeight);
            await expectNoZoomOnFocus(page);
            await page.context().close();
        });
    }
}

test('private reply at 390x844: its message box and the people search do not zoom the page on focus', async () => {
    const page = await open(VIEWS.group, { width: 390, height: 844 });
    await expect(page.getByText(/Message 29:/).first()).toBeVisible({ timeout: 90_000 });

    await page.getByRole('button', { name: 'Reply privately' }).first().click();
    const panel = page.getByRole('region', { name: 'Private reply' });
    await expect(panel.locator('textarea')).toBeVisible();
    await expectNoZoomOnFocus(page);

    await panel.getByRole('button', { name: 'Add people' }).click();
    const picker = page.getByRole('dialog', { name: 'Choose people' });
    await expect(picker.getByLabel('Search group members')).toBeVisible();
    await expectNoZoomOnFocus(page);
    await page.context().close();
});
