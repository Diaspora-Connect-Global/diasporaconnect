/**
 * Phones (< lg): pages with side rails (Home, Community) put both rails in a slide-in
 * drawer opened from a menu button on the left of the header; pages without rails get
 * no button. At 1280 px nothing changes. GraphQL is the in-memory double.
 */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { eventFixture } from '../support/eventFixtures';
import { FUTURE, UUID, open } from '../redesign/fixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const PHONE = { width: 360, height: 740 };
const registered = { UserEvents: { userEvents: { __typename: 'UserEvents', attending: [eventFixture({ id: 'evt-reg', title: 'Networking Mixer', startAt: FUTURE, endAt: FUTURE, isRegistered: true })], saved: [] } } };
const kyc = { GetMyKYCStatus: { getMyKYCStatus: { __typename: 'KYCStatus', status: 'UNDER_REVIEW', kycLevel: 0, profileId: null } } };

test('Home at 360px: button opens a drawer with BOTH rails as lists; Esc closes it and focus returns', async () => {
    const { page } = await open(browser, '/home', { ...registered, ...kyc }, PHONE);
    const button = page.getByTestId('rail-menu-button');
    await expect(button).toBeVisible({ timeout: 90_000 });
    const box = (await button.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await expect(button).toHaveAttribute('aria-label', 'Open menu');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    // The rails no longer stack into the main column.
    await expect(page.getByTestId('home-rail-mobile')).toHaveCount(0);
    await expect(page.getByTestId('rail-menu-drawer')).toHaveCount(0);

    await button.click();
    const drawer = page.getByTestId('rail-menu-drawer');
    await expect(drawer).toBeVisible();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    // Left rail entries, then right rail entries, as plain lists with headings.
    await expect(drawer.getByRole('heading', { name: 'Your Communities' })).toBeVisible();
    await expect(drawer.getByRole('link', { name: /Ghana Union Berlin/ })).toBeVisible();
    await expect(drawer.getByRole('heading', { name: 'Your activity' })).toBeVisible();
    await expect(drawer.getByTestId('rm-activity-event')).toContainText('Networking Mixer');
    await expect(drawer.getByTestId('rm-activity-event-status')).toHaveText('Registered');
    await expect(drawer.getByTestId('rm-activity-kyc')).toContainText('Identity verification');
    await expect(drawer.getByTestId('rm-activity-kyc-status')).toHaveText('Under review');
    await expect(drawer.getByRole('heading', { name: 'Quick actions' })).toBeVisible();
    expect(await drawer.getByRole('list').count()).toBeGreaterThanOrEqual(4);
    expect(await drawer.getByRole('link').count()).toBeGreaterThan(5);
    expect(await drawer.innerText()).not.toMatch(UUID);
    const size = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    expect(size.sw).toBeLessThanOrEqual(size.iw);

    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('aria-expanded', 'false');

    // The backdrop closes it too.
    await button.click();
    await expect(drawer).toBeVisible();
    await page.mouse.click(Math.round(PHONE.width - 4), 400);
    await expect(drawer).toHaveCount(0);
    await page.context().close();
});

test('Home at 360px: a row closes the drawer and navigates', async () => {
    const { page } = await open(browser, '/home', {}, PHONE);
    await page.getByTestId('rail-menu-button').click({ timeout: 90_000 });
    const drawer = page.getByTestId('rail-menu-drawer');
    await drawer.getByRole('link', { name: 'Find opportunities' }).click();
    await expect(page).toHaveURL(/\/discover/, { timeout: 180_000 }); // first visit compiles the page in dev
    await expect(drawer).toHaveCount(0);
    await page.context().close();
});

test('Community at 360px: the left page column and right rail are in the drawer, not stacked in the page', async () => {
    const { page } = await open(browser, '/community', {}, PHONE);
    const button = page.getByTestId('rail-menu-button');
    await expect(button).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('your-communities')).toBeHidden();
    await expect(page.getByTestId('community-rail')).toBeHidden();
    await button.click();
    const drawer = page.getByTestId('rail-menu-drawer');
    await expect(drawer.getByRole('heading', { name: 'Your communities' })).toBeVisible();
    await expect(drawer.getByRole('link', { name: /Ghana Union Berlin/ })).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Events', exact: true })).toBeVisible();
    expect(await drawer.innerText()).not.toMatch(UUID);
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
    await expect(button).toBeFocused();
    await page.context().close();
});

test('a page without rails (More) at 360px: the drawer lists the More entries', async () => {
    const { page } = await open(browser, '/more', {}, PHONE);
    const button = page.getByTestId('rail-menu-button');
    await expect(button).toBeVisible({ timeout: 90_000 });
    await button.click();
    const drawer = page.getByTestId('rail-menu-drawer');
    for (const heading of ['Your Stuff', 'Work & Business', 'Money & Payments', 'Connect & Community']) {
        await expect(drawer.getByRole('heading', { name: heading })).toBeVisible();
    }
    await expect(drawer.getByTestId('dm-saved')).toHaveAttribute('href', '/en/saved');
    await expect(drawer.getByTestId('dm-payments')).toHaveAttribute('href', '/en/wallet');
    await expect(drawer.getByTestId('dm-conversations')).toHaveAttribute('href', '/en/chat');
    expect(await drawer.getByRole('list').count()).toBeGreaterThanOrEqual(5);
    expect(await drawer.innerText()).not.toMatch(UUID);
    const size = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    expect(size.sw).toBeLessThanOrEqual(size.iw);
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
    await expect(button).toBeFocused();
    await page.context().close();
});

test('at 1280px there is no menu button, and the Community left rail has no Home / Discover / Community / More links', async () => {
    for (const route of ['/home', '/community', '/more']) {
        const { page } = await open(browser, route, {}, { width: 1280, height: 800 });
        await expect(page.getByRole('banner')).toBeVisible({ timeout: 90_000 });
        await expect(page.getByTestId('rail-menu-button')).toBeHidden();
        if (route === '/community') {
            const rail = page.getByTestId('community-nav');
            await expect(rail).toBeVisible({ timeout: 90_000 });
            await expect(rail.getByRole('link', { name: /^(Home|Discover|Community|More)$/ })).toHaveCount(0);
            await expect(rail.getByRole('link')).toHaveCount(3);
        }
        await page.context().close();
    }
});
