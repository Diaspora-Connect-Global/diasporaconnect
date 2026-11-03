/** Home "Latest on DiaspoPlug": each opportunity kind gets its own fitting fallback, never the job photo for all. */
import { test, expect, type Browser } from '@playwright/test';
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

test('a job gets the workshop photo; a scholarship and a grant get an icon tile, not the job photo', async () => {
    const { page, section } = await latest([opp('o-1', 'IT Support Specialist', 'EMPLOYMENT'), opp('o-2', 'Merit Scholarship', 'SCHOLARSHIP')]);
    const job = section.getByTestId('latest-card').filter({ hasText: 'IT Support Specialist' });
    await expect(job.locator('img')).toHaveAttribute('src', /cat-job\.webp/);
    await expect(job.locator('img')).toHaveAttribute('alt', '');
    const sch = section.getByTestId('latest-card').filter({ hasText: 'Merit Scholarship' });
    await expect(sch.locator('img')).toHaveCount(0);
    await expect(sch).toContainText('Scholarship');
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('a grant and a volunteer role are icon tiles too, and a programme gets the workshop photo', async () => {
    const { page, section } = await latest([opp('o-3', 'Community Grant', 'GRANT'), opp('o-4', 'Weekend Volunteer', 'VOLUNTEER')]);
    for (const title of ['Community Grant', 'Weekend Volunteer']) await expect(section.getByTestId('latest-card').filter({ hasText: title }).locator('img')).toHaveCount(0);
    await page.context().close();
    const second = await latest([opp('o-5', 'Mentoring Programme', 'PROGRAM')]);
    await expect(second.section.getByTestId('latest-card').filter({ hasText: 'Mentoring Programme' }).locator('img')).toHaveAttribute('src', /cat-team\.webp/);
    await second.page.context().close();
});

test('fits 360px with no horizontal scroll', async () => {
    const { page } = await latest([opp('o-1', 'Merit Scholarship', 'SCHOLARSHIP'), opp('o-2', 'IT Support Specialist', 'EMPLOYMENT')], { width: 360, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.context().close();
});
