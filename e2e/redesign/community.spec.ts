/** The redesigned Community: hero, left nav, groups to join, composer, feed tabs with reactions, right rail. */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { UUID, event, FUTURE, open } from './fixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const group = (id: string, name: string, privacy = 'PUBLIC') => ({ __typename: 'Group', id, name, description: 'A group', privacy, memberCount: 8, avatarUrl: null });

const DATA = {
    RedesignGroupsToJoin: { searchGroups: { __typename: 'GroupList', groups: [group('g-1', 'Young Professionals'), group('g-2', 'Already Joined'), group('g-3', 'Private Investors', 'PRIVATE')] } },
    RedesignMyGroupIds: { getMyGroups: { __typename: 'GroupList', groups: [{ __typename: 'Group', id: 'g-2' }] } },
    RecommendedPeople: { recommendedPeople: { __typename: 'PeopleRecommendationPage', rankingStrategy: 'e2e', items: [{ __typename: 'PeopleRecommendation', profile: { __typename: 'ProfileSummary', userId: '00000000-0000-4000-8000-0000000a0c01', firstName: 'Kwame', lastName: 'Asante', avatarUrl: null, headline: 'Software Engineer', bio: null, sector: null, countryOfOrigin: 'GH', residenceCountry: 'DE', connectionStatus: 'NONE', connectionId: null, isVerified: false, verificationBadge: null, trustScore: null, trustTier: null }, score: 1, sharedCommunityCount: 0, sharedCommunityNames: [], mutualConnectionCount: 0, mutualConnectionNames: [], matchReason: null }] } },
    GetTrendingHashtags: { trendingHashtags: [{ __typename: 'Hashtag', id: 'h1', tag: 'diaspora', usageCount: 7 }] },
};

test('hero, left navigation with real pages only, and your communities', async () => {
    const { page } = await open(browser, '/community', DATA);
    await expect(page.getByRole('heading', { level: 1, name: 'Community' })).toBeVisible({ timeout: 90_000 });
    const nav = page.getByTestId('community-nav');
    for (const [name, href] of [['Home', '/en/home'], ['Discover people', '/en/search'], ['Groups & circles', '/en/circles'], ['Events', '/en/events']]) {
        await expect(nav.getByRole('link', { name })).toHaveAttribute('href', href);
    }
    await expect(page.getByText('Help & Resources')).toHaveCount(0);
    await expect(page.getByTestId('your-communities')).toContainText('Ghana Union Berlin');
    await page.context().close();
});

test('groups to join leave out the ones already joined; private ones say "Request to join"', async () => {
    const { page } = await open(browser, '/community', DATA);
    const groups = page.getByTestId('community-groups');
    await expect(groups).toBeVisible({ timeout: 90_000 });
    await expect(groups).toContainText('Young Professionals');
    await expect(groups).not.toContainText('Already Joined');
    await expect(groups.getByRole('button', { name: 'Join', exact: true })).toHaveCount(1);
    await expect(groups.getByRole('button', { name: 'Request to join' })).toHaveCount(1);
    await page.context().close();
});

test('groups section is hidden when there are none', async () => {
    const { page } = await open(browser, '/community', { ...DATA, RedesignGroupsToJoin: { searchGroups: null } });
    await expect(page.getByTestId('community-composer')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('community-groups')).toHaveCount(0);
    await page.context().close();
});

test('composer, feed tabs and post cards that keep the Happy / Hopeful / Sad reactions', async () => {
    const { page } = await open(browser, '/community', DATA);
    await expect(page.getByTestId('community-composer')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByRole('link', { name: /Share an update/ })).toHaveAttribute('href', '/en/create-post');
    const tabs = page.getByRole('tab');
    expect((await tabs.allTextContents()).map((s) => s.trim())).toEqual(['For you', 'Latest', 'Following']);
    await expect(page.getByRole('tab', { name: 'For you' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[id^="feed-post-"]')).toHaveCount(3);
    await expect(page.locator('[id^="feed-post-"]').getByRole('button', { name: /^Like$/ })).toHaveCount(0);
    await page.getByRole('tab', { name: 'Latest' }).click();
    await expect(page.getByRole('tab', { name: 'Latest' })).toHaveAttribute('aria-selected', 'true');
    await page.context().close();
});

test('right rail: suggested people (Connect), trending topics, upcoming events, create post', async () => {
    const { page } = await open(browser, '/community', DATA);
    await expect(page.getByTestId('community-people')).toContainText('Kwame Asante', { timeout: 90_000 });
    await expect(page.getByTestId('community-people').getByRole('button', { name: 'Connect' })).toBeVisible();
    await expect(page.getByTestId('community-topics')).toContainText('#diaspora');
    await expect(page.getByTestId('community-topics')).toContainText('7 posts');
    await expect(page.getByTestId('community-events')).toContainText('Diaspora Business Summit');
    await expect(page.getByTestId('community-events')).not.toContainText('An event that already happened');
    await expect(page.getByTestId('community-rail').getByRole('link', { name: 'Create post' })).toBeVisible();
    // Never an id on screen.
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('rail cards hide when their data is empty or null', async () => {
    const { page, errors } = await open(browser, '/community', { RecommendedPeople: {}, GetTrendingHashtags: { trendingHashtags: null }, ListEvents: { listEvents: null } });
    await expect(page.getByTestId('community-rail')).toBeVisible({ timeout: 90_000 });
    for (const id of ['community-people', 'community-topics', 'community-events']) await expect(page.getByTestId(id)).toHaveCount(0);
    expect(errors).toEqual([]);
    void event; void FUTURE;
    await page.context().close();
});

for (const width of [360, 768]) {
    test(`no horizontal scroll at ${width}px`, async () => {
        const { page } = await open(browser, '/community', DATA, { width, height: 900 });
        await expect(page.getByTestId('community-composer')).toBeVisible({ timeout: 90_000 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        await page.context().close();
    });
}
