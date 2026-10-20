/** Circles: the invitation inbox (accept / decline). */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { open } from './fixtures';
import { card, circle, memberScreens } from './circleFixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const T = '2026-10-10T10:00:00Z';
const FUTURE = '2099-01-01T00:00:00Z';
const NO_IDS = /\b(cir|mot|jr|inv|usr|mem)-\d+\b/;

const invitation = (i: number, over: Record<string, unknown> = {}) => ({
    __typename: 'CircleInvitation',
    id: `inv-${i}`,
    circleId: `cir-${i}`,
    inviteeUserId: 'me',
    inviteeContact: null,
    invitedBy: `usr-${i}`,
    status: 'PENDING',
    expiresAt: FUTURE,
    createdAt: T,
    ...over,
});

const joinRequest = (i: number, over: Record<string, unknown> = {}) => ({
    __typename: 'CircleJoinRequest',
    id: `jr-${i}`,
    circleId: 'cir-1',
    userId: `usr-${i + 8}`,
    note: null,
    status: 'PENDING',
    decidedByUserId: null,
    decidedByMotionId: null,
    createdAt: T,
    decidedAt: null,
    ...over,
});

const PEOPLE: Record<string, [string, string]> = {
    'usr-5': ['Kofi', 'Mensah'],
    'usr-6': ['Abena', 'Owusu'],
    'usr-9': ['Esi', 'Boateng'],
    'usr-10': ['Yaw', 'Darko'],
};
const GetUserProfile = (v: Record<string, unknown>) => {
    const [firstName, lastName] = PEOPLE[String(v.userId)] ?? ['Ama', 'Mensah'];
    return { getProfile: { __typename: 'ProfileResponse', success: true, message: 'ok', profile: { __typename: 'Profile', userId: v.userId, firstName, lastName, avatarUrl: null } } };
};
const CirclePublicCard = (v: Record<string, unknown>) => ({
    circlePublicCard: v.circleId === 'cir-5' ? card(5, 'Accra Runners', 'INVITE_ONLY') : v.circleId === 'cir-6' ? card(6, 'Book Club Berlin', 'INVITE_ONLY') : null,
});

const noHScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const toasts = (page: Page) => page.locator('[data-sonner-toaster]').innerText();

