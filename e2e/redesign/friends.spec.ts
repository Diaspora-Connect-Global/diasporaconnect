/** `/friends`: Discover, Requests, Sent and Friends as one page, deep-linked with ?tab=. */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { UUID, ME, open } from './fixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const uid = (n: number) => `00000000-0000-4000-8000-0000000f0d${String(n).padStart(2, '0')}`;
const user = (n: number, first: string, last: string, over: Record<string, unknown> = {}) => ({
    __typename: 'ProfileSummary', userId: uid(n), username: null, firstName: first, lastName: last, email: null, avatarUrl: null, bio: null, occupation: null, headline: null, sector: null,
    location: null, country: null, residenceCountry: null, countryOfOrigin: null, connectionStatus: 'none', connectionId: null, isVerified: false, trustScore: null, trustTier: null, ...over,
});
const conn = (id: string, requester: Record<string, unknown>, receiver: Record<string, unknown>) => ({
    __typename: 'Connection', id, status: 'PENDING', message: null, createdAt: '2026-10-01T10:00:00.000Z', acceptedAt: null, connectionStatus: 'pending',
    requesterId: requester.userId, receiverId: receiver.userId, requester, receiver,
});
const suggestion = (p: Record<string, unknown>, over: Record<string, unknown> = {}) => ({ __typename: 'PeopleRecommendation', profile: p, score: 1, sharedCommunityCount: 0, sharedCommunityNames: [], mutualConnectionCount: 0, mutualConnectionNames: [], matchReason: null, ...over });
const ok = (key: string) => ({ [key]: { __typename: 'ConnectionResponse', success: true, message: null } });

/** Stateful in-memory double: a successful action removes the row from the next read. */
function world() {
    const removed = new Set<string>();
    const sentOut = new Set<string>();
    const meUser = { ...user(99, 'Ama', 'Mensah'), userId: ME };
    const received = [conn('c-req-1', user(1, 'Kwame', 'Asante', { username: 'kwame', occupation: 'Software Engineer', location: 'Berlin' }), meUser), conn('c-req-2', user(2, 'Esi', 'Mensah', { location: 'Accra, GHA' }), meUser)];
    const sent = [conn('c-sent-1', meUser, user(3, 'Samuel', 'Agyemang', { occupation: 'Architect' }))];
    const friends = [conn('c-fr-1', meUser, user(4, 'Grace', 'Boakye', { username: 'grace', sector: 'Healthcare' })), conn('c-fr-2', user(5, 'Kofi', 'Owusu', { sector: 'Finance' }), meUser)];
    const live = (rows: ReturnType<typeof conn>[]) => rows.filter((c) => !removed.has(c.id));
    return {
        removed,
        sentOut,
        overrides: {
            GetMyConnections: () => ({ getConnections: { __typename: 'GetConnectionsResponse', success: true, message: null, total: live(friends).length, connections: live(friends) } }),
            GetAllPendingConnections: () => ({ getPendingConnections: { __typename: 'GetConnectionsResponse', success: true, message: null, total: 3, connections: [...live(received), ...live(sent)] } }),
            RecommendedPeople: {
                recommendedPeople: {
                    __typename: 'PeopleRecommendationPage', rankingStrategy: 'e2e',
                    items: [
                        suggestion(user(6, 'Yaw', 'Darko', { headline: 'Doctor', residenceCountry: 'DE', isVerified: true }), { mutualConnectionCount: 2 }),
                        suggestion(user(7, 'Abena', 'Ofori', { connectionStatus: 'pending_sent', connectionId: 'c-disc-sent' })),
                    ],
                },
            },
            SendConnectionRequest: (v: Record<string, unknown>) => { sentOut.add(String((v.input as { receiverId?: string }).receiverId)); return ok('sendConnectionRequest'); },
            AcceptConnection: (v: Record<string, unknown>) => { removed.add(String((v.input as { connectionId?: string }).connectionId)); return ok('acceptConnection'); },
            RejectConnection: (v: Record<string, unknown>) => { removed.add(String((v.input as { connectionId?: string }).connectionId)); return ok('rejectConnection'); },
            CancelConnection: (v: Record<string, unknown>) => { removed.add(String((v.input as { connectionId?: string }).connectionId)); return ok('cancelConnection'); },
            RemoveFriend: (v: Record<string, unknown>) => { removed.add(String((v.input as { connectionId?: string }).connectionId)); return ok('removeFriend'); },
            SearchUsers: () => ({ searchUsers: { __typename: 'SearchUsersResponse', success: true, message: null, total: 0, hasMore: false, profiles: [] } }),
        },
    };
}

