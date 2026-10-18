/**
 * The account panel opened from the header avatar: a dropdown anchored to it (Radix Popover).
 *
 * Drives the REAL authenticated shell (`/en/home`) with a seeded session and an
 * in-memory GraphQL double. Pins: the identity block shows a name and handle and
 * never an id; every link is a real page and none repeats the top nav; Esc and the
 * close button return focus to the avatar; Tab stays inside the panel; the 360 px
 * layout never scrolls sideways, keeps >= 44 px targets and >= 14 px text; and
 * sign-out asks first, then clears the LOCAL session too.
 */
import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { fakeGraphql, ME_PROFILE, seedSession, SHELL_OVERRIDES, wireNetwork } from '../support/fakeSession';
import { isKnownAppPath } from '../../src/lib/appRoutes';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

type Opened = { page: Page; context: BrowserContext; graphql: ReturnType<typeof fakeGraphql>; authWrites: string[] };

async function open(viewport: { width: number; height: number }, profile: Record<string, unknown> = {}): Promise<Opened> {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport });
    await seedSession(context);
    // Remember every write to the persisted auth store (the seed re-runs on each navigation,
    // so the store itself cannot be read back after the sign-out redirect).
    const authWrites: string[] = [];
    await context.exposeFunction('__recordAuthWrite', (value: string) => authWrites.push(value));
    await context.addInitScript(() => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key: string, value: string) {
            if (key === 'auth-store') (window as unknown as { __recordAuthWrite: (v: string) => void }).__recordAuthWrite(value);
            return original.call(this, key, value);
        };
    });
    const graphql = fakeGraphql({
        ...SHELL_OVERRIDES,
        GetMyProfile: { getProfile: { __typename: 'ProfileResponse', success: true, message: 'ok', profile: { ...ME_PROFILE, ...profile } } },
        Logout: { logout: { __typename: 'LogoutResponse', success: true, message: 'ok', error: null } },
    });
    await wireNetwork(context, graphql);
    const page = await context.newPage();
    await page.goto('/en/home', { waitUntil: 'load' });
    await expect(page.locator('header.h-app-top-down')).toBeVisible({ timeout: 400_000 });
    return { page, context, graphql, authWrites };
}

const trigger = (p: Page) => p.locator('header').getByRole('button', { name: 'Profile' });
const panel = (p: Page) => p.getByRole('dialog', { name: 'Your account' });

async function openPanel(page: Page) {
    await expect(trigger(page)).toBeVisible();
    await trigger(page).click();
    await expect(panel(page)).toBeVisible();
}

