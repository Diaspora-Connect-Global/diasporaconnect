/**
 * Opportunity pay (compensationMin / compensationMax) is INTEGER MINOR units (x100) and
 * 64-bit on the backend (GraphQL Float; Int is 32-bit). Every display divides by 100
 * exactly once; nothing that is not a positive safe integer is shown. The web has no
 * salary input (opportunities are created in the consoles), so there is no x100 here.
 */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { UUID, open } from './fixtures';
import { compensationMajor, compensationParts, compensationText, formatMinorExact } from '../../src/lib/compensation';
import { formatMoney } from '../../src/types/money';
import { jobPostingSchema } from '../../src/lib/seoSchemas';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const OPP_ID = '00000000-0000-4000-8000-00000000f001';
const OWNER_ID = '00000000-0000-4000-8000-00000000f0aa';

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
    // GHS 500,000,000 - 750,000,000 is 5e10 - 7.5e10 minor units: past the old 32-bit Int.
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

test('opportunity page shows the pay divided by 100 once, past int32 (5e10 minor units = $500,000,000.00)', async () => {
    const { page } = await open(browser, `/opportunities/${OPP_ID}`, { GetOpportunity: { getOpportunity: opportunity() } });
    await expect(page.getByText('Seed round for a cocoa processor').first()).toBeVisible({ timeout: 90_000 });
    const body = page.locator('body');
    await expect(body).toContainText(/\$500,000,000\.00\s*–\s*\$750,000,000\.00 \(salary\)/);
    // Never the raw minor-unit figure, never x100 again.
    await expect(body).not.toContainText('50,000,000,000');
    await expect(body).not.toContainText('5,000,000,000');
    expect(await body.innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('one bound and no pay on the opportunity page', async () => {
    const from = await open(browser, `/opportunities/${OPP_ID}`, {
        GetOpportunity: { getOpportunity: opportunity({ compensationMax: null, compensationMin: 150050 }) },
    });
    await expect(from.page.locator('body')).toContainText('$1,500.50+ (salary)', { timeout: 90_000 });
    await from.page.context().close();

    const none = await open(browser, `/opportunities/${OPP_ID}`, {
        GetOpportunity: { getOpportunity: opportunity({ compensationMin: null, compensationMax: null }) },
    });
    await expect(none.page.getByText('Seed round for a cocoa processor').first()).toBeVisible({ timeout: 90_000 });
    await expect(none.page.locator('body')).not.toContainText('(salary)');
    await none.page.context().close();
});

test('compensation helpers: one ÷100, safe integers only (pure, no browser)', () => {
    expect(compensationText(50_000_000_000, 75_000_000_000, 'USD', 'en-US')).toBe('$500,000,000.00 – $750,000,000.00');
    expect(compensationText(150050, null, 'USD', 'en-US')).toBe('$1,500.50+');
    expect(compensationText(null, 90000, 'USD', 'en-US')).toBe('Up to $900.00');
    expect(compensationText(Number.MAX_SAFE_INTEGER, null, 'USD', 'en-US')).toBe('$90,071,992,547,409.91+');
    // A fraction or an unsafe integer is not an amount: never shown (no rounded figure).
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
        { id: OPP_ID, title: 'Engineer', description: 'x', compensationMin: 50_000_000_000, compensationMax: 75_000_000_000, compensationCurrency: 'ghs' } as never,
        'https://diaspoplug.com/en/opportunities/x',
    ) as { baseSalary?: { currency: string; value: { minValue?: number; maxValue?: number } } };
    expect(ld.baseSalary?.currency).toBe('GHS');
    expect(ld.baseSalary?.value.minValue).toBe(500_000_000);
    expect(ld.baseSalary?.value.maxValue).toBe(750_000_000);
});
