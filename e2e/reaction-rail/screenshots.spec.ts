/** Writes review screenshots to .artifacts/reactions/ (desktop picker, mobile picker, reacted state). */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';

const PATH = '/en/dev-harness/reaction-rail/isolated';
const OUT = '.artifacts/reactions';
let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser.close();
});

const base = process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_PORT ?? 3111}`;

test('screenshots: desktop picker + reacted state', async () => {
    const context = await browser.newContext({ baseURL: base, viewport: { width: 900, height: 700 } });
    const page = await context.newPage();
    await page.goto(PATH);
    await expect(page.locator('main[data-hydrated="yes"]')).toBeVisible({ timeout: 60_000 });
    const card = page.getByTestId('card-0');
    await card.getByTestId('reaction-button').hover();
    await expect(page.getByTestId('reaction-picker')).toBeVisible();
    await page.screenshot({ path: `${OUT}/desktop-picker-open.png`, clip: { x: 0, y: 0, width: 900, height: 420 } });
    await page.getByTestId('reaction-picker').getByRole('button', { name: 'Hopeful' }).click();
    await page.mouse.move(5, 5);
    await expect(card.getByTestId('reaction-button')).toHaveAttribute('data-reaction', 'HOPEFUL');
    await card.screenshot({ path: `${OUT}/desktop-reacted-hopeful.png` });
    await context.close();
});

test('screenshots: mobile picker (press-and-hold)', async () => {
    const context = await browser.newContext({ baseURL: base, viewport: { width: 390, height: 700 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.goto(PATH);
    await expect(page.locator('main[data-hydrated="yes"]')).toBeVisible({ timeout: 60_000 });
    const trig = page.getByTestId('card-0').getByTestId('reaction-button');
    const b = (await trig.boundingBox())!;
    await trig.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 3, isPrimary: true, clientX: b.x + 5, clientY: b.y + 5, bubbles: true });
    await page.waitForTimeout(650);
    await expect(page.getByTestId('reaction-picker')).toBeVisible();
    await page.screenshot({ path: `${OUT}/mobile-picker-open.png` });
    await context.close();
});
