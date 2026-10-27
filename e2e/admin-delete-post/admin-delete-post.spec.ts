/**
 * A super admin can delete ANY post; everyone else is unchanged.
 *
 * The session is seeded with a role (the sign-in response's `user.role`, kept
 * in the persisted auth store). GraphQL is mocked, so these specs assert what
 * the UI SENDS: AdminDeletePost for someone else's post, DeletePost for your
 * own, and nothing at all for a normal user. A refused call uses
 * BAD_USER_INPUT: a FORBIDDEN mock would sign the test user out.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { ME, seedSession, wireNetwork, fakeGraphql } from '../support/fakeSession';
import { ALL, FEED_OVERRIDES, post } from '../redesign/fixtures';
import type { Overrides } from '../support/eventFixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const OTHER = '00000000-0000-4000-8000-0000000a0b01';
const COMMUNITY = '00000000-0000-4000-8000-0000000c0c01';
const P_OTHER = '00000000-0000-4000-8000-0000000d0001';
const P_COMMUNITY = '00000000-0000-4000-8000-0000000d0002';
const P_OWN = '00000000-0000-4000-8000-0000000d0003';

const POSTS = [
    post(P_OTHER, 'Cocoa suppliers wanted in Ghana', { authorId: OTHER }),
    post(P_COMMUNITY, 'Community meeting notes for October', {
        authorType: 'COMMUNITY',
        authorId: COMMUNITY,
        author: { __typename: 'PostAuthor', id: COMMUNITY, authorType: 'COMMUNITY', displayName: 'Accra Union', avatarUrl: null, trustScore: null },
    }),
    post(P_OWN, 'My own post about the move', {
        authorId: ME,
        author: { __typename: 'PostAuthor', id: ME, authorType: 'USER', displayName: 'Ama Mensah', avatarUrl: null, trustScore: null },
    }),
];

const ranked = POSTS.map((p) => ({ __typename: 'RankedItem', itemId: p.id, itemType: 'POST', score: 1, authorId: p.authorId, topics: [], source: 'e2e', createdAt: p.createdAt }));
const FEED: Overrides = {
    ...FEED_OVERRIDES,
    RecommendedPosts: { recommendedPosts: { __typename: 'RankedFeedPage', items: ranked, nextCursor: null, rankingStrategy: 'e2e', explorationRatio: 0 } },
    JoinedCommunityFeed: { joinedCommunityFeed: { __typename: 'RankedFeedPage', items: ranked, nextCursor: null, rankingStrategy: 'e2e', explorationRatio: 0 } },
    GetPostsByIds: (v: Record<string, unknown>) => ({ postsByIds: POSTS.filter((p) => ((v.ids as string[]) ?? []).includes(p.id)) }),
};

const OK = {
    AdminDeletePost: { adminDeletePost: { __typename: 'OperationResult', success: true } },
    DeletePost: { deletePost: { __typename: 'OperationResult', success: true } },
};
const REFUSED = {
    AdminDeletePost: { __errors: [{ message: 'Cannot delete this post', code: 'BAD_USER_INPUT' }] },
};

/** Same as the shared `open`, but the seeded session carries a role. */
async function openAs(role: string | null, path: string, over: Overrides = {}) {
    const context = await browser.newContext({ baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_PORT ?? 3111}`, viewport: { width: 1280, height: 900 } });
    await seedSession(context);
    if (role) {
        await context.addInitScript((r) => {
            const raw = localStorage.getItem('auth-store');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            parsed.state.role = r;
            localStorage.setItem('auth-store', JSON.stringify(parsed));
        }, role);
    }
    const graphql = fakeGraphql({ ...ALL, ...FEED, ...over } as never);
    await wireNetwork(context, graphql);
    const page = await context.newPage();
    await page.goto(`/en${path}`, { waitUntil: 'load' });
    await expect(page.locator('header.h-app-top-down')).toBeVisible({ timeout: 90_000 });
    return { page, graphql };
}

const cardOf = (page: Page, text: string) => page.locator('[id^="feed-post-"]').filter({ hasText: text });
const menuOf = (page: Page, text: string) => cardOf(page, text).locator('button:has(svg[class*="ellipsis"], svg[class*="more-horizontal"])');
const calls = (g: ReturnType<typeof fakeGraphql>, name: string) => g.calls.filter((c) => c.name === name);

test('super admin: Delete on another user\'s post and on a community post; confirm sends AdminDeletePost and the post goes', async () => {
    const { page, graphql } = await openAs('SUPER_ADMIN', '/home', OK);
    await expect(cardOf(page, 'Cocoa suppliers')).toBeVisible({ timeout: 90_000 });

    await menuOf(page, 'Cocoa suppliers').click();
    await page.getByRole('menuitem', { name: 'Delete post' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('as a platform admin');
    await dialog.getByRole('button', { name: 'Delete post' }).click();
    await expect(cardOf(page, 'Cocoa suppliers')).toHaveCount(0);
    expect(calls(graphql, 'AdminDeletePost')).toHaveLength(1);
    expect(calls(graphql, 'AdminDeletePost')[0].variables).toEqual({ input: { postId: P_OTHER } });
    expect(calls(graphql, 'DeletePost')).toHaveLength(0);

    await menuOf(page, 'Community meeting notes').click();
    await page.getByRole('menuitem', { name: 'Delete post' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete post' }).click();
    await expect(cardOf(page, 'Community meeting notes')).toHaveCount(0);
    expect(calls(graphql, 'AdminDeletePost')[1].variables).toEqual({ input: { postId: P_COMMUNITY } });
    await page.context().close();
});

test('super admin: own post still uses DeletePost', async () => {
    const { page, graphql } = await openAs('super_admin', '/home', OK);
    await expect(cardOf(page, 'My own post')).toBeVisible({ timeout: 90_000 });
    await menuOf(page, 'My own post').click();
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(cardOf(page, 'My own post')).toHaveCount(0);
    expect(calls(graphql, 'DeletePost')).toHaveLength(1);
    expect(calls(graphql, 'DeletePost')[0].variables).toEqual({ id: P_OWN });
    expect(calls(graphql, 'AdminDeletePost')).toHaveLength(0);
    await page.context().close();
});

// Since the post actions menu (Not interested / Report / Unfriend…) every signed-in
// viewer has a "⋯" on others' posts; what must never appear for them is admin delete.
test('normal user: others\' posts offer no admin delete, AdminDeletePost is never sent', async () => {
    const { page, graphql } = await openAs('diaspora', '/home', OK);
    await expect(cardOf(page, 'Cocoa suppliers')).toBeVisible({ timeout: 90_000 });
    await expect(cardOf(page, 'My own post')).toBeVisible();
    for (const text of ['Cocoa suppliers', 'Community meeting notes']) {
        await menuOf(page, text).click();
        await expect(page.getByRole('menuitem', { name: 'Report post' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Delete post' })).toHaveCount(0);
        await page.keyboard.press('Escape');
    }
    await expect(menuOf(page, 'My own post')).toHaveCount(1);
    expect(calls(graphql, 'AdminDeletePost')).toHaveLength(0);
    await page.context().close();

    // A session with no recorded role (signed in before this shipped) behaves the same.
    const bare = await openAs(null, '/home', OK);
    await expect(cardOf(bare.page, 'Cocoa suppliers')).toBeVisible({ timeout: 90_000 });
    await menuOf(bare.page, 'Cocoa suppliers').click();
    await expect(bare.page.getByRole('menuitem', { name: 'Delete post' })).toHaveCount(0);
    await bare.page.context().close();
});

test('a refused AdminDeletePost shows an error and the post stays', async () => {
    const { page, graphql } = await openAs('super_admin', '/home', REFUSED);
    await expect(cardOf(page, 'Cocoa suppliers')).toBeVisible({ timeout: 90_000 });
    await menuOf(page, 'Cocoa suppliers').click();
    await page.getByRole('menuitem', { name: 'Delete post' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete post' }).click();
    await expect.poll(() => calls(graphql, 'AdminDeletePost').length).toBe(1);
    await expect(page.locator('[data-sonner-toast][data-type="error"]')).toBeVisible();
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
    await expect(cardOf(page, 'Cocoa suppliers')).toBeVisible();
    await page.context().close();
});

test('post page: a super admin can delete someone else\'s post and returns home', async () => {
    const { page, graphql } = await openAs('super_admin', `/post/${P_OTHER}`, { ...OK, GetPost: { post: POSTS[0] } });
    const menu = page.locator('button:has(svg[class*="ellipsis"], svg[class*="more-horizontal"])').first();
    await expect(menu).toBeVisible({ timeout: 90_000 });
    await menu.click();
    await page.getByRole('menuitem', { name: 'Delete post' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete post' }).click();
    await expect.poll(() => calls(graphql, 'AdminDeletePost').length).toBe(1);
    expect(calls(graphql, 'AdminDeletePost')[0].variables).toEqual({ input: { postId: P_OTHER } });
    await expect(page).toHaveURL(/\/home$/);
    await page.context().close();
});
