/**
 * Private-reply entry points in the REAL group chat screen
 * (`/en/dev-harness/group-chat`): "Reply privately" on a message, the marker
 * under the message a private reply started from (only the viewer's own
 * private replies ever reach the client), the header list, and the side
 * panel. Plus: when the backend doesn't offer the feature, none of it shows
 * and nothing toasts.
 */
import { test, expect, type Browser, type Page, type Route } from '@playwright/test';
import { openBrowser } from '../support/browser';

const HARNESS = '/en/dev-harness/group-chat';
const ME = '00000000-0000-4000-8000-0000000000a1';
const AMA = '00000000-0000-4000-8000-0000000000b2';
const ESI = '00000000-0000-4000-8000-0000000000c3';
const GROUP_ID = '00000000-0000-4000-8000-00000000a000';
const GROUP_CONV = '00000000-0000-4000-8000-00000000c000';
const ANCHOR = '00000000-0000-4000-8000-00000000d000';
const PR = '00000000-0000-4000-8000-00000000e000';
// A member who only exists on the group's SECOND page of members (page size
// is 100 — see MEMBERS_PAGE_SIZE in GroupChat.tsx).
const PAGE2_MEMBER = '00000000-0000-4000-8000-00000000f2f2';
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser.close();
});

const member = (userId: string, firstName: string, lastName: string, role = 'MEMBER') => ({
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

/** Filler members to pad a group past the 100-per-page limit. */
function fillerMembers(count: number) {
    return Array.from({ length: count }, (_, i) =>
        member(`00000000-0000-4000-8000-f${(i + 1).toString(16).padStart(11, '0')}`, `Filler${i}`, 'Member'),
    );
}

function fakeServer(opts: {
    featureAvailable: boolean;
    /** 101 members total (100 on page 1, PAGE2_MEMBER alone on page 2) instead of the default 3. */
    manyMembers?: boolean;
    /** The viewer's one private reply also includes PAGE2_MEMBER (unresolved until paged in). */
    page2MemberInPrivateReply?: boolean;
}) {
    async function handle(route: Route) {
        const body = route.request().postDataJSON() as { query?: string; variables?: Record<string, unknown> };
        const q = body?.query ?? '';
        const ok = (data: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data }) });
        if (q.includes('privateReplySettings')) {
            if (!opts.featureAvailable) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: null, errors: [{ message: 'Cannot query field "privateReplySettings"' }] }),
                });
            }
            return ok({ privateReplySettings: { __typename: 'PrivateReplySettings', maxMembers: 10, memberManagement: 'STARTER', newMembersSeeHistory: false } });
        }
        if (q.includes('myPrivateReplies')) {
            const memberUserIds = opts.page2MemberInPrivateReply ? [ME, ESI, PAGE2_MEMBER] : [ME, ESI];
            return ok({
                myPrivateReplies: [
                    {
                        __typename: 'PrivateReply',
                        id: PR,
                        groupConversationId: GROUP_CONV,
                        anchor: { __typename: 'PrivateReplyAnchor', messageId: ANCHOR, senderId: AMA, contentSnippet: 'Anyone going to the Accra meetup?', createdAt: '2026-09-28T09:00:00.000Z' },
                        memberUserIds,
                        managerUserId: ME,
                        isMember: true,
                        canManage: true,
                        unreadCount: 2,
                        createdAt: '2026-09-28T09:01:00.000Z',
                        lastMessageAt: '2026-09-28T09:05:00.000Z',
                    },
                ],
            });
        }
        if (q.includes('privateReply(')) return ok({ privateReply: null });
        if (q.includes('getGroupMembers')) {
            if (opts.manyMembers) {
                const roster = [
                    member(ME, 'Test', 'User', 'OWNER'),
                    member(AMA, 'Ama', 'Mensah'),
                    member(ESI, 'Esi', 'Owusu'),
                    ...fillerMembers(97),
                    member(PAGE2_MEMBER, 'Zawadi', 'PageTwo'),
                ]; // 101 total: the first 100 fit on page 1, PAGE2_MEMBER is alone on page 2.
                const offset = Number(body.variables?.membersOffset ?? 0);
                const limit = Number(body.variables?.membersLimit ?? 100);
                const page = roster.slice(offset, offset + limit);
                return ok({
                    getGroupMembers: {
                        __typename: 'GroupMembersResponse',
                        success: true,
                        message: 'ok',
                        total: roster.length,
                        hasMore: offset + page.length < roster.length,
                        members: page,
                    },
                });
            }
            return ok({
                getGroupMembers: {
                    __typename: 'GroupMembersResponse',
                    success: true,
                    message: 'ok',
                    total: 3,
                    hasMore: false,
                    members: [member(ME, 'Test', 'User', 'OWNER'), member(AMA, 'Ama', 'Mensah'), member(ESI, 'Esi', 'Owusu')],
                },
            });
        }
        if (q.includes('getGroup(')) {
            return ok({
                getGroup: {
                    __typename: 'GroupResponse',
                    success: true,
                    message: 'ok',
                    group: {
                        __typename: 'Group',
                        id: GROUP_ID,
                        name: 'Accra Techies',
                        description: '',
                        avatarUrl: null,
                        privacy: 'PUBLIC',
                        maxMembers: 100,
                        memberCount: 3,
                        ownerId: ME,
                        createdAt: '2026-09-01T00:00:00.000Z',
                        updatedAt: '2026-09-01T00:00:00.000Z',
                    },
                },
            });
        }
        if (q.includes('getConversations')) {
            return ok({
                getConversations: [
                    {
                        __typename: 'Conversation',
                        id: GROUP_CONV,
                        type: 'GROUP',
                        groupId: GROUP_ID,
                        participantIds: [ME, AMA, ESI],
                        participantCount: 3,
                        createdAt: '2026-09-01T00:00:00.000Z',
                        updatedAt: '2026-09-01T00:00:00.000Z',
                        lastMessageAt: '2026-09-28T09:00:00.000Z',
                        lastMessage: null,
                        unreadCount: 2,
                        isActive: true,
                    },
                ],
            });
        }
        if (q.includes('getMessages')) {
            return ok({
                getMessages: {
                    __typename: 'MessageListResponse',
                    messages: [
                        {
                            __typename: 'Message',
                            id: ANCHOR,
                            conversationId: GROUP_CONV,
                            senderId: AMA,
                            type: 'TEXT',
                            content: 'Anyone going to the Accra meetup?',
                            mentions: [],
                            replyToId: null,
                            attachments: [],
                            isEdited: false,
                            editedAt: null,
                            isDeleted: false,
                            createdAt: '2026-09-28T09:00:00.000Z',
                        },
                    ],
                    total: 1,
                    hasMore: false,
                },
            });
        }
        if (q.includes('myAiSummaryPreferences')) {
            return ok({ myAiSummaryPreferences: { __typename: 'AiSummaryPreferences', includeMyMessages: true, showSummaries: false } });
        }
        if (q.includes('groupChatDailySummary')) return ok({ groupChatDailySummary: null });
        if (q.includes('markConversationAsRead')) return ok({ markConversationAsRead: true });
        return ok(null);
    }
    return { handle };
}

