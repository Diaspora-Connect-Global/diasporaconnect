/** Home's left column (>= 1280 px): your communities, groups to join, the "Build stronger connections" card. GraphQL is the in-memory double. */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { UUID, open } from './fixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const group = (id: string, name: string, privacy = 'PUBLIC', memberCount: number | null = 8) => ({ __typename: 'Group', id, name, description: 'A group', privacy, memberCount, avatarUrl: null });
const DATA = {
    RedesignGroupsToJoin: { searchGroups: { __typename: 'GroupList', groups: [group('g-1', 'Young Professionals'), group('g-2', 'Already Joined'), group('g-3', 'Private Investors', 'PRIVATE', null)] } },
    RedesignMyGroupIds: { getMyGroups: { __typename: 'GroupList', groups: [{ __typename: 'Group', id: 'g-2' }] } },
    JoinGroup: { joinGroup: { __typename: 'JoinGroupResponse', success: true, message: 'ok' } },
    RequestToJoinGroup: { requestToJoinGroup: { __typename: 'RequestToJoinResponse', success: true, message: 'ok' } },
};

test('at 1280 the column lists real communities and associations, real counts only, no navigation card, no ids', async () => {
    const { page } = await open(browser, '/home', DATA);
    const col = page.getByTestId('home-left-column');
    await expect(col).toBeVisible({ timeout: 90_000 });
    const mine = col.getByTestId('home-left-communities');
    await expect(mine).toContainText('Ghana Union Berlin');
    await expect(mine).toContainText('Accra Tech Diaspora');
    await expect(mine).toContainText('Ghanaian Nurses in Germany');
    await expect(mine).toContainText('40 members'); // association: real count
    await expect(mine).not.toContainText('Kumasi Alumni'); // pending request, not a membership
    await expect(mine.getByText(/\b0 members\b/)).toHaveCount(0); // communities have no count: none invented
    await expect(mine.getByRole('link', { name: 'Join more communities' })).toHaveAttribute('href', '/en/community');
    await expect(col.getByRole('link', { name: 'Discover', exact: true })).toHaveCount(0);
    expect(await col.innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('featured groups leave out joined ones; Join and Request call the real mutations', async () => {
    const { page, graphql } = await open(browser, '/home', DATA);
    const groups = page.getByTestId('home-left-groups');
    await expect(groups).toBeVisible({ timeout: 90_000 });
    await expect(groups).toContainText('Young Professionals');
    await expect(groups).toContainText('8 members');
    await expect(groups).not.toContainText('Already Joined');
    await expect(groups.getByText(/0 members/)).toHaveCount(0);
    await groups.getByRole('button', { name: 'Join', exact: true }).click();
    await expect.poll(() => graphql.calls.filter((c) => c.name === 'JoinGroup').length).toBe(1);
    expect(graphql.calls.find((c) => c.name === 'JoinGroup')?.variables).toEqual({ joinGroupId: 'g-1' });
    await groups.getByRole('button', { name: 'Request' }).click();
    await expect.poll(() => graphql.calls.filter((c) => c.name === 'RequestToJoinGroup').length).toBe(1);
    await page.context().close();
});

test('the groups card is hidden when there is nothing to join; the explore card always shows', async () => {
    const { page } = await open(browser, '/home', { ...DATA, RedesignGroupsToJoin: { searchGroups: null } });
    const col = page.getByTestId('home-left-column');
    await expect(col).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('home-left-groups')).toHaveCount(0);
    const connect = col.getByTestId('home-left-connect');
    await expect(connect).toContainText('Build stronger connections.');
    await expect(connect.getByRole('link', { name: /Explore Communities/ })).toHaveAttribute('href', '/en/community');
    await page.context().close();
});

test('with no memberships only the join link remains in the communities card', async () => {
    const { page } = await open(browser, '/home', { ...DATA, ListMyJoinedCommunities: { listUserCommunities: [] }, GetUserAssociations: { getUserAssociations: [] } });
    const mine = page.getByTestId('home-left-communities');
    await expect(mine).toBeVisible({ timeout: 90_000 });
    await expect(mine.getByRole('listitem')).toHaveCount(0);
    await expect(mine.getByRole('link')).toHaveCount(1);
    await page.context().close();
});

test('below 1280 the column is not rendered', async () => {
    for (const width of [1100, 768, 360]) {
        const { page } = await open(browser, '/home', DATA, { width, height: 900 });
        await expect(page.locator('#home-hero-title')).toBeVisible({ timeout: 90_000 });
        await expect(page.getByTestId('home-left-column')).toHaveCount(0);
        await page.context().close();
    }
});
