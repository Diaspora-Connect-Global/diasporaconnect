/** `/people`: suggestions with their real reason, people search in the URL, Connect / Accept / Message. */
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

const uid = (n: number) => `00000000-0000-4000-8000-0000000a0d${String(n).padStart(2, '0')}`;
const person = (n: number, first: string, last: string, over: Record<string, unknown> = {}) => ({
    __typename: 'ProfileSummary', userId: uid(n), firstName: first, lastName: last, avatarUrl: null, headline: null, bio: null, sector: null,
    countryOfOrigin: 'GH', residenceCountry: 'DE', connectionStatus: 'none', connectionId: null, isVerified: false, verificationBadge: null, trustScore: null, trustTier: null, ...over,
});
const suggestion = (p: Record<string, unknown>, over: Record<string, unknown> = {}) => ({ __typename: 'PeopleRecommendation', profile: p, score: 1, sharedCommunityCount: 0, sharedCommunityNames: [], mutualConnectionCount: 0, mutualConnectionNames: [], matchReason: null, ...over });

const SUGGESTED = {
    RecommendedPeople: {
        recommendedPeople: {
            __typename: 'PeopleRecommendationPage',
            rankingStrategy: 'e2e',
            items: [
                suggestion(person(1, 'Kwame', 'Asante', { headline: 'Software Engineer', isVerified: true }), { mutualConnectionCount: 3 }),
                suggestion(person(2, 'Esi', 'Mensah', { sector: 'Healthcare' }), { sharedCommunityCount: 2, sharedCommunityNames: ['Ghana Union Berlin', 'Accra Tech Diaspora'] }),
                suggestion(person(3, 'Samuel', 'Agyemang', { connectionStatus: 'connected' })),
                suggestion(person(4, 'Grace', 'Boakye', { connectionStatus: 'pending_received', connectionId: 'conn-4' })),
                suggestion({ ...person(9, 'Me', 'Myself'), userId: ME }),
            ],
        },
    },
};

test('suggestions are a plain list with the real reason, the right button per connection state, never yourself or an id', async () => {
    const { page } = await open(browser, '/people', SUGGESTED as never);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Find your people', { timeout: 90_000 });
    const list = page.getByTestId('people-list');
    await expect(list.getByRole('heading', { name: 'Suggested for you' })).toBeVisible();
    await expect(list.locator('li')).toHaveCount(4);
    await expect(list.locator('li').nth(0)).toContainText('Software Engineer · Germany');
    await expect(list.locator('li').nth(0)).toContainText('3 mutual connections');
    await expect(list.locator('li').nth(1)).toContainText('In Ghana Union Berlin and 1 other');
    await expect(list.getByRole('button', { name: 'Connect: Kwame Asante' })).toBeVisible();
    await expect(list.getByRole('button', { name: 'Message: Samuel Agyemang' })).toBeVisible();
    await expect(list.getByRole('button', { name: 'Accept: Grace Boakye' })).toBeVisible();
    await expect(list).not.toContainText('Me Myself');
    // A plain list: every row starts on the same left edge.
    const xs = await list.locator('li').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x)));
    expect(new Set(xs).size).toBe(1);
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('Connect sends the real request and the button changes to Requested', async () => {
    const { page, graphql } = await open(browser, '/people', { ...SUGGESTED, SendConnectionRequest: { sendConnectionRequest: { __typename: 'ConnectionResponse', success: true, message: null } } } as never);
    const list = page.getByTestId('people-list');
    await list.getByRole('button', { name: 'Connect: Kwame Asante' }).click({ timeout: 90_000 });
    await expect.poll(() => (graphql.calls.find((c) => c.name === 'SendConnectionRequest')?.variables as { input?: { receiverId?: string } } | undefined)?.input?.receiverId).toBe(uid(1));
    await expect(list.locator('li').nth(0).getByRole('button', { name: 'Requested' })).toBeDisabled();
    await page.context().close();
});

test('search goes in the URL, lists matches, and clears back to suggestions', async () => {
    const asked: string[] = [];
    const searchUsers = (v: Record<string, unknown>) => {
        const q = String(((v.searchUsersInput ?? {}) as { query?: string }).query ?? '');
        asked.push(q);
        const profiles = q === 'kofi' ? [person(5, 'Kofi', 'Owusu', { headline: 'Architect' })] : [];
        return { searchUsers: { __typename: 'SearchUsersResponse', success: true, message: null, total: profiles.length, hasMore: false, profiles } };
    };
    const { page } = await open(browser, '/people', { ...SUGGESTED, SearchUsers: searchUsers } as never);
    await page.getByLabel('Search people').fill('kofi', { timeout: 90_000 });
    await page.getByRole('search').getByRole('button', { name: 'Search', exact: true }).click(); // the header has its own Search button
    await expect(page).toHaveURL(/\/people\?q=kofi/);
    const list = page.getByTestId('people-list');
    await expect(list.getByRole('heading', { name: 'Results for “kofi”' })).toBeVisible();
    await expect(list).toContainText('Kofi Owusu');
    expect(asked).toContain('kofi');
    await list.getByRole('button', { name: 'Clear search' }).click();
    await expect(page).not.toHaveURL(/q=/);
    await expect(list.getByRole('heading', { name: 'Suggested for you' })).toBeVisible();
    await page.goto('/en/people?q=zzz');
    await expect(page.getByTestId('people-list')).toContainText('No one matches “zzz”.', { timeout: 90_000 });
    await page.context().close();
});

test('the Community page links Discover people here; no horizontal scroll on a phone', async () => {
    const { page } = await open(browser, '/people', SUGGESTED as never, { width: 360, height: 800 });
    await expect(page.getByTestId('people-list')).toBeVisible({ timeout: 90_000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.getByTestId('people-more').getByRole('link', { name: /Connection requests/ })).toHaveAttribute('href', '/en/requests');
    await page.context().close();
});
