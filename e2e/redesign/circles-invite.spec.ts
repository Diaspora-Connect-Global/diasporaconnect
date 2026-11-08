/** Circles: inviting a person by name or username from the Members page (leads only; email/phone are never sent). */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { open } from './fixtures';
import { ME } from '../support/fakeSession';
import { memberScreens } from './circleFixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const KOFI_ID = '00000000-0000-4000-8000-0000000d0001';
const ABENA_ID = '00000000-0000-4000-8000-0000000d0002';
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const person = (id: string, displayName: string | null, username: string | null) => ({
    __typename: 'UserSearchSummary',
    id,
    displayName,
    username,
    avatarUrl: null,
});

const PEOPLE = [person(KOFI_ID, 'Kofi Mensah', 'kofi'), person(ABENA_ID, 'Abena Owusu', 'abena')];

const invitation = (over: Record<string, unknown> = {}) => ({
    __typename: 'CircleInvitation',
    id: 'inv-1',
    circleId: 'cir-1',
    inviteeUserId: KOFI_ID,
    inviteeContact: null,
    invitedBy: ME,
    status: 'PENDING',
    expiresAt: '2099-01-01T00:00:00Z',
    createdAt: '2026-10-10T10:00:00Z',
    ...over,
});

// Names by substring, usernames by exact match, as the gateway answers.
const searchAnswer = (v: Record<string, unknown>) => {
    const q = String(v.query).toLowerCase();
    return { searchUserSummaries: PEOPLE.filter((p) => p.username === q || p.displayName?.toLowerCase().includes(q)) };
};

async function openMembers(over: Record<string, unknown> = {}, viewport?: { width: number; height: number }, role: 'LEAD' | 'MEMBER' = 'LEAD') {
    const r = await open(
        browser,
        '/circles/cir-1/members',
        {
            ...memberScreens(role),
            CircleInviteSearchPeople: searchAnswer,
            InviteToCircle: { inviteToCircle: invitation() },
            ...over,
        } as never,
        viewport,
    );
    await r.page.locator('button[aria-controls="circle-members-invite-panel"]').click();
    return r;
}

const field = (page: Page) => page.getByRole('combobox', { name: /name or username/i });
// Scoped to the people list: the Members page also has native <select>s, whose options match the same role.
const results = (page: Page) => page.getByRole('listbox', { name: 'People' }).getByRole('option');
const sentInvites = (graphql: { calls: Array<{ name: string; variables: Record<string, unknown> }> }) =>
    graphql.calls.filter((c) => c.name === 'InviteToCircle');
const searches = (graphql: { calls: Array<{ name: string; variables: Record<string, unknown> }> }) =>
    graphql.calls.filter((c) => c.name === 'CircleInviteSearchPeople');

