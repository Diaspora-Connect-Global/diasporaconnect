/**
 * Checkout against faked GraphQL: the exact mutation variables for a product, a
 * service and a mixed cart, and that the total on screen is the sum of what is sent.
 *
 * NOTE: the fake replies carry `payment_intent_id` on the order. The real gateway
 * does not return it yet (see the commit that added this file), so this describes
 * the contract checkout needs, not what production answers today.
 */
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

const VENDOR_ID = '00000000-0000-4000-8000-0000000d0001';
const VENDOR_2 = '00000000-0000-4000-8000-0000000d0002';
const AT = '2026-10-01T08:00:00.000Z';

const product = (id: string, title: string, price: number) => ({ __typename: 'Product', id, vendor_id: VENDOR_ID, title, description: 'Seller text.', price, currency: 'GHS', inventory_count: 5, product_type: 'PHYSICAL', shipping_profile_id: null, download_url: null, images: [], tags: [], status: 'ACTIVE', created_at: AT, updated_at: AT });
const service = (id: string, title: string, base_price: number) => ({ __typename: 'MarketplaceService', id, vendor_id: VENDOR_2, title, description: 'Seller text.', base_price, currency: 'GHS', tags: [], status: 'ACTIVE', created_at: AT, updated_at: AT });

const PRODUCT = product('prod-1', 'Kente cloth', 12345);
const SERVICE = service('svc-1', 'Tax filing help', 25000);

const orderReply = (key: string, id: string) => ({
    [key]: { __typename: 'OrderResponse', success: true, message: null, order: { __typename: 'MarketplaceOrder', id, payment_intent_id: `pi-${id}`, buyer_id: 'b', vendor_id: VENDOR_ID, status: 'CREATED', items: null, total_amount: 0, currency: 'GHS', shipping_address: null, notes: null, created_at: AT, updated_at: AT } },
});

const BASE = {
    SearchProducts: { searchProducts: { __typename: 'ProductList', success: true, products: [PRODUCT], total: 1, page: 1, limit: 20 } },
    SearchMarketplaceServices: { searchMarketplaceServices: { __typename: 'ServiceList', success: true, services: [SERVICE], total: 1, page: 1, limit: 20 } },
    GetProduct: { getProduct: { __typename: 'ProductResponse', success: true, message: null, product: PRODUCT } },
    GetMarketplaceService: { getMarketplaceService: { __typename: 'ServiceResponse', success: true, message: null, service: SERVICE } },
    ProductReviews: { productReviews: { __typename: 'ProductReviewList', reviews: [], total: 0, average_rating: 0, has_more: false } },
    MyPaymentMethods: { myPaymentMethods: { __typename: 'PaymentMethodList', success: true, payment_methods: [{ __typename: 'PaymentMethod', id: 'card-1', provider: 'STRIPE', type: 'card', last4: '4242', brand: 'visa', expiry_month: 12, expiry_year: 2030, is_primary: true }] } },
    CreateProductOrder: orderReply('createProductOrder', 'order-p'),
    CreateServiceOrder: orderReply('createServiceOrder', 'order-s'),
    ConfirmPaymentIntent: { confirmPaymentIntent: { __typename: 'ConfirmPaymentIntentResponse', success: true, message: null, provider_transaction_id: null, requires_action: false, action_url: null } },
};

/** The cart lives in React state: reloading the page would empty it, so these stay in the app. */
async function addProductToCart(page: Page) {
    await expect(page.getByTestId('mp-card').first()).toBeVisible({ timeout: 90_000 });
    await page.getByTestId('mp-card').first().click();
    await page.getByTestId('mp-rail').getByRole('button', { name: 'Add to cart' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'Back to marketplace' }).click();
}

async function addServiceToCart(page: Page, quantity = 1) {
    await page.getByRole('tab', { name: 'Services' }).click();
    await expect(page.getByTestId('mp-card').first()).toContainText('Tax filing help', { timeout: 90_000 });
    await page.getByTestId('mp-card').first().click();
    const rail = page.getByTestId('mp-rail');
    for (let i = 1; i < quantity; i += 1) await rail.getByRole('button', { name: 'Increase quantity' }).click();
    await rail.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
}

const proceedToCheckout = (page: Page) => page.getByRole('button', { name: 'Proceed to checkout' }).click();

