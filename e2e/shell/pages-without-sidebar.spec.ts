/**
 * Every page that used to sit beside the left sidebar still renders inside the
 * new shell: header present, the right section lit, no sidebar, the content
 * column centred under the header, and no sideways scroll on a phone.
 *
 * The page list is derived from the route tree (everything under `(home)`),
 * so a new page there is covered by existing. GraphQL is answered by the
 * in-memory double in e2e/support/fakeSession.ts (unknown operations get
 * `null` root fields, i.e. each page's empty state); nothing talks to a backend.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { openBrowser } from '../support/browser';
import { COMMUNITY_OVERRIDES, fakeGraphql, seedSession, SHELL_OVERRIDES, wireNetwork } from '../support/fakeSession';
import { getActiveNavKey } from '../../src/lib/navSections';

const ID = '3f9a2b1c-4d5e-4f60-8a7b-9c3d1e2f5a6b';
const ID2 = '7c1d2e3f-4a5b-4c6d-9e7f-0a1b2c3d4e5f';
const HOME_GROUP = path.join(process.cwd(), 'src/app/[locale]/(protected)/(main)/(home)');

/** `(home)` page routes with their params filled in. */
function homeRoutes(dir = HOME_GROUP, prefix: string[] = []): string[] {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            const isGroup = /^\(.*\)$/.test(entry.name);
            const seg = entry.name === '[id]' ? ID : /^\[.+\]$/.test(entry.name) ? ID2 : entry.name;
            out.push(...homeRoutes(path.join(dir, entry.name), isGroup ? prefix : [...prefix, seg]));
        } else if (entry.name === 'page.tsx') {
            out.push('/' + prefix.join('/'));
        }
    }
    return out;
}

const NAMES = { home: 'Home', discover: 'Discover', community: 'Community', more: 'More' } as const;

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

async function open(route: string, viewport: { width: number; height: number }): Promise<{ page: Page; errors: string[] }> {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport });
    await seedSession(context);
    await wireNetwork(context, fakeGraphql({ ...SHELL_OVERRIDES, ...COMMUNITY_OVERRIDES }));
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`/en${route}`, { waitUntil: 'load' });
    await expect(page.locator('header.h-app-top-down')).toBeVisible({ timeout: 90_000 });
    return { page, errors };
}

/** The box of the page content frame (the first element inside the shell's content area). */
async function contentFrame(page: Page) {
    return page.locator('header.h-app-top-down + div > *').first().boundingBox();
}

test('the (home) route list is not empty', () => {
    expect(homeRoutes().length).toBeGreaterThan(10);
});

for (const route of homeRoutes()) {
    test(`${route}: header, no sidebar, centred 60vw column, no sideways scroll on a phone`, async () => {
        const { page, errors } = await open(route, { width: 1280, height: 800 });
        const key = getActiveNavKey(route);
        const active = page.getByRole('navigation', { name: 'Main navigation' }).locator('[aria-current="page"]');
        if (key) await expect(active).toHaveText(NAMES[key]);
        else await expect(active).toHaveCount(0);

        // The old sidebar listed group chats; nothing on these pages does now.
        await expect(page.locator('aside').filter({ hasText: 'Group chats' })).toHaveCount(0);

        const box = (await contentFrame(page))!;
        // 60vw of 1280 is the width most pages were laid out for; the redesigned Home takes a wider frame, min(92vw, 1400px), that the header matches,
        // and the redesigned events and circles lists take the header's 80vw.
        expect(Math.round(box.width)).toBe(route === '/home' ? 1178 : route === '/events' || route === '/circles' ? 1024 : 768);
        expect(Math.abs(box.x - (1280 - box.x - box.width))).toBeLessThanOrEqual(1);
        test.info().annotations.push({ type: 'page errors (desktop)', description: errors.join(' | ') || 'none' });
        await page.context().close();

        const phone = await open(route, { width: 360, height: 740 });
        const size = await phone.page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
        expect(size.sw, 'no sideways scroll at 360px').toBeLessThanOrEqual(size.iw);
        await expect(phone.page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
        await phone.page.context().close();
    });
}

test('/home feed has the same For you / Latest / Following tabs and category filter as /community', async () => {
    const { page } = await open('/home', { width: 1280, height: 800 });
    const tabs = page.getByRole('tablist', { name: /./ });
    await expect(tabs).toBeVisible({ timeout: 90_000 });
    await expect(tabs.getByRole('tab', { name: 'For you' })).toHaveAttribute('aria-selected', 'true');
    await tabs.getByRole('tab', { name: 'Following' }).click();
    await expect(tabs.getByRole('tab', { name: 'Following' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('community-feed-filter')).toBeVisible();
    await page.context().close();
});

test('/community: "Your communities" lists memberships, pending requests and associations beside the content', async () => {
    const { page } = await open('/community', { width: 1280, height: 800 });
    const column = page.getByTestId('your-communities');
    await expect(column.getByRole('heading', { name: 'Your communities' })).toBeVisible({ timeout: 90_000 });
    await expect(column.getByText('Ghana Union Berlin')).toBeVisible();
    await expect(column.getByText('Accra Tech Diaspora')).toBeVisible();
    // A community with a pending request is listed under "Pending requests", not as joined.
    await expect(column.getByRole('region', { name: 'Pending requests' }).getByText('Kumasi Alumni')).toBeVisible();
    await expect(column.getByRole('region', { name: 'Communities', exact: true }).getByText('Kumasi Alumni')).toHaveCount(0);
    await expect(column.getByRole('link', { name: 'Ghanaian Nurses in Germany' })).toHaveAttribute(
        'href',
        '/en/association/00000000-0000-4000-8000-0000000a0001',
    );
    await expect(column.getByRole('link', { name: 'Discover associations' })).toHaveAttribute('href', '/en/association');

    // Beside the discovery content on desktop…
    const c = (await column.boundingBox())!;
    const discover = (await page.getByTestId('community-feed').boundingBox())!;
    expect(discover.x).toBeGreaterThan(c.x + c.width);
    // …and the page uses the header's full 80vw frame.
    const frame = (await contentFrame(page))!;
    expect(Math.round(frame.width)).toBe(1024);
    await page.context().close();

    // …and on a phone it moves into the header's menu drawer instead of stacking above the feed.
    const phone = await open('/community', { width: 360, height: 740 });
    await expect(phone.page.getByTestId('community-feed')).toBeVisible({ timeout: 90_000 });
    await expect(phone.page.getByTestId('your-communities')).toBeHidden();
    await phone.page.getByTestId('rail-menu-button').click();
    await expect(phone.page.getByTestId('rail-menu-drawer').getByRole('heading', { name: 'Your communities' })).toBeVisible();
    await phone.page.keyboard.press('Escape');
    const size = await phone.page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    expect(size.sw).toBeLessThanOrEqual(size.iw);
    await phone.page.context().close();
});

test('public event page: no sidebar for a signed-in visitor, Discover lit', async () => {
    const { page } = await open(`/events/${ID}`, { width: 1280, height: 800 });
    await expect(page.getByRole('navigation', { name: 'Main navigation' }).locator('[aria-current="page"]')).toHaveText('Discover');
    await expect(page.locator('aside').filter({ hasText: 'Group chats' })).toHaveCount(0);
    await expect(page.getByText('Group chats')).toHaveCount(0);
    await page.context().close();
});
