/** Circles: the third way in, "Open to join" (`circleJoin`), next to request and invite-only. */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { open } from './fixtures';
import { card, circle, JOIN_REFUSALS, memberScreens } from './circleFixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const noHScroll = (page: import('@playwright/test').Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const DISCOVER = [card(7, 'Open Doors', 'OPEN'), card(8, 'Ask First', 'REQUEST'), card(9, 'By Invitation', 'INVITE_ONLY')];

test('"How people get in" lists three ways and fits at 360 px', async () => {
    const { page } = await open(browser, '/circles', { MyCircles: { myCircles: [] }, SearchCircles: { searchCircles: [] } } as never, { width: 360, height: 800 });
    const ways = page.getByTestId('circles-ways');
    await expect(ways).toBeVisible({ timeout: 90_000 });
    await expect(ways.getByRole('heading', { name: 'How people get in' })).toBeVisible();
    await expect(ways.getByRole('listitem')).toHaveCount(3);
    for (const t of ['Invite only', 'Request to join', 'Open to join']) await expect(ways).toContainText(t);
    expect(await noHScroll(page)).toBeLessThanOrEqual(0);
    await page.context().close();
});

test('discover cards: OPEN joins, REQUEST requests, INVITE_ONLY has no action', async () => {
    let joined = false;
    const { page, graphql } = await open(browser, '/circles', {
        MyCircles: () => ({ myCircles: joined ? [circle(7, 'Open Doors', { joinMode: 'OPEN' })] : [] }),
        SearchCircles: { searchCircles: DISCOVER },
        CircleJoin: () => {
            joined = true;
            return { circleJoin: { __typename: 'CircleInviteLinkRedemption', circle: circle(7, 'Open Doors', { joinMode: 'OPEN' }), member: { __typename: 'CircleMember', id: 'mem-7', circleId: 'cir-7', userId: 'me', role: 'MEMBER', status: 'ACTIVE', invitedBy: null, removedByMotionId: null, joinedAt: '2026-10-18T10:00:00Z', leftAt: null } } };
        },
    } as never);
    const discover = page.getByTestId('discover-circles');
    await expect(discover).toContainText('Open Doors', { timeout: 90_000 });
    await expect(discover).toContainText('Open to join');
    await expect(discover.getByRole('button', { name: 'Request Access' })).toHaveCount(1);
    await expect(discover).toContainText('Invite to join');
    await expect(discover.getByRole('button', { name: 'Join circle' })).toHaveCount(1);

    await discover.getByRole('button', { name: 'Join circle' }).click();
    await expect.poll(() => graphql.calls.find((c) => c.name === 'CircleJoin')?.variables).toEqual({ circleId: 'cir-7' });
    // Member UI without a reload: the circle moved into "My Circles" and left Discover.
    await expect(page.getByTestId('my-circles')).toContainText('Open Doors', { timeout: 30_000 });
    await expect(discover).not.toContainText('Open Doors');
    await expect(discover.getByRole('button', { name: 'Request Access' })).toHaveCount(1);
    await page.context().close();
});

for (const [code, message] of JOIN_REFUSALS) {
    test(`refusal ${code} shows its message and no false success`, async () => {
        const { page, graphql } = await open(browser, '/circles', {
            MyCircles: { myCircles: [] },
            SearchCircles: { searchCircles: [card(7, 'Open Doors', 'OPEN')] },
            CircleJoin: { __errors: [{ message: 'raw server text 0f3c', code }] },
        } as never);
        const btn = page.getByTestId('discover-circles').getByRole('button', { name: 'Join circle' });
        await btn.click({ timeout: 90_000 });
        await expect(page.getByText(message, { exact: false })).toBeVisible();
        // The server's wording is never rendered. (innerText does not enter shadow roots, so the Next dev error overlay, which echoes console.error, is not counted.)
        expect(await page.evaluate(() => document.body.innerText)).not.toContain('raw server text');
        const toasts = await page.locator('[data-sonner-toaster]').innerText();
        expect(toasts, 'toasts: ' + toasts).not.toContain('Welcome to the circle');
        await expect(page.getByRole('button', { name: 'Joined' })).toHaveCount(0);
        await expect(btn).toBeEnabled();
        expect(graphql.calls.filter((c) => c.name === 'CircleJoin')).toHaveLength(1);
        await expect(page).toHaveURL(/\/circles$/); // a refusal never logs the user out
        await page.context().close();
    });
}

