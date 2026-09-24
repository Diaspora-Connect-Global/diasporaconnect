/**
 * The Daily Summary card on its isolated harness (`/en/dev-harness/daily-summary`)
 * — see the harness page for the sample data, which deliberately smuggles user
 * ids into every text field. Drives the real component in a real browser at
 * desktop and phone widths.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { openBrowser } from '../support/browser';

const HARNESS = '/en/dev-harness/daily-summary';
const ID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-|deleted-user|\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{8,}\b/i;

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser.close();
});

const VIEWPORTS = {
    desktop: { width: 1280, height: 900 },
    mobile: { width: 390, height: 844 },
} as const;

async function open(query = '', viewport: { width: number; height: number } = VIEWPORTS.desktop): Promise<Page> {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport });
    const page = await context.newPage();
    await page.goto(`${HARNESS}${query}`, { waitUntil: 'load' });
    await expect(page.getByTestId('daily-summary-card')).toBeVisible();
    return page;
}

const card = (p: Page) => p.getByTestId('daily-summary-card');

for (const [label, viewport] of Object.entries(VIEWPORTS)) {
    test(`${label}: header, AI label, topics and lists render — and no user id anywhere`, async () => {
        const page = await open('', viewport);
        await expect(card(page).getByRole('heading', { name: 'Daily Summary' })).toBeVisible();
        await expect(card(page)).toContainText('Sep 23, 2026');
        await expect(card(page)).toContainText('42 messages');
        await expect(page.getByTestId('daily-summary-ai-label')).toHaveText('AI-generated summary');
        await expect(card(page)).toContainText('Community picnic on Saturday');
        await expect(card(page)).toContainText('Visa appointment tips');
        await expect(card(page)).toContainText('Key points');
        await expect(card(page)).toContainText('Decisions');
        await expect(card(page)).toContainText('Action items');
        // Participant names only; the id-shaped and blank ones fall back.
        const participants = card(page).getByRole('list', { name: 'Participants' }).first();
        await expect(participants).toContainText('Ama Owusu');
        await expect(participants).toContainText('Unknown user');

        const text = (await card(page).innerText()) + (await card(page).innerHTML());
        expect(text).not.toMatch(ID_RE);
        // Stripped ids read as a neutral label inside sentences.
        await expect(card(page)).toContainText('a member offered to bring drinks');

        // Fits the viewport: no horizontal page scroll.
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        await page.screenshot({ path: test.info().outputPath(`daily-summary-${label}.png`), fullPage: true });
        await page.context().close();
    });
}

test('"View messages" is an accessible button that hands over the topic\'s message ids in order', async () => {
    const page = await open();
    const button = page.getByRole('button', { name: 'View messages about “Community picnic on Saturday”' });
    await expect(button).toBeVisible();
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('harness-last-view')).toHaveText('m-101,m-104,m-109');
    const views = await page.evaluate(() => window.__dailySummaryHarness?.views ?? []);
    expect(views).toEqual([['m-101', 'm-104', 'm-109']]);
    await page.context().close();
});

test('older digest with no topics falls back to overview + lists, with no id text', async () => {
    const page = await open('?legacy=1');
    await expect(page.getByRole('button', { name: /View messages/ })).toHaveCount(0);
    await expect(card(page)).toContainText('Key points');
    await expect(card(page)).toContainText('with input from a member');
    expect(await card(page).innerText()).not.toMatch(ID_RE);
    await page.context().close();
});

test('the plain-text SYSTEM digest is parsed into the card, English header/footer dropped', async () => {
    const page = await open('?system=1');
    await expect(card(page)).toContainText('Sep 23, 2026');
    await expect(card(page)).toContainText('42 messages');
    await expect(card(page)).toContainText('Ama to book the pavilion');
    await expect(card(page)).not.toContainText('Daily summary ·');
    await expect(card(page)).not.toContainText('(Based on');
    expect(await card(page).innerText()).not.toMatch(ID_RE);
    await page.context().close();
});

test('translated in German', async () => {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
    const page = await context.newPage();
    await page.goto('/de/dev-harness/daily-summary', { waitUntil: 'load' });
    await expect(card(page).getByRole('heading', { name: 'Tageszusammenfassung' })).toBeVisible();
    await expect(page.getByTestId('daily-summary-ai-label')).toHaveText('KI-generierte Zusammenfassung');
    await expect(card(page)).toContainText('42 Nachrichten');
    await expect(card(page)).toContainText('23.09.2026');
    await context.close();
});
