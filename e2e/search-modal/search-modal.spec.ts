/** Global search modal: centred panel on desktop, full-screen sheet on phones. */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { UUID, open } from '../redesign/fixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const U1 = '00000000-0000-4000-8000-0000000c0001';
const O1 = '00000000-0000-4000-8000-0000000c0002';
const E1 = '00000000-0000-4000-8000-0000000c0003';

const DATA = {
    SearchUsers: (v: Record<string, unknown>) => {
        const q = String(((v.searchUsersInput ?? {}) as { query?: string }).query ?? '');
        const profiles = q.toLowerCase().startsWith('ko')
            ? [{ __typename: 'ProfileSummary', userId: U1, username: 'kofi', firstName: 'Kofi', lastName: 'Owusu-Aninkorah-with-a-very-long-surname', headline: 'Architect', sector: null, residenceCountry: 'DE', countryOfOrigin: 'GH' }]
            : [];
        return { searchUsers: { __typename: 'SearchUsersResponse', success: true, message: null, total: profiles.length, hasMore: false, profiles } };
    },
    SearchOpportunities: (v: Record<string, unknown>) => {
        const q = String(((v.input ?? {}) as { searchTerm?: string }).searchTerm ?? '');
        const opportunities = q.toLowerCase().startsWith('ko') ? [{ __typename: 'Opportunity', id: O1, title: 'Koforidua Site Engineer', category: 'JOB', type: 'FULL_TIME', location: 'Koforidua' }] : [];
        return { searchOpportunities: { __typename: 'OpportunityList', total: opportunities.length, opportunities } };
    },
    SearchEvents: (v: Record<string, unknown>) => {
        const q = String(((v.input ?? {}) as { searchTerm?: string }).searchTerm ?? '');
        const events = q.toLowerCase().startsWith('ko') ? [{ __typename: 'Event', id: E1, title: 'Kofi Annan Lecture', startAt: '2030-11-20T09:00:00.000Z', eventCategory: 'CONFERENCE' }] : [];
        return { searchEvents: { __typename: 'EventList', total: events.length, events } };
    },
};


// Destination pages are stubbed: what is under test is where the modal sends you, not a cold route compile.
async function stubNavigation(page: Page) {
    await page.route(/\/en\/(@[^/?]+|search)(\?.*)?$/, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>' }));
}

const trigger = (page: Page) => page.locator('header button[aria-label="Search"]:visible');

async function ready(page: Page) {
    await expect(trigger(page)).toBeVisible({ timeout: 90_000 });
}

test('desktop: opens as a centred panel, shows grouped results, no id on screen', async () => {
    const { page } = await open(browser, '/home', DATA as never, { width: 1280, height: 900 });
    await ready(page);
    await trigger(page).click();
    const dialog = page.getByRole('dialog', { name: 'Search' });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('combobox')).toBeFocused();
    const box = (await dialog.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(600);
    expect(Math.abs(box.x + box.width / 2 - 640)).toBeLessThan(4);

    await page.getByRole('combobox').fill('kof');
    const list = page.getByRole('listbox', { name: 'Search results' });
    await expect(list.getByRole('group', { name: 'People' })).toBeVisible();
    await expect(list.getByRole('group', { name: 'Opportunities' })).toBeVisible();
    await expect(list.getByRole('group', { name: 'Events' })).toBeVisible();
    await expect(list.getByRole('option', { name: /Kofi Owusu/ })).toHaveAttribute('href', /\/@kofi$/);
    await expect(list).toContainText('Architect');
    await expect(list).toContainText('Job · Koforidua');
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    expect(await dialog.innerHTML()).not.toContain(U1);
    await page.context().close();
});

test('keyboard: arrows move, Esc closes and returns focus to the trigger', async () => {
    const { page } = await open(browser, '/home', DATA as never, { width: 1280, height: 900 });
    await ready(page);
    await trigger(page).click();
    const input = page.getByRole('combobox');
    await input.fill('kof');
    const options = page.getByRole('option');
    await expect(options.first()).toBeVisible();
    await input.press('ArrowDown');
    await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(input).toHaveAttribute('aria-activedescendant', (await options.nth(0).getAttribute('id'))!);
    await input.press('ArrowDown');
    await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
    await input.press('ArrowUp');
    await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true');
    await input.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();
    await page.context().close();
});

test('Enter opens the highlighted result', async () => {
    const { page } = await open(browser, '/home', DATA as never, { width: 1280, height: 900 });
    await ready(page);
    await stubNavigation(page);
    await trigger(page).click();
    const input = page.getByRole('combobox');
    await input.fill('kof');
    await expect(page.getByRole('option').first()).toBeVisible();
    await input.press('ArrowDown');
    await input.press('Enter');
    await expect(page).toHaveURL(/\/@kofi/, { timeout: 90_000 });
    await page.context().close();
});

test('See all results goes to /search?q=', async () => {
    const { page } = await open(browser, '/home', DATA as never, { width: 1280, height: 900 });
    await ready(page);
    await stubNavigation(page);
    await trigger(page).click();
    await page.getByRole('combobox').fill('kof');
    await page.getByRole('option', { name: /See all results for “kof”/ }).click();
    await expect(page).toHaveURL(/\/search\?q=kof/, { timeout: 90_000 });
    await page.context().close();
});

test('debounces: typing fast sends one query set, and shows the empty state', async () => {
    const { page, graphql } = await open(browser, '/home', DATA as never, { width: 1280, height: 900 });
    await ready(page);
    await trigger(page).click();
    const input = page.getByRole('combobox');
    await input.pressSequentially('zzqx', { delay: 30 });
    await expect(page.getByText('No results for “zzqx”').first()).toBeVisible();
    const asked = graphql.calls.filter((c) => c.name === 'SearchUsers').map((c) => (c.variables.searchUsersInput as { query: string }).query);
    // One exact query for the finished word (the typo-variant lookup only follows an empty result).
    expect(asked.filter((q) => q === 'zzqx')).toHaveLength(1);
    expect(asked).not.toContain('z');
    await page.context().close();
});

test('error state with retry', async () => {
    let fail = true;
    const boom = (data: unknown) => (() => (fail ? { __errors: [{ message: 'down', code: 'INTERNAL' }] } : data));
    const { page } = await open(browser, '/home', { SearchUsers: boom(DATA.SearchUsers({ searchUsersInput: { query: 'ko' } })), SearchOpportunities: boom({ searchOpportunities: { total: 0, opportunities: [] } }), SearchEvents: boom({ searchEvents: { total: 0, events: [] } }) } as never, { width: 1280, height: 900 });
    await ready(page);
    await trigger(page).click();
    await page.getByRole('combobox').fill('kof');
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText("Search didn't work");
    fail = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('option', { name: /Kofi Owusu/ })).toBeVisible();
    await page.context().close();
});

