/** The redesigned Discover: hero, category tiles, real sections, Refine panel, filters in the URL. */
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

test('shows real sections with honest labels, and no footer', async () => {
    const { page } = await open(browser, '/discover');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Opportunities, services and trusted people', { timeout: 90_000 });
    // The first row mixes the newest of each kind — at 1280px beside the rail, one row of three…
    const latest = page.getByTestId('discover-section-latest');
    await expect(latest.getByRole('heading', { name: 'Latest opportunities' })).toBeVisible();
    await expect(latest.locator('li:visible')).toHaveCount(3);
    for (const name of ['Affordable housing build', 'Legal Consultation', 'Agriculture Project']) await expect(latest.getByText(name)).toBeVisible();
    // …and exactly those leave the sections below: the newest job did not fit, so it stays in Newest jobs.
    await expect(page.getByRole('heading', { name: 'Newest jobs' })).toBeVisible();
    await expect(page.getByTestId('discover-section-jobs').locator('[data-testid="discover-card-jobs"]:visible')).toHaveCount(2);
    // Services' only item is in the Latest row, so the Services section has nothing left and hides.
    await expect(page.getByTestId('discover-section-services')).toHaveCount(0);
    // Every listing is VISIBLE somewhere (text matchers also match hidden nodes, so check :visible).
    for (const name of ['Affordable housing build', 'Legal Consultation', 'Agriculture Project', 'IT Support Specialist', 'Project Manager']) {
        await expect(page.locator(`:text-is("${name}"):visible`)).toHaveCount(1);
    }
    // No rating data exists, so nothing claims "Top-rated"; no percentages or fake counts.
    await expect(page.getByText(/Top-rated|% match|views/i)).toHaveCount(0);
    // Logged-in pages carry no page footer (the post teasers have their own <footer> inside an <article>).
    await expect(page.getByRole('contentinfo')).toHaveCount(0);
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

const svc = (i: number) => ({ __typename: 'Service', id: `svc-${i}`, title: `Service number ${i}`, base_price: 10000, currency: 'GHS' });
const job = (i: number, over: Record<string, unknown> = {}) => ({ __typename: 'Opportunity', id: `job-${i}`, title: `Job number ${i}`, type: 'EMPLOYMENT', category: 'EMPLOYMENT_CAREER', location: 'Accra, Ghana', deliveryMode: 'IN_PERSON', deadline: null, createdAt: '2026-10-08T08:00:00.000Z', owner: null, ...over });
const MANY = {
    RedesignFeaturedServices: { getFeaturedMarketplaceServices: { __typename: 'ServiceList', services: [1, 2, 3, 4, 5].map(svc) } },
    ListOpportunities: (v: Record<string, unknown>) => {
        const input = (v.input ?? {}) as { type?: string };
        const rows = input.type === 'EMPLOYMENT' ? [job(1, { owner: { __typename: 'OpportunityOwner', name: 'Tech Solutions Ltd' }, commitmentType: 'FULL_TIME', compensationMin: 800, compensationMax: 1200, compensationCurrency: 'USD' }), ...[2, 3, 4, 5, 6].map((i) => job(i))] : [];
        return { listOpportunities: { __typename: 'OpportunityList', total: rows.length, opportunities: rows } };
    },
};

test('each overview section is one row: 3 cards beside the rail at 1280px, the rest one click away', async () => {
    const { page } = await open(browser, '/discover', MANY, { width: 1280, height: 900 });
    const services = page.getByTestId('discover-section-services');
    await expect(services.getByRole('heading', { name: 'Services', exact: true })).toBeVisible({ timeout: 90_000 });
    // Service 1 went to the Latest row; 2–5 are fetched here, and the 3-column row shows three.
    await expect(services).not.toContainText('Service number 1');
    await expect(services.locator('[data-testid="discover-card-services"]:visible')).toHaveCount(3);
    await expect(page.getByTestId('discover-section-jobs').locator('[data-testid="discover-card-jobs"]:visible')).toHaveCount(3);
    await page.context().close();
});

test('job cards say who is hiring and the commitment, and never show a salary', async () => {
    const { page } = await open(browser, '/discover?cat=jobs', MANY);
    const first = page.getByTestId('discover-card-jobs').first();
    await expect(first).toContainText('Job number 1', { timeout: 90_000 });
    await expect(first).toContainText('Tech Solutions Ltd');
    await expect(first).toContainText('Full-time');
    await expect(first).toContainText('Accra, Ghana');
    await expect(first).not.toContainText(/800|1,200|USD/);
    // Filtered views show more than one row and no Latest row.
    await expect(page.getByTestId('discover-card-jobs')).toHaveCount(6);
    await expect(page.getByTestId('discover-section-latest')).toHaveCount(0);
    await page.context().close();
});

for (const [width, shown] of [[360, 4], [1536, 4]] as const) {
    test(`at ${width}px the Latest row shows ${shown} and nothing repeats or goes missing`, async () => {
        const { page } = await open(browser, '/discover', {}, { width, height: 900 });
        const latest = page.getByTestId('discover-section-latest');
        await expect(latest.locator('li:visible')).toHaveCount(shown, { timeout: 90_000 });
        await expect(latest.getByText('IT Support Specialist')).toBeVisible();
        await expect(page.getByTestId('discover-section-jobs').locator('[data-testid="discover-card-jobs"]:visible')).toHaveCount(1);
        for (const name of ['Affordable housing build', 'Legal Consultation', 'Agriculture Project', 'IT Support Specialist', 'Project Manager']) {
            await expect(page.locator(`:text-is("${name}"):visible`)).toHaveCount(1);
        }
        await page.context().close();
    });
}

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

test('past events are never listed, and a section with no data is hidden', async () => {
    const { page } = await open(browser, '/discover', { ListOpportunities: { listOpportunities: { total: 0, opportunities: [] } } });
    await expect(page.getByTestId('discover-section-events')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('discover-section-events')).toContainText('Diaspora Business Summit');
    await expect(page.getByText('An event that already happened')).toHaveCount(0);
    await expect(page.getByTestId('discover-section-jobs')).toHaveCount(0);
    await page.context().close();
});

test('a category tile narrows the page to that real query and is reflected in the URL', async () => {
    const { page, graphql } = await open(browser, '/discover');
    await expect(page.getByTestId('discover-section-jobs')).toBeVisible({ timeout: 90_000 });
    await page.getByRole('button', { name: 'Real estate' }).click();
    await expect(page).toHaveURL(/cat=realEstate/);
    await expect(page.getByTestId('discover-section-realEstate')).toBeVisible();
    await expect(page.getByTestId('discover-section-jobs')).toHaveCount(0);
    const call = [...graphql.calls].reverse().find((c) => c.name === 'ListOpportunities');
    expect((call?.variables.input as { category?: string }).category).toBe('REAL_ESTATE_INFRASTRUCTURE');
    await expect(page.getByRole('checkbox', { name: 'Real estate' })).toBeChecked();
    await page.getByRole('button', { name: 'Clear all' }).click();
    await expect(page).not.toHaveURL(/cat=/);
    await page.context().close();
});

test('Refine: location and sort change the real query', async () => {
    const { page, graphql } = await open(browser, '/discover?cat=jobs');
    await expect(page.getByTestId('discover-section-jobs')).toBeVisible({ timeout: 90_000 });
    await page.getByLabel('Sort opportunities by').selectOption('closing');
    await expect(page).toHaveURL(/sort=closing/);
    await page.getByLabel('Location').fill('Accra');
    await page.getByLabel('Location').press('Enter');
    await expect(page).toHaveURL(/loc=Accra/);
    await expect.poll(() => [...graphql.calls].reverse().find((c) => c.name === 'ListOpportunities')?.variables).toMatchObject({ input: { type: 'EMPLOYMENT', location: 'Accra', sortBy: 'deadline', sortOrder: 'ASC' } });
    await page.context().close();
});

test('the hero search goes to the global search', async () => {
    const { page } = await open(browser, '/discover');
    await page.getByLabel('Search DiaspoPlug').fill('cocoa');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page).toHaveURL(/\/search\?q=cocoa/);
    await page.context().close();
});

for (const width of [360, 768]) {
    test(`no horizontal scroll at ${width}px`, async () => {
        const { page } = await open(browser, '/discover', {}, { width, height: 900 });
        await expect(page.getByTestId('discover-section-jobs')).toBeVisible({ timeout: 90_000 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        await page.context().close();
    });
}