const FIRST = { timeout: 90_000 };

/** Click a tab until the URL follows: the first click can land before the page has hydrated. */
async function pickTab(page: import('@playwright/test').Page, name: RegExp, url: RegExp) {
    await expect(async () => {
        await page.getByRole('tab', { name }).click();
        await expect(page).toHaveURL(url, { timeout: 3_000 });
    }).toPass({ timeout: 60_000 });
}

test('each tab is a plain list with the right rows; counts on the labels; no id on screen', async () => {
    const w = world();
    const { page } = await open(browser, '/friends', w.overrides as never);
    const list = page.getByTestId('friends-list');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Friends', FIRST);
    // Default tab: Discover.
    await expect(page.getByRole('tab', { name: /Discover/ })).toHaveAttribute('aria-selected', 'true');
    await expect(list.locator('li')).toHaveCount(2);
    await expect(list.locator('li').nth(0)).toContainText('Yaw Darko');
    await expect(list.locator('li').nth(0)).toContainText('Doctor · Germany');
    await expect(list.locator('li').nth(0)).toContainText('2 mutual connections');
    await expect(list.locator('li').nth(0).getByRole('button', { name: 'Add friend' })).toBeVisible();
    await expect(page.getByTestId('friends-count-requests')).toHaveText('2');
    await expect(page.getByTestId('friends-count-sent')).toHaveText('1');
    await expect(page.getByTestId('friends-count-friends')).toHaveText('2');

    await pickTab(page, /Requests/, /tab=requests/);
    await expect(list.locator('li')).toHaveCount(2);
    await expect(list.locator('li').nth(0)).toContainText('Kwame Asante');
    await expect(list.locator('li').nth(0)).toContainText('Software Engineer · Berlin');
    // user-service sends request locations as "City, <ISO code>": the code is shown as the country name.
    await expect(list.locator('li').nth(1)).toContainText('Accra, Ghana');
    await expect(list.locator('li').nth(1)).not.toContainText('GHA');
    await expect(list.locator('li').nth(0).getByRole('link')).toHaveAttribute('href', '/en/@kwame');

    await pickTab(page, /Sent/, /tab=sent/);
    await expect(list.locator('li')).toHaveCount(1);
    await expect(list.locator('li').nth(0)).toContainText('Samuel Agyemang');

    await pickTab(page, /Friends/, /tab=friends/);
    await expect(list.locator('li')).toHaveCount(2);
    // GetMyConnections has no headline/occupation (the gateway's ProfileSummary lacks them): sector is shown.
    await expect(list.locator('li').nth(0)).toContainText('Healthcare');
    // A plain list: every row starts on the same left edge.
    const xs = await list.locator('li').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x)));
    expect(new Set(xs).size).toBe(1);
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('?tab= deep links open the tab; the old ?t= numbers still work; unknown falls back to Discover', async () => {
    const w = world();
    const { page } = await open(browser, '/friends?tab=sent', w.overrides as never);
    await expect(page.getByRole('tab', { name: /Sent/ })).toHaveAttribute('aria-selected', 'true', FIRST);
    await expect(page.getByTestId('friends-list').locator('li')).toHaveCount(1);
    await page.goto('/en/friends?t=3');
    await expect(page.getByRole('tab', { name: /Requests/ })).toHaveAttribute('aria-selected', 'true', FIRST);
    await page.goto('/en/friends?tab=nonsense');
    await expect(page.getByRole('tab', { name: /Discover/ })).toHaveAttribute('aria-selected', 'true', FIRST);
    await page.context().close();
});

test('Requests: Accept and Ignore call the right mutation and the row goes away', async () => {
    const w = world();
    const { page, graphql } = await open(browser, '/friends?tab=requests', w.overrides as never);
    const list = page.getByTestId('friends-list');
    await list.locator('li').nth(0).getByRole('button', { name: 'Accept' }).click(FIRST);
    await expect.poll(() => (graphql.calls.find((c) => c.name === 'AcceptConnection')?.variables as { input?: { connectionId?: string } } | undefined)?.input?.connectionId).toBe('c-req-1');
    await expect(list.locator('li')).toHaveCount(1);
    await list.locator('li').nth(0).getByRole('button', { name: 'Ignore' }).click();
    await expect.poll(() => (graphql.calls.find((c) => c.name === 'RejectConnection')?.variables as { input?: { connectionId?: string } } | undefined)?.input?.connectionId).toBe('c-req-2');
    await expect(list.getByText('No friend requests waiting for you.')).toBeVisible();
    await page.context().close();
});

