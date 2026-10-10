/**
 * The app shell's navigation: Home · Discover · Community · More, the Messages
 * and Notifications icons with their badges, the account menu, and the phone
 * bottom bar (no hamburger drawer, no left sidebar).
 *
 * Part 1 is pure (no browser): which section each path lights up.
 * Part 2 drives the REAL authenticated routes with a seeded session and an
 * in-memory GraphQL double (e2e/support/fakeSession.ts) — nothing talks to a
 * backend.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { fakeGraphql, seedSession, SHELL_OVERRIDES, wireNetwork } from '../support/fakeSession';
import { getActiveNavKey, NAV_SECTIONS, stripLocale } from '../../src/lib/navSections';
import { isKnownAppPath } from '../../src/lib/appRoutes';

const ID = '3f9a2b1c-4d5e-4f60-8a7b-9c3d1e2f5a6b';

test.describe('section rules', () => {
    const cases: Array<[string, string | null]> = [
        ['/en/home', 'home'], ['/home', 'home'], ['/fr/feed', 'home'], [`/en/post/${ID}`, 'home'],
        ['/en/discover', 'discover'], ['/en/events', 'discover'], [`/en/events/${ID}`, 'discover'],
        [`/en/events/${ID}/ticket`, 'discover'], ['/en/search?q=accra', 'discover'], ['/de/marketplace', 'discover'],
        ['/en/opportunities', 'discover'], [`/en/opportunities/${ID}`, 'discover'],
        ['/en/community', 'community'], [`/en/community/${ID}`, 'community'], ['/en/association', 'community'],
        [`/en/association/${ID}`, 'community'], [`/en/groups/${ID}`, 'community'], ['/nl/circles', 'community'],
        [`/en/circles/${ID}/members`, 'community'],
        ['/en/more', 'more'], ['/en/saved', 'more'], ['/en/requests', 'more'], ['/en/wallet', 'more'], ['/it/settings', 'more'],
        ['/en/chat', null], ['/en/notification', null], ['/en/profile', null], [`/en/${ID}`, null], ['/en', null], ['/', null],
        ['/en/eventsx', null], ['/en/communityfoo', null], ['/en/vendors', null], ['/en/create-post', null],
    ];
    for (const [path, key] of cases) test(`${path} → ${key ?? 'none'}`, () => expect(getActiveNavKey(path)).toBe(key));

    test('the four sections are Home, Discover, Community, More — and each is a real page', () => {
        expect(NAV_SECTIONS.map((s) => s.key)).toEqual(['home', 'discover', 'community', 'more']);
        for (const s of NAV_SECTIONS) expect(isKnownAppPath(s.href), s.href).toBe(true);
    });

    test('stripLocale drops the locale, the query and a trailing slash', () => {
        expect(stripLocale('/fr/events/1/?tab=saved#x')).toBe('/events/1');
        expect(stripLocale('/en')).toBe('/');
        expect(stripLocale('/events')).toBe('/events');
    });
});

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

async function open(path: string, viewport: { width: number; height: number }): Promise<Page> {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport });
    await seedSession(context);
    await wireNetwork(context, fakeGraphql({ ...SHELL_OVERRIDES }));
    const page = await context.newPage();
    await page.goto(path, { waitUntil: 'load' });
    await expect(page.locator('header.h-app-top-down')).toBeVisible({ timeout: 90_000 });
    return page;
}

const mainNav = (p: Page) => p.getByRole('navigation', { name: 'Main navigation' });

test.describe('desktop header', () => {
    test('four sections in order, More active on /more, Messages + Notifications with badges, account last', async () => {
        const page = await open('/en/more', { width: 1280, height: 800 });
        const links = mainNav(page).getByRole('link');
        await expect(links).toHaveText(['Home', 'Discover', 'Community', 'More']);
        expect(await links.evaluateAll((els) => els.map((e) => e.getAttribute('href')))).toEqual([
            '/en/home', '/en/discover', '/en/community', '/en/more',
        ]);
        await expect(mainNav(page).getByRole('link', { name: 'More' })).toHaveAttribute('aria-current', 'page');
        await expect(mainNav(page).locator('[aria-current="page"]')).toHaveCount(1);

        // Post and Chat are no longer sections.
        await expect(page.locator('header').getByRole('link', { name: 'Post', exact: true })).toHaveCount(0);

        const messages = page.locator('header').getByRole('link', { name: /^Messages/ });
        await expect(messages).toHaveAttribute('href', '/en/chat');
        await expect(page.getByTestId('chat-nav-badge')).toHaveText('3');
        await expect(messages).toHaveAccessibleName('Messages, 3 unread messages');

        const notifications = page.locator('header').getByRole('link', { name: /^Notifications/ });
        await expect(notifications).toHaveAttribute('href', '/en/notification');
        await expect(page.getByTestId('notification-nav-badge')).toHaveText('5');

        // Keyboard: logo, the four sections, search, Messages, Notifications, account — in that order.
        await page.locator('body').focus();
        const order: string[] = [];
        for (let i = 0; i < 14; i++) {
            await page.keyboard.press('Tab');
            const label = await page.evaluate(() => {
                const el = document.activeElement as HTMLElement | null;
                if (!el || !el.closest('header')) return null;
                return el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.textContent?.trim() || el.tagName;
            });
            if (label) order.push(label);
            if (label === 'Profile') break;
        }
        expect(order).toEqual([
            'DiaspoPlug home', 'Home', 'Discover', 'Community', 'More',
            'Search Diasplug ...', 'Messages, 3 unread messages', 'Notifications, 5 unread notifications', 'Profile',
        ]);
        await page.context().close();
    });

    test('the active section follows the page', async () => {
        const page = await open('/en/discover', { width: 1280, height: 800 });
        for (const [path, name] of [
            ['/en/discover', 'Discover'],
            ['/en/events', 'Discover'],
            ['/en/community', 'Community'],
            ['/en/home', 'Home'],
        ] as const) {
            await page.goto(path, { waitUntil: 'load' });
            await expect(mainNav(page).locator('[aria-current="page"]')).toHaveText(name, { timeout: 90_000 });
        }
        await page.context().close();
    });
});

test.describe('phone header', () => {
    test('bottom bar with the four sections; top bar keeps search, Messages, Notifications and the account — no drawer', async () => {
        const page = await open('/en/more', { width: 390, height: 844 });
        const bottom = page.getByRole('navigation').last();
        await expect(bottom.getByRole('link')).toHaveText(['Home', 'Discover', 'Community', 'More']);
        await expect(bottom.getByRole('link', { name: 'More' })).toHaveAttribute('aria-current', 'page');
        const box = (await bottom.boundingBox())!;
        expect(Math.round(box.y + box.height)).toBe(844);

        const header = page.locator('header');
        await expect(header.getByRole('button', { name: 'Search Diasplug ...' })).toBeVisible();
        await expect(header.getByRole('link', { name: /^Messages/ })).toBeVisible();
        await expect(header.getByRole('link', { name: /^Notifications/ })).toBeVisible();
        await expect(header.getByRole('button', { name: 'Profile' })).toBeVisible();
        // The only visible header buttons are search and the account menu (the hamburger is gone).
        await expect(header.getByRole('button')).toHaveCount(2);
        await expect(page.getByTestId('chat-nav-badge')).toHaveText('3');
        await page.context().close();
    });
});
