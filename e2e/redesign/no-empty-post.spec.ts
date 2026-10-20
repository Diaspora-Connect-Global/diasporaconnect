/**
 * Never an empty post. The Post button stays disabled until there is visible text
 * (not whitespace, not invisible characters) or an attachment, and a server
 * POST_EMPTY refusal shows a translated message with no false success.
 * GraphQL is the in-memory double.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { open } from './fixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const modal = (page: Page) => page.getByTestId('post-composer-modal');
const promptBox = (page: Page) => page.getByRole('button', { name: /Share an update/ });
const postBtn = (page: Page) => modal(page).getByRole('button', { name: 'Post', exact: true });

const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
);

test('Post is disabled for empty, whitespace-only and invisible-only text, enabled with real text', async () => {
    const { page } = await open(browser, '/home', {});
    await promptBox(page).click({ timeout: 90_000 });
    await expect(modal(page)).toBeVisible({ timeout: 90_000 });
    const box = modal(page).locator('textarea');
    await expect(postBtn(page)).toBeDisabled();
    await expect(postBtn(page)).toHaveAccessibleDescription(/Add some text, a photo, a video or a file/);

    await box.fill('   \n\t  ');
    await expect(postBtn(page)).toBeDisabled();
    await box.fill('​‌﻿ ');
    await expect(postBtn(page)).toBeDisabled();

    await box.fill('Hello');
    await expect(postBtn(page)).toBeEnabled();
    await box.fill('   ');
    await expect(postBtn(page)).toBeDisabled();
    await page.context().close();
});

test('Post is enabled with an attachment and no text', async () => {
    const { page } = await open(browser, '/home', {});
    await promptBox(page).click({ timeout: 90_000 });
    await expect(modal(page)).toBeVisible({ timeout: 90_000 });
    await expect(postBtn(page)).toBeDisabled();
    const [chooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        modal(page).getByTitle('Add Photo').click(),
    ]);
    await chooser.setFiles({ name: 'a.png', mimeType: 'image/png', buffer: PNG });
    await expect(postBtn(page)).toBeEnabled();
    await page.context().close();
});

test('a server POST_EMPTY refusal shows the translated message and no success', async () => {
    const { page } = await open(browser, '/home', {
        CreatePost: { __errors: [{ message: 'A post must have text or at least one attachment.', code: 'POST_EMPTY' }] },
    });
    await promptBox(page).click({ timeout: 90_000 });
    await expect(modal(page)).toBeVisible({ timeout: 90_000 });
    await modal(page).locator('textarea').fill('x');
    await postBtn(page).click();
    await expect(modal(page).getByRole('alert')).toContainText('Your post is empty');
    await expect(modal(page)).toBeVisible();
    await expect(page.getByText('Post published successfully!')).toHaveCount(0);
    await page.context().close();
});

test('the empty-post hint fits at 360 px', async () => {
    const { page } = await open(browser, '/home', {});
    await page.setViewportSize({ width: 360, height: 740 });
    await promptBox(page).click({ timeout: 90_000 });
    await expect(modal(page)).toBeVisible({ timeout: 90_000 });
    await expect(postBtn(page)).toBeDisabled();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    await page.context().close();
});