test('circle page: a stranger sees Join circle on an OPEN circle, joins, and gets the member UI', async () => {
    let member = false;
    const { page, graphql } = await open(browser, '/circles/cir-7', {
        Circle: () => (member ? { circle: circle(7, 'Open Doors', { joinMode: 'OPEN' }) } : { __errors: [{ message: 'not a member', code: 'CIRCLE_NOT_A_MEMBER' }] }),
        MyCircleMembership: () => ({ myCircleMembership: { __typename: 'CircleMembershipCheck', isMember: member, status: member ? 'ACTIVE' : null, role: member ? 'MEMBER' : null, isLead: false, canPropose: member } }),
        CirclePublicCard: { circlePublicCard: card(7, 'Open Doors', 'OPEN') },
        CircleChat: { circleChat: { __typename: 'CircleChat', circleId: 'cir-7', available: false, conversationId: null, historyDays: null, historyLimited: false } },
        CircleMotions: { circleMotions: [] },
        CircleProjects: { circleProjects: [] },
        CircleChallenges: { circleChallenges: [] },
        CircleJoin: () => {
            member = true;
            return { circleJoin: { __typename: 'CircleInviteLinkRedemption', circle: circle(7, 'Open Doors', { joinMode: 'OPEN' }), member: { __typename: 'CircleMember', id: 'mem-7', circleId: 'cir-7', userId: 'me', role: 'MEMBER', status: 'ACTIVE', invitedBy: null, removedByMotionId: null, joinedAt: '2026-10-18T10:00:00Z', leftAt: null } } };
        },
    } as never);
    const landing = page.getByTestId('circle-join-landing');
    await expect(landing).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText('This circle is private')).toHaveCount(0);
    await landing.getByRole('button', { name: 'Join circle' }).click();
    await expect.poll(() => graphql.calls.find((c) => c.name === 'CircleJoin')?.variables).toEqual({ circleId: 'cir-7' });
    await expect(page.getByTestId('circle-join-landing')).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Open Doors' }).first()).toBeVisible();
    await page.context().close();
});

test('circle page: REQUEST keeps "Request Access" and INVITE_ONLY stays a private state', async () => {
    const base = {
        Circle: { circle: null },
        MyCircleMembership: { myCircleMembership: { __typename: 'CircleMembershipCheck', isMember: false, status: null, role: null, isLead: false, canPropose: false } },
        CircleChat: { circleChat: null },
    };
    const a = await open(browser, '/circles/cir-8', { ...base, CirclePublicCard: { circlePublicCard: card(8, 'Ask First', 'REQUEST') }, RequestToJoinCircle: { requestToJoinCircle: { __typename: 'CircleJoinRequest', id: 'r1', circleId: 'cir-8', userId: 'u', status: 'PENDING', note: null, createdAt: '2026-01-01T00:00:00Z' } } } as never);
    await a.page.getByRole('button', { name: 'Request Access' }).click({ timeout: 90_000 });
    await expect(a.page.getByRole('button', { name: 'Request sent' })).toBeVisible();
    expect(a.graphql.calls.some((c) => c.name === 'RequestToJoinCircle' && c.variables.circleId === 'cir-8')).toBe(true);
    expect(a.graphql.calls.some((c) => c.name === 'CircleJoin')).toBe(false);
    await a.page.context().close();

    const b = await open(browser, '/circles/cir-9', { ...base, CirclePublicCard: { circlePublicCard: card(9, 'By Invitation', 'INVITE_ONLY') } } as never);
    await expect(b.page.getByText('This circle is private')).toBeVisible({ timeout: 90_000 });
    await expect(b.page.getByRole('button', { name: 'Join circle' })).toHaveCount(0);
    await b.page.context().close();
});