async function fillAddress(page: Page) {
    await page.getByPlaceholder('Name').fill('Ama Owusu');
    await page.getByPlaceholder('Address').fill('1 High Street');
    await page.getByPlaceholder('City').fill('Accra');
    await page.locator('#checkout-country').click();
    await page.getByRole('option', { name: /Ghana/ }).click();
    await page.getByPlaceholder(/phone/i).fill('0240000000');
}

/** Reads "GH₵123.45" off the screen as integer minor units. */
const toMinor = (text: string | null) => Math.round(Number((text ?? '').replace(/[^0-9.]/g, '')) * 100);
const inputs = (graphql: { calls: { name: string; variables: unknown }[] }, name: string) =>
    graphql.calls.filter((c) => c.name === name).map((c) => (c.variables as { input: Record<string, unknown> }).input);

test('product cart: exact createProductOrder variables, and the total is what is sent', async () => {
    const { page, graphql } = await open(browser, '/marketplace', BASE);
    await expect(page.getByTestId('mp-card').first()).toBeVisible({ timeout: 90_000 });
    await page.getByTestId('mp-card').first().click();
    await page.getByRole('button', { name: 'Buy now' }).click();

    const total = toMinor(await page.getByTestId('mp-checkout-total').textContent());
    expect(total).toBe(12345);
    await expect(page.getByText('Shipping fee')).toHaveCount(0);
    await expect(page.getByText('Billing address')).toHaveCount(0);

    // Pay waits for a complete address, and says so.
    await expect(page.getByRole('button', { name: /^Pay/ })).toBeDisabled();
    await expect(page.getByTestId('mp-checkout-address-hint')).toBeVisible();
    await fillAddress(page);
    await expect(page.getByTestId('mp-checkout-address-hint')).toHaveCount(0);
    await page.getByRole('button', { name: /^Pay/ }).click();

    await expect(page.getByRole('button', { name: 'Done order' })).toBeVisible({ timeout: 30_000 });
    expect(inputs(graphql, 'CreateProductOrder')).toEqual([{
        vendor_id: VENDOR_ID,
        items: [{ product_id: 'prod-1', quantity: 1, price: 12345, currency: 'GHS' }],
        shipping_address: 'Ama Owusu, 1 High Street, Accra, GH, 0240000000',
        notes: 'payment_method:credit',
    }]);
    expect(inputs(graphql, 'CreateServiceOrder')).toEqual([]);
    expect(inputs(graphql, 'ConfirmPaymentIntent')).toEqual([{ payment_intent_id: 'pi-order-p', payment_method_id: 'card-1', provider: 'STRIPE' }]);
    expect(total).toBe((inputs(graphql, 'CreateProductOrder')[0].items as { price: number; quantity: number }[]).reduce((sum, i) => sum + i.price * i.quantity, 0));
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('service cart: createServiceOrder with no product_id, package or address, and no address asked for', async () => {
    const { page, graphql } = await open(browser, '/marketplace', BASE);
    await expect(page.getByTestId('mp-card').first()).toBeVisible({ timeout: 90_000 });
    await addServiceToCart(page);
    await proceedToCheckout(page);

    const total = toMinor(await page.getByTestId('mp-checkout-total').textContent());
    expect(total).toBe(25000); // base_price, not the old 150/300/450 packages
    await expect(page.getByPlaceholder('Address')).toHaveCount(0);
    await expect(page.getByText('Shipping address')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Pay/ })).toBeEnabled();
    await page.getByRole('button', { name: /^Pay/ }).click();

    await expect(page.getByRole('button', { name: 'Done order' })).toBeVisible({ timeout: 30_000 });
    expect(inputs(graphql, 'CreateServiceOrder')).toEqual([{ vendor_id: VENDOR_2, service_id: 'svc-1', notes: 'payment_method:credit' }]);
    expect(inputs(graphql, 'CreateProductOrder')).toEqual([]);
    await page.context().close();
});

