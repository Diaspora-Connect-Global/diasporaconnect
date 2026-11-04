/** The redesigned Discover: hero, category tiles, "For you" and Latest only until refined, Refine panel, filters in the URL. */
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

const ROWS = ['services', 'jobs', 'scholarships', 'grants', 'programs', 'volunteering', 'investments', 'realEstate', 'products', 'events'];

async function expectNoOtherRows(page: Page) {
    for (const k of ROWS) await expect(page.getByTestId(`discover-section-${k}`)).toHaveCount(0);
    await expect(page.getByTestId('discover-community-posts')).toHaveCount(0);
}

test('the untouched page lists Latest and nothing else, with honest labels and no footer', async () => {
    const { page } = await open(browser, '/discover');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Opportunities, services and trusted people', { timeout: 90_000 });
    const latest = page.getByTestId('discover-section-latest');
    await expect(latest.getByRole('heading', { name: 'Latest opportunities' })).toBeVisible();
    // Every listing is in it once, and not cut to one row (text matchers also match hidden nodes, so check :visible).
    for (const name of ['Affordable housing build', 'Legal Consultation', 'Agriculture Project', 'IT Support Specialist', 'Project Manager']) {
        await expect(page.locator(`:text-is("${name}"):visible`)).toHaveCount(1);
    }
    await expectNoOtherRows(page);
    // No rating data exists, so nothing claims "Top-rated"; no percentages or fake counts.
    await expect(page.getByText(/Top-rated|% match|views/i)).toHaveCount(0);
    // Logged-in pages carry no page footer.
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
        const rows = !input.type || input.type === 'EMPLOYMENT' ? [job(1, { owner: { __typename: 'OpportunityOwner', name: 'Tech Solutions Ltd' }, commitmentType: 'FULL_TIME', compensationMin: 80000, compensationMax: 120000, compensationCurrency: 'USD' }), job(2, { compensationMin: 250000, compensationCurrency: 'USD' }), job(3, { compensationMax: 90000, compensationCurrency: 'USD' }), job(4, { compensationMin: 50_000_000_000, compensationMax: 75_000_000_000, compensationCurrency: 'USD' }), ...[5, 6].map((i) => job(i))] : [];
        return { listOpportunities: { __typename: 'OpportunityList', total: rows.length, opportunities: rows } };
    },
};

test('narrowed only by sort, each section is one row: 3 cards beside the rail at 1280px, the rest one click away', async () => {
    const { page } = await open(browser, '/discover?sort=closing', MANY, { width: 1280, height: 900 });
    const services = page.getByTestId('discover-section-services');
    await expect(services.getByRole('heading', { name: 'Services', exact: true })).toBeVisible({ timeout: 90_000 });
    await expect(services.locator('[data-testid="discover-card-services"]:visible')).toHaveCount(3);
    await expect(page.getByTestId('discover-section-jobs').locator('[data-testid="discover-card-jobs"]:visible')).toHaveCount(3);
    await expect(page.getByTestId('discover-section-latest')).toHaveCount(0);
    await page.context().close();
});

test('job cards say who is hiring, the commitment and the pay (API sends integer minor units, shown once ÷100)', async () => {
    const { page } = await open(browser, '/discover?cat=jobs', MANY);
    const first = page.getByTestId('discover-card-jobs').first();
    await expect(first).toContainText('Job number 1', { timeout: 90_000 });
    await expect(first).toContainText('Tech Solutions Ltd');
    await expect(first).toContainText('Full-time');
    await expect(first).toContainText('Accra, Ghana');
    // 80000 / 120000 minor units = $800.00 – $1,200.00 (NOT $80,000.00 – $120,000.00)
    await expect(first.getByTestId('job-pay')).toHaveText(/\$800\.00\s*–\s*\$1,200\.00/);
    await expect(first).not.toContainText('80,000');
    // One bound only: "From" / "Up to"; no pay at all: nothing rendered.
    await expect(page.getByTestId('discover-card-jobs').nth(1).getByTestId('job-pay')).toHaveText('From $2,500.00');
    await expect(page.getByTestId('discover-card-jobs').nth(2).getByTestId('job-pay')).toHaveText('Up to $900.00');
    // Past the old 32-bit Int: 5e10 minor units (GraphQL Float) = $500,000,000.00, exactly.
    await expect(page.getByTestId('discover-card-jobs').nth(3).getByTestId('job-pay')).toHaveText(/\$500,000,000\.00\s*–\s*\$750,000,000\.00/);
    await expect(page.getByTestId('discover-card-jobs').nth(4).getByTestId('job-pay')).toHaveCount(0);
    // Filtered views show more than one row and no Latest row.
    await expect(page.getByTestId('discover-card-jobs')).toHaveCount(6);
    await expect(page.getByTestId('discover-section-latest')).toHaveCount(0);
    await page.context().close();
});

