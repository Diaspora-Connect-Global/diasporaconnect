/**
 * Community (desktop): the left column scrolls as ONE unit. "Your communities" used to be sticky on
 * its own, so on scroll it pinned and slid over the circles promo card below it.
 */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { open } from './fixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

test('after scrolling the feed, the circles promo never sits under "Your communities"', async () => {
    const { page } = await open(browser, '/community', {}, { width: 1280, height: 800 });
    const communities = page.getByTestId('your-communities');
    const promo = page.getByRole('link', { name: 'Explore circles' }).locator('xpath=ancestor::section[1]');
    await expect(communities).toBeVisible({ timeout: 180_000 });
    await expect(promo).toBeVisible();

    const gap = async () => {
        const a = (await communities.boundingBox())!;
        const b = (await promo.boundingBox())!;
        return b.y - (a.y + a.height);
    };
    expect(await gap()).toBeGreaterThanOrEqual(0);
    // Scroll the page's own scroll container (the feed column lives inside it).
    await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll<HTMLElement>('.h-app-inner')).find((e) => e.scrollHeight > e.clientHeight);
        el?.scrollBy(0, 700);
    });
    await page.waitForTimeout(500);
    expect(await gap()).toBeGreaterThanOrEqual(0);
    await page.context().close();
});
