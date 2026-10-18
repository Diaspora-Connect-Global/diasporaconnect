/** The redesigned Community: hero, left nav, groups to join, feed tabs with reactions, right rail. */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { UUID, event, FUTURE, open, post } from './fixtures';

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
    for (const [name, href] of [['Discover people', '/en/people'], ['Groups & circles', '/en/circles'], ['Events', '/en/events']]) {
        await expect(nav.getByRole('link', { name })).toHaveAttribute('href', href);
    }
    // Home / Discover / Community / More live in the top bar, not in this rail.
    await expect(nav.getByRole('link', { name: /^(Home|Discover|Community|More)$/ })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Home' })).toHaveCount(0);
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
    await expect(groups.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/en/groups');
    await page.context().close();
});

test('a group the server says is PENDING reads Requested after a reload; ACTIVE ones are not offered', async () => {
    const status = (g: Record<string, unknown>, viewerMembershipStatus: string) => ({ ...g, viewerMembershipStatus });
    const { page } = await open(browser, '/community', {
        ...DATA,
        RedesignGroupsToJoin: { searchGroups: { __typename: 'GroupList', groups: [status(group('g-1', 'Young Professionals'), 'NONE'), status(group('g-3', 'Private Investors', 'PRIVATE'), 'PENDING'), status(group('g-4', 'Already In'), 'ACTIVE')] } },
    });
    const groups = page.getByTestId('community-groups');
    await expect(groups).toBeVisible({ timeout: 90_000 });
    await expect(groups).not.toContainText('Already In');
    await expect(groups.getByRole('button', { name: 'Requested' })).toBeDisabled();
    await expect(groups.getByRole('button', { name: 'Join', exact: true })).toHaveCount(1);
    await page.context().close();
});

test('groups section is hidden when there are none', async () => {
    const { page } = await open(browser, '/community', { ...DATA, RedesignGroupsToJoin: { searchGroups: null } });
    await expect(page.getByRole('tablist', { name: 'Feed' })).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('community-groups')).toHaveCount(0);
    await page.context().close();
});

