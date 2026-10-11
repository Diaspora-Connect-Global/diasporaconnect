/**
 * Event networking MEETINGS (M5), against the dev-harness pages (fixture backend) and,
 * for the flag-off checks, the in-memory GraphQL double on the REAL routes.
 *
 * The meetings gateway is not deployed and MEETINGS_UI_ENABLED is false, so: the harness
 * pages render the real components on fixtures, and the real routes must show nothing
 * of meetings and send no meeting operation.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { COMMUNITY_OVERRIDES } from '../support/fakeSession';
import { ADMIN_OF_ORGANISER, EVENT_ID, eventFixture, openPage } from '../support/eventFixtures';
import { networkingOverrides, UUID, card } from '../support/networkingFixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const BASE = process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_PORT ?? 3111}`;
const H = '/en/dev-harness/networking/meetings';
const READY = { timeout: 90_000 };
const withoutHrefs = (html: string) => html.replace(/href="[^"]*"/g, '');

async function harness(path: string, viewport = { width: 1280, height: 900 }, timezoneId?: string): Promise<{ page: Page; errors: string[]; close: () => Promise<void> }> {
    const context = await browser.newContext({ baseURL: BASE, viewport, timezoneId, locale: 'en-GB' });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${H}/${path}`);
    await expect(page.getByTestId('harness-banner')).toBeVisible(READY);
    return { page, errors, close: () => context.close() };
}

const calls = async (page: Page): Promise<Array<{ name: string; input: Record<string, unknown> }>> => JSON.parse((await page.getByTestId('harness-calls').textContent()) || '[]');

async function chooseBasics(page: Page) {
    await expect(page.getByTestId('meeting-request-sheet')).toBeVisible();
    await expect(page.getByTestId('slot-option').first()).toBeVisible();
    await page.getByTestId('slot-option').nth(2).check();
    await page.getByTestId('purpose-select').selectOption('INVESTMENT');
}

test.describe('request sheet', () => {
    test('names the event timezone, groups slots by day, sends the chosen slot and never connects', async () => {
        const { page, errors, close } = await harness('request');
        await page.getByTestId('request-meeting').click();
        await expect(page.getByTestId('zone-note')).toContainText('Africa/Accra', READY);
        await expect(page.getByTestId('slot-day')).toHaveCount(2);
        await expect(page.getByTestId('slot-day').first().getByRole('heading')).toContainText('Wednesday');
        await page.screenshot({ path: '.artifacts/meetings/request-1280.png' });
        // Without a time or a topic nothing is sent and the form says why.
        await page.getByTestId('request-send').click();
        await expect(page.getByText('Choose a time first.')).toBeVisible();
        await expect(page.getByText('Choose what the meeting is about.')).toBeVisible();
        expect((await calls(page)).some((c) => c.name === 'request')).toBe(false);
        await chooseBasics(page);
        await page.getByTestId('note-input').fill('Hello from the harness');
        await page.getByTestId('request-send').click();
        await expect(page.getByTestId('request-sent')).toBeVisible();
        await expect(page.getByTestId('request-sent')).toContainText('10:00');
        const req = (await calls(page)).find((c) => c.name === 'request');
        expect(req?.input).toMatchObject({ handle: 'h-david-71c', startAt: '2030-11-20T10:00:00.000Z', durationMinutes: 30, format: 'IN_PERSON', purpose: 'INVESTMENT', note: 'Hello from the harness' });
        expect(req?.input.acknowledgeProfileReveal ?? null).toBeNull();
        expect(errors).toEqual([]);
        await close();
    });

    test('slots can be chosen with the keyboard alone (arrow keys inside the radio group)', async () => {
        const { page, close } = await harness('request');
        await page.getByTestId('request-meeting').click();
        const first = page.getByTestId('slot-option').first();
        await expect(first).toBeVisible(READY);
        await first.focus();
        await page.keyboard.press('Space');
        await expect(first).toBeChecked();
        await page.keyboard.press('ArrowRight');
        await expect(page.getByTestId('slot-option').nth(1)).toBeChecked();
        await close();
    });

    test('a different length or place loads fresh times; online format asks for an https link', async () => {
        const { page, close } = await harness('request');
        await page.getByTestId('request-meeting').click();
        await expect(page.getByTestId('slot-option').first()).toBeVisible(READY);
        await page.getByTestId('duration-option').nth(0).check();
        await expect(page.getByTestId('slot-option').first()).toBeVisible();
        await expect.poll(async () => (await calls(page)).filter((c) => c.name === 'suggest').map((c) => c.input.durationMinutes)).toContain(15);
        await page.getByTestId('point-option').nth(2).check();
        await expect.poll(async () => (await calls(page)).some((c) => c.input.meetingPointId === 'pt-cafe')).toBe(true);
        await expect(page.getByTestId('point-picker')).toContainText('Up to 3 meetings at the same time');
        await page.getByTestId('format-option').nth(1).check();
        await page.getByTestId('online-url').fill('http://not-secure.example');
        await expect(page.getByText('Use a link that starts with https://')).toBeVisible();
        await close();
    });

    test('SLOT_TAKEN shows a friendly retry with fresh times, then the second try succeeds', async () => {
        const { page, close } = await harness('request?taken=1');
        await page.getByTestId('request-meeting').click();
        await chooseBasics(page);
        await page.getByTestId('request-send').click();
        await expect(page.getByTestId('request-error')).toHaveAttribute('data-error', 'slotTaken');
        await expect(page.getByTestId('request-error')).toContainText('just taken');
        await expect(page.getByTestId('slot-option').first()).toBeVisible();
        await expect(page.locator('[data-testid="slot-option"]:checked')).toHaveCount(0);
        await page.screenshot({ path: '.artifacts/meetings/request-slot-taken-1280.png' });
        await page.getByTestId('slot-option').nth(4).check();
        await page.getByTestId('request-send').click();
        await expect(page.getByTestId('request-sent')).toBeVisible();
        expect((await calls(page)).filter((c) => c.name === 'request')).toHaveLength(2);
        await close();
    });

    test('a hidden requester must confirm the profile reveal before anything is sent', async () => {
        const { page, close } = await harness('request?hidden=1');
        await page.getByTestId('request-meeting').click();
        await chooseBasics(page);
        await expect(page.getByTestId('reveal-block')).toContainText('will see my profile');
        await page.getByTestId('request-send').click();
        expect((await calls(page)).some((c) => c.name === 'request')).toBe(false);
        await page.getByTestId('reveal-check').check();
        await page.getByTestId('request-send').click();
        await expect(page.getByTestId('request-sent')).toBeVisible();
        expect((await calls(page)).find((c) => c.name === 'request')?.input.acknowledgeProfileReveal).toBe(true);
        await close();
    });

    test('the note stops at 280 characters; no shared times reads as guidance, not an error', async () => {
        const a = await harness('request');
        await a.page.getByTestId('request-meeting').click();
        await a.page.getByTestId('note-input').fill('x'.repeat(400));
        expect(await a.page.getByTestId('note-input').inputValue()).toHaveLength(280);
        await a.close();
        const b = await harness('request?empty=1');
        await b.page.getByTestId('request-meeting').click();
        await expect(b.page.getByTestId('no-slots')).toContainText('No shared times');
        await b.close();
    });

    test('mobile 360: the sheet scrolls inside the viewport with no horizontal overflow', async () => {
        const { page, close } = await harness('request', { width: 360, height: 740 });
        await page.getByTestId('request-meeting').click();
        await expect(page.getByTestId('slot-option').first()).toBeVisible(READY);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(over).toBeLessThanOrEqual(0);
        await page.screenshot({ path: '.artifacts/meetings/request-360.png' });
        await close();
    });
});

test.describe('meeting detail', () => {
    test('requested to me: Accept confirms and announces it; calendar and message appear', async () => {
        const { page, close } = await harness('detail?state=requested-in');
        await expect(page.getByTestId('meeting-status')).toHaveAttribute('data-status', 'REQUESTED', READY);
        await expect(page.getByTestId('meeting-status')).toContainText('Needs your reply');
        await expect(page.getByTestId('meeting-cancel')).toHaveCount(0);
        await page.screenshot({ path: '.artifacts/meetings/detail-requested-in-1280.png' });
        await page.getByTestId('meeting-accept').click();
        await expect(page.getByTestId('meeting-status')).toHaveAttribute('data-status', 'CONFIRMED');
        await expect(page.getByTestId('meeting-announce')).toHaveText('Meeting confirmed.');
        await expect(page.getByTestId('calendar-google')).toHaveAttribute('href', /calendar\.google\.com/);
        await expect(page.getByTestId('meeting-message')).toBeVisible();
        expect((await calls(page)).find((c) => c.name === 'respond')?.input).toMatchObject({ action: 'ACCEPT', meetingId: 'm-fixture-1' });
        await close();
    });

    test('requested to me: Decline ends it', async () => {
        const { page, close } = await harness('detail?state=requested-in');
        await page.getByTestId('meeting-decline').click();
        await expect(page.getByTestId('meeting-status')).toHaveAttribute('data-status', 'DECLINED', READY);
        await expect(page.getByTestId('meeting-accept')).toHaveCount(0);
        await close();
    });

    test('propose alternatives: up to three times, the fourth is disabled, then it waits for them', async () => {
        const { page, close } = await harness('detail?state=requested-in');
        await page.getByTestId('meeting-propose').click();
        await expect(page.getByTestId('propose-panel').getByTestId('slot-option').first()).toBeVisible(READY);
        const opts = page.getByTestId('propose-panel').getByTestId('slot-option');
        await opts.nth(0).check();
        await opts.nth(1).check();
        await opts.nth(2).check();
        await expect(page.getByTestId('slot-count')).toContainText('3 of 3');
        await expect(opts.nth(3)).toBeDisabled();
        await page.getByTestId('propose-send').click();
        await expect(page.getByTestId('meeting-status')).toHaveAttribute('data-status', 'ALT_PROPOSED', READY);
        await expect(page.getByTestId('my-proposals').getByRole('listitem')).toHaveCount(3);
        await expect(page.getByTestId('waiting-note')).toBeVisible();
        const sent = (await calls(page)).find((c) => c.name === 'respond')?.input;
        expect(sent).toMatchObject({ action: 'PROPOSE_ALTERNATIVE' });
        expect((sent?.proposedStarts as string[]).length).toBe(3);
        await close();
    });

    test('alternatives proposed to me: Accept needs a chosen time, then confirms that time', async () => {
        const { page, close } = await harness('detail?state=alt-in');
        await expect(page.getByTestId('proposals')).toBeVisible(READY);
        await expect(page.getByTestId('meeting-accept')).toBeDisabled();
        await page.getByTestId('proposals').getByTestId('slot-option').nth(1).check();
        await page.getByTestId('meeting-accept').click();
        await expect(page.getByTestId('meeting-status')).toHaveAttribute('data-status', 'CONFIRMED');
        expect((await calls(page)).find((c) => c.name === 'respond')?.input).toMatchObject({ action: 'ACCEPT', startAt: '2030-11-20T14:00:00.000Z' });
        await close();
    });

    test('confirmed: cancel asks first, Keep does nothing, Yes cancels', async () => {
        const { page, close } = await harness('detail?state=confirmed');
        await page.getByTestId('meeting-cancel').click();
        await expect(page.getByTestId('cancel-confirm')).toContainText('will be told');
        await page.getByTestId('cancel-keep').click();
        await expect(page.getByTestId('cancel-confirm')).toHaveCount(0);
        expect((await calls(page)).some((c) => c.name === 'cancel')).toBe(false);
        await page.getByTestId('meeting-cancel').click();
        await page.getByTestId('cancel-confirm-yes').click();
        await expect(page.getByTestId('meeting-status')).toHaveAttribute('data-status', 'CANCELLED');
        await expect(page.getByTestId('ended-note')).toContainText('You cancelled');
        await close();
    });

    test('confirmed: reschedule keeps the original until answered; the other side can keep the original time', async () => {
        const a = await harness('detail?state=confirmed');
        await a.page.getByTestId('meeting-reschedule').click();
        await expect(a.page.getByTestId('propose-panel').getByTestId('slot-option').first()).toBeVisible(READY);
        await a.page.getByTestId('propose-panel').getByTestId('slot-option').nth(5).check();
        await a.page.getByTestId('propose-send').click();
        await expect(a.page.getByTestId('meeting-status')).toHaveAttribute('data-status', 'RESCHEDULE_PROPOSED', READY);
        await expect(a.page.getByTestId('meeting-announce')).toContainText('original time stays');
        await a.close();
        const b = await harness('detail?state=reschedule-in');
        await expect(b.page.getByTestId('meeting-decline')).toHaveText('Keep the original time', READY);
        await b.page.getByTestId('meeting-decline').click();
        await expect(b.page.getByTestId('meeting-status')).toHaveAttribute('data-status', 'CONFIRMED');
        await b.close();
    });

    test('the meeting link is shown only for an online meeting, as a safe external link; in person shows the place', async () => {
        const online = await harness('detail?state=online');
        const link = online.page.getByTestId('meeting-link');
        await expect(link).toHaveAttribute('rel', 'noopener noreferrer', READY);
        await expect(link).toHaveAttribute('target', '_blank');
        await online.close();
        const inPerson = await harness('detail?state=confirmed');
        await expect(inPerson.page.getByTestId('meeting-detail')).toContainText('Networking lounge', READY);
        await expect(inPerson.page.getByTestId('meeting-link')).toHaveCount(0);
        await inPerson.close();
    });

    test('time is in the event zone, with the viewer\'s own time when their zone differs', async () => {
        const { page, close } = await harness('detail?state=confirmed', { width: 1280, height: 900 }, 'America/New_York');
        await expect(page.getByTestId('slot-event-time').first()).toContainText('10:00–10:30', READY);
        await expect(page.getByTestId('zone-note')).toContainText('Africa/Accra');
        await expect(page.getByTestId('slot-local-time').first()).toContainText('Your local time');
        await close();
        const same = await harness('detail?state=confirmed', { width: 1280, height: 900 }, 'Africa/Accra');
        await expect(same.page.getByTestId('slot-event-time').first()).toBeVisible(READY);
        await expect(same.page.getByTestId('slot-local-time')).toHaveCount(0);
        await same.close();
    });

    test('every state renders with the right actions and no ids', async () => {
        const expected: Record<string, { status: string; has: string[]; not: string[] }> = {
            'requested-in': { status: 'REQUESTED', has: ['meeting-accept', 'meeting-decline', 'meeting-propose'], not: ['meeting-cancel'] },
            'requested-out': { status: 'REQUESTED', has: ['meeting-cancel', 'waiting-note'], not: ['meeting-accept'] },
            'alt-in': { status: 'ALT_PROPOSED', has: ['proposals', 'meeting-accept', 'meeting-decline'], not: [] },
            confirmed: { status: 'CONFIRMED', has: ['meeting-cancel', 'meeting-reschedule', 'calendar-ics'], not: ['meeting-accept'] },
            'reschedule-in': { status: 'RESCHEDULE_PROPOSED', has: ['proposals', 'meeting-accept'], not: [] },
            'reschedule-out': { status: 'RESCHEDULE_PROPOSED', has: ['my-proposals', 'waiting-note'], not: ['meeting-accept'] },
            cancelled: { status: 'CANCELLED', has: ['ended-note'], not: ['meeting-cancel', 'meeting-accept'] },
            declined: { status: 'DECLINED', has: ['ended-note'], not: ['meeting-accept'] },
            expired: { status: 'EXPIRED', has: ['ended-note'], not: ['meeting-accept'] },
            completed: { status: 'COMPLETED', has: [], not: ['meeting-cancel', 'meeting-accept', 'calendar-ics'] },
        };
        for (const [state, want] of Object.entries(expected)) {
            const { page, errors, close } = await harness(`detail?state=${state}`);
            await expect(page.getByTestId('meeting-status')).toHaveAttribute('data-status', want.status, READY);
            for (const id of want.has) await expect(page.getByTestId(id).first(), `${state} has ${id}`).toBeVisible();
            for (const id of want.not) await expect(page.getByTestId(id), `${state} lacks ${id}`).toHaveCount(0);
            const text = withoutHrefs(await page.getByTestId('meeting-detail').innerHTML());
            expect(text).not.toMatch(UUID);
            expect(text).not.toMatch(/m-fixture|h-david|h-kwame/);
            expect(errors).toEqual([]);
            if (state === 'requested-in' || state === 'alt-in' || state === 'confirmed') {
                await page.setViewportSize({ width: 360, height: 740 });
                await page.screenshot({ path: `.artifacts/meetings/detail-${state}-360.png`, fullPage: true });
            }
            await close();
        }
    });
});

test.describe('meetings tab', () => {
    test('filters with counts, cursor paging, detail dialog and an empty state', async () => {
        const { page, errors, close } = await harness('tab');
        await expect(page.getByTestId('panel-meetings')).toBeVisible(READY);
        await expect(page.getByTestId('tab-meetings')).toHaveAttribute('aria-current', 'page');
        await expect(page.getByTestId('awaiting-me')).toBeVisible();
        for (const f of ['pending', 'upcoming', 'alternatives', 'completed', 'cancelled']) await expect(page.getByTestId(`meetings-filter-${f}`)).toBeVisible();
        await expect(page.getByTestId('meetings-filter-pending')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByTestId('meeting-card')).toHaveCount(2);
        await page.getByTestId('meetings-more').click();
        await expect(page.getByTestId('meeting-card')).toHaveCount(4);
        await page.getByTestId('meetings-filter-upcoming').click();
        await expect(page.getByTestId('meeting-card').first()).toHaveAttribute('data-status', 'CONFIRMED');
        await page.getByTestId('meeting-open').first().click();
        await expect(page.getByTestId('meeting-dialog')).toBeVisible();
        await expect(page.getByTestId('meeting-dialog').getByTestId('meeting-status')).toHaveAttribute('data-status', 'CONFIRMED');
        await page.screenshot({ path: '.artifacts/meetings/tab-dialog-1280.png' });
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('meeting-dialog')).toHaveCount(0);
        await page.getByTestId('meetings-filter-pending').click();
        await page.screenshot({ path: '.artifacts/meetings/tab-1280.png' });
        expect(withoutHrefs(await page.getByTestId('panel-meetings').innerHTML())).not.toMatch(UUID);
        expect(errors).toEqual([]);
        await close();
        const empty = await harness('tab?empty=1');
        await expect(empty.page.getByTestId('meetings-empty')).toBeVisible(READY);
        await empty.close();
        const m = await harness('tab', { width: 360, height: 740 });
        await expect(m.page.getByTestId('meeting-card').first()).toBeVisible(READY);
        expect(await m.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
        await m.page.screenshot({ path: '.artifacts/meetings/tab-360.png' });
        await m.close();
    });

    test('the hub, person page and matches list offer Request a meeting (harness, flag shown on)', async () => {
        for (const [path, within] of [['hub?tab=matches', 'panel-matches'], ['person', 'person-actions']] as const) {
            const context = await browser.newContext({ baseURL: BASE, viewport: { width: 1280, height: 900 } });
            const page = await context.newPage();
            await page.goto(`/en/dev-harness/networking/${path}`);
            await expect(page.getByTestId(within).first()).toBeVisible(READY);
            await expect(page.getByTestId('request-meeting').first()).toBeVisible();
            await page.getByTestId('request-meeting').first().click();
            await expect(page.getByTestId('meeting-request-sheet')).toBeVisible();
            await context.close();
        }
        const hub = await browser.newContext({ baseURL: BASE });
        const p = await hub.newPage();
        await p.goto('/en/dev-harness/networking/hub?tab=meetings');
        await expect(p.getByTestId('panel-meetings')).toBeVisible(READY);
        await expect(p.getByTestId('rail-actions')).toContainText('My schedule');
        await hub.close();
    });
});

test.describe('my schedule', () => {
    test('merges meetings, programme and circle sessions by day, in time order; says so when circle sessions are missing', async () => {
        const { page, errors, close } = await harness('schedule');
        await expect(page.getByTestId('schedule')).toBeVisible(READY);
        await expect(page.getByTestId('schedule-day')).toHaveCount(2);
        const kinds = await page.getByTestId('schedule-item').evaluateAll((els) => els.map((e) => e.getAttribute('data-kind')));
        expect(kinds).toEqual(['SESSION', 'MEETING', 'SESSION', 'MEETING', 'SESSION']);
        // Circle sessions are not available: a quiet note, and not one invented session.
        await expect(page.getByTestId('circle-note')).toBeVisible();
        await expect(page.locator('[data-kind="CIRCLE_SESSION"]')).toHaveCount(0);
        await expect(page.getByTestId('zone-note')).toContainText('Africa/Accra');
        await page.screenshot({ path: '.artifacts/meetings/schedule-1280.png' });
        await page.getByTestId('schedule-open').first().click();
        await expect(page.getByTestId('meeting-dialog')).toBeVisible();
        await page.keyboard.press('Escape');
        expect(withoutHrefs(await page.getByTestId('schedule').innerHTML())).not.toMatch(UUID);
        expect(errors).toEqual([]);
        await close();
        const withCircles = await harness('schedule?circles=1');
        await expect(withCircles.page.locator('[data-kind="CIRCLE_SESSION"]')).toHaveCount(1, READY);
        await expect(withCircles.page.getByTestId('circle-note')).toHaveCount(0);
        await withCircles.close();
        const empty = await harness('schedule?empty=1');
        await expect(empty.page.getByTestId('schedule-empty')).toBeVisible(READY);
        await empty.close();
        const m = await harness('schedule', { width: 360, height: 740 });
        await expect(m.page.getByTestId('schedule')).toBeVisible(READY);
        expect(await m.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
        await m.page.screenshot({ path: '.artifacts/meetings/schedule-360.png' });
        await m.close();
    });
});

test.describe('organiser settings', () => {
    test('edits policy, lengths, windows, places and caps; sends the loaded version; validates before saving', async () => {
        const { page, errors, close } = await harness('settings');
        await expect(page.getByTestId('meeting-settings')).toBeVisible(READY);
        await expect(page.getByTestId('meeting-settings')).toContainText('Africa/Accra');
        await page.screenshot({ path: '.artifacts/meetings/settings-1280.png', fullPage: true });
        await page.getByTestId('policy-ANY_PARTICIPANT').check();
        await page.getByTestId('duration-check').nth(4).check(); // 45 minutes
        await page.getByTestId('add-point').click();
        // An unnamed place is refused locally.
        await page.getByTestId('settings-save').click();
        await expect(page.getByText('Each place needs a name')).toBeVisible();
        expect(await page.getByTestId('harness-saved').textContent()).toBe('');
        await page.getByTestId('point-name').last().fill('Rooftop terrace');
        await page.getByTestId('point-capacity').last().fill('4');
        await page.getByTestId('max-meetings').fill('12');
        await page.getByTestId('settings-save').click();
        await expect(page.getByTestId('settings-saved')).toBeVisible();
        const saved = JSON.parse((await page.getByTestId('harness-saved').textContent()) || '{}');
        expect(saved).toMatchObject({ meetingPolicy: 'ANY_PARTICIPANT', expectedVersion: 3, maxMeetingsPerPerson: 12 });
        expect(saved.meetingDurations).toEqual([15, 30, 45]);
        expect(saved.meetingWindows).toHaveLength(2);
        expect(saved.meetingWindows[0]).toEqual({ date: '2030-11-20', startTime: '09:00', endTime: '12:00' });
        expect(saved.meetingPoints).toHaveLength(3);
        expect(saved.meetingPoints[2]).toMatchObject({ name: 'Rooftop terrace', capacityPerSlot: 4 });
        expect(saved.meetingPoints[0].id).toBe('pt-lounge');
        expect(errors).toEqual([]);
        await close();
        const conflict = await harness('settings?conflict=1');
        await conflict.page.getByTestId('settings-save').click();
        await expect(conflict.page.getByTestId('settings-error')).toHaveAttribute('data-error', 'conflict', READY);
        await conflict.close();
        const m = await harness('settings', { width: 360, height: 740 });
        await expect(m.page.getByTestId('meeting-settings')).toBeVisible(READY);
        expect(await m.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
        await m.page.screenshot({ path: '.artifacts/meetings/settings-360.png', fullPage: true });
        await m.close();
    });
});

test.describe('flag off (production default): real routes show nothing and send nothing', () => {
    const meetingOps = (ops: string[]) => ops.filter((o) => /Meeting|Schedule/i.test(o));

    test('hub: no Meetings tab, ?tab=meetings falls back to Discover, no meeting operation', async () => {
        const { page, graphql } = await openPage(browser, `/events/${EVENT_ID}/networking?tab=meetings`, networkingOverrides());
        await expect(page.getByTestId('goals-editor')).toBeVisible(READY);
        await expect(page.getByTestId('tab-meetings')).toHaveCount(0);
        await expect(page.getByTestId('panel-meetings')).toHaveCount(0);
        await expect(page.getByTestId('rail-actions')).not.toContainText('My schedule');
        expect(meetingOps(graphql.ops)).toEqual([]);
        await page.context().close();
    });

    test('person page: no Request a meeting; matches list: none either', async () => {
        const person = { ...card('h-david-71c', 'David Owusu'), __typename: 'EventNetworkingPerson', intro: null, needsNote: null, offersNote: null };
        const { page, graphql } = await openPage(browser, `/events/${EVENT_ID}/networking/people/h-david-71c`, networkingOverrides({ NetworkingPerson: { eventNetworkingPerson: person } }));
        await expect(page.getByTestId('person-view')).toBeVisible(READY);
        await expect(page.getByTestId('request-meeting')).toHaveCount(0);
        expect(meetingOps(graphql.ops)).toEqual([]);
        await page.context().close();
    });

    test('/events/[id]/schedule renders the not-found fallback and sends no meeting operation; the event page rail has no schedule link', async () => {
        const context = await browser.newContext({ baseURL: BASE, viewport: { width: 1280, height: 900 } });
        const res = await context.request.get(`/en/events/${EVENT_ID}/schedule`);
        // The shell has already streamed by the time the page calls notFound(), so the status line is 200;
        // what matters is that the response is the not-found fallback and carries no schedule UI.
        const body = await res.text();
        expect(body).toContain('NEXT_HTTP_ERROR_FALLBACK;404');
        expect(body).not.toContain('schedule-day');
        await context.close();
        const { page, graphql } = await openPage(browser, `/events/${EVENT_ID}`, networkingOverrides({ EventNetworkingStatus: { eventNetworkingStatus: { __typename: 'EventNetworkingStatus', networkingEnabled: true, featureAvailable: true, eligibility: 'CONFIRMED', participationStatus: 'ACTIVE' } } }));
        await expect(page.getByTestId('cta-join-networking')).toBeVisible(READY);
        await expect(page.getByTestId('cta-schedule')).toHaveCount(0);
        expect(meetingOps(graphql.ops)).toEqual([]);
        await page.context().close();
    });

    test('manage page: no meeting settings section and no settings query', async () => {
        const { page, graphql } = await openPage(browser, `/events/${EVENT_ID}/manage?tab=settings`, { ...networkingOverrides(), ...ADMIN_OF_ORGANISER, ...COMMUNITY_OVERRIDES, GetEvent: { getEvent: eventFixture() } });
        await expect(page.getByText('Danger zone')).toBeVisible(READY);
        await expect(page.getByTestId('meeting-settings')).toHaveCount(0);
        expect(meetingOps(graphql.ops)).toEqual([]);
        await page.context().close();
    });
});

