/**
 * The Community page's feed is community-only (posts authored by communities and
 * associations); Home's feed stays mixed. GraphQL is the in-memory double.
 */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { open, UUID } from './fixtures';
import { COMMUNITY_POSTS, MEMBER_POST, feedByType } from './communityFeedFixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const members = (v: Record<string, unknown>) => ({ postsByCategory: { __typename: 'PostsByCategoryResponse', posts: [], total: 0, hasMore: false, ...v } });

test('For you reads the community-scoped feed and shows only community/association posts', async () => {
    const asked: Array<Record<string, unknown>> = [];
    const { page, graphql } = await open(browser, '/community', { GetFeed: feedByType(asked) });
    const cards = page.locator('[id^="feed-post-"]');
    await expect(cards).toHaveCount(3, { timeout: 90_000 });
    await expect(page.getByTestId('community-feed')).not.toContainText('MEMBER POST');
    expect(asked[0]).toMatchObject({ type: 'COMMUNITIES_AND_ASSOCIATIONS' });
    expect(asked[0].chronological).toBeUndefined();
    // No recommender, no network/all fallback.
    expect(graphql.ops).not.toContain('RecommendedPosts');
    expect(asked.every((i) => i.type === 'COMMUNITIES_AND_ASSOCIATIONS')).toBe(true);
    // The reaction rail is the Happy / Hopeful / Sad one, and no id is ever on screen.
    await expect(cards.getByRole('button', { name: /^Like$/ })).toHaveCount(0);
    await expect(cards.first().getByTestId('reaction-button').first()).toBeVisible();
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('Latest asks for the same community set, newest first (chronological)', async () => {
    const asked: Array<Record<string, unknown>> = [];
    const { page } = await open(browser, '/community', { GetFeed: feedByType(asked) });
    await expect(page.locator('[id^="feed-post-"]')).toHaveCount(3, { timeout: 90_000 });
    await page.getByRole('tab', { name: 'Latest' }).click();
    await expect.poll(() => asked.some((i) => i.chronological === true)).toBe(true);
    const latest = asked.find((i) => i.chronological === true)!;
    expect(latest).toMatchObject({ type: 'COMMUNITIES_AND_ASSOCIATIONS', chronological: true });
    // A chronological read must not wipe the viewer's seen history.
    expect(latest.clearHistory).toBe(false);
    await expect(page.getByTestId('community-feed')).not.toContainText('MEMBER POST');
    await expect(page.locator('[id^="feed-post-"]')).toHaveCount(3);
    await page.context().close();
});

test('Following stays on the membership-scoped community feed', async () => {
    const asked: Array<Record<string, unknown>> = [];
    const { page, graphql } = await open(browser, '/community', { GetFeed: feedByType(asked) });
    await expect(page.locator('[id^="feed-post-"]')).toHaveCount(3, { timeout: 90_000 });
    await page.getByRole('tab', { name: 'Following' }).click();
    await expect.poll(() => graphql.ops.includes('JoinedCommunityFeed')).toBe(true);
    await page.context().close();
});

test('the category filter stays inside community posts', async () => {
    const asked: Array<Record<string, unknown>> = [];
    const { page } = await open(browser, '/community', {
        GetFeed: feedByType([]),
        GetPostsByCategory: (v: Record<string, unknown>) => {
            asked.push((v.input ?? {}) as Record<string, unknown>);
            return members({ posts: [COMMUNITY_POSTS[0]], total: 1 });
        },
    });
    await expect(page.locator('[id^="feed-post-"]')).toHaveCount(3, { timeout: 90_000 });
    await page.getByLabel('Filter posts').selectOption('Business');
    await expect(page.locator('[id^="feed-post-"]')).toHaveCount(1);
    expect(asked[0]).toMatchObject({ category: 'Business', authorTypes: ['COMMUNITY', 'ASSOCIATION'] });
    await page.context().close();
});

test('an empty community feed shows the empty state and never falls back to member posts', async () => {
    const asked: Array<Record<string, unknown>> = [];
    const { page, graphql } = await open(browser, '/community', { GetFeed: feedByType(asked, []) });
    await expect(page.getByTestId('community-feed')).toContainText('No posts here yet.', { timeout: 90_000 });
    await expect(page.locator('[id^="feed-post-"]')).toHaveCount(0);
    await expect(page.getByTestId('community-feed')).not.toContainText(MEMBER_POST.text as string);
    // Give a would-be fallback time to fire, then prove it did not.
    await page.waitForTimeout(1500);
    expect(asked.every((i) => i.type === 'COMMUNITIES_AND_ASSOCIATIONS')).toBe(true);
    expect(graphql.ops).not.toContain('RecommendedPosts');
    await page.context().close();
});

test('Home is unchanged: the unfiltered recommender feed, Latest = platform-wide ALL', async () => {
    const asked: Array<Record<string, unknown>> = [];
    const { page, graphql } = await open(browser, '/home', { GetFeed: feedByType(asked) });
    await expect(page.locator('[id^="feed-post-"]')).toHaveCount(3, { timeout: 90_000 });
    expect(graphql.ops).toContain('RecommendedPosts');
    expect(asked.some((i) => i.type === 'COMMUNITIES_AND_ASSOCIATIONS')).toBe(false);
    await page.getByRole('tab', { name: 'Latest' }).click();
    await expect.poll(() => asked.some((i) => i.type === 'ALL')).toBe(true);
    expect(asked.some((i) => i.chronological === true)).toBe(false);
    await expect(page.getByTestId('community-feed')).toContainText('MEMBER POST');
    await page.context().close();
});
