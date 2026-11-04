/** Circle interface fixes: every section reachable from home, nothing stranded off-screen on a phone, readable secondary text. */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { open } from './fixtures';
import { memberScreens } from './circleFixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const PHONE = { width: 360, height: 800 };

test('home: every section is one tap away and the page does not scroll sideways @360', async () => {
    const { page } = await open(browser, '/circles/cir-1', memberScreens('MEMBER') as never, PHONE);
    const nav = page.getByRole('navigation', { name: 'Circle' });
    await expect(nav).toBeVisible({ timeout: 90_000 });
    for (const path of ['members', 'leaderboard', 'history', 'governance', 'plan', 'settings']) {
        await expect(nav.locator(`a[href$="/circles/cir-1/${path}"]`)).toHaveCount(1);
    }
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    // The heading names the circle in full (it wraps rather than truncating to "Accra Tec…").
    await expect(page.getByRole('heading', { level: 1, name: 'Accra Tech Hub' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.context().close();
});

test('home on a laptop: every section is on screen without scrolling the strip', async () => {
    const { page } = await open(browser, '/circles/cir-1', memberScreens('MEMBER') as never, { width: 1280, height: 900 });
    const nav = page.getByRole('navigation', { name: 'Circle' });
    await expect(nav).toBeVisible({ timeout: 90_000 });
    const navBox = await nav.boundingBox();
    for (const path of ['members', 'leaderboard', 'history', 'governance', 'plan', 'settings']) {
        const box = await nav.locator(`a[href$="/circles/cir-1/${path}"]`).boundingBox();
        expect(box && box.x + box.width, `${path} is cut off`).toBeLessThanOrEqual((navBox?.x ?? 0) + (navBox?.width ?? 0));
    }
    await page.context().close();
});

test('home: with chat off the feed opens at its top, newest first', async () => {
    const { page } = await open(browser, '/circles/cir-1', memberScreens('MEMBER') as never, PHONE);
    await expect(page.getByRole('heading', { level: 1, name: 'Accra Tech Hub' })).toBeVisible({ timeout: 90_000 });
    await page.waitForTimeout(800);
    const scrolled = await page.evaluate(() => [...document.querySelectorAll('div')].filter((d) => d.scrollHeight > d.clientHeight + 40).map((d) => d.scrollTop));
    expect(Math.max(0, ...scrolled)).toBe(0);
    await page.context().close();
});

test('members: the message button and join date stay on screen @360', async () => {
    const { page } = await open(browser, '/circles/cir-1/members', memberScreens('LEAD') as never, PHONE);
    const button = page.getByRole('button', { name: /message/i }).first();
    await expect(button).toBeVisible({ timeout: 90_000 });
    const box = await button.boundingBox();
    expect(box && box.x + box.width).toBeLessThanOrEqual(PHONE.width);
    await expect(page.getByRole('columnheader', { name: 'Joined' })).toBeHidden();
    await expect(page.getByText(/Joined .*2026/).first()).toBeVisible();
    await page.context().close();
});

test('history: decisions stack instead of hiding columns @360', async () => {
    const { page } = await open(browser, '/circles/cir-1/history', memberScreens('LEAD') as never, PHONE);
    await expect(page.getByRole('link', { name: 'Motion 2 title' })).toBeVisible({ timeout: 90_000 });
    const row = page.getByRole('row').filter({ hasText: 'Motion 2 title' });
    const box = await row.boundingBox();
    expect(box && box.x + box.width).toBeLessThanOrEqual(PHONE.width);
    await expect(row.getByText('Rules at the time')).toBeVisible();
    await page.context().close();
});

test('leaderboard has a page heading and a labelled back button', async () => {
    const { page } = await open(browser, '/circles/cir-1/leaderboard', memberScreens('MEMBER') as never, PHONE);
    await expect(page.getByRole('heading', { level: 1, name: 'Leaderboard' })).toBeVisible({ timeout: 90_000 });
    await expect(page.getByRole('button', { name: 'Previous page' })).toBeVisible();
    await page.context().close();
});

// German, French, Italian and Dutch labels run longer than English; every one must still fit a phone.
test('the circle screens fit 360px in every language', async () => {
    const { page } = await open(browser, '/circles/cir-1', memberScreens('LEAD') as never, PHONE);
    await expect(page.getByRole('navigation').first()).toBeVisible({ timeout: 90_000 });
    for (const locale of ['de', 'fr', 'it', 'nl']) {
        for (const path of ['', '/members', '/history', '/leaderboard']) {
            await page.goto(`/${locale}/circles/cir-1${path}`, { waitUntil: 'load', timeout: 120_000 });
            await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 90_000 });
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
            expect(overflow, `${locale}${path} scrolls sideways`).toBeLessThanOrEqual(0);
            if (path === '/members') {
                const box = await page.locator('table tbody tr button').first().boundingBox();
                expect(box && box.x + box.width, `${locale} message button is off-screen`).toBeLessThanOrEqual(PHONE.width);
            }
        }
    }
    await page.context().close();
});

test('circle screens darken the secondary text colour for contrast', async () => {
    const { page } = await open(browser, '/circles/cir-1/governance', memberScreens('LEAD') as never, PHONE);
    const intro = page.getByText('The rules this circle has set for itself', { exact: false });
    await expect(intro).toBeVisible({ timeout: 90_000 });
    expect(await intro.evaluate((e) => getComputedStyle(e).color)).toBe('rgb(102, 102, 102)');
    await page.context().close();
});