test.describe('account panel', () => {
    // Real routes on a cold dev server compile on first hit.
    test.describe.configure({ timeout: 600_000 });
    test('identity is a name and a handle, never an id; every link is a real page and none repeats the top nav', async () => {
        const { page, context } = await open({ width: 1280, height: 800 });
        await openPanel(page);

        const identity = page.getByTestId('account-identity');
        await expect(identity).toContainText('Ama Mensah');
        await expect(identity).toContainText('@ama');
        expect(await panel(page).innerText()).not.toMatch(UUID);

        const hrefs = await panel(page).locator('a[href]').evaluateAll((els) =>
            els.map((a) => {
                const u = new URL((a as HTMLAnchorElement).href);
                return u.pathname + u.search;
            }),
        );
        expect(hrefs).toEqual([
            '/en/profile', '/en/friends?tab=friends', '/en/saved', '/en/requests', '/en/wallet', '/en/settings', '/en/contact',
            '/en/about', '/en/terms', '/en/privacy',
        ]);
        for (const h of hrefs) expect(isKnownAppPath(h.replace(/^\/en/, '')), h).toBe(true);
        for (const nav of ['/en/home', '/en/discover', '/en/community', '/en/more']) expect(hrefs).not.toContain(nav);
        await expect(panel(page).getByRole('button', { name: 'Sign out' })).toBeVisible();
        await context.close();
    });

    test('no profile name: falls back to the handle, then to a neutral label — never an id', async () => {
        const { page, context } = await open({ width: 1280, height: 800 }, { firstName: '', lastName: '', middleName: null });
        await openPanel(page);
        const identity = page.getByTestId('account-identity');
        await expect(identity).toContainText('@ama');
        expect(await identity.innerText()).not.toMatch(UUID);
        await context.close();
    });

    test('Esc closes the panel and focus returns to the avatar; so does the close button', async () => {
        const { page, context } = await open({ width: 1280, height: 800 });
        await openPanel(page);
        await page.keyboard.press('Escape');
        await expect(panel(page)).toHaveCount(0);
        await expect(trigger(page)).toBeFocused();

        await openPanel(page);
        await page.getByRole('button', { name: 'Close menu' }).click();
        await expect(panel(page)).toHaveCount(0);
        await expect(trigger(page)).toBeFocused();
        await context.close();
    });

    test('Tab never leaves the panel', async () => {
        const { page, context } = await open({ width: 1280, height: 800 });
        await openPanel(page);
        for (let i = 0; i < 24; i++) {
            await page.keyboard.press('Tab');
            const inside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
            expect(inside).toBe(true);
        }
        await context.close();
    });

    test('following a link closes the panel and lands on the page', async () => {
        const { page, context } = await open({ width: 1280, height: 800 });
        await openPanel(page);
        await panel(page).getByRole('link', { name: 'Settings & privacy' }).click();
        await expect(page).toHaveURL(/\/en\/settings/, { timeout: 400_000 });
        await expect(page.getByRole('dialog', { name: 'Your account' })).toHaveCount(0);
        await context.close();
    });

    test('phone 360: a card inside the screen (not a full-height sheet), no sideways scroll, 44 px targets, 14 px text, long names truncate', async () => {
        const long = 'Wolfeschlegelsteinhausenbergerdorff'.repeat(2);
        const { page, context } = await open({ width: 360, height: 740 }, { firstName: long, lastName: long });
        await openPanel(page);

        const box = await panel(page).boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(360);
        expect(box!.y).toBeGreaterThan(0);
        expect(box!.y + box!.height).toBeLessThanOrEqual(740);
        expect(box!.height).toBeLessThan(740);

        const m = await page.evaluate(() => {
            const dlg = document.querySelector('[data-testid="account-panel"]') as HTMLElement;
            const small: string[] = [];
            for (const el of Array.from(dlg.querySelectorAll<HTMLElement>('*'))) {
                const hasOwnText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? '').trim());
                if (hasOwnText && el.closest('.sr-only') === null && parseFloat(getComputedStyle(el).fontSize) < 14) small.push(el.textContent!.trim());
            }
            const rows = Array.from(dlg.querySelectorAll<HTMLElement>('nav a, nav button, footer a, [role="combobox"], button[aria-label="Close menu"]'));
            return {
                docOverflow: document.documentElement.scrollWidth - window.innerWidth,
                panelOverflow: dlg.scrollWidth - dlg.clientWidth,
                small,
                shortTargets: rows.filter((r) => r.getBoundingClientRect().height < 44).map((r) => r.textContent?.trim() || r.getAttribute('aria-label')),
            };
        });
        expect(m.docOverflow).toBeLessThanOrEqual(0);
        expect(m.panelOverflow).toBeLessThanOrEqual(0);
        expect(m.small).toEqual([]);
        expect(m.shortTargets).toEqual([]);
        // The long name is clipped inside the identity card, not pushing it wider.
        const idBox = await page.getByTestId('account-identity').boundingBox();
        expect(idBox!.x + idBox!.width).toBeLessThanOrEqual(360);
        await context.close();
    });

    test('desktop: a 360 px dropdown anchored to the avatar, as tall as its content, not top-to-bottom', async () => {
        const { page, context } = await open({ width: 1280, height: 900 });
        // Measure the avatar first: while the (modal) dropdown is open, the rest of the page is
        // aria-hidden, so the trigger is no longer reachable by role.
        await expect(trigger(page)).toBeVisible();
        const avatar = (await trigger(page).boundingBox())!;
        await openPanel(page);
        // It opens with a short zoom-in; measure once the animation has settled.
        await expect.poll(async () => Math.round((await panel(page).boundingBox())?.width ?? 0)).toBe(360);
        const box = (await panel(page).boundingBox())!;
        expect(box.height).toBeLessThan(900 - 80);
        // Anchored: right edges line up with the avatar, and it opens just below it.
        expect(Math.abs(box.x + box.width - (avatar.x + avatar.width))).toBeLessThanOrEqual(2);
        expect(box.y).toBeGreaterThanOrEqual(avatar.y + avatar.height);
        expect(box.y - (avatar.y + avatar.height)).toBeLessThanOrEqual(16);
        // No dimmed backdrop over the page.
        expect(await page.locator('[data-radix-popper-content-wrapper]').count()).toBe(1);
        expect(await page.evaluate(() => Array.from(document.querySelectorAll('div')).some((d) => getComputedStyle(d).position === 'fixed' && d.getBoundingClientRect().width >= window.innerWidth && getComputedStyle(d).backgroundColor.startsWith('rgba(0, 0, 0')))).toBe(false);
        await context.close();
    });

    test('sign-out asks first; Cancel keeps the session; Sign out revokes the server session, clears the local one and goes to sign-in', async () => {
        const { page, context, graphql, authWrites } = await open({ width: 1280, height: 800 });
        await openPanel(page);
        await panel(page).getByRole('button', { name: 'Sign out' }).click();
        await expect(panel(page)).toHaveCount(0);
        const confirm = page.getByRole('dialog', { name: 'Sign out?' });
        await expect(confirm).toBeVisible();
        expect(graphql.calls.some((c) => c.name === 'Logout')).toBe(false);

        await confirm.getByRole('button', { name: 'Cancel' }).click();
        await expect(confirm).toHaveCount(0);
        expect(graphql.calls.some((c) => c.name === 'Logout')).toBe(false);

        await openPanel(page);
        await panel(page).getByRole('button', { name: 'Sign out' }).click();
        await page.getByRole('dialog', { name: 'Sign out?' }).getByRole('button', { name: 'Sign out' }).click();
        await expect(page).toHaveURL(/\/en\/signin/, { timeout: 90_000 });
        expect(graphql.calls.filter((c) => c.name === 'Logout')).toHaveLength(1);
        expect(authWrites.some((w) => JSON.parse(w).state?.tokens === null)).toBe(true);
        await context.close();
    });
});
