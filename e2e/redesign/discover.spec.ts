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
    await expect(page.getByTestId('discover-section-jobs')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Newest jobs' })).toBeVisible();
    await expect(page.getByTestId('discover-section-jobs').getByTestId('discover-card-jobs')).toHaveCount(2);
    await expect(page.getByTestId('discover-section-services')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Services', exact: true })).toBeVisible();
    // No rating data exists, so nothing claims "Top-rated"; no percentages or fake counts.
    await expect(page.getByText(/Top-rated|% match|views/i)).toHaveCount(0);
    // Logged-in pages carry no page footer (the post teasers have their own <footer> inside an <article>).
    await expect(page.getByRole('contentinfo')).toHaveCount(0);
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
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