for (const width of [360, 1280, 1536]) {
    test(`at ${width}px Latest shows every listing, and no other row is back`, async () => {
        const { page } = await open(browser, '/discover', {}, { width, height: 900 });
        const latest = page.getByTestId('discover-section-latest');
        await expect(latest.getByText('IT Support Specialist')).toBeVisible({ timeout: 90_000 });
        for (const name of ['Affordable housing build', 'Legal Consultation', 'Agriculture Project', 'IT Support Specialist', 'Project Manager']) {
            await expect(latest.locator(`:text-is("${name}"):visible`)).toHaveCount(1);
        }
        await expectNoOtherRows(page);
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
    const { page } = await open(browser, '/discover?cat=events,jobs', { ListOpportunities: { listOpportunities: { total: 0, opportunities: [] } } });
    await expect(page.getByTestId('discover-section-events')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('discover-section-events')).toContainText('Diaspora Business Summit');
    await expect(page.getByText('An event that already happened')).toHaveCount(0);
    await expect(page.getByTestId('discover-section-jobs')).toHaveCount(0);
    await page.context().close();
});

test('a category tile narrows the page to that real query and is reflected in the URL', async () => {
    const { page, graphql } = await open(browser, '/discover');
    await expect(page.getByTestId('discover-section-latest')).toBeVisible({ timeout: 90_000 });
    await page.getByRole('button', { name: 'Real estate' }).click();
    await expect(page).toHaveURL(/cat=realEstate/);
    await expect(page.getByTestId('discover-section-realEstate')).toBeVisible();
    await expect(page.getByTestId('discover-section-latest')).toHaveCount(0);
    const call = [...graphql.calls].reverse().find((c) => c.name === 'ListOpportunities');
    expect((call?.variables.input as { category?: string }).category).toBe('REAL_ESTATE_INFRASTRUCTURE');
    await expect(page.getByRole('checkbox', { name: 'Real estate' })).toBeChecked();
    await page.getByRole('button', { name: 'Clear all' }).click();
    await expect(page).not.toHaveURL(/cat=/);
    await expect(page.getByTestId('discover-section-latest')).toBeVisible();
    await expectNoOtherRows(page);
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
    // Jobs = EMPLOYMENT + CONTRACT: one request per type, both carrying the filters.
    const last = (type: string) => [...graphql.calls].reverse().find((c) => c.name === 'ListOpportunities' && (c.variables.input as { type?: string })?.type === type)?.variables;
    for (const type of ['EMPLOYMENT', 'CONTRACT']) {
        await expect.poll(() => last(type)).toMatchObject({ input: { type, location: 'Accra', sortBy: 'DEADLINE', sortOrder: 'ASC' } });
    }
    await page.context().close();
});

test('the hero search goes to the global search', async () => {
    const { page } = await open(browser, '/discover');
    // Wait for data on screen: typing before hydration fills the DOM but not React's state.
    await expect(page.getByTestId('discover-section-latest')).toBeVisible({ timeout: 90_000 });
    await page.getByLabel('Search DiaspoPlug').fill('cocoa');
    await page.getByRole('search').getByRole('button', { name: 'Search', exact: true }).click(); // the header has its own Search button
    await expect(page).toHaveURL(/\/search\?q=cocoa/);
    await page.context().close();
});

for (const width of [360, 768]) {
    test(`no horizontal scroll at ${width}px`, async () => {
        const { page } = await open(browser, '/discover', {}, { width, height: 900 });
        await expect(page.getByTestId('discover-section-latest')).toBeVisible({ timeout: 90_000 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        await page.context().close();
    });
}

const recEvent = {
    __typename: 'EventGQL',
    id: 'evt-rec-1',
    title: 'Diaspora founders meetup',
    status: 'published',
    startAt: new Date(Date.now() + 5 * 86_400_000).toISOString(),
    endAt: new Date(Date.now() + 5 * 86_400_000 + 7_200_000).toISOString(),
    eventCategory: 'NETWORKING',
    coverImageUrl: null,
    locationType: 'physical',
    locationDetails: { __typename: 'EventLocationDetails', type: 'physical', venueName: 'Hub', city: 'Accra', country: 'Ghana', virtualLink: null },
};
const FOR_YOU = {
    // Job 2 is also among the newest: shown here, it must not repeat in Latest.
    RecommendedOpportunities: {
        recommendedOpportunities: {
            __typename: 'OpportunityList',
            opportunities: [
                { ...job(2), isSavedByCurrentUser: false, compensationMin: null, compensationMax: null, compensationCurrency: null, commitmentType: null, reasons: ['MATCHES_SKILLS', 'NOT_A_REAL_CODE'] },
                { ...job(9, { title: 'Chevening scholarship', type: 'SCHOLARSHIP', category: 'EDUCATION_TRAINING' }), isSavedByCurrentUser: false, reasons: ['NEAR_YOU'] },
            ],
        },
    },
    // Discover's For you is opportunities only: the other recommenders are not shown (or asked) here.
    RecommendedEvents: { recommendedEvents: [{ __typename: 'RecommendedEventGQL', reasons: ['NEAR_YOU'], event: recEvent }] },
    RecommendedMarketplaceServices: { recommendedMarketplaceServices: { __typename: 'ServiceList', services: [{ ...svc(1), reasons: ['TOP_RATED'] }] } },
};

test('"For you" and Latest are the whole page: every type, each pick says why, and none repeats below', async () => {
    const { page, graphql } = await open(browser, '/discover', { ...MANY, ...FOR_YOU }, { width: 1280, height: 900 });
    const forYou = page.getByTestId('discover-section-forYou');
    await expect(forYou.getByRole('heading', { name: 'For you' })).toBeVisible({ timeout: 90_000 });
    await expect(forYou.getByText('Job number 2')).toBeVisible();
    await expect(forYou.getByText('Chevening scholarship')).toBeVisible();
    await expect(forYou.getByText('Scholarship', { exact: true })).toBeVisible();
    // Reasons are translated codes; an unknown code is dropped, never shown raw.
    await expect(forYou.getByText('Matches your skills', { exact: true })).toBeVisible();
    await expect(forYou).not.toContainText('NOT_A_REAL_CODE');
    await expect(forYou).not.toContainText('Diaspora founders meetup');
    await expect(forYou).not.toContainText('Service number 1');
    expect(graphql.calls.some((c) => c.name === 'RecommendedEvents' || c.name === 'RecommendedMarketplaceServices')).toBe(false);
    // A picked job is not repeated in Latest, which still shows the rest.
    await expect(page.locator(':text-is("Job number 2"):visible')).toHaveCount(1);
    await expect(page.getByTestId('discover-section-latest').getByText('Job number 1')).toBeVisible();
    await expectNoOtherRows(page);
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('"View all" on For you lists more picks on their own; a location filter hides the row (the recommender cannot filter by place)', async () => {
    const { page } = await open(browser, '/discover', { ...MANY, ...FOR_YOU }, { width: 1280, height: 900 });
    const forYou = page.getByTestId('discover-section-forYou');
    await expect(forYou).toBeVisible({ timeout: 90_000 });
    await forYou.getByRole('button', { name: 'View all' }).click();
    await expect(page).toHaveURL(/cat=forYou/);
    await expect(page.getByTestId('discover-section-forYou')).toBeVisible();
    await expect(page.getByTestId('discover-section-jobs')).toHaveCount(0);
    await expect(page.getByTestId('discover-section-latest')).toHaveCount(0);
    await page.goto(page.url().replace('cat=forYou', 'loc=Accra'));
    await expect(page.getByTestId('discover-section-jobs')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('discover-section-forYou')).toHaveCount(0);
    await page.context().close();
});

test('with few listings, all of them recommended, Latest repeats them rather than disappearing', async () => {
    const { page } = await open(browser, '/discover', {
        ...FOR_YOU,
        RedesignFeaturedServices: { getFeaturedMarketplaceServices: { __typename: 'ServiceList', services: [] } },
        ListOpportunities: { listOpportunities: { __typename: 'OpportunityList', total: 2, opportunities: [job(2), job(9, { title: 'Chevening scholarship', type: 'SCHOLARSHIP', category: 'EDUCATION_TRAINING' })] } },
    }, { width: 1280, height: 900 });
    await expect(page.getByTestId('discover-section-forYou').getByText('Chevening scholarship')).toBeVisible({ timeout: 90_000 });
    const latest = page.getByTestId('discover-section-latest');
    for (const name of ['Job number 2', 'Chevening scholarship']) await expect(latest.getByText(name)).toBeVisible();
    await page.context().close();
});

test('Latest lists every kind of opportunity, so a scholarship and a volunteer role are on the page', async () => {
    const { page } = await open(browser, '/discover', EVERY_TYPE, { width: 1280, height: 900 });
    const latest = page.getByTestId('discover-section-latest');
    await expect(latest.getByText('Masters scholarship', { exact: true })).toBeVisible({ timeout: 90_000 });
    for (const name of ['Accountant in Accra', 'Leadership fellowship', 'Small business grant', 'Founders programme', 'Weekend tutoring volunteers', 'Cocoa farm investment']) {
        await expect(latest.getByText(name, { exact: true })).toBeVisible();
    }
    await page.context().close();
});

test('"For you" is hidden when nothing is recommended', async () => {
    const { page } = await open(browser, '/discover');
    await expect(page.getByTestId('discover-section-latest')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('discover-section-forYou')).toHaveCount(0);
    await page.context().close();
});

const typed = (id: string, title: string, type: string) => job(0, { id, title, type, category: 'EMPLOYMENT_CAREER' });
const EVERY_TYPE = {
    ListOpportunities: (v: Record<string, unknown>) => {
        const input = (v.input ?? {}) as { type?: string };
        const all = [
            typed('t-emp', 'Accountant in Accra', 'EMPLOYMENT'),
            typed('t-con', 'Six-month audit contract', 'CONTRACT'),
            typed('t-sch', 'Masters scholarship', 'SCHOLARSHIP'),
            typed('t-fel', 'Leadership fellowship', 'FELLOWSHIP'),
            typed('t-gra', 'Small business grant', 'GRANT'),
            typed('t-pro', 'Founders programme', 'PROGRAM'),
            typed('t-ini', 'Clean water initiative', 'INITIATIVE'),
            typed('t-vol', 'Weekend tutoring volunteers', 'VOLUNTEER'),
            typed('t-inv', 'Cocoa farm investment', 'INVESTMENT'),
        ];
        const rows = all.filter((o) => !input.type || o.type === input.type);
        return { listOpportunities: { __typename: 'OpportunityList', total: rows.length, opportunities: rows } };
    },
};

test('every opportunity type has a place: a row per kind, each a real query, empty kinds hidden', async () => {
    const rows: Record<string, { title: string; items: string[] }> = {
        jobs: { title: 'Newest jobs', items: ['Accountant in Accra', 'Six-month audit contract'] },
        scholarships: { title: 'Scholarships & fellowships', items: ['Masters scholarship', 'Leadership fellowship'] },
        grants: { title: 'Grants', items: ['Small business grant'] },
        programs: { title: 'Programmes & initiatives', items: ['Founders programme', 'Clean water initiative'] },
        volunteering: { title: 'Volunteering', items: ['Weekend tutoring volunteers'] },
        investments: { title: 'Newest investments', items: ['Cocoa farm investment'] },
    };
    const { page } = await open(browser, `/discover?cat=${Object.keys(rows).join(',')}`, EVERY_TYPE, { width: 1280, height: 900 });
    for (const [key, row] of Object.entries(rows)) {
        const section = page.getByTestId(`discover-section-${key}`);
        await expect(section.getByRole('heading', { name: row.title, exact: true })).toBeVisible({ timeout: 90_000 });
        for (const item of row.items) await expect(section.getByText(item, { exact: true })).toBeVisible();
    }
    // The refine panel offers the same kinds.
    for (const name of ['Jobs', 'Scholarships', 'Grants', 'Programmes', 'Volunteering', 'Investments']) {
        await expect(page.getByRole('checkbox', { name })).toBeChecked();
    }
    await page.context().close();
});

test('a kind with nothing posted has no row', async () => {
    const { page } = await open(browser, '/discover?cat=jobs,grants', MANY);
    await expect(page.getByTestId('discover-section-jobs')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('discover-section-grants')).toHaveCount(0);
    await page.context().close();
});
