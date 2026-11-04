/** The redesigned Marketplace: hero + grid, URL-driven filters that change the real query, detail with price ÷100 once, unchanged order mutation. */
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

const VENDOR_ID = '00000000-0000-4000-8000-0000000d0001';
const product = (id: string, title: string, price: number, over: Record<string, unknown> = {}) => ({
    __typename: 'Product',
    id,
    vendor_id: VENDOR_ID,
    title,
    description: `${title} description written by the seller.`,
    price,
    currency: 'GHS',
    inventory_count: 5,
    product_type: 'PHYSICAL',
    shipping_profile_id: null,
    download_url: null,
    images: [],
    tags: ['fabric', 'gifts'],
    status: 'ACTIVE',
    created_at: '2026-10-01T08:00:00.000Z',
    updated_at: '2026-10-01T08:00:00.000Z',
    ...over,
});
// API sends integer minor units: 12345 = GHS 123.45, shown once ÷100.
const PRODUCTS = [product('prod-1', 'Kente cloth', 12345), product('prod-2', 'Shea butter set', 4500)];
const service = (id: string, title: string, base: number) => ({ __typename: 'MarketplaceService', id, vendor_id: VENDOR_ID, title, description: 'Seller text.', base_price: base, currency: 'GHS', tags: [], status: 'ACTIVE', created_at: '2026-10-01T08:00:00.000Z', updated_at: '2026-10-01T08:00:00.000Z' });

const OVERRIDES = {
    SearchProducts: { searchProducts: { __typename: 'ProductList', success: true, products: PRODUCTS, total: 2, page: 1, limit: 20 } },
    SearchMarketplaceServices: { searchMarketplaceServices: { __typename: 'ServiceList', success: true, services: [service('svc-1', 'Tax filing help', 25000)], total: 1, page: 1, limit: 20 } },
    GetProduct: (v: Record<string, unknown>) => ({ getProduct: { __typename: 'ProductResponse', success: true, message: null, product: PRODUCTS.find((p) => p.id === v.product_id) ?? PRODUCTS[0] } }),
    ProductReviews: { productReviews: { __typename: 'ProductReviewList', reviews: [], total: 0, average_rating: 0, has_more: false } },
};

test('hero, tabs and a card grid render from the faked queries, with no rating or id', async () => {
    const { page } = await open(browser, '/marketplace', OVERRIDES);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Buy and sell', { timeout: 90_000 });
    await expect(page.getByRole('tab', { name: 'Products' })).toHaveAttribute('aria-selected', 'true');
    const cards = page.getByTestId('mp-card');
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toContainText('Kente cloth');
    await expect(cards.first()).toContainText('123.45');
    // No rating data exists for a list row: no stars, no "(0)", no invented location.
    await expect(page.getByTestId('mp-results').getByText(/\(\d+\)|Accra, Ghana/)).toHaveCount(0);
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('tab, tag, currency and price filters live in the URL and change the real query variables', async () => {
    const { page, graphql } = await open(browser, '/marketplace', OVERRIDES);
    await expect(page.getByTestId('mp-card').first()).toBeVisible({ timeout: 90_000 });
    // Open the refine panel on phones; on desktop it is already open.
    await page.getByRole('button', { name: 'fabric' }).click();
    await expect.poll(() => graphql.calls.filter((c) => c.name === 'SearchProducts').some((c) => (c.variables as { input: { tags?: string[] } }).input.tags?.[0] === 'fabric')).toBe(true);
    await expect(page).toHaveURL(/tag=fabric/);
    await page.getByLabel('Currency').selectOption('USD');
    await expect(page).toHaveURL(/cur=USD/); // a person's next change comes after this one has landed
    await page.getByPlaceholder('Minimum').fill('10.50');
    await page.getByPlaceholder('Minimum').blur();
    await expect.poll(() => {
        const last = graphql.calls.filter((c) => c.name === 'SearchProducts').at(-1);
        const input = (last?.variables as { input: Record<string, unknown> }).input;
        // 10.50 typed in major units goes out as 1050 integer minor units.
        return input.currency === 'USD' && input.min_price === 1050;
    }).toBe(true);
    await page.getByRole('tab', { name: 'Services' }).click();
    await expect(page.getByTestId('mp-card').first()).toContainText('Tax filing help');
    await expect(page.getByTestId('mp-card').first()).toContainText('From');
    await expect(page).toHaveURL(/tab=services/);
    await page.context().close();
});

test('the product page shows the price once ÷100, the seller description, and "No reviews yet" instead of stars', async () => {
    const { page } = await open(browser, '/marketplace', OVERRIDES);
    await page.getByTestId('mp-card').first().click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kente cloth', { timeout: 30_000 });
    await expect(page.getByTestId('mp-price')).toContainText('123.45');
    await expect(page.getByTestId('mp-price')).not.toContainText('12,345');
    await expect(page.getByText('Kente cloth description written by the seller.')).toBeVisible();
    await expect(page.getByTestId('mp-reviews')).toContainText('No reviews yet');
    // The vendor id is a UUID: it is used for the order but never shown, and there is no fake size picker.
    await expect(page.getByText('Sold by')).toHaveCount(0);
    await expect(page.getByText(/^(SM|XXL)$/)).toHaveCount(0);
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('checkout still sends the same order mutation: vendor, product, quantity, price in minor units, currency, notes', async () => {
    const over = { ...OVERRIDES, CreateProductOrder: { createProductOrder: { __typename: 'OrderResponse', success: false, message: 'e2e stop', order: null } } };
    const { page, graphql } = await open(browser, '/marketplace', over);
    await page.getByTestId('mp-card').first().click();
    await page.getByRole('button', { name: 'Buy now' }).click();
    await page.getByPlaceholder('Name').fill('Ama Owusu');
    await page.getByPlaceholder('Address').fill('1 High Street');
    await page.getByPlaceholder('City').fill('Accra');
    await page.locator('#checkout-country').click();
    await page.getByRole('option', { name: 'Ghana' }).click();
    await page.getByPlaceholder(/phone/i).fill('0240000000');
    await page.getByRole('button', { name: /^Pay/ }).click();
    await expect.poll(() => graphql.calls.some((c) => c.name === 'CreateProductOrder'), { timeout: 30_000 }).toBe(true);
    const input = (graphql.calls.find((c) => c.name === 'CreateProductOrder')!.variables as { input: Record<string, unknown> }).input;
    expect(input.vendor_id).toBe(VENDOR_ID);
    expect(input.items).toEqual([{ product_id: 'prod-1', quantity: 1, price: 12345, currency: 'GHS' }]);
    expect(input.notes).toBe('payment_method:credit');
    await page.context().close();
});

test('fits 360px with no horizontal scroll', async () => {
    const { page } = await open(browser, '/marketplace', OVERRIDES, { width: 360, height: 800 });
    await expect(page.getByTestId('mp-card').first()).toBeVisible({ timeout: 90_000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByTestId('mp-card').first().click();
    await expect(page.getByTestId('mp-price')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.context().close();
});
