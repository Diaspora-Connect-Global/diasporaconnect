/** Discover: hero, category tiles, ONE paged list of everything discoverable, Refine panel, filters in the URL. */
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

const job = (i: number, over: Record<string, unknown> = {}) => ({ __typename: 'Opportunity', id: `job-${i}`, title: `Job number ${i}`, type: 'EMPLOYMENT', category: 'EMPLOYMENT_CAREER', location: 'Accra, Ghana', deliveryMode: 'IN_PERSON', deadline: null, createdAt: '2026-10-08T08:00:00.000Z', owner: null, ...over });
const svc = (i: number) => ({ __typename: 'Service', id: `svc-${i}`, title: `Service number ${i}`, base_price: 10000, currency: 'GHS' });
const prod = (i: number) => ({ __typename: 'Product', id: `prod-${i}`, title: `Product number ${i}`, price: 2500, currency: 'GHS', images: [] });
const PAGE = 12;

/** Opportunities of every owner, paged by offset (12 per read), plus a product and a service. */
const MANY = {
    ListOpportunities: (v: Record<string, unknown>) => {
        const input = (v.input ?? {}) as { offset?: number; type?: string };
        const all = Array.from({ length: 30 }, (_, i) => job(i + 1, input.type === 'GRANT' ? { type: 'GRANT' } : {}));
        const rows = all.slice(input.offset ?? 0, (input.offset ?? 0) + PAGE);
        return { listOpportunities: { __typename: 'OpportunityList', total: all.length, opportunities: rows } };
    },
    SearchProducts: { searchProducts: { __typename: 'ProductList', success: true, total: 1, page: 1, limit: PAGE, products: [prod(1)] } },
    SearchMarketplaceServices: { searchMarketplaceServices: { __typename: 'ServiceList', success: true, total: 1, page: 1, limit: PAGE, services: [svc(1)] } },
};

