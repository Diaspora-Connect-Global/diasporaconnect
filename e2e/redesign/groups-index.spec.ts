/** `/groups`: your groups, group discovery (browse + search in the URL), join / request, load more, create. */
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

const gid = (n: number) => `00000000-0000-4000-8000-0000000d00${String(n).padStart(2, '0')}`;
const group = (n: number, name: string, privacy = 'PUBLIC', over: Record<string, unknown> = {}) => ({ __typename: 'Group', id: gid(n), name, description: `About ${name}.`, privacy, memberCount: 10 + n, avatarUrl: null, ...over });

const MINE = [group(1, 'Berlin Ghanaians', 'PUBLIC', { ownerId: 'x', createdAt: '2026-01-01T00:00:00Z' }), group(2, 'Accra Tech Diaspora', 'PRIVATE', { ownerId: 'x', createdAt: '2026-01-01T00:00:00Z' })];
const ALL = [MINE[0], group(3, 'Young Professionals'), group(4, 'Private Investors', 'PRIVATE'), group(5, 'Nurses in Germany'), group(6, 'Tech Founders')];

const directory = (calls: { query: string; offset: number }[]) => (v: Record<string, unknown>) => {
    const query = String(v.query ?? '');
    const offset = Number(v.offset ?? 0);
    const limit = Number(v.limit ?? 20);
    calls.push({ query, offset });
    const rows = ALL.filter((g) => !query || g.name.toLowerCase().includes(query.toLowerCase()));
    return { searchGroups: { __typename: 'GroupSearchResponse', total: rows.length, groups: rows.slice(offset, offset + limit) } };
};
const REASONS = ['POPULAR', 'ACTIVE', 'NEW', 'FROM_YOUR_COMMUNITY', 'SIMILAR_TO_YOUR_GROUPS'];
/** `rankedGroups`: groups you are not in, each with a reason code; the cursor is the offset as text. */
const ranked = (calls: { cursor: string | null }[], pageSize?: number) => (v: Record<string, unknown>) => {
    const cursor = (v.cursor as string | null | undefined) ?? null;
    calls.push({ cursor });
    const start = cursor ? Number(cursor) : 0;
    const limit = pageSize ?? Number(v.limit ?? 20);
    const rows = ALL.filter((g) => !MINE.some((m) => m.id === g.id));
    const slice = rows.slice(start, start + limit);
    const next = start + limit < rows.length ? String(start + limit) : null;
    return { rankedGroups: { __typename: 'RankedGroupsResponse', success: true, nextCursor: next, items: slice.map((g, i) => ({ __typename: 'RankedGroup', rankReason: REASONS[(start + i) % REASONS.length], group: { ...g, viewerMembershipStatus: 'NONE' } })) } };
};
const DATA = (calls: { query: string; offset: number }[] = [], over: Record<string, unknown> = {}, rankedCalls: { cursor: string | null }[] = []) => ({
    GetMyGroups: { getMyGroups: { __typename: 'GroupsResponse', success: true, message: null, total: MINE.length, groups: MINE } },
    GroupsDirectory: directory(calls),
    RankedGroups: ranked(rankedCalls),
    ...over,
});

