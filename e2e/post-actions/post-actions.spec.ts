/**
 * The "⋯" menu on someone else's post: Not interested, Report, Unfriend /
 * Unfollow (people), Leave (communities and associations).
 *
 * GraphQL is mocked, so these specs assert what each click SENDS and what the
 * card shows afterwards. The relationship (connected? following? member?) is
 * answered per author, so one feed exercises every branch of the menu.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { seedSession, wireNetwork, fakeGraphql } from '../support/fakeSession';
import { ALL, FEED_OVERRIDES, post } from '../redesign/fixtures';
import type { Overrides } from '../support/eventFixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const FRIEND = '00000000-0000-4000-8000-0000000a0b01';
const STRANGER = '00000000-0000-4000-8000-0000000a0b02';
const COMMUNITY = '00000000-0000-4000-8000-0000000c0c01';
const ASSOCIATION = '00000000-0000-4000-8000-0000000c0c02';
const CONNECTION = '00000000-0000-4000-8000-0000000e0001';
const P_FRIEND = '00000000-0000-4000-8000-0000000d0101';
const P_STRANGER = '00000000-0000-4000-8000-0000000d0102';
const P_COMMUNITY = '00000000-0000-4000-8000-0000000d0103';
const P_ASSOCIATION = '00000000-0000-4000-8000-0000000d0104';

const person = (id: string, name: string) => ({
    authorId: id,
    author: { __typename: 'PostAuthor', id, authorType: 'USER', displayName: name, avatarUrl: null, trustScore: null },
});
const entity = (type: 'COMMUNITY' | 'ASSOCIATION', id: string, name: string) => ({
    authorType: type,
    authorId: id,
    author: { __typename: 'PostAuthor', id, authorType: type, displayName: name, avatarUrl: null, trustScore: null },
});

const POSTS = [
    post(P_FRIEND, 'Cocoa suppliers wanted in Ghana', person(FRIEND, 'Kofi Mensah')),
    post(P_STRANGER, 'Selling a used car in Berlin', person(STRANGER, 'Yaw Boateng')),
    post(P_COMMUNITY, 'Community meeting notes for October', entity('COMMUNITY', COMMUNITY, 'Accra Union')),
    post(P_ASSOCIATION, 'Association scholarship announcement', entity('ASSOCIATION', ASSOCIATION, 'Nurses Abroad')),
];

const ranked = POSTS.map((p) => ({ __typename: 'RankedItem', itemId: p.id, itemType: 'POST', score: 1, authorId: p.authorId, topics: [], source: 'e2e', createdAt: p.createdAt }));
const FEED: Overrides = {
    ...FEED_OVERRIDES,
    RecommendedPosts: { recommendedPosts: { __typename: 'RankedFeedPage', items: ranked, nextCursor: null, rankingStrategy: 'e2e', explorationRatio: 0 } },
    JoinedCommunityFeed: { joinedCommunityFeed: { __typename: 'RankedFeedPage', items: ranked, nextCursor: null, rankingStrategy: 'e2e', explorationRatio: 0 } },
    GetPostsByIds: (v: Record<string, unknown>) => ({ postsByIds: POSTS.filter((p) => ((v.ids as string[]) ?? []).includes(p.id)) }),
};

const RELATIONS: Overrides = {
    GetPostAuthorRelation: (v: Record<string, unknown>) =>
        v.userId === FRIEND
            ? {
                  getProfile: { __typename: 'GetProfileResponse', success: true, connectionStatus: 'connected', connectionId: CONNECTION },
                  isFollowing: { __typename: 'IsFollowingResponse', success: true, isFollowing: true },
              }
            : {
                  getProfile: { __typename: 'GetProfileResponse', success: true, connectionStatus: 'none', connectionId: null },
                  isFollowing: { __typename: 'IsFollowingResponse', success: true, isFollowing: false },
              },
    GetMyMembershipsCommunity: (v: Record<string, unknown>) =>
        v.entityId === COMMUNITY
            ? { myMembership: { __typename: 'MembershipRequestResponse', id: 'm-1', status: 'ACTIVE', expiresAt: null, hasActiveSubscription: false, entityName: 'Accra Union' } }
            : { myMembership: null },
};

const OK: Overrides = {
    HidePost: { hidePost: { __typename: 'OperationResult', success: true } },
    ReportPost: { reportPost: { __typename: 'OperationResult', success: true } },
    RemoveFriend: { removeFriend: { __typename: 'RemoveFriendResponse', success: true, message: 'ok' } },
    UnfollowUser: { unfollowUser: { __typename: 'UnfollowUserResponse', success: true, message: 'ok' } },
    LeaveCommunity: { leaveCommunity: { __typename: 'RemoveResponse', success: true, message: 'ok' } },
    LeaveAssociation: { leaveAssociation: { __typename: 'RemoveResponse', success: true, message: 'ok' } },
    RecordInteraction: { recordInteraction: { __typename: 'RecommendationOperationResult', success: true, message: null } },
};

async function open(over: Overrides = {}, viewport = { width: 1280, height: 900 }) {
    const context = await browser.newContext({ baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_PORT ?? 3111}`, viewport });
    await seedSession(context);
    const graphql = fakeGraphql({ ...ALL, ...FEED, ...RELATIONS, ...OK, ...over } as never);
    await wireNetwork(context, graphql);
    const page = await context.newPage();
    await page.goto('/en/home', { waitUntil: 'load' });
    await expect(page.locator('header.h-app-top-down')).toBeVisible({ timeout: 90_000 });
    await expect(cardOf(page, 'Cocoa suppliers')).toBeVisible({ timeout: 90_000 });
    return { page, graphql };
}

const cardOf = (page: Page, text: string) => page.locator('[id^="feed-post-"]').filter({ hasText: text });
const openMenu = (page: Page, text: string) => cardOf(page, text).getByRole('button', { name: 'More actions for this post' }).click();
const calls = (g: ReturnType<typeof fakeGraphql>, name: string) => g.calls.filter((c) => c.name === name);

test('Not interested hides the post in place and sends HidePost once', async () => {
    const { page, graphql } = await open();
    await openMenu(page, 'Selling a used car');
    await page.getByRole('menuitem', { name: 'Not interested' }).click();

    await expect(page.getByText("Post hidden. You'll see fewer posts like this.")).toBeVisible();
    await expect(cardOf(page, 'Selling a used car')).toHaveCount(0);
    expect(calls(graphql, 'HidePost')).toHaveLength(1);
    expect(calls(graphql, 'HidePost')[0].variables).toEqual({ id: P_STRANGER });
    // Hiding already reaches the recommender through post-feed; no second signal.
    expect(calls(graphql, 'RecordInteraction')).toHaveLength(0);
    await page.context().close();
});

test('a refused HidePost shows an error and the post stays', async () => {
    const { page, graphql } = await open({ HidePost: { __errors: [{ message: 'Post not found', code: 'BAD_USER_INPUT' }] } });
    await openMenu(page, 'Selling a used car');
    await page.getByRole('menuitem', { name: 'Not interested' }).click();

    await expect.poll(() => calls(graphql, 'HidePost').length).toBe(1);
    await expect(page.locator('[data-sonner-toast][data-type="error"]')).toBeVisible();
    await expect(cardOf(page, 'Selling a used car')).toBeVisible();
    await page.context().close();
});

test('Report needs a reason, sends ReportPost with it, then collapses the card', async () => {
    const { page, graphql } = await open();
    await openMenu(page, 'Selling a used car');
    await page.getByRole('menuitem', { name: 'Report post' }).click();

    const dialog = page.getByRole('dialog');
    const send = dialog.getByRole('button', { name: 'Send report' });
    await expect(send).toBeDisabled();
    await dialog.getByLabel('Scam or fraud').check();
    await dialog.getByLabel('More details (optional)').fill('  Asked me to pay a deposit first.  ');
    await send.click();

    await expect(dialog).toContainText('Thanks for letting us know');
    expect(calls(graphql, 'ReportPost')[0].variables).toEqual({
        input: { postId: P_STRANGER, reason: 'SCAM', details: 'Asked me to pay a deposit first.' },
    });
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByText('You reported this post. Our team will review it.')).toBeVisible();
    await page.context().close();
});

test('a connected friend: Unfriend confirms, sends RemoveFriend with the connection, and teaches the ranker', async () => {
    const { page, graphql } = await open();
    await openMenu(page, 'Cocoa suppliers');
    await page.getByRole('menuitem', { name: 'Unfriend Kofi Mensah' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Unfriend Kofi Mensah?');
    await dialog.getByRole('button', { name: 'Unfriend' }).click();

    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toContainText("You're no longer connected with Kofi Mensah");
    expect(calls(graphql, 'RemoveFriend')[0].variables).toEqual({ input: { connectionId: CONNECTION } });
    await expect.poll(() => calls(graphql, 'RecordInteraction').length).toBe(1);
    expect(calls(graphql, 'RecordInteraction')[0].variables).toEqual({
        input: { itemType: 'POST', itemId: P_FRIEND, kind: 'UNFOLLOW' },
    });
    await page.context().close();
});

test('a followed person: Unfollow sends UnfollowUser for the author', async () => {
    const { page, graphql } = await open();
    await openMenu(page, 'Cocoa suppliers');
    await page.getByRole('menuitem', { name: 'Unfollow Kofi Mensah' }).click();

    await expect.poll(() => calls(graphql, 'UnfollowUser').length).toBe(1);
    expect(calls(graphql, 'UnfollowUser')[0].variables).toEqual({ userId: FRIEND });
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toContainText('You unfollowed Kofi Mensah');
    await page.context().close();
});

test('a stranger: no Unfriend or Unfollow, only the post actions', async () => {
    const { page } = await open();
    await openMenu(page, 'Selling a used car');
    await expect(page.getByRole('menuitem', { name: 'Not interested' })).toBeVisible();
    await expect.poll(async () => page.getByRole('menuitem', { name: /Loading/ }).count()).toBe(0);
    await expect(page.getByRole('menuitem', { name: /^Unfriend/ })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: /^Unfollow/ })).toHaveCount(0);
    await page.context().close();
});

test('community member: Leave confirms and sends LeaveCommunity; a non-member association offers no Leave', async () => {
    const { page, graphql } = await open();
    await openMenu(page, 'Community meeting notes');
    await page.getByRole('menuitem', { name: 'Leave Accra Union' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Leave' }).click();

    await expect.poll(() => calls(graphql, 'LeaveCommunity').length).toBe(1);
    expect(calls(graphql, 'LeaveCommunity')[0].variables).toEqual({ communityId: COMMUNITY });
    await expect.poll(() => calls(graphql, 'RecordInteraction').length).toBe(1);
    expect(calls(graphql, 'RecordInteraction')[0].variables).toEqual({
        input: { itemType: 'POST', itemId: P_COMMUNITY, kind: 'LEAVE_COMMUNITY' },
    });

    await openMenu(page, 'Association scholarship');
    await expect(page.getByRole('menuitem', { name: 'Report post' })).toBeVisible();
    await expect.poll(async () => page.getByRole('menuitem', { name: /Loading/ }).count()).toBe(0);
    await expect(page.getByRole('menuitem', { name: /^Leave/ })).toHaveCount(0);
    expect(calls(graphql, 'LeaveAssociation')).toHaveLength(0);
    await page.context().close();
});

test('360 px: the menu and the report dialog fit the screen', async () => {
    const { page } = await open({}, { width: 360, height: 760 });
    await openMenu(page, 'Cocoa suppliers');
    await expect(page.getByRole('menuitem', { name: 'Unfriend Kofi Mensah' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Report post' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const box = await page.getByRole('dialog').boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= 360).toBe(true);
    await page.context().close();
});
