/**
 * Event networking ORGANISER ANALYTICS (M8), against the dev-harness page (fixture backend)
 * and, for the flag-off check, the in-memory GraphQL double on the REAL manage route.
 *
 * The analytics gateway is not built and ANALYTICS_UI_ENABLED is false, so: the harness page
 * renders the real panel on fixtures, and the real manage page must show no Analytics tab and
 * send no analytics operation. Not run in CI by the author: written against the harness.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { COMMUNITY_OVERRIDES } from '../support/fakeSession';
import { ADMIN_OF_ORGANISER, EVENT_ID, eventFixture, openPage } from '../support/eventFixtures';
import { networkingOverrides } from '../support/networkingFixtures';
import { buildAnalyticsCsv, csvFilename, escapeCsvCell, toCsv } from '../../src/components/networking/analytics/csv';
import { cellOf, rateOf } from '../../src/components/networking/analytics/stats';
import { buildFull, buildSmall } from '../../src/components/networking/analytics/harness/fixtures';

const BASE = process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_PORT ?? 3111}`;
const URL_BASE = '/en/dev-harness/networking/analytics';
const READY = { timeout: 90_000 };
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// ─── Pure rules and CSV (no browser) ─────────────────────────────────────────

test.describe('display rules (pure)', () => {
    test('a count below 5 is never a value, whatever the server claims', () => {
        expect(cellOf({ value: 3, suppressed: false })).toEqual({ kind: 'suppressed' });
        expect(cellOf({ value: 0, suppressed: false })).toEqual({ kind: 'suppressed' });
        expect(cellOf({ value: 4, suppressed: false })).toEqual({ kind: 'suppressed' });
        expect(cellOf({ value: 99, suppressed: true })).toEqual({ kind: 'suppressed' });
        expect(cellOf({ value: null, suppressed: false })).toEqual({ kind: 'suppressed' });
        expect(cellOf({ value: 5, suppressed: false })).toEqual({ kind: 'value', n: 5 });
        expect(cellOf(null)).toEqual({ kind: 'none' });
    });

    test('a ratio: empty denominator is "none" before anything else; small sides hide it; otherwise num/den', () => {
        const s = (value: number | null, suppressed = false) => ({ value, suppressed });
        expect(rateOf({ numerator: s(null, true), denominator: s(0), noDenominator: true, suppressed: false })).toEqual({ kind: 'none' });
        expect(rateOf({ numerator: s(0), denominator: s(0), noDenominator: false, suppressed: true })).toEqual({ kind: 'none' });
        expect(rateOf({ numerator: s(3), denominator: s(50), noDenominator: false, suppressed: false })).toEqual({ kind: 'suppressed' });
        expect(rateOf({ numerator: s(20), denominator: s(4), noDenominator: false, suppressed: false })).toEqual({ kind: 'suppressed' });
        expect(rateOf({ numerator: s(20), denominator: s(80), noDenominator: false, suppressed: false })).toEqual({ kind: 'rate', numerator: 20, denominator: 80, ratio: 0.25 });
    });
});

test.describe('CSV builder (pure)', () => {
    test('RFC 4180 quoting and formula-injection escaping', () => {
        expect(escapeCsvCell('plain')).toBe('plain');
        expect(escapeCsvCell('a,b')).toBe('"a,b"');
        expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
        expect(escapeCsvCell('line\nbreak')).toBe('"line\nbreak"');
        for (const lead of ['=', '+', '-', '@', '\t', '\r']) {
            const out = escapeCsvCell(`${lead}SUM(A1)`);
            expect(out.replace(/^"/, '').startsWith("'")).toBe(true);
        }
        // Escaping first, quoting second: a formula that also needs quotes gets both.
        expect(escapeCsvCell('=HYPERLINK("x","y")')).toBe('"\'=HYPERLINK(""x"",""y"")"');
        expect(escapeCsvCell(12)).toBe('12');
        expect(toCsv([['a', 'b,c'], ['1', '2']])).toBe('a,"b,c"\r\n1,2\r\n');
    });

    test('filename: slug of the title plus the date, never an id', () => {
        const name = csvFilename('Ghana Diaspora Business Summit 2030!', new Date(2030, 10, 4));
        expect(name).toBe('ghana-diaspora-business-summit-2030-networking-analytics-2030-11-04.csv');
        expect(csvFilename('Été à Zürich', new Date(2030, 0, 9))).toBe('ete-a-zurich-networking-analytics-2030-01-09.csv');
        expect(csvFilename('', new Date(2030, 0, 9))).toBe('event-networking-analytics-2030-01-09.csv');
        expect(csvFilename('=cmd|calc', new Date(2030, 0, 9)).startsWith('cmd-calc')).toBe(true);
    });

    const text = (title: string) => ({
        t: (k: string) => k,
        fewerThan5: 'fewer than 5',
        none: '—',
        eventTitle: title,
        generatedAt: '2030-11-24T09:30:00.000Z',
        filters: [['filters.circle', '=Founders'] as [string, string]],
    });

    test('suppressed cells are exported as "fewer than 5"; a leaked small number is not exported; empty ratio is "—"', () => {
        const csv = buildAnalyticsCsv(buildSmall(), text('Summit'));
        const row = (metric: string) => csv.split('\r\n').find((l) => l.includes(`,${metric},`)) ?? '';
        expect(row('kpi.connected')).toBe('csv.connections,kpi.connected,fewer than 5,,');
        expect(row('kpi.rate')).toContain('fewer than 5');
        expect(row('kpi.useful')).toBe('csv.contacts,kpi.useful,—,—,—');
        expect(row('kpi.participants')).toContain(',6,');
        // a small insight code is left out, not listed as "fewer than 5" or an "other" cell
        expect(csv).not.toContain('Finance');
        expect(csv).toContain('Technology');
    });

    test('formula-looking text anywhere is defused; full data exports numbers, percentages and denominators', () => {
        const csv = buildAnalyticsCsv(buildFull(), text('=2+2'));
        expect(csv).toContain("'=2+2");
        expect(csv).toContain("'=Founders");
        expect(csv.split('\r\n').find((l) => l.includes(',kpi.rate,'))).toBe('csv.connections,kpi.rate,48.5%,64,132');
        expect(csv.endsWith('\r\n')).toBe(true);
        expect(csv).not.toMatch(UUID);
        expect(csv).not.toContain('c-founders');
    });
});

// ─── Harness page ─────────────────────────────────────────────────────────────

test.describe('analytics harness', () => {
    let browser: Browser;
    test.beforeAll(async () => {
        browser = await openBrowser();
    });
    test.afterAll(async () => {
        await browser?.close();
    });

    async function harness(state: string, viewport = { width: 1280, height: 900 }): Promise<{ page: Page; errors: string[]; close: () => Promise<void> }> {
        const context = await browser.newContext({ baseURL: BASE, viewport, locale: 'en-GB', acceptDownloads: true });
        const page = await context.newPage();
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(`${URL_BASE}?state=${state}`);
        await expect(page.getByTestId('harness-banner')).toBeVisible(READY);
        return { page, errors, close: () => context.close() };
    }
    const loaded = (page: Page) => expect(page.getByTestId('kpis')).toBeVisible(READY);
    const calls = async (page: Page): Promise<Array<{ name: string; filters?: Record<string, string> }>> => JSON.parse((await page.getByTestId('harness-calls').textContent()) || '[]');
    const loads = async (page: Page) => (await calls(page)).filter((c) => c.name === 'load');
    const intOf = (s: string | null) => Number((s ?? '').replace(/[^\d]/g, ''));

    test('full: every KPI shows a value, the explanation and the last-updated time; eight tiles', async () => {
        const { page, errors, close } = await harness('full');
        await loaded(page);
        await expect(page.locator('[data-testid^="kpi-"][data-testid$="-value"]')).toHaveCount(8);
        await expect(page.getByTestId('kpi-participants-value')).toHaveText('132');
        await expect(page.getByTestId('kpi-rate-value')).toHaveText('48.5%');
        await expect(page.getByTestId('kpi-rate')).toContainText('64 of 132 networking participants');
        await expect(page.getByTestId('kpi-held')).toContainText('A booking alone does not count');
        await expect(page.getByTestId('kpi-meetings')).toContainText('6 circle sessions scheduled (counted separately)');
        await expect(page.getByTestId('kpi-useful')).toContainText('19 of 37 people who gave feedback');
        await expect(page.getByTestId('kpi-circles')).toContainText('91 circle memberships');
        await expect(page.getByTestId('last-updated')).toContainText('Last updated');
        await page.screenshot({ path: '.artifacts/analytics/full-1280.png', fullPage: true });
        expect(errors).toEqual([]);
        await close();
    });

    test('suppression: no value under 5 is ever printed (small cohort, including a server that leaks 3)', async () => {
        for (const state of ['small', 'empty']) {
            const { page, close } = await harness(state);
            await loaded(page);
            await expect(page.getByTestId('kpi-connected-value')).toHaveAttribute('data-state', 'suppressed');
            await expect(page.getByTestId('kpi-connected-value')).toHaveText('fewer than 5');
            await expect(page.getByTestId('kpi-meetings-value')).toHaveText('fewer than 5');
            // The whole-cohort note shows only when the participant count itself is under K (empty: 0; small has 6).
            if (state === 'empty') await expect(page.getByTestId('too-few')).toBeVisible();
            else await expect(page.getByTestId('too-few')).toHaveCount(0);
            const shown = await page.locator('[data-state="value"]').allTextContents();
            for (const s of shown.filter((x) => !x.includes('%'))) expect(intOf(s)).toBeGreaterThanOrEqual(5);
            // the leaked "3" and the circle row's 3/4 never appear as a figure
            const panel = (await page.getByTestId('analytics-panel').innerText()).replace(/\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}/g, '');
            expect(panel).not.toMatch(/(^|\s)[0-4](\s|$)/);
            await close();
        }
    });

    test('zero denominators read "—" with the "no one yet" note, never 0%', async () => {
        const small = await harness('small');
        await loaded(small.page);
        await expect(small.page.getByTestId('kpi-useful-value')).toHaveAttribute('data-state', 'none');
        await expect(small.page.getByTestId('kpi-useful-value')).toHaveText('—');
        await expect(small.page.getByTestId('kpi-useful')).toContainText('No one in this group yet.');
        await expect(small.page.getByTestId('kpi-growth-value')).toHaveText('—');
        // A group of 0 is still a count under K, so it reads "fewer than 5" like any small group (the stricter rule).
        await expect(small.page.getByTestId('buckets-population')).toContainText('Fewer than 5 meetings are in this group');
        // A standalone 0% (not the "100%" in the multi-select note).
        expect(await small.page.getByTestId('analytics-panel').innerText()).not.toMatch(/(^|[^\d.])0(\.0)?\s?%/);
        await small.close();
        const empty = await harness('empty');
        await loaded(empty.page);
        await expect(empty.page.getByTestId('kpi-rate-value')).toHaveText('—');
        await expect(empty.page.getByTestId('kpi-growth')).toHaveCount(0);
        await empty.close();
    });

    test('the held-meetings groups add up to the population and "held" is the first two groups', async () => {
        const { page, close } = await harness('full');
        await loaded(page);
        const read = async (id: string) => intOf(await page.getByTestId(`bucket-${id}`).locator('span').last().textContent());
        const parts = await Promise.all(['both', 'one', 'nonAttendance', 'noResponse', 'rescheduledOrCancelled'].map(read));
        const population = intOf((await page.getByTestId('buckets-population').textContent())?.match(/^\s*([\d,.]+)/)?.[1] ?? '');
        expect(parts.reduce((a, b) => a + b, 0)).toBe(population);
        expect(parts[0] + parts[1]).toBe(intOf(await page.getByTestId('kpi-held-value').textContent()));
        // "Other answer" is hidden while it is zero; no-response is its own group, never non-attendance
        await expect(page.getByTestId('bucket-other')).toHaveCount(0);
        await expect(page.getByTestId('bucket-noResponse')).toContainText('No response');
        await expect(page.getByTestId('bucket-nonAttendance')).toContainText('Non-attendance reported');
        await close();
    });

    test('circles list unique people and memberships separately; insights show the denominator and the multi-select note', async () => {
        const { page, close } = await harness('full');
        await loaded(page);
        await expect(page.getByTestId('circle-row')).toHaveCount(3);
        await expect(page.getByTestId('circles')).toContainText('never added together');
        await expect(page.getByTestId('circle-row').first()).toContainText('Founders Roundtable');
        await expect(page.getByTestId('insights-denominator')).toContainText('Based on 118 participants');
        await expect(page.getByTestId('insights-multi')).toContainText('percentages can add up to more than 100%');
        await expect(page.getByTestId('insight-INDUSTRIES')).toContainText('Technology');
        // every printed insight count is at least 5, and each bar has its value as text
        const counts = await page.getByTestId('insight-item').locator('span.font-medium').allTextContents();
        expect(counts.length).toBeGreaterThan(10);
        for (const c of counts) expect(intOf(c)).toBeGreaterThanOrEqual(5);
        await close();
    });

    test('filters: one query per change, with the chosen values; a backwards date range is explained and not sent', async () => {
        const { page, close } = await harness('full');
        await loaded(page);
        expect((await loads(page)).length).toBe(1);
        expect((await loads(page))[0].filters).toEqual({});
        await page.getByLabel('Circle', { exact: true }).selectOption('c-founders');
        await expect.poll(async () => (await loads(page)).length).toBe(2);
        expect((await loads(page))[1].filters).toEqual({ circleKey: 'c-founders' });
        await page.getByLabel('Networking status', { exact: true }).selectOption('ACTIVE');
        await page.getByLabel('Attendance format', { exact: true }).selectOption('ONLINE');
        await page.getByLabel('Meeting status', { exact: true }).selectOption('COMPLETED');
        await expect.poll(async () => (await loads(page)).length).toBe(5);
        expect((await loads(page))[4].filters).toEqual({ circleKey: 'c-founders', networkingStatus: 'ACTIVE', attendanceFormat: 'ONLINE', meetingStatus: 'COMPLETED' });
        await page.getByTestId('filter-from').fill('2030-12-01');
        await expect.poll(async () => (await loads(page)).length).toBe(6);
        await page.getByTestId('filter-to').fill('2030-11-01');
        await expect(page.getByTestId('range-invalid')).toBeVisible();
        await page.waitForTimeout(400);
        expect((await loads(page)).length).toBe(6);
        await page.getByTestId('filter-to').fill('2030-12-15');
        await expect(page.getByTestId('range-invalid')).toHaveCount(0);
        await expect.poll(async () => (await loads(page)).length).toBe(7);
        expect((await loads(page))[6].filters).toMatchObject({ from: '2030-12-01', to: '2030-12-15' });
        await page.getByTestId('filters-reset').click();
        await expect.poll(async () => (await loads(page)).length).toBe(8);
        expect((await loads(page))[7].filters).toEqual({});
        await close();
    });

    test('a narrow filter (one industry) shrinks the cohort: every cell becomes "fewer than 5"', async () => {
        const { page, close } = await harness('full');
        await loaded(page);
        await page.getByLabel('Industry', { exact: true }).selectOption('FINANCE');
        await expect(page.getByTestId('kpi-participants-value')).toHaveAttribute('data-state', 'suppressed', READY);
        await expect(page.getByTestId('kpi-participants-value')).toHaveText('fewer than 5');
        await expect(page.getByTestId('kpi-rate-value')).toHaveText('fewer than 5');
        await expect(page.getByTestId('too-few')).toBeVisible();
        await close();
    });

    test('CSV export downloads a file named from the title and date, with suppressed cells as "fewer than 5"', async () => {
        const { page, close } = await harness('small');
        await loaded(page);
        const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-csv').click()]);
        expect(download.suggestedFilename()).toMatch(/^ghana-diaspora-business-summit-2030-networking-analytics-\d{4}-\d{2}-\d{2}\.csv$/);
        const stream = await download.createReadStream();
        const chunks: Buffer[] = [];
        for await (const c of stream) chunks.push(c as Buffer);
        const body = Buffer.concat(chunks).toString('utf8').replace(/^﻿/, '');
        expect(body).toContain('fewer than 5');
        expect(body).toContain('Ghana Diaspora Business Summit 2030');
        expect(body).not.toMatch(UUID);
        expect(body.split('\r\n').find((l) => l.includes('People who connected'))).toMatch(/fewer than 5/);
        await close();
    });

    test('no id on screen (opaque keys never rendered) and nothing personal', async () => {
        for (const state of ['full', 'small']) {
            const { page, close } = await harness(state);
            await loaded(page);
            const text = await page.locator('body').innerText();
            expect(text).not.toMatch(UUID);
            expect(text).not.toContain('c-founders');
            await close();
        }
    });

    test('error state: a calm message from the stable code, retry works', async () => {
        const { page, close } = await harness('error');
        await expect(page.getByTestId('analytics-error')).toBeVisible(READY);
        await expect(page.getByTestId('analytics-error')).toHaveAttribute('data-error', 'unavailable');
        await expect(page.getByTestId('analytics-error')).toContainText('temporarily unavailable');
        await page.getByRole('button', { name: 'Try again' }).click();
        await expect.poll(async () => (await loads(page)).length).toBe(2);
        await close();
    });

    test('no horizontal scroll at 360px in any state; targets are at least 24px; keyboard reaches the export', async () => {
        for (const state of ['full', 'small', 'empty']) {
            const { page, close } = await harness(state, { width: 360, height: 800 });
            await loaded(page);
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
            expect(overflow).toBeLessThanOrEqual(0);
            if (state === 'full') {
                await page.screenshot({ path: '.artifacts/analytics/full-360.png', fullPage: true });
                for (const box of await page.locator('select:visible, input[type=date]:visible, button:visible').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
                    expect(box).toBeGreaterThanOrEqual(24);
                }
                await page.getByTestId('export-csv').focus();
                await expect(page.getByTestId('export-csv')).toBeFocused();
            }
            await close();
        }
    });

    test('wide layout: tiles use a three-column grid at 1280px', async () => {
        const { page, close } = await harness('full');
        await loaded(page);
        const tops = await page.locator('[data-testid^="kpi-"][data-testid$="-value"]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
        const firstRow = tops.filter((t) => Math.abs(t - tops[0]) < 40).length;
        expect(firstRow).toBe(3);
        await close();
    });
});

// ─── Flag off: the real manage page ──────────────────────────────────────────

test.describe('flag off (production default): the manage page shows nothing and sends nothing', () => {
    let browser: Browser;
    test.beforeAll(async () => {
        browser = await openBrowser();
    });
    test.afterAll(async () => {
        await browser?.close();
    });

    test('no Analytics tab, ?tab=analytics falls back to Overview, no analytics operation', async () => {
        const { page, graphql } = await openPage(browser, `/events/${EVENT_ID}/manage?tab=analytics`, { ...networkingOverrides(), ...ADMIN_OF_ORGANISER, ...COMMUNITY_OVERRIDES, GetEvent: { getEvent: eventFixture() } });
        await expect(page.getByRole('tab').first()).toBeVisible(READY);
        await expect(page.locator('[data-tab="analytics"]')).toHaveCount(0);
        await expect(page.getByTestId('analytics-panel')).toHaveCount(0);
        expect(graphql.ops.filter((o) => /Analytics/i.test(o))).toEqual([]);
        await page.context().close();
    });
});
