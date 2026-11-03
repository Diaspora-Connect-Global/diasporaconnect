/** The 13 opportunity category pages (/opportunities/<slug>): hero, real filters in the URL, cards to the opportunity page. */
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

type ListCall = { name: string; variables: Record<string, unknown> };
const lastList = (calls: ListCall[]) => [...calls].reverse().find((c) => c.name === 'ListOpportunities')?.variables.input as Record<string, unknown> | undefined;

test('shows the category as the one h1, with cards that link to the opportunity page and no single-opportunity lookup', async () => {
    const { page, graphql } = await open(browser, '/opportunities/employment-career');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Employment & career', { timeout: 90_000 });
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    // .first(): the loading placeholder repeats the hero text for an instant.
    await expect(page.getByText('Jobs, internships and career programmes, at home and abroad.').first()).toBeVisible();
    // The fixture has two jobs in this category; the other categories' listings are not shown.
    const cards = page.getByTestId('opp-category-card');
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toContainText('IT Support Specialist');
    await expect(cards.first()).toHaveAttribute('href', /\/opportunities\/opp-job-1$/);
    await expect(page.getByText('Agriculture Project')).toHaveCount(0);
    // The real total, never invented.
    await expect(page.getByTestId('opp-category-results')).toContainText('2 opportunities');
    // A category slug is never sent as an opportunity id (each failed lookup trips the gateway's circuit breaker).
    expect(graphql.calls.filter((c) => c.name === 'GetOpportunity')).toHaveLength(0);
    expect(lastList(graphql.calls)).toMatchObject({ category: 'EMPLOYMENT_CAREER', sortBy: 'CREATED_AT', sortOrder: 'DESC', offset: 0 });
    // Back link and the other categories.
    await expect(page.getByRole('link', { name: 'Back to opportunities' })).toHaveAttribute('href', /\/opportunities$/);
    const others = page.getByRole('navigation', { name: 'Explore other categories' });
    await expect(others.getByRole('link')).toHaveCount(12);
    await expect(others.getByRole('link', { name: 'Funding & grants' })).toHaveAttribute('href', /\/opportunities\/funding-grants$/);
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('filters change the real query and live in the URL', async () => {
    const { page, graphql } = await open(browser, '/opportunities/employment-career');
    await expect(page.getByTestId('opp-category-card')).toHaveCount(2, { timeout: 90_000 });
    // Type: a radio group, sent to the server as `type`.
    await page.getByRole('radio', { name: 'Job', exact: true }).click(); // URL-driven: the state follows the navigation
    await expect(page.getByRole('radio', { name: 'Job', exact: true })).toBeChecked();
    await expect(page).toHaveURL(/type=EMPLOYMENT/);
    await expect.poll(() => lastList(graphql.calls)).toMatchObject({ category: 'EMPLOYMENT_CAREER', type: 'EMPLOYMENT' });
    await expect(page.getByTestId('opp-category-card')).toHaveCount(2);
    // Sort and place.
    await page.getByLabel('Sort by').selectOption('closing');
    await expect(page).toHaveURL(/sort=closing/);
    await expect.poll(() => lastList(graphql.calls)).toMatchObject({ type: 'EMPLOYMENT', sortBy: 'DEADLINE', sortOrder: 'ASC' });
    await page.getByLabel('Location').fill('Accra');
    await page.getByLabel('Location').press('Enter');
    await expect(page).toHaveURL(/loc=Accra/);
    await expect.poll(() => lastList(graphql.calls)).toMatchObject({ type: 'EMPLOYMENT', location: 'Accra', sortBy: 'DEADLINE' });
    // A type with no match: a filtered empty state that can be cleared.
    await page.getByRole('radio', { name: 'Grant', exact: true }).click(); // URL-driven: the state follows the navigation
    await expect(page.getByRole('radio', { name: 'Grant', exact: true })).toBeChecked();
    await expect(page.getByTestId('opp-category-empty')).toContainText('Nothing matches these filters');
    await page.getByTestId('opp-category-empty').getByRole('button', { name: 'Clear filters' }).click();
    await expect(page).not.toHaveURL(/type=|loc=|sort=/);
    await expect(page.getByTestId('opp-category-card')).toHaveCount(2);
    await page.context().close();
});

test('a shared link opens with its filters applied', async () => {
    const { page, graphql } = await open(browser, '/opportunities/employment-career?type=GRANT&sort=closing');
    await expect(page.getByTestId('opp-category-empty')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByRole('radio', { name: 'Grant', exact: true })).toBeChecked();
    expect(lastList(graphql.calls)).toMatchObject({ category: 'EMPLOYMENT_CAREER', type: 'GRANT', sortBy: 'DEADLINE' });
    await page.context().close();
});

test('a category with nothing posted shows an empty state, not a spinner', async () => {
    const { page, graphql } = await open(browser, '/opportunities/funding-grants');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Funding & grants', { timeout: 90_000 });
    await expect(page.getByTestId('opp-category-empty')).toContainText('No Funding & grants opportunities yet');
    await expect(page.getByTestId('opp-category-card')).toHaveCount(0);
    // No count is claimed when there is nothing.
    await expect(page.getByTestId('opp-category-results')).not.toContainText(/\d+ opportunit/);
    expect(graphql.calls.filter((c) => c.name === 'GetOpportunity')).toHaveLength(0);
    await page.context().close();
});

test('other categories use their own name and description', async () => {
    const { page } = await open(browser, '/opportunities/real-estate-infrastructure');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Real estate & infrastructure', { timeout: 90_000 });
    await expect(page.getByTestId('opp-category-card')).toHaveCount(1);
    await expect(page.getByTestId('opp-category-card')).toContainText('Affordable housing build');
    await page.context().close();
});

for (const width of [360, 768]) {
    test(`no horizontal scroll at ${width}px`, async () => {
        const { page } = await open(browser, '/opportunities/employment-career', {}, { width, height: 900 });
        await expect(page.getByTestId('opp-category-card').first()).toBeVisible({ timeout: 90_000 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        await page.context().close();
    });
}
