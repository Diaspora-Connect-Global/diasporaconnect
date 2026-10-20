/** Circles: the lead's "Join requests" section (Members page). Approve = open an ADMIT_MEMBER motion; there is no decline rpc. */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { open } from './fixtures';
import { memberScreens, motion } from './circleFixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const T = '2026-10-15T10:00:00Z';
const request = (i: number, over: Record<string, unknown> = {}) => ({
    __typename: 'CircleJoinRequest',
    id: `req-${i}`,
    circleId: 'cir-1',
    userId: `usr-${10 + i}`,
    note: null,
    status: 'PENDING',
    decidedByUserId: null,
    decidedByMotionId: null,
    createdAt: T,
    decidedAt: null,
    ...over,
});

const NAMES: Record<string, [string, string]> = { 'usr-11': ['Efua', 'Boateng'], 'usr-12': ['Kwame', 'Asante'] };
const profile = (v: Record<string, unknown>) => {
    const n = NAMES[String(v.userId)] ?? ['Someone', 'Else'];
    return { getProfile: { __typename: 'ProfileResponse', success: true, message: 'ok', profile: { __typename: 'Profile', userId: v.userId, username: null, firstName: n[0], lastName: n[1], avatarUrl: null } } };
};

const base = (role: 'LEAD' | 'MEMBER', over: Record<string, unknown> = {}) =>
    ({ ...memberScreens(role), GetUserProfile: profile, CircleJoinRequests: { circleJoinRequests: [request(1, { note: 'I run the Accra meetup.' }), request(2)] }, ...over }) as never;

const noHScroll = (page: import('@playwright/test').Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const URL = '/circles/cir-1/members';

test('a lead sees pending requests with names, message and date, and no ids', async () => {
    const { page, graphql } = await open(browser, URL, base('LEAD'));
    const section = page.getByTestId('join-requests');
    await expect(section.getByRole('heading', { name: 'Join requests (2)' })).toBeVisible({ timeout: 90_000 });
    await expect(section).toContainText('Efua Boateng');
    await expect(section).toContainText('Kwame Asante');
    await expect(section).toContainText('I run the Accra meetup.');
    await expect(section).toContainText('Asked');
    expect(await section.innerText()).not.toMatch(/\b(usr|req|cir|mot)-\d+\b/);
    expect(graphql.calls.find((c) => c.name === 'CircleJoinRequests')?.variables).toMatchObject({ circleId: 'cir-1', status: 'JOIN_REQUEST_PENDING' });
    await page.context().close();
});

test('approve opens an ADMIT_MEMBER motion for that person and says members will vote', async () => {
    let opened = false;
    const { page, graphql } = await open(
        browser,
        URL,
        base('LEAD', {
            CircleMotions: () => ({ circleMotions: opened ? [motion(5, { kind: 'ADMIT_MEMBER', subjectType: 'MEMBER', subjectId: 'usr-11' })] : [] }),
            OpenCircleMotion: () => {
                opened = true;
                return { openCircleMotion: motion(5, { kind: 'ADMIT_MEMBER', subjectType: 'MEMBER', subjectId: 'usr-11' }) };
            },
        }),
    );
    const section = page.getByTestId('join-requests');
    await section.getByRole('button', { name: 'Approve Efua Boateng' }).click({ timeout: 90_000 });
    await expect.poll(() => graphql.calls.find((c) => c.name === 'OpenCircleMotion')?.variables).toMatchObject({
        input: { circleId: 'cir-1', kind: 'ADMIT_MEMBER', subjectType: 'MEMBER', subjectId: 'usr-11', idempotencyKey: 'admit-req-1' },
    });
    await expect(page.locator('[data-sonner-toaster]')).toContainText('Members will vote on this', { timeout: 30_000 });
    // The row now points at the running vote instead of offering Approve again.
    await expect(section.getByText('Members are voting on this.')).toHaveCount(1);
    await expect(section.getByRole('button', { name: 'Approve Efua Boateng' })).toHaveCount(0);
    await expect(section.getByRole('button', { name: 'Approve Kwame Asante' })).toBeVisible();
    await page.context().close();
});

for (const [code, message] of [
    ['CIRCLE_LEAD_REQUIRED', 'Your circle reserves this to its leads.'],
    ['CIRCLE_NOT_A_MEMBER', "You're no longer a member of this circle."],
] as const) {
    test(`refusal ${code} shows a message and no false success`, async () => {
        const { page, graphql } = await open(browser, URL, base('LEAD', { CircleMotions: { circleMotions: [] }, OpenCircleMotion: { __errors: [{ message: 'raw server text 0f3c', code }] } }));
        const btn = page.getByTestId('join-requests').getByRole('button', { name: 'Approve Efua Boateng' });
        await btn.click({ timeout: 90_000 });
        await expect(page.getByText(message, { exact: false })).toBeVisible();
        expect(await page.evaluate(() => document.body.innerText)).not.toContain('raw server text');
        expect(await page.locator('[data-sonner-toaster]').innerText()).not.toContain('Members will vote');
        await expect(btn).toBeEnabled();
        expect(graphql.calls.filter((c) => c.name === 'OpenCircleMotion')).toHaveLength(1);
        await page.context().close();
    });
}

test('a non-lead never sees the section and never queries requests', async () => {
    const { page, graphql } = await open(browser, URL, base('MEMBER'));
    await expect(page.getByRole('heading', { name: 'Members' }).first()).toBeVisible({ timeout: 90_000 });
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await expect(page.getByTestId('join-requests')).toHaveCount(0);
    expect(graphql.calls.filter((c) => c.name === 'CircleJoinRequests')).toHaveLength(0);
    await page.context().close();
});

test('empty state', async () => {
    const { page } = await open(browser, URL, base('LEAD', { CircleJoinRequests: { circleJoinRequests: [] } }));
    const section = page.getByTestId('join-requests');
    await expect(section).toContainText('No pending requests.', { timeout: 90_000 });
    await expect(section.getByRole('heading', { name: 'Join requests (0)' })).toBeVisible();
    await page.context().close();
});

test('load error shows a retry, not an empty list', async () => {
    const { page } = await open(browser, URL, base('LEAD', { CircleJoinRequests: { __errors: [{ message: 'boom', code: 'INTERNAL' }] } }));
    const section = page.getByTestId('join-requests');
    await expect(section).toContainText("couldn't load the join requests", { timeout: 90_000 });
    await expect(section).not.toContainText('No pending requests.');
    await page.context().close();
});

test('fits at 360 px with a long message and long name', async () => {
    const long = 'A very long message without any spaces '.repeat(6) + 'x'.repeat(80);
    const { page } = await open(browser, URL, base('LEAD', { CircleJoinRequests: { circleJoinRequests: [request(1, { note: long })] } }), { width: 360, height: 800 });
    await expect(page.getByTestId('join-requests')).toContainText('Efua Boateng', { timeout: 90_000 });
    expect(await noHScroll(page)).toBeLessThanOrEqual(0);
    await page.context().close();
});
