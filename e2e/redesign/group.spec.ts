/** The group page (`/groups/[id]`): header, actions by membership, about, members, group info. */
import { test, expect, type Browser } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { openBrowser } from '../support/browser';
import { UUID, ME, open } from './fixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const GROUP_ID = '00000000-0000-4000-8000-0000000d0001';
const OWNER_ID = '00000000-0000-4000-8000-0000000a0f01';

const group = (over: Record<string, unknown> = {}) => ({
    __typename: 'Group',
    id: GROUP_ID,
    name: 'Ghana Tech Professionals',
    description: 'A space for Ghanaian tech professionals at home and abroad.\nShare jobs, ask questions and meet up.',
    avatarUrl: null,
    privacy: 'PUBLIC',
    maxMembers: 50,
    memberCount: 3,
    ownerId: OWNER_ID,
    createdAt: '2026-03-14T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    ...over,
});

const member = (i: number, first: string, last: string, role = 'MEMBER', over: Record<string, unknown> = {}) => ({
    __typename: 'GroupMember',
    id: `gm-${i}`,
    groupId: GROUP_ID,
    userId: `00000000-0000-4000-8000-0000000a0f0${i}`,
    role,
    status: 'ACTIVE',
    joinedAt: '2026-04-01T10:00:00.000Z',
    createdAt: '2026-04-01T10:00:00.000Z',
    profile: { __typename: 'ProfileSummary', avatarUrl: null, firstName: first, lastName: last, residenceCountry: 'Germany', city: 'Berlin', trustScore: null, occupation: null, ...over },
});

const MEMBERS = [member(1, 'Ama', 'Serwaa', 'OWNER', { occupation: 'Product Manager' }), member(2, 'Kofi', 'Mensah', 'ADMIN'), member(3, 'Esi', 'Boateng', 'MEMBER', { city: 'Accra', residenceCountry: 'Ghana' })];

const DATA = (membership: { isMember: boolean; role?: string | null; status?: string | null }, over: Record<string, unknown> = {}) => ({
    GetGroup: { getGroup: { __typename: 'GroupResponse', success: true, message: null, group: group(over) } },
    CheckGroupMembership: { checkGroupMembership: { __typename: 'GroupMembershipCheck', role: null, status: null, ...membership } },
    GetGroupPageMembers: { getGroupMembers: { __typename: 'GroupMembersResponse', success: true, message: null, total: MEMBERS.length, hasMore: false, members: MEMBERS } },
});

const PAGE = `/groups/${GROUP_ID}`;
const MEMBER = { isMember: true, role: 'MEMBER', status: 'ACTIVE' };
const VISITOR = { isMember: false };

test('member: full name, facts, Open group chat as the main action, Leave asks first', async () => {
    const { page } = await open(browser, PAGE, DATA(MEMBER) as never);
    const header = page.getByTestId('group-header');
    await expect(header.getByRole('heading', { level: 1, name: 'Ghana Tech Professionals' })).toBeVisible({ timeout: 90_000 });
    await expect(header).toContainText('Public');
    await expect(header).toContainText('3 of 50 members');
    await expect(header).toContainText('Since March 2026');
    await expect(header.getByRole('link', { name: 'Open group chat' })).toHaveAttribute('href', `/en/chat?ct=group&gid=${GROUP_ID}`);
    await header.getByRole('button', { name: 'Leave group' }).click();
    await expect(page.getByRole('dialog')).toContainText('Leave group?');
    await page.context().close();
});

