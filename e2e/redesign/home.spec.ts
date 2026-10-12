/**
 * The redesigned Home: greeting hero, "Your activity", latest listings, posts
 * from the viewer's communities, the right rail, and — still — the full feed
 * with the Happy / Hopeful / Sad reactions. GraphQL is the in-memory double.
 */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { eventFixture } from '../support/eventFixtures';
import { ALL, FUTURE, UUID, open } from './fixtures';
import { ME_PROFILE } from '../support/fakeSession';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const registered = { UserEvents: { userEvents: { __typename: 'UserEvents', attending: [eventFixture({ id: 'evt-reg', title: 'Networking Mixer', startAt: FUTURE, endAt: FUTURE, isRegistered: true })], saved: [] } } };

test('greets the person by first name with a time-of-day greeting and shows their place', async () => {
    const { page } = await open(browser, '/home');
    const hero = page.locator('#home-hero-title');
    await expect(hero).toContainText('Ama', { timeout: 90_000 });
    await expect(hero).toContainText('👋');
    await expect(page.getByText(/^Good (morning|afternoon|evening),$/)).toBeVisible();
    await expect(page.getByText('Berlin, Germany')).toBeVisible();
    await expect(page.getByText('Your connection to real opportunities, trusted services and a stronger Africa.')).toBeVisible();
    await expect(page.getByRole('link', { name: /Explore opportunities/ }).first()).toBeVisible();
    await page.context().close();
});

test('the hero always renders with real height, and falls back to the bare greeting without a name or place', async () => {
    const { page } = await open(browser, '/home', { GetMyProfile: { getProfile: { __typename: 'ProfileResponse', success: true, message: 'ok', profile: { ...ME_PROFILE, firstName: null, lastName: null, city: null, residenceCountry: null, countryOfOrigin: null } } } });
    const hero = page.locator('#home-hero-title');
    await expect(hero).toHaveText(/^Good (morning|afternoon|evening)$/, { timeout: 90_000 });
    // Regression: the hero (overflow-hidden) used to be flex-shrunk to a hairline inside the scrolling column.
    const box = await page.locator('section[aria-labelledby="home-hero-title"]').boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(150);
    await expect(page.getByText(/,\s*Germany$/)).toHaveCount(0);
    await page.context().close();
});