async function open(server: ReturnType<typeof fakeServer>): Promise<Page> {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.route('**/graphql', server.handle);
    await page.goto(HARNESS, { waitUntil: 'load' });
    await expect(page.getByTestId('harness-ready')).toBeVisible();
    await expect(page.getByText('Anyone going to the Accra meetup?').first()).toBeVisible({ timeout: 90_000 });
    return page;
}

test('Reply privately, the marker under its message and the header list — and the panel opens from each', async () => {
    const page = await open(fakeServer({ featureAvailable: true }));

    // The viewer's private reply is marked under the message it started from.
    const marker = page.getByRole('button', { name: /Private · Esi Owusu and you/ });
    await expect(marker).toBeVisible();
    await expect(marker).toContainText('2 new');

    // Header: the list button carries the unread count for screen readers too.
    await expect(page.getByRole('button', { name: 'Private replies, 2 unread' })).toBeVisible();

    // "Reply privately" pre-selects the author and hides the main composer.
    await page.getByRole('button', { name: 'Reply privately' }).click();
    const panel = page.getByRole('region', { name: 'Private reply' });
    await expect(panel.getByRole('heading', { name: 'Private reply to Ama Mensah' })).toBeVisible();
    await expect(panel.getByText('Only Ama Mensah and you will see this.')).toBeVisible();
    await expect(page.getByPlaceholder(/Message Accra Techies/i)).toHaveCount(0);

    // The marker opens that private reply in the same panel.
    await marker.click();
    await expect(panel.getByRole('heading', { name: 'Private reply', exact: true })).toBeVisible();

    // The header list shows it with its unread count.
    await page.getByRole('button', { name: 'Private replies, 2 unread' }).click();
    const list = page.getByRole('dialog', { name: 'Private replies' });
    await expect(list.getByText('Esi Owusu and you')).toBeVisible();
    await expect(list.getByText('2 new')).toBeVisible();

    expect(await page.locator('main').innerText()).not.toMatch(UUID_RE);
    await page.context().close();
});