test('requesting an OPEN circle is refused (CIRCLE_IS_OPEN): says so, never "Request sent"', async () => {
    const { page } = await open(browser, '/circles/cir-8', {
        Circle: { circle: null },
        MyCircleMembership: { myCircleMembership: { __typename: 'CircleMembershipCheck', isMember: false, status: null, role: null, isLead: false, canPropose: false } },
        CircleChat: { circleChat: null },
        CirclePublicCard: { circlePublicCard: card(8, 'Ask First', 'REQUEST') },
        RequestToJoinCircle: { __errors: [{ message: 'raw', code: 'CIRCLE_IS_OPEN' }] },
    } as never);
    await page.getByRole('button', { name: 'Request Access' }).click({ timeout: 90_000 });
    await expect(page.getByText('This circle is open to join now.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request sent' })).toHaveCount(0);
    await page.context().close();
});

test('create form offers three ways in, distinct at 360 px, and sends OPEN', async () => {
    const { page, graphql } = await open(browser, '/circles/create', { CreateCircle: { createCircle: circle(11, 'New One', { joinMode: 'OPEN' }) } } as never, { width: 360, height: 800 });
    const group = page.getByRole('radiogroup', { name: /How do people get in/ });
    await expect(group).toBeVisible({ timeout: 90_000 });
    await expect(group.getByRole('radio')).toHaveCount(3);
    for (const t of ['Request to join', 'Invite only', 'Open to join']) await expect(group.getByRole('radio', { name: new RegExp(t) })).toBeVisible();
    expect(await noHScroll(page)).toBeLessThanOrEqual(0);
    await group.getByRole('radio', { name: /Open to join/ }).check({ force: true });
    await page.getByLabel('Circle name').fill('New One');
    await page.getByRole('button', { name: 'Create Circle' }).click();
    await expect.poll(() => (graphql.calls.find((c) => c.name === 'CreateCircle')?.variables as { input?: { joinMode?: string } })?.input?.joinMode).toBe('OPEN');
    await page.context().close();
});

test('settings: a lead picks among three ways in and OPEN goes through the existing setCircleJoinMode', async () => {
    const base = memberScreens('LEAD');
    const { page, graphql } = await open(browser, '/circles/cir-1/settings', { ...base, SetCircleJoinMode: { setCircleJoinMode: circle(1, 'Accra Tech Hub', { joinMode: 'OPEN' }) } } as never, { width: 360, height: 800 });
    await page.getByRole('button', { name: 'Access & discovery' }).click({ timeout: 90_000 });
    const group = page.getByRole('radiogroup', { name: 'How do people get in?' });
    await expect(group).toBeVisible();
    await expect(group.getByRole('radio')).toHaveCount(3);
    await group.getByRole('radio', { name: /Open to join/ }).check({ force: true });
    await expect.poll(() => graphql.calls.find((c) => c.name === 'SetCircleJoinMode')?.variables).toEqual({ circleId: 'cir-1', joinMode: 'OPEN' });
    expect(await noHScroll(page)).toBeLessThanOrEqual(0);
    await page.context().close();
});

test('settings: a plain member sees the current way in as text, including "Open to join"', async () => {
    const base = memberScreens('MEMBER');
    const { page } = await open(browser, '/circles/cir-1/settings', { ...base, Circle: { circle: circle(1, 'Accra Tech Hub', { joinMode: 'OPEN' }) } } as never);
    await page.getByRole('button', { name: 'Access & discovery' }).click({ timeout: 90_000 });
    await expect(page.getByText('Finding and joining')).toBeVisible();
    await expect(page.getByRole('radio')).toHaveCount(0);
    await expect(page.locator('dd', { hasText: 'Open to join' })).toBeVisible();
    await page.context().close();
});