test('"Your activity" is built from real data and hidden when there is none', async () => {
    const empty = await open(browser, '/home');
    await expect(empty.page.locator('#home-hero-title')).toBeVisible({ timeout: 90_000 });
    await expect(empty.page.getByTestId('home-activity')).toHaveCount(0);
    await empty.page.context().close();

    const { page } = await open(browser, '/home', {
        ...registered,
        MyServiceRequests: { myServiceRequests: [{ __typename: 'ServiceRequest', id: 'sr-1', requestNumber: 'DP-2026-0042', requestTypeId: 't', category: 'Passport', status: 'UNDER_REVIEW', ownerType: 'COMMUNITY', ownerEntityId: 'c1', submittedAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z' }] },
        GetMyKYCStatus: { getMyKYCStatus: { __typename: 'KYCStatus', status: 'UNDER_REVIEW', kycLevel: 0, profileId: null } },
    });
    const activity = page.getByTestId('home-activity');
    await expect(activity).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('activity-event')).toContainText('Networking Mixer');
    await expect(page.getByTestId('activity-request')).toContainText('Under review');
    await expect(page.getByTestId('activity-request')).toContainText('DP-2026-0042');
    await expect(page.getByTestId('activity-kyc')).toContainText('Under review');
    // At most three cards, and no invented progress percentage.
    expect(await activity.getByRole('listitem').count()).toBeLessThanOrEqual(3);
    await expect(activity).not.toContainText('%');
    await page.context().close();
});

test('latest listings are labelled by what they are, and "From your community" shows three real posts', async () => {
    const { page } = await open(browser, '/home');
    await expect(page.getByTestId('home-latest')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByRole('heading', { name: 'Latest on DiaspoPlug' })).toBeVisible();
    await expect(page.getByText('Recommended for you')).toHaveCount(0);
    await expect(page.getByTestId('latest-card')).toHaveCount(4);
    const posts = page.getByTestId('home-community-posts');
    await expect(posts).toBeVisible();
    await expect(posts.getByTestId('community-post-preview')).toHaveCount(3);
    await expect(posts).toContainText('Kofi Mensah');
    // The action row uses Happy / Hopeful / Sad, never "Like", plus the real comment count and Share.
    const row = posts.getByTestId('post-reaction-row').first();
    await expect(row.getByTestId('reaction-button')).toHaveAccessibleName('React');
    await row.getByTestId('reaction-button').hover();
    for (const k of ['Happy', 'Hopeful', 'Sad']) await expect(page.getByTestId('reaction-picker').getByRole('button', { name: k })).toBeVisible();
    await expect(posts.getByRole('button', { name: /^Like$/ })).toHaveCount(0);
    await expect(row.getByRole('button', { name: /Share/ })).toBeVisible();
    // Every listing card has a photo on top (its own, or a category placeholder).
    const cards = page.getByTestId('latest-card');
    for (let i = 0; i < 4; i += 1) await expect(cards.nth(i).locator('img').first()).toHaveAttribute('src', /.+/);
    await page.context().close();
});

test('the right rail offers only actions that exist, upcoming registrations and circles', async () => {
    const { page } = await open(browser, '/home', {
        ...registered,
        MyCircles: { myCircles: [{ __typename: 'Circle', id: 'cir-1', circleNumber: 1, name: 'Accra Tech Hub', handle: 'accra', tagline: null, description: null, avatarUrl: null, bannerUrl: null, brandJson: null, discoverable: true, joinMode: 'REQUEST', status: 'ACTIVE', founderUserId: 'x', chatConversationId: null, memberCount: 12, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', archivedAt: null }] },
    });
    const rail = page.getByTestId('home-rail-desktop');
    await expect(rail).toBeVisible({ timeout: 90_000 });
    await expect(rail.getByRole('link', { name: /Find opportunities/ })).toBeVisible();
    await expect(rail.getByRole('link', { name: /Explore services/ })).toBeVisible();
    await expect(rail.getByRole('link', { name: /Connect with people/ })).toBeVisible();
    // No request-type source exists for it yet: not shown.
    await expect(rail.getByText('Get something done')).toHaveCount(0);
    await expect(rail.getByTestId('home-upcoming')).toContainText('Networking Mixer');
    await expect(rail.getByTestId('home-circles')).toContainText('Accra Tech Hub');
    await expect(rail.getByTestId('home-circles')).toContainText('12 members');
    await page.context().close();
});

test('upcoming and circles are hidden when there is nothing, and no ids reach the page', async () => {
    const { page } = await open(browser, '/home');
    await expect(page.getByTestId('home-rail-desktop')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('home-upcoming')).toHaveCount(0);
    await expect(page.getByTestId('home-circles')).toHaveCount(0);
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('the full feed is still below, with Happy / Hopeful / Sad reactions on its cards', async () => {
    const { page } = await open(browser, '/home');
    await expect(page.getByRole('heading', { name: 'Your feed' })).toBeVisible({ timeout: 90_000 });
    await expect(page.locator('[id^="feed-post-"]')).toHaveCount(3);
    await expect(page.getByText('Free legal consultation for the next three days.').first()).toBeVisible();
    // The reaction control keeps its design: no "Like" button anywhere on the cards.
    await expect(page.locator('[id^="feed-post-"]').getByRole('button', { name: /^Like$/ })).toHaveCount(0);
    await expect(page.locator('[id^="feed-post-"]').first().getByTestId('reaction-button').first()).toBeVisible();
    await page.context().close();
});

test('survives a partial backend error (null query results)', async () => {
    const nulls = Object.fromEntries(['UserEvents', 'MyServiceRequests', 'GetMyVendor', 'MyCircles', 'ListOpportunities', 'RedesignFeaturedServices', 'RedesignFeaturedProducts'].map((k) => [k, {}]));
    const { page, errors } = await open(browser, '/home', nulls);
    await expect(page.locator('#home-hero-title')).toBeVisible({ timeout: 90_000 });
    expect(errors).toEqual([]);
    void ALL;
    await page.context().close();
});

for (const width of [360, 768]) {
    test(`no horizontal scroll at ${width}px`, async () => {
        const { page } = await open(browser, '/home', {}, { width, height: 900 });
        await expect(page.locator('#home-hero-title')).toBeVisible({ timeout: 90_000 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        await page.context().close();
    });
}