test.describe('who sees the invite form', () => {
    test('a lead sees the invite button, and the form and link panel behind it', async () => {
        const { page } = await openMembers();
        await expect(field(page)).toBeVisible();
        await expect(page.getByRole('button', { name: 'Invite someone' })).toBeVisible();
    });

    test('an ordinary member sees no invite button and no form at all', async () => {
        const { page } = await open(browser, '/circles/cir-1/members', memberScreens('MEMBER') as never);
        await expect(page.locator('#circle-members-search')).toBeVisible();
        await expect(page.locator('button[aria-controls="circle-members-invite-panel"]')).toHaveCount(0);
        await expect(page.getByRole('combobox', { name: /name or username/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Copy circle link' })).toHaveCount(0);
    });
});

test.describe('invite by name or username', () => {
    test('typing a name lists people, and picking one sends their user id without showing it', async () => {
        const { page, graphql } = await openMembers();
        const input = field(page);
        await input.fill('mens');
        const options = results(page);
        await expect(options).toHaveCount(1);
        await expect(options.first()).toContainText('Kofi Mensah');
        await expect(options.first()).toContainText('@kofi');
        await expect(page.getByRole('status').filter({ hasText: '1 person found' })).toBeVisible();

        await options.first().click();
        await expect(input).toHaveValue('Kofi Mensah');
        await page.getByRole('button', { name: 'Invite someone' }).click();
        await expect(page.getByText('Invited Kofi Mensah')).toBeVisible();
        const sent = sentInvites(graphql);
        expect(sent).toHaveLength(1);
        expect(sent[0].variables).toEqual({ input: { circleId: 'cir-1', inviteeUserId: KOFI_ID } });
        await expect(input).toHaveValue('');
        // No id or fragment of one is ever on screen.
        const body = await page.locator('body').innerText();
        expect(body).not.toMatch(UUID);
        expect(body).not.toContain('0000000d');
    });

    test('a username is found, the @ is not sent, and the result count is bounded', async () => {
        const { page, graphql } = await openMembers();
        await field(page).fill('@abena');
        const options = results(page);
        await expect(options).toHaveCount(1);
        await expect(options.first()).toContainText('@abena');
        expect(searches(graphql)[0].variables).toEqual({ query: 'abena', limit: 8 });
    });

    test('someone with no name is shown by username; someone with neither is not offered', async () => {
        const { page } = await openMembers({
            CircleInviteSearchPeople: {
                searchUserSummaries: [person(KOFI_ID, null, 'kofi'), person(ABENA_ID, null, null)],
            },
        });
        await field(page).fill('ko');
        const options = results(page);
        await expect(options).toHaveCount(1);
        await expect(options.first()).toContainText('@kofi');
    });

    test('typing is debounced: one search for a fast "kofi", none under two characters', async () => {
        const { page, graphql } = await openMembers();
        const input = field(page);
        await input.pressSequentially('k');
        await page.waitForTimeout(600);
        expect(searches(graphql)).toHaveLength(0);
        await input.pressSequentially('ofi', { delay: 30 });
        await expect(results(page)).toHaveCount(1);
        expect(searches(graphql)).toHaveLength(1);
    });

    test('an email or phone number is never sent and never searched: a hint says to search by name', async () => {
        const { page, graphql } = await openMembers();
        const hint = page.getByText(/Search by name or username instead of an email or phone number/);
        await field(page).fill('new@example.com');
        await expect(hint).toBeVisible();
        await page.getByRole('button', { name: 'Invite someone' }).click();
        await expect(hint).toBeVisible();
        await expect(page.getByText(/^Invited /)).toHaveCount(0);
        await field(page).fill('+233 24 123 4567');
        await expect(hint).toBeVisible();
        await page.getByRole('button', { name: 'Invite someone' }).click();
        await expect(page.getByText(/^Invited /)).toHaveCount(0);
        expect(sentInvites(graphql)).toHaveLength(0);
        expect(searches(graphql)).toHaveLength(0);
    });

    test('a name with nobody picked is not sent and says what to do', async () => {
        const { page, graphql } = await openMembers();
        await field(page).fill('Someone Unknown');
        await page.getByRole('button', { name: 'Invite someone' }).click();
        await expect(page.getByRole('alert').filter({ hasText: 'Pick someone from the list' })).toBeVisible();
        expect(sentInvites(graphql)).toHaveLength(0);
        await expect(page.getByText(/^Invited /)).toHaveCount(0);
        await expect(field(page)).toHaveAttribute('aria-invalid', 'true');
    });

    test('no matches and a failed search each have their own state', async () => {
        const { page } = await openMembers();
        await field(page).fill('zzzz');
        await expect(page.getByRole('status').filter({ hasText: 'No one found' })).toBeVisible();
        await expect(results(page)).toHaveCount(0);

        const failing = await openMembers({
            CircleInviteSearchPeople: { __errors: [{ message: 'People search is temporarily unavailable', code: 'INTERNAL_SERVER_ERROR' }] },
        });
        await field(failing.page).fill('kofi');
        await expect(failing.page.getByRole('status').filter({ hasText: "Search didn't work" })).toBeVisible();
    });

    test('refusals are answered in our words and never tick', async () => {
        for (const [raw, text] of [
            ['Circle 0f3c1111-2222-3333-4444-555566667777: 00000000-0000-4000-8000-0000000d0001 is already an ACTIVE member', 'That person is already a member of this circle.'],
            ['Invitation 0f3c1111-2222-3333-4444-555566667777: a PENDING invitation already exists', 'That person already has an invitation to this circle.'],
        ]) {
            const { page, graphql } = await openMembers({ InviteToCircle: { __errors: [{ message: raw, code: 'BAD_REQUEST' }] } });
            const input = field(page);
            await input.fill('kofi');
            await results(page).first().click();
            await page.getByRole('button', { name: 'Invite someone' }).click();
            await expect(page.locator('[data-sonner-toaster]')).toContainText(text);
            expect(sentInvites(graphql)).toHaveLength(1);
            await expect(page.getByText(/^Invited /)).toHaveCount(0);
            // The raw sentence carries ids and is never rendered.
            expect(await page.locator('[data-sonner-toaster]').innerText()).not.toMatch(UUID);
            await expect(input).toHaveValue('Kofi Mensah');
        }
    });

    test('keyboard and screen-reader contract, and it fits 360px', async () => {
        const { page, graphql } = await openMembers({}, { width: 360, height: 740 });
        const input = field(page);
        await expect(input).toHaveAttribute('aria-autocomplete', 'list');
        await expect(input).toHaveAttribute('aria-expanded', 'false');
        await input.fill('kofi');
        await expect(input).toHaveAttribute('aria-expanded', 'true');
        await expect(page.getByRole('listbox', { name: 'People' })).toBeVisible();
        await input.press('ArrowDown');
        const active = await input.getAttribute('aria-activedescendant');
        expect(active).toBeTruthy();
        await expect(page.locator(`[id="${active}"]`)).toHaveAttribute('aria-selected', 'true');
        await input.press('Escape');
        await expect(input).toHaveAttribute('aria-expanded', 'false');
        await input.press('ArrowDown');
        await input.press('Enter');
        // Enter picked the person; it did not submit the form.
        await expect(input).toHaveValue('Kofi Mensah');
        expect(sentInvites(graphql)).toHaveLength(0);
        await input.press('Enter');
        await expect(page.getByText('Invited Kofi Mensah')).toBeVisible();
        expect(sentInvites(graphql)).toHaveLength(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    });

    test('the results list is not cut off by the card it opens from', async () => {
        const { page } = await openMembers({}, { width: 360, height: 740 });
        await field(page).fill('o');
        await field(page).fill('owusu');
        const option = results(page).first();
        await expect(option).toBeVisible();
        // What is at the option's centre is the option itself, not something drawn over it.
        const onTop = await option.evaluate((el) => {
            const box = el.getBoundingClientRect();
            const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
            return !!hit && (el === hit || el.contains(hit));
        });
        expect(onTop).toBe(true);
    });

    test('the card wears the redesign chrome and keeps "Copy circle link"', async () => {
        const { page } = await openMembers();
        const section = page.locator('section', { has: field(page) });
        await expect(section).toHaveClass(/rounded-2xl/);
        await expect(section).toHaveClass(/shadow-sm/);
        await expect(section.getByRole('button', { name: 'Copy circle link' })).toBeVisible();
    });
});