test('a service line of 2 is 2 orders, and the screen total is what they add up to', async () => {
    const { page, graphql } = await open(browser, '/marketplace', BASE);
    await expect(page.getByTestId('mp-card').first()).toBeVisible({ timeout: 90_000 });
    await addServiceToCart(page, 2);
    await proceedToCheckout(page);
    expect(toMinor(await page.getByTestId('mp-checkout-total').textContent())).toBe(50000);
    await page.getByRole('button', { name: /^Pay/ }).click();
    await expect(page.getByRole('button', { name: 'Done order' })).toBeVisible({ timeout: 30_000 });
    expect(inputs(graphql, 'CreateServiceOrder')).toHaveLength(2);
    expect(inputs(graphql, 'ConfirmPaymentIntent')).toHaveLength(2);
    await page.context().close();
});

test('the cart total is the checkout total: no fee added on the way', async () => {
    const { page } = await open(browser, '/marketplace', BASE);
    await addProductToCart(page);
    await page.getByRole('button', { name: /^Open cart/ }).click();
    await expect(page.getByTestId('mp-cart-total')).toContainText('123.45');
    await expect(page.getByText(/one time fee/i)).toHaveCount(0);
    await proceedToCheckout(page);
    expect(toMinor(await page.getByTestId('mp-checkout-total').textContent())).toBe(12345);
    await page.context().close();
});

test('mixed cart: one of each mutation, and the total is the sum of both', async () => {
    const { page, graphql } = await open(browser, '/marketplace', BASE);
    await addProductToCart(page);
    await addServiceToCart(page);
    await proceedToCheckout(page);

    expect(toMinor(await page.getByTestId('mp-checkout-total').textContent())).toBe(12345 + 25000);
    await fillAddress(page); // the product still needs one
    await page.getByRole('button', { name: /^Pay/ }).click();

    await expect(page.getByRole('button', { name: 'Done order' })).toBeVisible({ timeout: 30_000 });
    expect(inputs(graphql, 'CreateProductOrder')).toHaveLength(1);
    expect(inputs(graphql, 'CreateServiceOrder')).toEqual([{ vendor_id: VENDOR_2, service_id: 'svc-1', notes: 'payment_method:credit' }]);
    expect(inputs(graphql, 'ConfirmPaymentIntent')).toHaveLength(2);
    await page.context().close();
});

test('part of a mixed cart fails: paid part shown, rest still payable, no success claimed, nothing paid twice', async () => {
    let refuse = true;
    const over = {
        ...BASE,
        // errorPolicy 'all': a refused mutation resolves with data: null, it does not throw.
        CreateServiceOrder: () => (refuse ? { __errors: [{ message: 'refused', code: 'INTERNAL' }] } : orderReply('createServiceOrder', 'order-s')),
    };
    const { page, graphql } = await open(browser, '/marketplace', over);
    await addProductToCart(page);
    await addServiceToCart(page);
    await proceedToCheckout(page);
    await fillAddress(page);
    await page.getByRole('button', { name: /^Pay/ }).click();

    await expect(page.getByTestId('mp-checkout-failure')).toContainText('You have not been charged for the items still listed here');
    await expect(page.getByTestId('mp-checkout-paid')).toContainText('Kente cloth');
    await expect(page.getByRole('button', { name: 'Done order' })).toHaveCount(0);
    // Only the unpaid service is left to pay for.
    expect(toMinor(await page.getByTestId('mp-checkout-total').textContent())).toBe(25000);

    refuse = false;
    await page.getByRole('button', { name: /^Pay/ }).click();
    await expect(page.getByRole('button', { name: 'Done order' })).toBeVisible({ timeout: 30_000 });
    expect(inputs(graphql, 'CreateProductOrder')).toHaveLength(1);
    expect(inputs(graphql, 'ConfirmPaymentIntent')).toHaveLength(2);
    // The success screen lists both, for the full amount.
    await expect(page.getByText('Kente cloth')).toBeVisible();
    await expect(page.getByText('Tax filing help')).toBeVisible();
    await page.context().close();
});

test('checkout with a paid line and a failure fits 360px', async () => {
    const over = { ...BASE, CreateServiceOrder: { __errors: [{ message: 'refused', code: 'INTERNAL' }] } };
    const { page } = await open(browser, '/marketplace', over, { width: 360, height: 800 });
    await addProductToCart(page);
    await addServiceToCart(page);
    await proceedToCheckout(page);
    await fillAddress(page);
    await page.getByRole('button', { name: /^Pay/ }).click();
    await expect(page.getByTestId('mp-checkout-failure')).toBeVisible({ timeout: 30_000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.context().close();
});
