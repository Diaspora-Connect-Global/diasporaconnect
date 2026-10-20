/**
 * Opportunity pay (compensationMin / compensationMax) is INTEGER MINOR units (x100) on the
 * wire, 64-bit on the backend (GraphQL Float). Every live display divides by 100 exactly
 * once: the public opportunity page (CustomEmploymentComponent), the search results and the
 * JobPosting structured data. The web has no salary input, so there is no x100 here.
 *
 *   E2E_BASE_URL=http://localhost:3112 npx playwright test e2e/opportunities
 */
import { test, expect, type Browser, type Page, type Route } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { compensationMajor, compensationParts, compensationText, formatMinorExact } from '../../src/lib/compensation';
import { formatMoney } from '../../src/types/money';
import { jobPostingSchema } from '../../src/lib/seoSchemas';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const OPP_ID = '00000000-0000-4000-8000-00000000f001';
const OWNER_ID = '00000000-0000-4000-8000-00000000f0aa';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const opportunity = (over: Record<string, unknown> = {}) => ({
    __typename: 'OpportunityType',
    id: OPP_ID,
    ownerId: OWNER_ID,
    ownerType: 'COMMUNITY',
    visibility: 'PUBLIC',
    priorityLevel: 'NORMAL',
    title: 'Seed round for a cocoa processor',
    description: 'We are raising a seed round.',
    scope: null,
    eligibilityCriteria: null,
    status: 'PUBLISHED',
    category: 'BUSINESS_INVESTMENT',
    type: 'EMPLOYMENT',
    subCategory: null,
    deliveryMode: 'IN_PERSON',
    commitmentType: null,
    location: 'Accra, Ghana',
    duration: null,
    applicationMethod: 'EXTERNAL_LINK',
    externalLink: 'https://example.com/apply',
    applicationEmail: null,
    // 5e10 - 7.5e10 minor units = 500,000,000 - 750,000,000: past the old 32-bit Int.
    compensationMin: 50_000_000_000,
    compensationMax: 75_000_000_000,
    compensationCurrency: 'USD',
    compensationType: 'SALARY',
    benefitsSummary: null,
    eligibilityRegions: [],
    deadline: null,
    applicationCount: 0,
    skills: [],
    tags: [],
    currentUserApplicationId: null,
    isSavedByCurrentUser: false,
    hasCurrentUserApplied: false,
    createdAt: '2026-10-08T08:00:00.000Z',
    updatedAt: '2026-10-08T08:00:00.000Z',
    publishedAt: '2026-10-08T08:00:00.000Z',
    closedAt: null,
    owner: { __typename: 'OpportunityOwner', id: OWNER_ID, name: 'Volta Capital', avatarUrl: null, type: 'COMMUNITY', trustScore: null, trustTier: null },
    ...over,
});

/** Answers GetOpportunity; every other operation gets `{ data: null }`. Nothing leaves localhost. */
async function openOpportunity(o: Record<string, unknown>): Promise<Page> {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
    await context.route((url) => !['localhost', '127.0.0.1'].includes(url.hostname), (route) => route.abort());
    await context.route('**/graphql', async (route: Route) => {
        const body = route.request().postDataJSON() as { operationName?: string };
        const data = body?.operationName === 'GetOpportunity' ? { getOpportunity: o } : null;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data }) });
    });
    const page = await context.newPage();
    await page.goto(`/en/opportunities/${OPP_ID}`, { waitUntil: 'load' });
    await expect(page.getByText('Seed round for a cocoa processor').first()).toBeVisible({ timeout: 90_000 });
    return page;
}

test('opportunity page shows the pay divided by 100 once, past int32 (5e10 minor units = $500,000,000.00)', async () => {
    const page = await openOpportunity(opportunity());
    const body = page.locator('body');
    await expect(body).toContainText(/\$500,000,000\.00\s*–\s*\$750,000,000\.00 \(salary\)/);
    await expect(body).not.toContainText('50,000,000,000'); // never the raw minor-unit figure
    expect(await body.innerText()).not.toMatch(UUID_RE);
    await page.context().close();
});

test('one bound, and no pay at all, on the opportunity page', async () => {
    const from = await openOpportunity(opportunity({ compensationMin: 150050, compensationMax: null }));
    await expect(from.locator('body')).toContainText('$1,500.50+ (salary)');
    await from.context().close();

    const none = await openOpportunity(opportunity({ compensationMin: null, compensationMax: null }));
    await expect(none.locator('body')).not.toContainText('(salary)');
    await none.context().close();
});

test('compensation helpers: one ÷100, safe integers only (pure, no browser)', () => {
    expect(compensationText(50_000_000_000, 75_000_000_000, 'USD', 'en-US')).toBe('$500,000,000.00 – $750,000,000.00');
    expect(compensationText(150050, null, 'USD', 'en-US')).toBe('$1,500.50+');
    expect(compensationText(null, 90000, 'USD', 'en-US')).toBe('Up to $900.00');
    expect(compensationText(Number.MAX_SAFE_INTEGER, null, 'USD', 'en-US')).toBe('$90,071,992,547,409.91+');
    // Exact past 2^46 minor units, where a float `minor / 100` would print .90; identical to formatMoney below that.
    expect(formatMinorExact(Number.MAX_SAFE_INTEGER, 'USD', 'en-US')).toBe('$90,071,992,547,409.91');
    for (const v of [1, 99, 150050, 50_000_000_000]) expect(formatMinorExact(v, 'GHS', 'en-US')).toBe(formatMoney(v, 'GHS', 'en-US'));
    expect(formatMinorExact(150050, 'BAD!', 'en-US')).toBe(formatMoney(150050, 'BAD!', 'en-US'));
    expect(compensationParts(12.5, null, 'USD')).toBeNull();
    expect(compensationParts(2 ** 53, null, 'USD')).toBeNull();
    expect(compensationParts(0, 0, 'USD')).toBeNull();
    expect(compensationMajor(50_000_000_000)).toBe(500_000_000);
});

test('JobPosting structured data carries the major-unit salary (÷100 once)', () => {
    const ld = jobPostingSchema(
        { title: 'Engineer', description: 'x', compensationMin: 50_000_000_000, compensationMax: 75_000_000_000, compensationCurrency: 'ghs' },
        'https://diaspoplug.com/en/opportunities/x',
    ) as { baseSalary?: { currency: string; value: { minValue?: number; maxValue?: number } } };
    expect(ld.baseSalary?.currency).toBe('GHS');
    expect(ld.baseSalary?.value.minValue).toBe(500_000_000);
    expect(ld.baseSalary?.value.maxValue).toBe(750_000_000);
});
