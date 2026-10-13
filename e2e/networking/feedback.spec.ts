/**
 * Event networking M7, feedback sheets and the post-event recap, against the dev-harness pages
 * (fixture backend). FEEDBACK_UI_ENABLED is false in production; the flag-off checks live in
 * event-day.spec.ts next to the other M7 flag checks.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { UUID } from '../support/networkingFixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const BASE = process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_PORT ?? 3111}`;
const H = '/en/dev-harness/networking';
const READY = { timeout: 90_000 };
const withoutHrefs = (html: string) => html.replace(/href="[^"]*"/g, '');

async function harness(path: string, viewport = { width: 1280, height: 900 }): Promise<{ page: Page; errors: string[]; close: () => Promise<void> }> {
    const context = await browser.newContext({ baseURL: BASE, viewport, locale: 'en-GB' });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${H}/${path}`);
    await expect(page.getByTestId('harness-banner')).toBeVisible(READY);
    return { page, errors, close: () => context.close() };
}

const calls = async (page: Page): Promise<Array<{ name: string; input: Record<string, unknown> }>> => JSON.parse((await page.getByTestId('harness-calls').textContent()) || '[]');

async function openSheet(page: Page, kind: 'meeting' | 'circle') {
    await page.getByTestId(`open-${kind}-feedback`).click();
    await expect(page.getByTestId('feedback-sheet')).toBeVisible();
    await expect(page.getByTestId('feedback-form')).toBeVisible(READY);
}

test.describe('meeting feedback', () => {
    test('validation, the 1000-character cap, the private-comment note, Stay connected and the saved state', async () => {
        const { page, errors, close } = await harness('feedback');
        await openSheet(page, 'meeting');
        await expect(page.getByTestId('feedback-sheet')).toContainText('How was your meeting with David Owusu?');
        // Nothing chosen: nothing is sent and the form says why.
        await page.getByTestId('feedback-save').click();
        await expect(page.getByTestId('feedback-problem')).toHaveText('Choose what happened.');
        expect((await calls(page)).filter((c) => c.name === 'submit')).toEqual([]);
        // The four attendance answers, exactly.
        await expect(page.getByTestId('attendance-option')).toHaveCount(4);
        await expect(page.getByTestId('feedback-form')).toContainText("I was there, they weren't");
        await expect(page.getByTestId('feedback-form')).toContainText("They were there, I wasn't");
        // Usefulness and outcomes appear only for someone who was there.
        await expect(page.getByTestId('usefulness-group')).toHaveCount(0);
        await page.locator('[data-testid="attendance-option"][data-value="MET"]').check();
        await expect(page.getByTestId('usefulness-group')).toBeVisible();
        await expect(page.getByTestId('usefulness-option')).toHaveCount(5);
        await expect(page.getByTestId('outcome-option')).toHaveCount(7);
        await page.getByTestId('feedback-save').click();
        await expect(page.getByTestId('feedback-problem')).toHaveText('Choose how useful it was.');
        await page.locator('[data-testid="usefulness-option"][data-value="4"]').check();
        await page.locator('[data-testid="outcome-option"][data-value="EXCHANGED_CONTACTS"]').check();
        await page.locator('[data-testid="outcome-option"][data-value="MENTORSHIP"]').check();
        // Comment: capped at 1000 with a live count, private to the author.
        await expect(page.getByTestId('comment-note')).toHaveAttribute('data-kind', 'private');
        await expect(page.getByTestId('comment-note')).toContainText('Only you can see this comment');
        await page.getByTestId('feedback-comment').fill('x'.repeat(1100));
        expect((await page.getByTestId('feedback-comment').inputValue()).length).toBe(1000);
        await expect(page.getByTestId('comment-count')).toHaveText('1000 / 1000');
        await page.getByTestId('feedback-comment').fill('Good conversation.');
        await expect(page.getByTestId('comment-count')).toHaveText('18 / 1000');
        await page.getByTestId('stay-connected').check();
        await page.getByTestId('feedback-save').click();
        await expect(page.getByTestId('feedback-saved')).toBeVisible();
        await expect(page.getByTestId('connect-sent')).toContainText('David Owusu');
        const log = await calls(page);
        const submit = log.find((c) => c.name === 'submit');
        expect(submit?.input).toMatchObject({ type: 'MEETING', attendance: 'MET', usefulness: 4, outcomes: ['EXCHANGED_CONTACTS', 'MENTORSHIP'], comment: 'Good conversation.' });
        // Stay connected sends the EXISTING connect, after the feedback is saved, to that person.
        expect(log.map((c) => c.name)).toEqual(['submit', 'connect']);
        expect(log[1].input).toMatchObject({ handle: 'h-david-71c' });
        expect(errors).toEqual([]);
        await close();
    });

    test('without Stay connected nobody is connected; a good rating never connects', async () => {
        const { page, close } = await harness('feedback');
        await openSheet(page, 'meeting');
        await page.locator('[data-testid="attendance-option"][data-value="MET"]').check();
        await page.locator('[data-testid="usefulness-option"][data-value="5"]').check();
        await expect(page.getByTestId('stay-connected')).not.toBeChecked();
        await page.getByTestId('feedback-save').click();
        await expect(page.getByTestId('feedback-saved')).toBeVisible();
        expect((await calls(page)).map((c) => c.name)).toEqual(['submit']);
        await close();
    });

    test('someone who was not there answers without usefulness, outcomes or Stay connected', async () => {
        const { page, close } = await harness('feedback');
        await openSheet(page, 'meeting');
        await page.locator('[data-testid="attendance-option"][data-value="THEY_ATTENDED_I_DID_NOT"]').check();
        await expect(page.getByTestId('usefulness-group')).toHaveCount(0);
        await expect(page.getByTestId('outcomes-group')).toHaveCount(0);
        await expect(page.getByTestId('stay-connected')).toHaveCount(0);
        await page.getByTestId('feedback-save').click();
        await expect(page.getByTestId('feedback-saved')).toBeVisible();
        const submit = (await calls(page)).find((c) => c.name === 'submit');
        expect(submit?.input).toMatchObject({ attendance: 'THEY_ATTENDED_I_DID_NOT', usefulness: null, outcomes: [] });
        await close();
    });

    test('the answers are native radios: the arrow keys move inside the group', async () => {
        const { page, close } = await harness('feedback');
        await openSheet(page, 'meeting');
        const first = page.getByTestId('attendance-option').first();
        await first.focus();
        await page.keyboard.press('Space');
        await expect(first).toBeChecked();
        await page.keyboard.press('ArrowRight');
        await expect(page.getByTestId('attendance-option').nth(1)).toBeChecked();
        await close();
    });

    test('an existing answer opens filled in, can be updated, and an existing connection is reported kindly', async () => {
        const { page, close } = await harness('feedback?state=submitted&connected=existing');
        await openSheet(page, 'meeting');
        await expect(page.getByTestId('feedback-existing')).toContainText('You answered on');
        await expect(page.getByTestId('feedback-existing')).toContainText('You can change it until');
        await expect(page.locator('[data-testid="attendance-option"][data-value="MET"]')).toBeChecked();
        await expect(page.locator('[data-testid="usefulness-option"][data-value="4"]')).toBeChecked();
        await expect(page.getByTestId('feedback-comment')).toHaveValue('Good conversation about seed-stage fintech.');
        await expect(page.getByTestId('feedback-save')).toHaveText('Update feedback');
        await page.locator('[data-testid="usefulness-option"][data-value="5"]').check();
        await page.getByTestId('stay-connected').check();
        await page.getByTestId('feedback-save').click();
        await expect(page.getByTestId('feedback-saved')).toBeVisible();
        await expect(page.getByTestId('connect-existing')).toBeVisible();
        await page.getByTestId('feedback-edit').click();
        await expect(page.getByTestId('feedback-form')).toBeVisible();
        await close();
    });

    test('after the window closed the answer is shown read-only', async () => {
        const { page, close } = await harness('feedback?state=closed');
        await openSheet(page, 'meeting');
        await expect(page.getByTestId('feedback-existing')).toContainText('The feedback window has closed');
        await expect(page.getByTestId('feedback-save')).toHaveCount(0);
        await expect(page.locator('[data-testid="attendance-option"][data-value="MET"]')).toBeDisabled();
        await expect(page.getByTestId('feedback-comment')).toBeDisabled();
        await close();
    });
});

test.describe('circle feedback', () => {
    test('its comment note says it is shared anonymously with organisers only at 5 or more responses', async () => {
        const { page, close } = await harness('feedback');
        await openSheet(page, 'circle');
        await expect(page.getByTestId('feedback-sheet')).toContainText('How was Investing in African Startups?');
        const note = page.getByTestId('comment-note');
        await expect(note).toHaveAttribute('data-kind', 'anonymous');
        await expect(note).toContainText('without your name');
        await expect(note).toContainText('at least 5 people');
        await expect(page.getByTestId('attendance-option')).toHaveCount(2);
        await page.locator('[data-testid="attendance-option"][data-value="ATTENDED"]').check();
        await expect(page.getByTestId('stay-connected')).toHaveCount(0);
        await page.locator('[data-testid="usefulness-option"][data-value="3"]').check();
        await page.getByTestId('feedback-comment').fill('Relevant people in the room.');
        await page.getByTestId('feedback-save').click();
        await expect(page.getByTestId('feedback-saved')).toBeVisible();
        const log = await calls(page);
        expect(log.map((c) => c.name)).toEqual(['submit']);
        expect(log[0].input).toMatchObject({ type: 'CIRCLE', attendance: 'ATTENDED', usefulness: 3, comment: 'Relevant people in the room.' });
        await close();
    });

    test('a closed circle window refuses with a calm message', async () => {
        const { page, close } = await harness('feedback?state=closed');
        await openSheet(page, 'circle');
        await expect(page.getByTestId('feedback-existing')).toContainText('closed');
        await close();
    });
});

test.describe('recap', () => {
    test('personal counts, the waiting list that opens the sheets, and the organiser prompt', async () => {
        const { page, errors, close } = await harness('recap');
        await expect(page.getByTestId('recap')).toBeVisible(READY);
        await expect(page.getByTestId('tab-recap')).toHaveAttribute('aria-current', 'page');
        await expect(page.getByTestId('tab-recap')).toHaveText('Recap');
        await expect(page.getByTestId('recap-stat-matches').getByTestId('recap-stat-value')).toHaveText('7');
        await expect(page.getByTestId('recap-stat-meetings').getByTestId('recap-stat-value')).toHaveText('3');
        await expect(page.getByTestId('recap-stat-circles').getByTestId('recap-stat-value')).toHaveText('2');
        await expect(page.getByTestId('recap')).toContainText('Only you can see this page');
        const rows = page.getByTestId('recap-pending-row');
        await expect(rows).toHaveCount(2);
        await expect(rows.first()).toContainText('David Owusu');
        await expect(rows.nth(1)).toContainText('Investing in African Startups');
        await expect(page.getByTestId('recap-join-organiser')).toHaveAttribute('href', '/en/community/org-fixture');
        await expect(page.getByTestId('recap-join-organiser')).toContainText('Diaspora Business Network');
        await expect(page.getByTestId('recap-ends')).toContainText('Networking stays open until');
        await expect(page.getByTestId('recap-ends')).toContainText('2030');
        // Answer the first one: the sheet opens on that person, and the row leaves the list.
        await rows.first().getByTestId('recap-give-feedback').click();
        await expect(page.getByTestId('feedback-sheet')).toContainText('David Owusu');
        await page.locator('[data-testid="attendance-option"][data-value="RESCHEDULED_OR_CANCELLED"]').check();
        await page.getByTestId('feedback-save').click();
        await expect(page.getByTestId('feedback-saved')).toBeVisible();
        await page.getByTestId('feedback-close').click();
        await expect(page.getByTestId('recap-pending-row')).toHaveCount(1);
        expect(errors).toEqual([]);
        await close();
    });

    test('states: empty, already a member, request pending, closed, caught up, many waiting', async () => {
        const cases: Array<[string, (p: Page) => Promise<void>]> = [
            ['empty', async (p) => {
                for (const k of ['matches', 'meetings', 'circles']) await expect(p.getByTestId(`recap-stat-${k}`).getByTestId('recap-stat-value')).toHaveText('0');
                await expect(p.getByTestId('recap-caught-up')).toContainText("You're all caught up");
            }],
            ['member', async (p) => {
                await expect(p.getByTestId('recap-organiser-member')).toBeVisible();
                await expect(p.getByTestId('recap-join-organiser')).toHaveCount(0);
            }],
            ['pending', async (p) => {
                await expect(p.getByTestId('recap-organiser-pending')).toBeVisible();
                await expect(p.getByTestId('recap-join-organiser')).toHaveCount(0);
            }],
            ['closed', async (p) => {
                await expect(p.getByTestId('recap-ends')).toHaveAttribute('data-open', 'false');
                await expect(p.getByTestId('recap-ends')).toContainText('Networking has closed');
            }],
            ['caught-up', async (p) => {
                await expect(p.getByTestId('recap-caught-up')).toBeVisible();
                await expect(p.getByTestId('recap-pending-row')).toHaveCount(0);
            }],
            ['many', async (p) => {
                await expect(p.getByTestId('recap-more')).toContainText('And 25 more');
            }],
        ];
        for (const [state, check] of cases) {
            const { page, close } = await harness(`recap?state=${state}`);
            await expect(page.getByTestId('recap')).toBeVisible(READY);
            await check(page);
            await close();
        }
    });

    test('never another person\'s data, never an id, no horizontal scroll at 360px', async () => {
        const { page, errors, close } = await harness('recap', { width: 360, height: 740 });
        await expect(page.getByTestId('recap')).toBeVisible(READY);
        const text = withoutHrefs(await page.getByTestId('recap').innerHTML());
        expect(text).not.toMatch(UUID);
        expect(text).not.toMatch(/m-fixture|c-fixture|h-david|org-fixture/);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
        await page.screenshot({ path: '.artifacts/feedback/recap-360.png', fullPage: true });
        expect(errors).toEqual([]);
        await close();
    });

    test('the feedback sheets fit a phone and carry no ids', async () => {
        const { page, close } = await harness('feedback', { width: 360, height: 740 });
        await openSheet(page, 'meeting');
        await page.locator('[data-testid="attendance-option"][data-value="MET"]').check();
        const dialogBox = await page.getByTestId('feedback-sheet').boundingBox();
        expect(dialogBox?.width ?? 0).toBeLessThanOrEqual(360);
        const html = withoutHrefs(await page.getByTestId('feedback-sheet').innerHTML());
        expect(html).not.toMatch(UUID);
        expect(html).not.toMatch(/m-fixture|c-fixture|h-david/);
        await page.screenshot({ path: '.artifacts/feedback/sheet-360.png' });
        await close();
    });
});
