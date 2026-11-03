/**
 * The opportunity page in the new design (/opportunities/{id}): a hero with the facts people look for
 * first, the poster's text in sections, the application form, and a rail (How to apply, At a glance,
 * Posted by). Names, never ids; words, never raw codes; only http(s) application links.
 */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { ME, UUID, open } from './fixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const OPP_ID = '00000000-0000-4000-8000-00000000f101';
const OWNER_ID = '00000000-0000-4000-8000-00000000f1aa';
const DAY = 86_400_000;

const opportunity = (over: Record<string, unknown> = {}) => ({
    __typename: 'OpportunityType',
    id: OPP_ID,
    ownerId: OWNER_ID,
    ownerType: 'COMMUNITY',
    visibility: 'PUBLIC',
    priorityLevel: 'NORMAL',
    title: 'Finance officer',
    description: 'Keep the books for our Accra office and report to the board every quarter.',
    scope: 'Monthly reconciliations.\nPayroll.',
    eligibilityCriteria: 'Three years of experience.',
    status: 'PUBLISHED',
    category: 'BUSINESS_INVESTMENT',
    type: 'EMPLOYMENT',
    subCategory: null,
    deliveryMode: 'HYBRID',
    commitmentType: 'FULL_TIME',
    location: 'Accra, Ghana',
    duration: null,
    applicationMethod: 'EXTERNAL_LINK',
    externalLink: 'https://www.example.com/apply',
    applicationEmail: null,
    compensationMin: 250000,
    compensationMax: 400000,
    compensationCurrency: 'GHS',
    compensationType: 'SALARY',
    benefitsSummary: 'Health cover.',
    eligibilityRegions: ['Ghana', 'Nigeria'],
    deadline: new Date(Date.now() + 40 * DAY).toISOString(),
    applicationCount: 3,
    skills: ['Excel', 'IFRS'],
    tags: ['#finance'],
    formFields: null,
    currentUserApplicationId: null,
    isSavedByCurrentUser: false,
    hasCurrentUserApplied: false,
    createdAt: '2026-10-08T08:00:00.000Z',
    updatedAt: '2026-10-08T08:00:00.000Z',
    publishedAt: '2026-10-08T08:00:00.000Z',
    closedAt: null,
    owner: { __typename: 'OpportunityOwner', id: OWNER_ID, name: 'Volta Finance Network', avatarUrl: null, type: 'COMMUNITY', trustScore: null, trustTier: null },
    ...over,
});

const openOpp = (over: Record<string, unknown> = {}, viewport?: { width: number; height: number }) =>
    open(browser, `/opportunities/${OPP_ID}`, { GetOpportunity: { getOpportunity: opportunity(over) } }, viewport);

test('hero, sections and rail: words for every code, who posted it, and no ids', async () => {
    const { page } = await openOpp();
    const hero = page.getByTestId('opportunity-hero');
    await expect(hero.getByRole('heading', { level: 1, name: 'Finance officer' })).toBeVisible({ timeout: 90_000 });
    await expect(hero.getByTestId('opportunity-type')).toHaveText('Job');
    await expect(hero.getByTestId('opportunity-status')).toHaveText('Open');
    await expect(hero).toContainText('Posted by Volta Finance Network');
    await expect(hero).toContainText('Accra, Ghana');
    await expect(hero).toContainText('Hybrid');
    await expect(hero).toContainText('Full-time');
    await expect(hero).toContainText(/40 days left|39 days left/);
    for (const name of ['About this opportunity', 'What you’ll do', 'Who can apply', 'What’s offered', 'Skills', 'Topics']) {
        await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
    }
    await expect(page.getByText('Open to people in')).toBeVisible();
    await expect(page.getByText('#finance')).toBeVisible();
    const facts = page.getByTestId('facts-card');
    await expect(facts).toContainText('Business & investment');
    await expect(facts).toContainText('3 applicants');
    await expect(page.getByTestId('poster-card')).toContainText('Volta Finance Network');
    await expect(page.getByTestId('poster-card')).toContainText('Community');
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(UUID);
    for (const code of ['EMPLOYMENT', 'BUSINESS_INVESTMENT', 'HYBRID', 'FULL_TIME', 'SALARY']) expect(text).not.toContain(code);
    // One h1 on the page.
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await page.context().close();
});