test('browse: your groups on the side, groups to discover in a list without the ones you are in', async () => {
    const calls: { query: string; offset: number }[] = [];
    const rankedCalls: { cursor: string | null }[] = [];
    const { page } = await open(browser, '/groups', DATA(calls, {}, rankedCalls) as never);
    await expect(page.getByRole('heading', { level: 1, name: 'Find your people.' })).toBeVisible({ timeout: 90_000 });
    const mine = page.getByTestId('groups-mine');
    await expect(mine.getByRole('link', { name: /Berlin Ghanaians/ })).toHaveAttribute('href', `/en/groups/${gid(1)}`);
    await expect(mine).toContainText('Accra Tech Diaspora');
    const discover = page.getByTestId('groups-discover');
    await expect(discover.getByRole('heading', { name: 'Discover groups' })).toBeVisible();
    await expect(discover).toContainText('Young Professionals');
    await expect(discover).toContainText('13 members');
    await expect(discover).not.toContainText('Berlin Ghanaians');
    await expect(discover.getByRole('button', { name: 'Join: Young Professionals' })).toBeVisible();
    await expect(discover.getByRole('button', { name: 'Request to join: Private Investors' })).toBeVisible();
    // Browsing asks for the ranked list (not the empty search) and labels each card with its reason.
    expect(rankedCalls[0]).toEqual({ cursor: null });
    expect(calls).toEqual([]);
    await expect(discover.getByTestId('group-reason').first()).toHaveText('Popular');
    await expect(discover).toContainText('Active lately');
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('join and request call the real mutations; the row stays put and changes its button', async () => {
    const { page, graphql } = await open(browser, '/groups', DATA([], { JoinGroup: { joinGroup: { __typename: 'JoinGroupResponse', success: true, message: null } }, RequestToJoinGroup: { requestToJoinGroup: { __typename: 'GroupRequestResponse', success: true, message: null } } }) as never);
    const discover = page.getByTestId('groups-discover');
    await discover.getByRole('button', { name: 'Join: Young Professionals' }).click({ timeout: 90_000 });
    await expect.poll(() => graphql.calls.find((c) => c.name === 'JoinGroup')?.variables).toEqual({ joinGroupId: gid(3) });
    await expect(discover.getByRole('link', { name: 'Open' })).toHaveAttribute('href', `/en/groups/${gid(3)}`);
    await expect(discover).toContainText('Young Professionals');
    await discover.getByRole('button', { name: 'Request to join: Private Investors' }).click();
    await expect.poll(() => graphql.calls.find((c) => c.name === 'RequestToJoinGroup')?.variables).toEqual({ requestInput: { groupId: gid(4) } });
    await expect(discover.getByRole('button', { name: 'Requested' })).toBeDisabled();
    await page.context().close();
});

test('search goes in the URL, lists every match (yours marked Open), and clears', async () => {
    const calls: { query: string; offset: number }[] = [];
    const { page } = await open(browser, '/groups', DATA(calls) as never);
    await page.getByLabel('Search groups').fill('ber', { timeout: 90_000 });
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page).toHaveURL(/\/groups\?q=ber/);
    const discover = page.getByTestId('groups-discover');
    await expect(discover.getByRole('heading', { name: 'Results for “ber”' })).toBeVisible();
    await expect(discover.getByRole('link', { name: 'Open' })).toHaveAttribute('href', `/en/groups/${gid(1)}`);
    expect(calls.some((c) => c.query === 'ber')).toBe(true);
    await discover.getByRole('button', { name: 'Clear search' }).click();
    await expect(page).not.toHaveURL(/q=/);
    await expect(discover.getByRole('heading', { name: 'Discover groups' })).toBeVisible();

    await page.goto('/en/groups?q=zzz');
    await expect(page.getByTestId('groups-discover')).toContainText('No groups match “zzz”.', { timeout: 90_000 });
    await page.context().close();
});

test('load more asks for the next page', async () => {
    const rankedCalls: { cursor: string | null }[] = [];
    const { page } = await open(browser, '/groups', DATA([], { RankedGroups: ranked(rankedCalls, 2) }, rankedCalls) as never);
    const discover = page.getByTestId('groups-discover');
    await expect(discover).toContainText('Young Professionals', { timeout: 90_000 });
    await expect(discover).not.toContainText('Tech Founders');
    await discover.getByRole('button', { name: 'Load more' }).click();
    await expect(discover).toContainText('Private Investors');
    expect(rankedCalls.some((c) => c.cursor === '2')).toBe(true);
    await page.context().close();
});

test('Create a group opens the create dialog; empty states read honestly', async () => {
    const { page } = await open(browser, '/groups', DATA([], { GetMyGroups: { getMyGroups: { __typename: 'GroupsResponse', success: true, message: null, total: 0, groups: [] } }, GroupsDirectory: { searchGroups: { __typename: 'GroupSearchResponse', total: 0, groups: [] } }, RankedGroups: { rankedGroups: { __typename: 'RankedGroupsResponse', success: true, nextCursor: null, items: [] } } }) as never);
    await expect(page.getByTestId('groups-mine')).toContainText("You haven't joined any groups yet.", { timeout: 90_000 });
    await expect(page.getByTestId('groups-discover')).toContainText('There are no groups to join right now.');
    await page.getByRole('button', { name: 'Create a group' }).click();
    await expect(page.getByRole('dialog', { name: 'Create Group' })).toBeVisible();
    await page.context().close();
});

test('phone: your groups come first, no horizontal scroll', async () => {
    const { page } = await open(browser, '/groups', DATA() as never, { width: 360, height: 800 });
    const mine = page.getByTestId('groups-mine');
    await expect(mine).toContainText('Berlin Ghanaians', { timeout: 90_000 });
    const m = (await mine.boundingBox())!;
    const d = (await page.getByTestId('groups-discover').boundingBox())!;
    expect(d.y).toBeGreaterThan(m.y + m.height - 1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.context().close();
});

test('a pending request survives a reload: the server status reads Requested, joined reads Open', async () => {
    const rows = [group(4, 'Private Investors', 'PRIVATE', { viewerMembershipStatus: 'PENDING' }), group(3, 'Young Professionals', 'PUBLIC', { viewerMembershipStatus: 'ACTIVE' }), group(5, 'Nurses in Germany', 'PUBLIC', { viewerMembershipStatus: 'BANNED' })];
    const found = { searchGroups: { __typename: 'GroupSearchResponse', total: rows.length, groups: rows } };
    const { page } = await open(browser, '/groups?q=a', DATA([], { GroupsDirectory: found }) as never);
    const discover = page.getByTestId('groups-discover');
    await expect(discover.getByRole('button', { name: 'Requested' })).toBeDisabled({ timeout: 90_000 });
    await expect(discover.getByRole('link', { name: 'Open' })).toHaveAttribute('href', `/en/groups/${gid(3)}`);
    // Banned: listed, but no join action.
    await expect(discover).toContainText('Nurses in Germany');
    await expect(discover.getByRole('button', { name: /Nurses in Germany/ })).toHaveCount(0);
    await page.context().close();
});