test('phone 360: full-screen sheet, 16px input, no horizontal scroll, long names truncate', async () => {
    const { page } = await open(browser, '/home', DATA as never, { width: 360, height: 740 });
    await ready(page);
    await trigger(page).click();
    const dialog = page.getByRole('dialog', { name: 'Search' });
    await expect(dialog).toBeVisible();
    const box = (await dialog.boundingBox())!;
    expect(Math.round(box.width)).toBe(360);
    expect(Math.round(box.height)).toBe(740);
    const input = page.getByRole('combobox');
    expect(await input.evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px');
    await input.fill('kof');
    await expect(page.getByRole('option').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    // Every target is at least 24px.
    const small = await dialog.locator('button, [role=option]').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().height < 24 || e.getBoundingClientRect().width < 24).length);
    expect(small).toBe(0);
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('Tab stays inside the dialog', async () => {
    const { page } = await open(browser, '/home', DATA as never, { width: 1280, height: 900 });
    await ready(page);
    await trigger(page).click();
    await page.getByRole('combobox').fill('kof');
    await expect(page.getByRole('option').first()).toBeVisible();
    for (let i = 0; i < 8; i++) {
        await page.keyboard.press('Tab');
        expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))).toBe(true);
    }
    await page.context().close();
});

// Evidence only: SEARCH_SHOTS=1 writes screenshots to .artifacts/search-modal/.
for (const width of [360, 768, 1280]) {
    test(`screenshot @ ${width}`, async () => {
        test.skip(process.env.SEARCH_SHOTS !== '1', 'set SEARCH_SHOTS=1 to capture');
        const { page } = await open(browser, '/home', DATA as never, { width, height: width === 1280 ? 900 : 780 });
        await ready(page);
        await trigger(page).click();
        await page.getByRole('combobox').fill('kof');
        await expect(page.getByRole('option').first()).toBeVisible();
        await page.getByRole('combobox').press('ArrowDown');
        await page.screenshot({ path: `.artifacts/search-modal/results-${width}.png` });
        await page.getByRole('combobox').fill('');
        await page.screenshot({ path: `.artifacts/search-modal/empty-${width}.png` });
        await page.context().close();
    });
}
