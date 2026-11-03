/** The redesigned "Become a vendor" flow: hero, step indicator, same validation, same createVendor variables. */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { UUID, open } from './fixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const CREATE_VENDOR = { CreateVendor: { createVendor: 'vendor-created' } };

async function pastIntro(page: Page) {
    await page.getByRole('button', { name: 'Skip' }).click();
    await page.getByRole('button', { name: 'Finish' }).click();
}

test('renders the hero, the step indicator and the benefits rail', async () => {
    const { page } = await open(browser, '/becomeavendor', CREATE_VENDOR);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Become a vendor', { timeout: 90_000 });
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    const steps = page.getByTestId('vendor-steps');
    await expect(steps.getByRole('listitem')).toHaveCount(3);
    await expect(steps.locator('[aria-current="step"]')).toContainText('Welcome');
    // The rail only says what the platform does: escrow, payouts, optional verification. No invented numbers.
    const rail = page.getByTestId('vendor-rail');
    await expect(rail.getByText('Payments held in escrow')).toBeVisible();
    await expect(rail.getByText('Verification is optional')).toBeVisible();
    await expect(page.getByText(/thousands|trusted by|rated|\d+\s*vendors/i)).toHaveCount(0);
    // Intro: Next advances a slide, Skip jumps to the last one, Finish moves to step 2.
    await expect(page.getByRole('heading', { level: 2, name: "Let's get your business online" })).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Grow your business with new customers' })).toBeVisible();
    await page.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Secure sales with escrow' })).toBeVisible();
    await page.getByRole('button', { name: 'Finish' }).click();
    await expect(steps.locator('[aria-current="step"]')).toContainText('What you offer');
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('validation: Continue stays disabled until an option is chosen, and Back returns to the intro', async () => {
    const { page } = await open(browser, '/becomeavendor', CREATE_VENDOR);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 90_000 });
    await pastIntro(page);
    const next = page.getByRole('button', { name: 'Continue' });
    await expect(next).toBeDisabled();
    await page.getByRole('radio', { name: /Sell products/ }).check({ force: true });
    await expect(next).toBeEnabled();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByTestId('vendor-intro')).toBeVisible();
    await page.context().close();
});

test('products: submit sends createVendor with BUSINESS and the product description', async () => {
    const { page, graphql } = await open(browser, '/becomeavendor', CREATE_VENDOR);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 90_000 });
    await pastIntro(page);
    await page.getByRole('radio', { name: /Sell products/ }).check({ force: true });
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Add business documents' })).toBeVisible();
    // A non-PDF is refused in place.
    await page.locator('#file-upload').setInputFiles({ name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('x') });
    await expect(page.locator('p[role="alert"]')).toHaveText('Only PDF files are supported.');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect.poll(() => graphql.calls.filter((c) => c.name === 'CreateVendor').length, { timeout: 30_000 }).toBe(1);
    const call = graphql.calls.find((c) => c.name === 'CreateVendor')!;
    expect(call.variables).toEqual({ vendorType: 'BUSINESS', displayName: expect.any(String), description: 'Product seller on DiasporaConnect' });
    await page.context().close();
});

test('services: submit sends createVendor with INDIVIDUAL and the service description', async () => {
    const { page, graphql } = await open(browser, '/becomeavendor', CREATE_VENDOR);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 90_000 });
    await pastIntro(page);
    await page.getByRole('radio', { name: /Provide services/ }).check({ force: true });
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect.poll(() => graphql.calls.filter((c) => c.name === 'CreateVendor').length, { timeout: 30_000 }).toBe(1);
    const call = graphql.calls.find((c) => c.name === 'CreateVendor')!;
    expect(call.variables).toEqual({ vendorType: 'INDIVIDUAL', displayName: expect.any(String), description: 'Service provider on DiasporaConnect' });
    await page.context().close();
});

test('no horizontal scroll at 360px on any step, and the status page fits too', async () => {
    const { page } = await open(browser, '/becomeavendor', CREATE_VENDOR, { width: 360, height: 740 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 90_000 });
    const overflow = () => page.evaluate(() => [document.documentElement, document.querySelector('.h-app-inner')].some((el) => !!el && el.scrollWidth > el.clientWidth));
    expect(await overflow()).toBe(false);
    await pastIntro(page);
    expect(await overflow()).toBe(false);
    await page.getByRole('radio', { name: /Sell products/ }).check({ force: true });
    await page.getByRole('button', { name: 'Continue' }).click();
    expect(await overflow()).toBe(false);
    await page.goto('/en/becomeavendor/status');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your vendor account is ready', { timeout: 90_000 });
    expect(await overflow()).toBe(false);
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});