test("a member's listing names the member (it used to say DiasporaPlug)", async () => {
    const { page } = await openOpp({ ownerType: 'USER', owner: { __typename: 'OpportunityOwner', id: OWNER_ID, name: 'Kofi Boateng', avatarUrl: null, type: 'USER', trustScore: null, trustTier: null } });
    await expect(page.getByTestId('opportunity-hero')).toContainText('Posted by Kofi Boateng', { timeout: 90_000 });
    await expect(page.getByTestId('poster-card')).toContainText('Member');
    await expect(page.locator('body')).not.toContainText('DiasporaPlug');
    await page.context().close();
});

test('an id in place of a name is never shown', async () => {
    const { page } = await openOpp({ owner: { __typename: 'OpportunityOwner', id: OWNER_ID, name: OWNER_ID, avatarUrl: null, type: 'COMMUNITY', trustScore: null, trustTier: null } });
    await expect(page.getByTestId('opportunity-hero')).toBeVisible({ timeout: 90_000 });
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('an external application opens the http(s) site in a new tab and names it', async () => {
    const { page } = await openOpp();
    const apply = page.getByTestId('apply-card').getByTestId('apply-primary');
    await expect(apply).toHaveAttribute('href', 'https://www.example.com/apply', { timeout: 90_000 });
    await expect(apply).toHaveAttribute('target', '_blank');
    await expect(apply).toHaveAttribute('rel', /noopener/);
    await expect(page.getByTestId('apply-card')).toContainText('You’ll apply on example.com.');
    await page.context().close();
});

test('a javascript: application link is never a link', async () => {
    const { page } = await openOpp({ externalLink: 'javascript:alert(document.cookie)' });
    await expect(page.getByTestId('apply-card')).toContainText('The poster hasn’t said how to apply yet.', { timeout: 90_000 });
    await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
    await page.context().close();
});

test('an in-platform listing shows its own questions, CV included, and Apply now jumps to them', async () => {
    const { page } = await openOpp({
        applicationMethod: 'IN_PLATFORM_FORM',
        externalLink: null,
        formFields: [
            { __typename: 'FormFieldType', key: 'full_name', label: 'Full Name', type: 'text', required: true },
            { __typename: 'FormFieldType', key: 'email', label: 'Email', type: 'email', required: true },
            { __typename: 'FormFieldType', key: 'resume', label: 'CV', type: 'file_upload', required: true },
            { __typename: 'FormFieldType', key: 'why', label: 'Why this role?', type: 'textarea', required: false },
        ],
    });
    const form = page.getByTestId('apply-form');
    await expect(form.getByRole('heading', { name: 'Your application' })).toBeVisible({ timeout: 90_000 });
    await expect(form.getByText('CV', { exact: true })).toBeVisible();
    await expect(form.getByLabel('Why this role?')).toBeVisible();
    await page.getByTestId('apply-card').getByRole('button', { name: 'Apply now' }).click();
    await expect(form.getByLabel(/Full Name/)).toBeFocused();
    await page.context().close();
});

test('your own listing: manage applicants, no apply form', async () => {
    const { page } = await openOpp({ ownerType: 'USER', ownerId: ME, applicationMethod: 'IN_PLATFORM_FORM', externalLink: null });
    const card = page.getByTestId('apply-card');
    await expect(card.getByRole('heading', { name: 'Your listing' })).toBeVisible({ timeout: 90_000 });
    await expect(card.getByRole('link', { name: 'Manage applicants' })).toHaveAttribute('href', `/en/opportunities/${OPP_ID}/applicants`);
    await expect(page.getByTestId('apply-form')).toHaveCount(0);
    await page.context().close();
});

test('closed (by the poster or past its deadline): no way to apply', async () => {
    for (const over of [{ status: 'CLOSED' }, { deadline: new Date(Date.now() - 2 * DAY).toISOString() }]) {
        const { page } = await openOpp({ ...over, applicationMethod: 'IN_PLATFORM_FORM', externalLink: null });
        await expect(page.getByTestId('opportunity-status')).toHaveText('Closed', { timeout: 90_000 });
        await expect(page.getByTestId('apply-card')).toContainText('Applications are closed');
        await expect(page.getByTestId('apply-primary')).toHaveCount(0);
        await expect(page.getByTestId('apply-form')).toHaveCount(0);
        await page.context().close();
    }
});

test('the last week reads "Closing soon" with the days left', async () => {
    const { page } = await openOpp({ deadline: new Date(Date.now() + 3 * DAY + 3_600_000).toISOString() });
    await expect(page.getByTestId('opportunity-status')).toHaveText('Closing soon', { timeout: 90_000 });
    await expect(page.getByTestId('opportunity-hero')).toContainText('3 days left');
    await page.context().close();
});

test('already applied: says so and offers withdraw', async () => {
    const { page } = await openOpp({ hasCurrentUserApplied: true, currentUserApplicationId: '00000000-0000-4000-8000-00000000f1ap', applicationMethod: 'IN_PLATFORM_FORM', externalLink: null });
    await expect(page.getByTestId('applied-badge')).toHaveText('You’ve applied', { timeout: 90_000 });
    await expect(page.getByRole('button', { name: 'Withdraw application' })).toBeVisible();
    await expect(page.getByTestId('apply-form')).toHaveCount(0);
    await page.context().close();
});

test('a post turned into a listing: the long title is clamped in the hero, the full text is in About', async () => {
    const post = "We're hiring! Our Accra office is looking for a full-time accountant with 3+ years of experience. Send us your CV before 30 November. #hiring";
    const { page } = await openOpp({ title: post, description: post });
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toHaveClass(/line-clamp-3/, { timeout: 90_000 });
    await expect(page.getByRole('heading', { name: 'About this opportunity' })).toBeVisible();
    await page.context().close();
});

test('nothing to read beyond the title: no empty column, the rail cards sit side by side', async () => {
    const { page } = await openOpp({ title: 'Volunteer drivers', description: 'Volunteer drivers', scope: null, eligibilityCriteria: null, eligibilityRegions: [], benefitsSummary: null, skills: [], tags: [] });
    await expect(page.getByTestId('apply-card')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByRole('heading', { name: 'About this opportunity' })).toHaveCount(0);
    const [a, f] = await Promise.all([page.getByTestId('apply-card').boundingBox(), page.getByTestId('facts-card').boundingBox()]);
    expect(a && f && Math.abs(a.y - f.y) < 4).toBe(true); // same row at 1280px
    await page.context().close();
});

test('a slug that is not a category or an id: "not found" without asking the server', async () => {
    const { page, graphql } = await open(browser, '/opportunities/not-a-real-page', {});
    await expect(page.getByTestId('opportunity-not-found')).toBeVisible({ timeout: 90_000 });
    expect(graphql.calls.some((c) => c.name === 'GetOpportunity')).toBe(false);
    await page.context().close();
});

for (const width of [360, 768]) {
    test(`no horizontal scroll at ${width}px, and the main action sits in the hero on phones`, async () => {
        const { page } = await openOpp({}, { width, height: 900 });
        await expect(page.getByTestId('opportunity-hero')).toBeVisible({ timeout: 90_000 });
        if (width === 360) await expect(page.getByTestId('opportunity-hero').getByTestId('apply-primary')).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        await page.context().close();
    });
}
