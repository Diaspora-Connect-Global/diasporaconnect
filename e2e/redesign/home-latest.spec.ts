/** Home "Latest on DiaspoPlug": every opportunity kind shows its icon tile, never a stock photo. */
import { test, expect, type Browser, type Locator } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { ALL, UUID, open } from './fixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const opp = (id: string, title: string, type: string, over: Record<string, unknown> = {}) => ({ __typename: 'Opportunity', id, title, type, category: 'EMPLOYMENT_CAREER', location: 'Accra, Ghana', deliveryMode: 'IN_PERSON', deadline: null, createdAt: '2026-10-08T08:00:00.000Z', owner: null, ...over });
const withOpps = (rows: unknown[]) => ({ ...ALL, ListOpportunities: { listOpportunities: { __typename: 'OpportunityList', total: rows.length, opportunities: rows } } });

async function latest(rows: unknown[], viewport?: { width: number; height: number }) {
    const { page } = await open(browser, '/home', withOpps(rows), viewport);
    const section = page.getByTestId('home-latest');
    await expect(section).toBeVisible({ timeout: 90_000 });
    return { page, section };
}

async function expectIconTile(section: Locator, title: string, tag: string) {
    const card = section.getByTestId('latest-card').filter({ hasText: title });
    await expect(card.locator('img')).toHaveCount(0);
    await expect(card.locator('svg').first()).toBeVisible();
    await expect(card).toContainText(tag);
}

test('a job and a scholarship both get an icon tile, not a photo', async () => {
    const { page, section } = await latest([opp('o-1', 'IT Support Specialist', 'EMPLOYMENT'), opp('o-2', 'Merit Scholarship', 'SCHOLARSHIP')]);
    await expectIconTile(section, 'IT Support Specialist', 'Job');
    await expectIconTile(section, 'Merit Scholarship', 'Scholarship');
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('so do programme, investment and real estate', async () => {
    const first = await latest([opp('o-3', 'Mentoring Programme', 'PROGRAM'), opp('o-4', 'Solar Fund', 'INVESTMENT')]);
    await expectIconTile(first.section, 'Mentoring Programme', 'Programme');
    await expectIconTile(first.section, 'Solar Fund', 'Investment');
    await first.page.context().close();
    const second = await latest([opp('o-5', 'Plot in Tema', 'INVESTMENT', { category: 'REAL_ESTATE_INFRASTRUCTURE' }), opp('o-6', 'Community Grant', 'GRANT')]);
    await expectIconTile(second.section, 'Plot in Tema', 'Real estate');
    await expectIconTile(second.section, 'Community Grant', 'Grant');
    await second.page.context().close();
});

test('fits 360px with no horizontal scroll', async () => {
    const { page } = await latest([opp('o-1', 'Merit Scholarship', 'SCHOLARSHIP'), opp('o-2', 'IT Support Specialist', 'EMPLOYMENT')], { width: 360, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.context().close();
});