test('the people picker pages in more members so someone on page 2 can be found and picked', async () => {
    const page = await open(fakeServer({ featureAvailable: true, manyMembers: true }));

    await page.getByRole('button', { name: 'Reply privately' }).click();
    const panel = page.getByRole('region', { name: 'Private reply' });
    await panel.getByRole('button', { name: 'Add people' }).click();
    const picker = page.getByRole('dialog', { name: 'Choose people' });

    // Not loaded yet (only the first 100 of 101 members are): the picker says
    // more can be loaded rather than claiming nobody matches.
    await picker.getByLabel('Search group members').fill('Zawadi');
    await expect(picker.getByText('No group members found')).toBeVisible();
    await expect(picker.getByText(/load more to keep searching/i)).toBeVisible();
    await expect(picker.getByLabel('Zawadi PageTwo')).toHaveCount(0);

    // Paging in the rest of the group is a keyboard-reachable button, not
    // only a scroll gesture.
    const loadMore = picker.getByRole('button', { name: 'Load more' });
    await expect(loadMore).toBeVisible();
    await loadMore.focus();
    await page.keyboard.press('Enter');

    await expect(picker.getByLabel('Zawadi PageTwo')).toBeVisible();
    // Every member is now loaded — the whole group was never fetched at once
    // on chat open, only once the picker actually needed the rest of it.
    await expect(picker.getByRole('button', { name: 'Load more' })).toHaveCount(0);

    await picker.getByLabel('Zawadi PageTwo').click();
    await picker.getByRole('button', { name: 'Done' }).click();
    await expect(panel.getByText('Only Ama Mensah, Zawadi PageTwo, and you will see this.')).toBeVisible();

    expect(await page.locator('main').innerText()).not.toMatch(UUID_RE);
    await page.context().close();
});

test('a private-reply member outside the first page of group members still shows their real name, not "a member"', async () => {
    const page = await open(fakeServer({ featureAvailable: true, manyMembers: true, page2MemberInPrivateReply: true }));

    // PAGE2_MEMBER is a real, current member but starts unresolved (only page
    // 1 of the group's members is loaded on chat open). There is no batch
    // "profile by id" lookup, so the client must page the rest of the group
    // in on its own to find the name — it must not get stuck on the generic
    // "a member" placeholder forever.
    const marker = page.getByRole('button', { name: /Private ·/ });
    await expect(marker).toBeVisible();
    await expect(marker).toContainText('Zawadi PageTwo', { timeout: 15_000 });
    await expect(marker).not.toContainText('a member');

    expect(await page.locator('main').innerText()).not.toMatch(UUID_RE);
    await page.context().close();
});

test('when the backend does not offer private replies: no button, no marker, no header entry, no error toast', async () => {
    const page = await open(fakeServer({ featureAvailable: false }));

    await expect(page.getByRole('button', { name: 'Reply', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reply privately' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Private replies/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Private ·/ })).toHaveCount(0);
    const toasts = page.locator('section[aria-label^="Notifications"]');
    await expect(toasts.getByText('Something went wrong. Please try again.')).toHaveCount(0);
    await page.context().close();
});
