/** `/circles`: hero search + create, your circles, discover (search in the URL), "How circles work". */
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

const circle = (i: number, name: string) => ({ __typename: 'Circle', id: `cir-${i}`, circleNumber: i, name, handle: `c${i}`, tagline: null, description: null, avatarUrl: null, bannerUrl: null, brandJson: null, discoverable: true, joinMode: 'REQUEST', status: 'ACTIVE', founderUserId: 'x', chatConversationId: null, memberCount: 12 + i, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', archivedAt: null });
const MINE = { MyCircles: { myCircles: [circle(1, 'Accra Tech Hub'), circle(2, 'Ghana Real Estate')] } };

test('hero with search and create, your circles, discover, and how circles work; no ids', async () => {
    const asked: Array<string | null> = [];
    const { page } = await open(browser, '/circles', { ...MINE, SearchCircles: (v: Record<string, unknown>) => { asked.push((v.query as string | null) ?? null); return { searchCircles: [] }; } } as never);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Small circles', { timeout: 90_000 });
    await expect(page.getByTestId('create-circle-link')).toHaveAttribute('href', '/en/circles/create');
    await expect(page.getByTestId('my-circles')).toContainText('Accra Tech Hub');
    await expect(page.getByTestId('discover-circles').getByRole('heading', { name: 'Discover Circles' })).toBeVisible();
    await expect(page.getByTestId('circles-how')).toContainText('How circles work');
    expect(asked[0]).toBeNull();
    expect(await page.locator('body').innerText()).not.toMatch(UUID);

    await page.getByLabel('Search circles').fill('tech');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page).toHaveURL(/\/circles\?q=tech/, { timeout: 60_000 });
    await expect(page.getByTestId('discover-circles')).toContainText('No circles match “tech”.', { timeout: 60_000 });
    await expect(page.getByTestId('my-circles')).toHaveCount(0);
    expect(asked).toContain('tech');
    await page.getByRole('button', { name: 'Clear search' }).click();
    await expect(page).not.toHaveURL(/q=/, { timeout: 60_000 });
    await page.context().close();
});

test('phone: no horizontal scroll', async () => {
    const { page } = await open(browser, '/circles', { ...MINE, SearchCircles: { searchCircles: [] } } as never, { width: 360, height: 800 });
    await expect(page.getByTestId('my-circles')).toBeVisible({ timeout: 90_000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.context().close();
});
