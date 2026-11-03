/** The redesigned Wallet: honest totals (minor units / 100 once), Withdraw per vendor status, states, no ids, 360px. */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { UUID, open } from './fixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const intent = (id: string, status: string, gross: number, purpose: string, currency = 'GHS') => ({
    __typename: 'PaymentIntentType',
    id,
    status,
    gross_amount: gross,
    currency,
    purpose,
    created_at: '2026-10-20T10:00:00.000Z',
});

const PAYMENTS = {
    MyPaymentIntents: {
        myPaymentIntents: {
            __typename: 'PaymentIntentListResponse',
            success: true,
            total: 3,
            payment_intents: [
                intent('11111111-aaaa-4bbb-8ccc-000000000001', 'CONFIRMED', 12550, 'PRODUCT_ORDER'),
                intent('11111111-aaaa-4bbb-8ccc-000000000002', 'CONFIRMED', 2000, 'EVENT_TICKET'),
                intent('11111111-aaaa-4bbb-8ccc-000000000003', 'PENDING', 5000, 'SERVICE_ORDER'),
            ],
        },
    },
};
const EMPTY = { MyPaymentIntents: { myPaymentIntents: { __typename: 'PaymentIntentListResponse', success: true, total: 0, payment_intents: [] } } };
const VENDOR = { GetMyVendor: { getMyVendor: { __typename: 'Vendor', id: 'v-1', userId: 'u-1', displayName: 'Ama Crafts', status: 'REGISTERED', capabilities: [], payoutAccounts: [] } } };
const NO_VENDOR = { GetMyVendor: { getMyVendor: null } };

test('totals are minor units divided by 100 once, with honest labels and status badges', async () => {
    const { page } = await open(browser, '/wallet', { ...PAYMENTS, ...NO_VENDOR });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Wallet', { timeout: 90_000 });
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    const summary = page.getByTestId('wallet-summary');
    await expect(summary.getByText('Total paid')).toBeVisible();
    await expect(summary).toContainText('145.50'); // 12550 + 2000 = 14550 minor
    await expect(summary).toContainText('50.00'); // 5000 minor pending
    await expect(summary).not.toContainText('14,550');
    await expect(page.getByText(/total balance|available|in escrow/i)).toHaveCount(0);
    const list = page.getByTestId('wallet-transactions');
    await expect(list.getByRole('listitem')).toHaveCount(3);
    await expect(list.getByText('Pending')).toHaveCount(1);
    await expect(list.getByText('Paid')).toHaveCount(2);
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('non-vendor: Withdraw is disabled with a reason and never goes to vendor onboarding', async () => {
    const { page } = await open(browser, '/wallet', { ...PAYMENTS, ...NO_VENDOR });
    const withdraw = page.getByTestId('wallet-withdraw');
    await expect(withdraw).toBeVisible({ timeout: 90_000 });
    await expect(withdraw).toBeDisabled();
    await expect(page.getByText(/Withdrawals are for sellers/)).toBeVisible();
    await withdraw.click({ force: true });
    await page.waitForTimeout(500);
    expect(page.url()).not.toContain('becomeavendor');
    expect(page.url()).not.toContain('/vendors');
    expect(page.url()).toContain('/wallet');
    await page.context().close();
});

test('vendor: Withdraw links to the payout page', async () => {
    const { page } = await open(browser, '/wallet', { ...PAYMENTS, ...VENDOR });
    const withdraw = page.getByTestId('wallet-withdraw');
    await expect(withdraw).toBeVisible({ timeout: 90_000 });
    await expect(withdraw).toHaveAttribute('href', /\/en\/vendors\/payouts$/);
    await expect(page.getByText(/Withdrawals are for sellers/)).toHaveCount(0);
    await page.context().close();
});

test('empty state, and no horizontal scroll at 360px', async () => {
    const { page } = await open(browser, '/wallet', { ...EMPTY, ...NO_VENDOR }, { width: 360, height: 800 });
    await expect(page.getByText('No payments yet')).toBeVisible({ timeout: 90_000 });
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.context().close();
});

test('360px with data: no horizontal scroll', async () => {
    const { page } = await open(browser, '/wallet', { ...PAYMENTS, ...VENDOR }, { width: 360, height: 800 });
    await expect(page.getByTestId('wallet-transactions')).toBeVisible({ timeout: 90_000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.context().close();
});
