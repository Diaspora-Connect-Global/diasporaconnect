/**
 * The More page and Discover v1 offer only REAL destinations.
 *
 * Part 1 (no browser): every href in the More/Discover data is a page that
 * exists (`isKnownAppPath`, itself pinned to the route tree by
 * e2e/notifications/notification-path.spec.ts), and the mockup tiles with no
 * real source are absent.
 * Part 2 drives the real `/en/more` and `/en/discover` routes with a seeded
 * session and an in-memory GraphQL double: every rendered link passes the same
 * check, the sheets open and close from the keyboard, the rail shows only real
 * account facts, and the phone layout never scrolls sideways.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { fakeGraphql, seedSession, SHELL_OVERRIDES, wireNetwork } from '../support/fakeSession';
import { MORE_ACCOUNT_LINKS, MORE_RAIL_LINKS, MORE_SECTIONS, MORE_SHEETS } from '../../src/components/more/moreLinks';
import { DISCOVER_CATEGORIES } from '../../src/components/discover/discoverLinks';
import { isKnownAppPath } from '../../src/lib/appRoutes';

test.describe('More / Discover data', () => {
    const hrefs = new Set([
        ...MORE_SECTIONS.flatMap((s) => s.items.flatMap((i) => (i.href ? [i.href] : []))),
        ...Object.values(MORE_SHEETS).flatMap((links) => links.map((l) => l.href)),
        ...MORE_RAIL_LINKS.map((l) => l.href),
        ...Object.values(MORE_ACCOUNT_LINKS),
        ...DISCOVER_CATEGORIES.map((c) => c.href),
    ]);
    for (const href of hrefs) test(`${href} is a real page`, () => expect(isKnownAppPath(href)).toBe(true));

    test('mockup tiles with no real source are not offered', () => {
        const keys = MORE_SECTIONS.flatMap((s) => s.items.map((i) => i.key));
        for (const absent of ['bookings', 'projects', 'investments', 'documents', 'receipts', 'recentlyUsed', 'faqs', 'help']) {
            expect(keys).not.toContain(absent);
        }
        expect(MORE_RAIL_LINKS.map((l) => l.href)).not.toContain('/help');
    });

    test('every sheet tile has a sheet, every other tile a destination', () => {
        for (const item of MORE_SECTIONS.flatMap((s) => s.items)) {
            if (item.sheet) expect(MORE_SHEETS[item.sheet].length).toBeGreaterThan(0);
            else expect(item.href).toMatch(/^\//);
        }
    });
});

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

async function open(path: string, viewport = { width: 1280, height: 800 }): Promise<Page> {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport });
    await seedSession(context);
    await wireNetwork(context, fakeGraphql({ ...SHELL_OVERRIDES }));
    const page = await context.newPage();
    await page.goto(path, { waitUntil: 'load' });
    return page;
}

/** Path + query of every link inside `scope` (a selector, or a comma-separated list of them). */
async function linkPaths(page: Page, scope: string): Promise<string[]> {
    const selector = scope
        .split(',')
        .map((s) => `${s.trim()} a[href]`)
        .join(', ');
    return page.locator(selector).evaluateAll((els) =>
        els.map((a) => {
            const u = new URL((a as HTMLAnchorElement).href);
            return u.pathname + u.search;
        }),
    );
}

test.describe('More page', () => {
    test('every card and rail link goes to a real page; omitted tiles are absent', async () => {
        const page = await open('/en/more');
        await expect(page.getByRole('heading', { level: 1, name: 'Everything you need, all in one place.' })).toBeVisible({ timeout: 90_000 });

        const paths = await linkPaths(page, '[data-testid^="more-section-"], [data-testid="more-rail"]');
        expect(paths.length).toBeGreaterThan(10);
        for (const p of paths) expect(isKnownAppPath(p), p).toBe(true);

        for (const title of ['Your Stuff', 'Work & Business', 'Money & Payments', 'Connect & Community']) {
            await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
        }
        for (const absent of ['My Bookings', 'My Projects', 'My Investments', 'Documents', 'Receipts', 'Recently used', 'FAQs', 'Help & Support']) {
            await expect(page.getByText(absent, { exact: true })).toHaveCount(0);
        }
        await page.context().close();
    });

    test('the rail shows real account facts and the header counts', async () => {
        const page = await open('/en/more');
        const rail = page.getByTestId('more-rail');
        await expect(rail.getByText('Ama Mensah')).toBeVisible({ timeout: 90_000 });
        await expect(rail.getByText('Verified')).toBeVisible();
        await expect(rail.getByText('Member since 2024')).toBeVisible();
        await expect(rail.getByRole('link', { name: /Notifications/ })).toContainText('5');
        await expect(rail.getByRole('link', { name: /Messages/ })).toContainText('3');
        // No id ever reaches the screen.
        expect(await rail.innerText()).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/i);
        await page.context().close();
    });

    test('"My Requests" and "Saved" open a sheet of real links, from the keyboard too', async () => {
        const page = await open('/en/more');
        const requests = page.getByRole('button', { name: /My Requests/ });
        await expect(requests).toBeVisible({ timeout: 90_000 });
        await requests.focus();
        await page.keyboard.press('Enter');
        const sheet = page.getByRole('dialog', { name: 'My Requests' });
        await expect(sheet).toBeVisible();
        expect(await linkPaths(page, '[role="dialog"]')).toEqual(['/en/community', '/en/association', '/en/profile?m=friends&t=3']);
        await page.keyboard.press('Escape');
        await expect(sheet).toHaveCount(0);
        await expect(requests).toBeFocused();

        await page.getByTestId('more-rail').getByRole('button', { name: 'Saved items' }).click();
        await expect(page.getByRole('dialog', { name: 'Saved' })).toBeVisible();
        expect(await linkPaths(page, '[role="dialog"]')).toEqual(['/en/profile?posts=saved', '/en/events?tab=saved', '/en/opportunities?tab=saved']);
        await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await page.context().close();
    });

    test('phone: no sideways scroll', async () => {
        const page = await open('/en/more', { width: 360, height: 740 });
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 90_000 });
        const size = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
        expect(size.sw).toBeLessThanOrEqual(size.iw);
        await page.context().close();
    });
});

test.describe('Discover v1', () => {
    test('search goes to /search?q=…, an empty search stays put, tiles go to real pages', async () => {
        const page = await open('/en/discover');
        const box = page.getByRole('searchbox', { name: 'Search DiaspoPlug' });
        await expect(box).toBeVisible({ timeout: 90_000 });

        await page.getByRole('button', { name: 'Search', exact: true }).click();
        await expect(page).toHaveURL(/\/en\/discover$/);
        await expect(box).toBeFocused();

        const tiles = await linkPaths(page, 'nav[aria-labelledby="discover-categories"]');
        expect(tiles).toEqual(['/en/marketplace?tab=services', '/en/events']);

        await box.fill('accra tech');
        await box.press('Enter');
        await expect(page).toHaveURL(/\/en\/search\?q=accra%20tech$/, { timeout: 90_000 });
        await page.context().close();
    });
});