test('with no filter the page lists every kind together, not a recommendation slice', async () => {
    const { page } = await open(browser, '/discover', MANY, { width: 1280, height: 900 });
    const feed = page.getByTestId('discover-feed');
    await expect(feed).toBeVisible({ timeout: 90_000 });
    await expect(feed.getByTestId('discover-card-opportunities').first()).toBeVisible();
    await expect(feed.getByTestId('discover-card-products')).toHaveCount(1);
    await expect(feed.getByTestId('discover-card-services')).toHaveCount(1);
    await expect(feed.getByTestId('discover-card-events').first()).toBeVisible();
    await expect(feed.getByTestId('discover-card-opportunities')).toHaveCount(PAGE);
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('Load more reads the next page of opportunities and appends it', async () => {
    const { page, graphql } = await open(browser, '/discover', MANY, { width: 1280, height: 900 });
    const cards = page.getByTestId('discover-card-opportunities');
    await expect(cards).toHaveCount(PAGE, { timeout: 90_000 });
    await page.getByTestId('discover-load-more').click();
    await expect(cards).toHaveCount(PAGE * 2);
    const offsets = graphql.calls.filter((c) => c.name === 'ListOpportunities').map((c) => (c.variables.input as { offset?: number }).offset);
    expect(offsets).toEqual(expect.arrayContaining([0, PAGE]));
    await page.context().close();
});

test('a category tile narrows the list to that kind and clearing returns to everything', async () => {
    const { page, graphql } = await open(browser, '/discover', MANY);
    await expect(page.getByTestId('discover-feed')).toBeVisible({ timeout: 90_000 });
    await page.getByRole('button', { name: 'Real estate' }).click();
    await expect(page).toHaveURL(/cat=realEstate/);
    await expect(page.getByTestId('discover-card-products')).toHaveCount(0);
    const call = [...graphql.calls].reverse().find((c) => c.name === 'ListOpportunities');
    expect((call?.variables.input as { category?: string }).category).toBe('REAL_ESTATE_INFRASTRUCTURE');
    await page.getByRole('button', { name: 'Clear all' }).click();
    await expect(page).not.toHaveURL(/cat=/);
    await expect(page.getByTestId('discover-card-products')).toHaveCount(1);
    await page.context().close();
});

test('Refine: location and sort change the real query; a place leaves products and services out', async () => {
    const { page, graphql } = await open(browser, '/discover?cat=jobs', MANY);
    await expect(page.getByTestId('discover-feed')).toBeVisible({ timeout: 90_000 });
    await page.getByLabel('Sort opportunities by').selectOption('closing');
    await expect(page).toHaveURL(/sort=closing/);
    await page.getByLabel('Location').fill('Accra');
    await page.getByLabel('Location').press('Enter');
    await expect(page).toHaveURL(/loc=Accra/);
    const last = (type: string) => [...graphql.calls].reverse().find((c) => c.name === 'ListOpportunities' && (c.variables.input as { type?: string })?.type === type)?.variables;
    for (const type of ['EMPLOYMENT', 'CONTRACT']) {
        await expect.poll(() => last(type)).toMatchObject({ input: { type, location: 'Accra', sortBy: 'DEADLINE', sortOrder: 'ASC' } });
    }
    await page.goto('/discover?loc=Accra');
    await expect(page.getByTestId('discover-card-products')).toHaveCount(0);
    await expect(page.getByTestId('discover-card-services')).toHaveCount(0);
    await page.context().close();
});

test('job cards say who is hiring, the commitment and the pay (API sends integer minor units, shown once ÷100)', async () => {
    const jobs = { ListOpportunities: { listOpportunities: { __typename: 'OpportunityList', total: 1, opportunities: [job(1, { owner: { __typename: 'OpportunityOwner', name: 'Tech Solutions Ltd' }, commitmentType: 'FULL_TIME', compensationMin: 80000, compensationMax: 120000, compensationCurrency: 'USD' })] } } };
    const { page } = await open(browser, '/discover?cat=jobs', jobs);
    const first = page.getByTestId('discover-card-jobs').first();
    await expect(first).toContainText('Tech Solutions Ltd', { timeout: 90_000 });
    await expect(first.getByTestId('job-pay')).toHaveText(/\$800\.00\s*–\s*\$1,200\.00/);
    await page.context().close();
});

test('nothing matching shows the empty message, not a blank page', async () => {
    const none = { ListOpportunities: { listOpportunities: { __typename: 'OpportunityList', total: 0, opportunities: [] } } };
    const { page } = await open(browser, '/discover?cat=grants', none);
    await expect(page.getByTestId('discover-empty')).toBeVisible({ timeout: 90_000 });
    await page.context().close();
});

test('on a phone the Refine panel is closed until tapped, and shows how many filters are on', async () => {
    const { page } = await open(browser, '/discover?cat=jobs&sort=closing', {}, { width: 360, height: 800 });
    const toggle = page.getByRole('button', { name: /Refine your search/ });
    await expect(toggle).toBeVisible({ timeout: 90_000 });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toContainText('2');
    await expect(page.getByRole('checkbox', { name: 'Jobs' })).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('checkbox', { name: 'Jobs' })).toBeChecked();
    await expect(page.getByTestId('discover-help')).toBeHidden();
    await page.context().close();
});

test('the "Need help getting something done?" card narrows Discover to services', async () => {
    const { page } = await open(browser, '/discover', MANY, { width: 1280, height: 900 });
    const help = page.getByTestId('discover-help');
    await expect(help).toContainText('Need help getting something done in Africa?', { timeout: 90_000 });
    await help.getByRole('button', { name: 'Browse services' }).click();
    await expect(page).toHaveURL(/cat=services/);
    await expect(page.getByRole('checkbox', { name: 'Services' })).toBeChecked();
    await expect(page.getByTestId('discover-help')).toHaveCount(0);
    await page.context().close();
});

test('the hero search goes to the global search', async () => {
    const { page } = await open(browser, '/discover');
    // Wait for data on screen: typing before hydration fills the DOM but not React's state.
    await expect(page.getByTestId('discover-feed')).toBeVisible({ timeout: 90_000 });
    await page.getByLabel('Search DiaspoPlug').fill('cocoa');
    await page.getByRole('search').getByRole('button', { name: 'Search', exact: true }).click(); // the header has its own Search button
    await expect(page).toHaveURL(/\/search\?q=cocoa/);
    await page.context().close();
});

for (const width of [360, 768]) {
    test(`no horizontal scroll at ${width}px`, async () => {
        const { page } = await open(browser, '/discover', MANY, { width, height: 900 });
        await expect(page.getByTestId('discover-feed')).toBeVisible({ timeout: 90_000 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        await page.context().close();
    });
}
