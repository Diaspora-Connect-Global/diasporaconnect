/**
 * Sign-in / sign-up show only the providers that are set up: Google. Facebook and X are hidden
 * until their OAuth apps work (owner, 2026-10-18).
 */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

for (const path of ['/en/signin', '/en/signup']) {
    test(`${path}: only "Continue with Google", no Facebook or X`, async () => {
        const context = await browser.newContext({ viewport: { width: 360, height: 760 } });
        const page = await context.newPage();
        await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 300_000 });
        const providers = page.getByTestId('sign-in-providers');
        await expect(providers).toBeVisible({ timeout: 120_000 });
        await expect(providers.getByRole('button')).toHaveCount(1);
        await expect(providers.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Facebook|Continue with X/ })).toHaveCount(0);
        await context.close();
    });
}
