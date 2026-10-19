/** Every Circles screen renders from mocked data at 360 and 1280 px: no crash, no sideways scroll, no ids. */
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

const ROUTES: Array<[string, string]> = [
    ['/circles', 'index'],
    ['/circles/cir-1', 'home'],
    ['/circles/cir-1/members', 'members'],
    ['/circles/cir-1/governance', 'governance'],
    ['/circles/cir-1/history', 'history'],
    ['/circles/cir-1/leaderboard', 'leaderboard'],
    ['/circles/cir-1/plan', 'plan'],
    ['/circles/cir-1/settings', 'settings'],
    ['/circles/cir-1/motions/new', 'new motion'],
    ['/circles/cir-1/motions/mot-1', 'motion'],
    ['/circles/cir-1/projects/new', 'new project'],
    ['/circles/cir-1/projects/prj-1', 'project'],
    ['/circles/cir-1/challenges/new', 'new challenge'],
    ['/circles/cir-1/challenges/chl-1', 'challenge'],
    ['/circles/cir-1/report', 'report'],
    ['/circles/create', 'create'],
];
const VIEWPORTS = [
    { width: 360, height: 800 },
    { width: 1280, height: 900 },
];

for (const vp of VIEWPORTS) {
    for (const [path, label] of ROUTES) {
        test(`${label} @${vp.width}`, async () => {
            const { page, errors } = await open(browser, path, memberScreens('LEAD') as never, vp);
            await expect(page.locator('h1, h2, h3').first()).toBeVisible({ timeout: 90_000 });
            await page.waitForLoadState('networkidle').catch(() => undefined);
            const text = await page.locator('body').innerText();
            expect(text, 'error boundary or error state').not.toMatch(/something went wrong|couldn't load|Application error/i);
            expect(text, 'raw ids').not.toMatch(/\b(cir|mot|prj|chl|usr|mem|gol|sub|pl)-\d+\b/);
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
            const offenders =
                overflow > 0
                    ? await page.evaluate(() =>
                          [...document.querySelectorAll('body *')]
                              .filter((e) => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
                              .slice(0, 6)
                              .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 80)} right=${Math.round(e.getBoundingClientRect().right)}`),
                      )
                    : [];
            expect(overflow, `horizontal scroll: ${offenders.join(' | ')}`).toBeLessThanOrEqual(0);
            expect(errors).toEqual([]);
            await page.context().close();
        });
    }
}