test.describe('invitation inbox', () => {
    test('lists only pending, unexpired invitations by circle and inviter name, no ids', async () => {
        const { page } = await open(browser, '/circles/invitations', {
            MyCircleInvitations: { myCircleInvitations: [invitation(5), invitation(6), invitation(7, { status: 'DECLINED' }), invitation(8, { expiresAt: '2020-01-01T00:00:00Z' }), invitation(3, { status: 'INVITATION_PENDING', circleId: 'cir-3', invitedBy: 'usr-3' })] },
            CirclePublicCard,
            GetUserProfile,
        } as never);
        const rows = page.getByTestId('circle-invitation');
        await expect(rows).toHaveCount(3, { timeout: 90_000 });
        await expect(rows.nth(0)).toContainText('Accra Runners');
        await expect(rows.nth(0)).toContainText('Invited by Kofi Mensah');
        await expect(rows.nth(1)).toContainText('Book Club Berlin');
        // A circle whose card cannot be read falls back to a generic label, never an id.
        await expect(rows.nth(2)).toContainText('A circle');
        await expect(rows.first().getByRole('button', { name: /Accept the invitation to Accra Runners/ })).toBeVisible();
        expect(await page.locator('body').innerText()).not.toMatch(NO_IDS);
        await page.context().close();
    });

    test('Accept sends the right mutation, then lands on the circle as a member', async () => {
        let member = false;
        const { page, graphql } = await open(browser, '/circles/invitations', {
            ...memberScreens('MEMBER'),
            MyCircleInvitations: () => ({ myCircleInvitations: member ? [] : [invitation(5)] }),
            CirclePublicCard,
            GetUserProfile,
            Circle: { circle: circle(5, 'Accra Runners') },
            RespondToCircleInvitation: () => {
                member = true;
                return { respondToCircleInvitation: invitation(5, { status: 'ACCEPTED' }) };
            },
        } as never);
        await page.getByRole('button', { name: /Accept the invitation to Accra Runners/ }).click({ timeout: 90_000 });
        await expect.poll(() => graphql.calls.find((c) => c.name === 'RespondToCircleInvitation')?.variables).toEqual({ invitationId: 'inv-5', accept: true });
        await expect(page).toHaveURL(/\/circles\/cir-5$/, { timeout: 30_000 });
        await expect(page.getByText('Accra Runners').first()).toBeVisible({ timeout: 30_000 });
        await page.context().close();
    });

    test('Decline sends accept:false and the row goes away', async () => {
        let declined = false;
        const { page, graphql } = await open(browser, '/circles/invitations', {
            MyCircleInvitations: () => ({ myCircleInvitations: declined ? [invitation(6)] : [invitation(5), invitation(6)] }),
            CirclePublicCard,
            GetUserProfile,
            RespondToCircleInvitation: () => {
                declined = true;
                return { respondToCircleInvitation: invitation(5, { status: 'DECLINED' }) };
            },
        } as never);
        const rows = page.getByTestId('circle-invitation');
        await expect(rows).toHaveCount(2, { timeout: 90_000 });
        await page.getByRole('button', { name: /Decline the invitation to Accra Runners/ }).click();
        await expect.poll(() => graphql.calls.find((c) => c.name === 'RespondToCircleInvitation')?.variables).toEqual({ invitationId: 'inv-5', accept: false });
        await expect(rows).toHaveCount(1);
        await expect(rows.first()).toContainText('Book Club Berlin');
        await expect(page).toHaveURL(/\/circles\/invitations$/);
        await page.context().close();
    });

    for (const [accept, label, message, code] of [
        [true, 'Accept', 'This invitation is no longer valid.', 'CIRCLE_NOT_A_MEMBER'],
        [true, 'Accept', "That didn't go through. Please try again.", 'INTERNAL_SERVER_ERROR'],
        [false, 'Decline', 'This invitation is no longer valid.', 'CIRCLE_NOT_A_MEMBER'],
    ] as const) {
        test(`${label} refused (${code}) shows its own message and no false success`, async () => {
            const { page, graphql } = await open(browser, '/circles/invitations', {
                MyCircleInvitations: { myCircleInvitations: [invitation(5)] },
                CirclePublicCard,
                GetUserProfile,
                RespondToCircleInvitation: { __errors: [{ message: 'raw server text 0f3c', code }] },
            } as never);
            await page.getByRole('button', { name: new RegExp(`${label} the invitation to Accra Runners`) }).click({ timeout: 90_000 });
            await expect(page.getByText(message)).toBeVisible();
            const t = await toasts(page);
            expect(t).not.toMatch(/You joined|Invitation declined/);
            expect(await page.evaluate(() => document.body.innerText)).not.toContain('raw server text');
            await expect(page.getByTestId('circle-invitation')).toHaveCount(1);
            await expect(page).toHaveURL(/\/circles\/invitations$/);
            expect(graphql.calls.filter((c) => c.name === 'RespondToCircleInvitation')).toHaveLength(1);
            await page.context().close();
        });
    }

    test('a full circle says so', async () => {
        const { page } = await open(browser, '/circles/invitations', {
            MyCircleInvitations: { myCircleInvitations: [invitation(5)] },
            CirclePublicCard,
            GetUserProfile,
            RespondToCircleInvitation: { __errors: [{ message: 'Entitlement MAX_MEMBERS reached: usage 12 of limit 12', code: 'INTERNAL_SERVER_ERROR' }] },
        } as never);
        await page.getByRole('button', { name: /Accept the invitation/ }).click({ timeout: 90_000 });
        await expect(page.getByText("This circle is full right now, so you can't join yet.")).toBeVisible();
        await page.context().close();
    });

    test('empty state is true', async () => {
        const { page } = await open(browser, '/circles/invitations', { MyCircleInvitations: { myCircleInvitations: [] } } as never);
        await expect(page.getByText('No pending invitations')).toBeVisible({ timeout: 90_000 });
        await expect(page.getByTestId('circle-invitation')).toHaveCount(0);
        await page.context().close();
    });

    test('a failed load shows an error with retry, not an empty state', async () => {
        let fail = true;
        const { page } = await open(browser, '/circles/invitations', {
            MyCircleInvitations: () => (fail ? { __errors: [{ message: 'boom', code: 'INTERNAL_SERVER_ERROR' }] } : { myCircleInvitations: [invitation(5)] }),
            CirclePublicCard,
            GetUserProfile,
        } as never);
        await expect(page.getByText("We couldn't load your invitations. Please try again.")).toBeVisible({ timeout: 90_000 });
        await expect(page.getByText('No pending invitations')).toHaveCount(0);
        fail = false;
        await page.getByRole('button', { name: /Try again/ }).click();
        await expect(page.getByTestId('circle-invitation')).toHaveCount(1);
        await page.context().close();
    });

    test('fits at 360 px', async () => {
        const { page } = await open(browser, '/circles/invitations', {
            MyCircleInvitations: { myCircleInvitations: [invitation(5), invitation(6)] },
            CirclePublicCard,
            GetUserProfile,
        } as never, { width: 360, height: 800 });
        await expect(page.getByTestId('circle-invitation')).toHaveCount(2, { timeout: 90_000 });
        expect(await noHScroll(page)).toBeLessThanOrEqual(0);
        await page.context().close();
    });

    test('the Circles page shows a count badge and links to the inbox', async () => {
        const { page } = await open(browser, '/circles', {
            MyCircles: { myCircles: [] },
            SearchCircles: { searchCircles: [] },
            MyCircleInvitations: { myCircleInvitations: [invitation(5), invitation(6)] },
            CirclePublicCard,
            GetUserProfile,
        } as never);
        const link = page.getByTestId('circle-invitations-link');
        await expect(link).toBeVisible({ timeout: 90_000 });
        await expect(page.getByTestId('circle-invitations-badge')).toHaveText('2');
        await link.click();
        await expect(page).toHaveURL(/\/circles\/invitations$/);
        await expect(page.getByTestId('circle-invitation')).toHaveCount(2);
        await page.context().close();
    });

    test('no badge when nothing is pending', async () => {
        const { page } = await open(browser, '/circles', { MyCircles: { myCircles: [] }, SearchCircles: { searchCircles: [] }, MyCircleInvitations: { myCircleInvitations: [] } } as never);
        await expect(page.getByTestId('circle-invitations-link')).toBeVisible({ timeout: 90_000 });
        await expect(page.getByTestId('circle-invitations-badge')).toHaveCount(0);
        await page.context().close();
    });
});