test('members: role badges, occupation and place, links to profiles, never an id on screen', async () => {
    const { page } = await open(browser, PAGE, DATA(MEMBER) as never);
    const members = page.getByTestId('group-members');
    await expect(members.getByRole('link', { name: /Ama Serwaa/ })).toBeVisible({ timeout: 90_000 });
    await expect(members.getByRole('link', { name: /Ama Serwaa/ })).toContainText('Owner');
    await expect(members.getByRole('link', { name: /Ama Serwaa/ })).toContainText('Product Manager · Berlin, Germany');
    await expect(members.getByRole('link', { name: /Kofi Mensah/ })).toContainText('Admin');
    await expect(members.getByRole('link', { name: /Esi Boateng/ })).not.toContainText('Member');
    await expect(members.getByRole('link', { name: /Esi Boateng/ })).toHaveAttribute('href', '/en/00000000-0000-4000-8000-0000000a0f03');
    // A plain list: one member per row, all aligned on the same left edge.
    const xs = await members.getByRole('link').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x)));
    expect(new Set(xs).size).toBe(1);
    await expect(page.getByTestId('group-info')).toContainText("Anyone can see who's in this group and join.");
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('visitor of a public group: Join, no chat link, members visible', async () => {
    const { page } = await open(browser, PAGE, DATA(VISITOR) as never);
    const actions = page.getByTestId('group-actions');
    await expect(actions.getByRole('button', { name: 'Join' })).toBeVisible({ timeout: 90_000 });
    await expect(actions.getByRole('link', { name: 'Open group chat' })).toHaveCount(0);
    await expect(page.getByTestId('group-members')).toContainText('Esi Boateng');
    await page.context().close();
});

test('visitor of a private group: Request to join, members not asked for, privacy explained', async () => {
    const { page, graphql } = await open(browser, PAGE, DATA(VISITOR, { privacy: 'PRIVATE' }) as never);
    await expect(page.getByTestId('group-actions').getByRole('button', { name: 'Request to join' })).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('group-members')).toContainText("Only members can see who's in this group.");
    await expect(page.getByTestId('group-info')).toContainText('Only members can see who\'s in it. Joining needs approval.');
    expect(graphql.calls.some((c) => c.name === 'GetGroupPageMembers' || c.name === 'GetGroupMembers')).toBe(false);
    await page.context().close();
});

test('pending request shows Requested (disabled); the owner sees ownership and the chat', async () => {
    const pending = await open(browser, PAGE, DATA({ isMember: true, role: 'MEMBER', status: 'PENDING' }, { privacy: 'PRIVATE' }) as never);
    await expect(pending.page.getByTestId('group-actions').getByRole('button', { name: 'Requested' })).toBeDisabled({ timeout: 90_000 });
    await expect(pending.page.getByTestId('group-actions').getByRole('link', { name: 'Open group chat' })).toHaveCount(0);
    await pending.page.context().close();

    const owner = await open(browser, PAGE, DATA(VISITOR, { ownerId: ME }) as never);
    await expect(owner.page.getByTestId('group-actions')).toContainText('You own this group', { timeout: 90_000 });
    await expect(owner.page.getByTestId('group-actions').getByRole('link', { name: 'Open group chat' })).toBeVisible();
    await owner.page.context().close();
});

test('singular count, no cap, back to all groups, and no horizontal scroll on a phone', async () => {
    const { page } = await open(browser, PAGE, DATA(MEMBER, { memberCount: 1, maxMembers: null }) as never, { width: 360, height: 800 });
    const header = page.getByTestId('group-header');
    await expect(header).toContainText('1 member', { timeout: 90_000 });
    await expect(header).not.toContainText('1 members');
    await expect(page.getByTestId('group-back')).toHaveText('All groups');
    await expect(page.getByTestId('group-back')).toHaveAttribute('href', '/en/groups');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.context().close();
});

test.describe('screenshots', () => {
    test.skip(process.env.REDESIGN_SCREENSHOTS !== '1', 'set REDESIGN_SCREENSHOTS=1 to capture');
    const OUT = path.join(process.cwd(), '.artifacts/redesign-screenshots');
    for (const [name, membership] of [['member', MEMBER], ['visitor', VISITOR]] as const) {
        for (const width of [360, 1280]) {
            test(`group ${name} @ ${width}`, async () => {
                fs.mkdirSync(OUT, { recursive: true });
                const { page } = await open(browser, PAGE, DATA(membership) as never, { width, height: 900 });
                await page.waitForTimeout(5000);
                await page.evaluate(() => document.querySelectorAll('.h-app-inner').forEach((el) => ((el as HTMLElement).style.height = 'auto')));
                await page.screenshot({ path: path.join(OUT, `group-${name}-${width}.png`), fullPage: true });
                await page.context().close();
            });
        }
    }
});