test('Sent: Cancel request calls CancelConnection', async () => {
    const w = world();
    const { page, graphql } = await open(browser, '/friends?tab=sent', w.overrides as never);
    const list = page.getByTestId('friends-list');
    await list.locator('li').nth(0).getByRole('button', { name: 'Cancel request' }).click(FIRST);
    await expect.poll(() => (graphql.calls.find((c) => c.name === 'CancelConnection')?.variables as { input?: { connectionId?: string } } | undefined)?.input?.connectionId).toBe('c-sent-1');
    await expect(list.locator('li')).toHaveCount(0);
    await page.context().close();
});

test('Friends: Remove (after confirming) calls RemoveFriend', async () => {
    const w = world();
    const { page, graphql } = await open(browser, '/friends?tab=friends', w.overrides as never);
    const list = page.getByTestId('friends-list');
    await list.locator('li').nth(0).getByRole('button', { name: 'Open menu' }).click(FIRST);
    await page.getByRole('menuitem', { name: /Remove/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Remove/ }).click();
    await expect.poll(() => (graphql.calls.find((c) => c.name === 'RemoveFriend')?.variables as { input?: { connectionId?: string } } | undefined)?.input?.connectionId).toBe('c-fr-1');
    await expect(list.locator('li')).toHaveCount(1);
    await page.context().close();
});

test('Discover: Add friend sends the request for that person and the row shows Requested', async () => {
    const w = world();
    const { page, graphql } = await open(browser, '/friends', w.overrides as never);
    const list = page.getByTestId('friends-list');
    await list.locator('li').nth(0).getByRole('button', { name: 'Add friend' }).click(FIRST);
    await expect.poll(() => (graphql.calls.find((c) => c.name === 'SendConnectionRequest')?.variables as { input?: { receiverId?: string } } | undefined)?.input?.receiverId).toBe(uid(6));
    await expect(list.locator('li').nth(0)).toContainText('Requested');
    await page.context().close();
});

test('Discover search goes in the URL; empty tabs say so', async () => {
    const w = world();
    const { page, graphql } = await open(browser, '/friends', w.overrides as never);
    await page.getByLabel('Search people').fill('zzz', FIRST);
    // Scoped: the header has its own "Search" button (global search).
    await page.getByTestId('friends-list').getByRole('search').getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page).toHaveURL(/q=zzz/);
    await expect(page.getByTestId('friends-list')).toContainText('No one matches “zzz”.');
    expect(graphql.calls.some((c) => c.name === 'SearchUsers')).toBe(true);
    await page.context().close();
});

for (const width of [360, 768, 1280]) {
    test(`no horizontal scroll and no clipped names at ${width}px`, async () => {
        const w = world();
        const { page } = await open(browser, '/friends?tab=requests', w.overrides as never, { width, height: 800 });
        await expect(page.getByTestId('friends-list').locator('li')).toHaveCount(2, FIRST);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        // Nothing inside the list pokes out past the viewport.
        const out = await page.getByTestId('friends-list').locator('li *').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1).length);
        expect(out).toBe(0);
        // Body text is at least 14px (the search input is 16px on phones).
        const small = await page.getByTestId('friends-list').locator('li').locator('span, button, a').evaluateAll((els) =>
            els
                .filter((e) => Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent?.trim()) && parseFloat(getComputedStyle(e).fontSize) < 14)
                .map((e) => `${e.tagName} "${e.textContent?.trim()}" ${getComputedStyle(e).fontSize}`));
        expect(small).toEqual([]);
        if (width === 360) expect(await page.getByLabel('Filter this list').evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
        await page.context().close();
    });
}

test('the old profile modal link forwards to the page', async () => {
    const w = world();
    const { page } = await open(browser, '/friends', w.overrides as never);
    await page.goto('/en/profile?m=friends&t=3', { waitUntil: 'commit' });
    await expect(page).toHaveURL(/\/en\/friends\?tab=requests/, FIRST);
    await page.context().close();
});