test('no composer, feed tabs and post cards that keep the Happy / Hopeful / Sad reactions', async () => {
    const { page } = await open(browser, '/community', DATA);
    await expect(page.getByRole('tablist', { name: 'Feed' })).toBeVisible({ timeout: 90_000 });
    // Post creation lives on Home now: no composer box on Community.
    await expect(page.getByTestId('feed-composer')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Share an update/ })).toHaveCount(0);
    const tabs = page.getByRole('tab');
    expect((await tabs.allTextContents()).map((s) => s.trim())).toEqual(['For you', 'Latest', 'Following']);
    await expect(page.getByRole('tab', { name: 'For you' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[id^="feed-post-"]')).toHaveCount(3);
    await expect(page.locator('[id^="feed-post-"]').getByRole('button', { name: /^Like$/ })).toHaveCount(0);
    await page.getByRole('tab', { name: 'Latest' }).click();
    await expect(page.getByRole('tab', { name: 'Latest' })).toHaveAttribute('aria-selected', 'true');
    await page.context().close();
});

test('right rail: suggested people (Connect), trending topics, upcoming events (and no create-post card)', async () => {
    const { page } = await open(browser, '/community', DATA);
    await expect(page.getByTestId('community-people')).toContainText('Kwame Asante', { timeout: 90_000 });
    await expect(page.getByTestId('community-people').getByRole('button', { name: 'Connect' })).toBeVisible();
    await expect(page.getByTestId('community-topics')).toContainText('#diaspora');
    await expect(page.getByTestId('community-topics')).toContainText('7 posts');
    await expect(page.getByTestId('community-events')).toContainText('Diaspora Business Summit');
    await expect(page.getByTestId('community-events')).not.toContainText('An event that already happened');
    await expect(page.getByTestId('community-rail').getByRole('link', { name: 'Create post' })).toHaveCount(0);
    // Never an id on screen.
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

const community = (id: string, name: string, memberCount: number) => ({
    __typename: 'Community', id, name, description: 'A community', avatarUrl: null, bannerUrl: null, memberCount,
    visibility: 'PUBLIC', joinPolicy: 'OPEN', membershipStatus: null, communityType: null,
});
const TO_JOIN = {
    DiscoverCommunities: { discoverCommunities: { __typename: 'DiscoverCommunitiesResponse', total: 2, communities: [community('00000000-0000-4000-8000-0000000c0001', 'Ghana Union Berlin', 12), community('00000000-0000-4000-8000-0000000c0009', 'Lagos Founders Circle', 34)] } },
};

test('no communities grid in the middle column; communities to join sit in the right rail', async () => {
    const { page } = await open(browser, '/community', { ...DATA, ...TO_JOIN }, { width: 1280, height: 900 });
    const join = page.getByTestId('community-rail').getByTestId('community-join');
    await expect(join).toContainText('Lagos Founders Circle', { timeout: 90_000 });
    await expect(join).toContainText('34 members');
    // Already a member → not offered.
    await expect(join).not.toContainText('Ghana Union Berlin');
    // The old grid and its Visibility / Pricing chips are gone.
    await expect(page.getByText('Visibility', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Pricing', { exact: true })).toHaveCount(0);
    const feed = (await page.getByTestId('community-feed').boundingBox())!;
    const rail = (await join.boundingBox())!;
    expect(rail.x).toBeGreaterThan(feed.x + feed.width - 1);
    // Joining still goes through the page's confirmation flow.
    await join.getByRole('button', { name: 'Join: Lagos Founders Circle' }).click();
    await expect(page.getByRole('dialog')).toContainText('Lagos Founders Circle');
    await page.context().close();
});

test('"All posts" filter narrows the feed to one category and selects Latest; For you clears it', async () => {
    const asked: string[] = [];
    const byCategory = (v: Record<string, unknown>) => {
        const category = ((v.input ?? {}) as { category?: string }).category ?? '';
        asked.push(category);
        const posts = category === 'Business' ? [post('00000000-0000-4000-8000-0000000b0101', 'Export partners wanted for shea butter.')] : [];
        return { postsByCategory: { __typename: 'PostsByCategoryResponse', posts, total: posts.length, hasMore: false } };
    };
    const { page } = await open(browser, '/community', { ...DATA, GetPostsByCategory: byCategory });
    const filter = page.getByLabel('Filter posts');
    await expect(filter).toBeVisible({ timeout: 90_000 });
    await expect(filter).toHaveValue('');
    expect((await filter.locator('option').first().textContent())?.trim()).toBe('All posts');
    await expect(page.locator('[id^="feed-post-"]')).toHaveCount(3);

    await filter.selectOption('Business');
    await expect(page.getByRole('tab', { name: 'Latest' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[id^="feed-post-"]')).toHaveCount(1);
    await expect(page.getByTestId('community-feed')).toContainText('Export partners wanted');
    expect(asked).toContain('Business');

    await filter.selectOption('Sports');
    await expect(page.getByTestId('community-feed')).toContainText('No Sports posts yet.');

    await page.getByRole('tab', { name: 'For you' }).click();
    await expect(filter).toHaveValue('');
    await expect(page.locator('[id^="feed-post-"]')).toHaveCount(3);
    await page.context().close();
});

test('rail cards hide when their data is empty or null', async () => {
    const { page, errors } = await open(browser, '/community', { RecommendedPeople: {}, GetTrendingHashtags: { trendingHashtags: null }, ListEvents: { listEvents: null } });
    await expect(page.getByTestId('community-rail')).toBeAttached({ timeout: 90_000 });
    for (const id of ['community-people', 'community-topics', 'community-events', 'community-join']) await expect(page.getByTestId(id)).toHaveCount(0);
    expect(errors).toEqual([]);
    void event; void FUTURE;
    await page.context().close();
});

for (const width of [360, 768]) {
    test(`no horizontal scroll at ${width}px`, async () => {
        const { page } = await open(browser, '/community', DATA, { width, height: 900 });
        await expect(page.getByRole('tablist', { name: 'Feed' })).toBeVisible({ timeout: 90_000 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        await page.context().close();
    });
}
