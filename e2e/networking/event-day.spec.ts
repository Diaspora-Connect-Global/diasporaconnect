/**
 * Event networking M7, event day: the card inside a confirmed meeting, against the dev-harness
 * page (fixture backend, a clock set per state) and, for the flag-off checks, the in-memory
 * GraphQL double on the REAL routes.
 *
 * The event-day gateway is not deployed and EVENT_DAY_UI_ENABLED is false, so the real routes
 * must show nothing of it and send no event-day operation.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { EVENT_ID, openPage } from '../support/eventFixtures';
import { networkingOverrides, UUID } from '../support/networkingFixtures';
import { EVENT_DAY_LEAD_MS, EVENT_DAY_TAIL_MS, eventDayPhase, formatCountdown, mapsAddressUrl, mapsPointUrl, remainingMs, showsEventDayCard } from '../../src/lib/eventDay';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const BASE = process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_PORT ?? 3111}`;
const H = '/en/dev-harness/networking/event-day';
const READY = { timeout: 90_000 };
const withoutHrefs = (html: string) => html.replace(/href="[^"]*"/g, '');

async function harness(query = '', viewport = { width: 1280, height: 900 }): Promise<{ page: Page; errors: string[]; close: () => Promise<void> }> {
    const context = await browser.newContext({ baseURL: BASE, viewport, locale: 'en-GB' });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${H}${query}`);
    await expect(page.getByTestId('harness-banner')).toBeVisible(READY);
    await expect(page.getByTestId('meeting-detail')).toBeVisible(READY);
    return { page, errors, close: () => context.close() };
}

const calls = async (page: Page): Promise<Array<{ name: string; input: Record<string, unknown> }>> => JSON.parse((await page.getByTestId('harness-calls').textContent()) || '[]');
const names = async (page: Page) => (await calls(page)).map((c) => c.name);

async function shareWithConsent(page: Page) {
    await page.getByTestId('eventday-share').click();
    await expect(page.getByTestId('share-consent')).toBeVisible();
    await page.getByTestId('share-consent-confirm').click();
}

test.describe('window logic (pure helper)', () => {
    const slot = { startAt: '2030-11-20T10:00:00.000Z', endAt: '2030-11-20T10:30:00.000Z' };
    const start = Date.parse(slot.startAt);
    const end = Date.parse(slot.endAt);

    test('opens 30 minutes before the start and closes 15 minutes after the end, both edges inclusive', () => {
        expect(eventDayPhase(slot, start - EVENT_DAY_LEAD_MS - 1)).toBe('before');
        expect(eventDayPhase(slot, start - EVENT_DAY_LEAD_MS)).toBe('open');
        expect(eventDayPhase(slot, start + 60_000)).toBe('open');
        expect(eventDayPhase(slot, end + EVENT_DAY_TAIL_MS)).toBe('open');
        expect(eventDayPhase(slot, end + EVENT_DAY_TAIL_MS + 1)).toBe('after');
        expect(eventDayPhase(null, start)).toBe('unknown');
        expect(eventDayPhase({ startAt: 'nope', endAt: 'nope' }, start)).toBe('unknown');
    });

    test('only a CONFIRMED meeting inside the window shows the card', () => {
        const inside = start - 5 * 60_000;
        expect(showsEventDayCard({ status: 'CONFIRMED', slot }, inside)).toBe(true);
        for (const status of ['REQUESTED', 'ALT_PROPOSED', 'RESCHEDULE_PROPOSED', 'DECLINED', 'CANCELLED', 'EXPIRED', 'COMPLETED']) {
            expect(showsEventDayCard({ status, slot }, inside), status).toBe(false);
        }
        expect(showsEventDayCard({ status: 'CONFIRMED', slot }, start - 2 * 3_600_000)).toBe(false);
    });

    test('countdown, remaining time and map links', () => {
        expect(formatCountdown(15 * 60_000)).toBe('15:00');
        expect(formatCountdown(61_000)).toBe('1:01');
        expect(formatCountdown(500)).toBe('0:01');
        expect(formatCountdown(-5)).toBe('0:00');
        expect(remainingMs('2030-01-01T00:10:00.000Z', Date.parse('2030-01-01T00:00:00.000Z'))).toBe(600_000);
        expect(remainingMs(null, 0)).toBe(0);
        expect(mapsPointUrl(5.6051, -0.1869)).toBe('https://www.google.com/maps/search/?api=1&query=5.605100,-0.186900');
        expect(mapsPointUrl(95, 0)).toBeNull();
        expect(mapsAddressUrl('Hall A')).toBeNull();
        expect(mapsAddressUrl('  ')).toBeNull();
        expect(mapsAddressUrl('Accra Conference Centre, Accra')).toContain('Accra%20Conference%20Centre');
    });
});

test.describe('card visibility by time and format', () => {
    test('before the window and after it: no card at all', async () => {
        for (const state of ['before', 'after']) {
            const { page, errors, close } = await harness(`?state=${state}`);
            await expect(page.getByTestId('meeting-status')).toHaveAttribute('data-status', 'CONFIRMED');
            await expect(page.getByTestId('eventday-card'), state).toHaveCount(0);
            expect(await names(page)).toEqual([]);
            expect(errors).toEqual([]);
            await close();
        }
    });

    test('inside the window an in-person meeting shows where to meet and every action', async () => {
        const { page, errors, close } = await harness('?state=window');
        const card = page.getByTestId('eventday-card');
        await expect(card).toBeVisible(READY);
        await expect(card).toHaveAttribute('data-mode', 'in-person');
        await expect(page.getByTestId('eventday-place')).toContainText('Networking lounge');
        await expect(page.getByTestId('eventday-place')).toContainText('Ground floor, next to registration');
        for (const id of ['eventday-profile', 'eventday-message', 'eventday-arrived', 'eventday-cant-find', 'eventday-share', 'eventday-venue-map']) {
            await expect(page.getByTestId(id), id).toBeVisible();
        }
        // The venue link is a real address only; the profile link goes to the networking person page.
        await expect(page.getByTestId('eventday-venue-map')).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=Accra/);
        await expect(page.getByTestId('eventday-venue-map')).toHaveAttribute('rel', /noopener/);
        expect(errors).toEqual([]);
        await close();
    });

    test('online meeting: the join link only, no arrival and no location', async () => {
        const { page, close } = await harness('?state=online');
        await expect(page.getByTestId('eventday-card')).toHaveAttribute('data-mode', 'online', READY);
        await expect(page.getByTestId('eventday-join')).toHaveAttribute('href', 'https://meet.example.org/room/summit-check');
        for (const id of ['eventday-arrived', 'eventday-cant-find', 'eventday-share', 'eventday-place']) {
            await expect(page.getByTestId(id), id).toHaveCount(0);
        }
        expect(await names(page)).toEqual([]);
        await close();
    });
});

test.describe('arrival', () => {
    test('"I\'ve arrived" records it, shows the time and goes away', async () => {
        const { page, close } = await harness('?state=window');
        await page.getByTestId('eventday-arrived').click(READY);
        await expect(page.getByTestId('eventday-my-arrival')).toContainText('You arrived at', READY);
        await expect(page.getByTestId('eventday-arrived')).toHaveCount(0);
        expect(await names(page)).toContain('arrived');
        await close();
    });

    test('arrived and other-arrived states show who is already there', async () => {
        const a = await harness('?state=arrived');
        await expect(a.page.getByTestId('eventday-my-arrival')).toBeVisible(READY);
        await expect(a.page.getByTestId('eventday-their-arrival')).toHaveCount(0);
        await a.close();
        const b = await harness('?state=other-arrived');
        await expect(b.page.getByTestId('eventday-my-arrival')).toBeVisible(READY);
        await expect(b.page.getByTestId('eventday-their-arrival')).toContainText('David Owusu arrived at');
        await b.close();
    });
});

test.describe('"I can\'t find you"', () => {
    test('neutral confirmation, then a cool-down that lifts', async () => {
        const { page, close } = await harness('?state=window&cooldown=4');
        const btn = page.getByTestId('eventday-cant-find');
        await expect(page.getByTestId('eventday-cant-find-hint')).not.toContainText('again in');
        await btn.click(READY);
        await expect(btn).toBeDisabled();
        await expect(page.getByTestId('eventday-cant-find-hint')).toContainText('You can ask again in');
        await expect(page.getByTestId('eventday-announce')).toContainText('We let David Owusu know you are looking for them');
        expect(await names(page)).toEqual(['cantFind']);
        // Nobody is blamed: no alarm wording on the card.
        await expect(page.getByTestId('eventday-card')).not.toContainText(/late|missing|no-show|failed to/i);
        await expect(btn).toBeEnabled({ timeout: 15_000 });
        await close();
    });

    test('when the other person is looking for you, a calm notice offers the two ways forward', async () => {
        const { page, close } = await harness('?state=they-cant-find');
        await expect(page.getByTestId('eventday-cant-find-notice')).toContainText('is looking for you', READY);
        await expect(page.getByTestId('eventday-cant-find-notice')).toContainText('share your location');
        await close();
    });
});

test.describe('share my location', () => {
    test('nothing asks for a location before consent; consent says what, who and how long', async () => {
        const { page, errors, close } = await harness('?state=window');
        await expect(page.getByTestId('eventday-card')).toBeVisible(READY);
        expect(await names(page)).toEqual([]);
        await page.getByTestId('eventday-share').click();
        const dialog = page.getByTestId('share-consent');
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText('15 minutes');
        await expect(dialog).toContainText('Only David Owusu');
        await expect(dialog).toContainText('Organisers and other attendees cannot see it');
        await expect(dialog).toContainText('not live tracking');
        await expect(dialog).toContainText('stop sharing at any time');
        // "Not now" is the focused default: a stray Enter cannot share.
        await expect(page.getByTestId('share-consent-cancel')).toBeFocused();
        expect(await names(page)).toEqual([]);
        await page.getByTestId('share-consent-cancel').click();
        await expect(dialog).toHaveCount(0);
        expect(await names(page)).toEqual([]);
        expect(errors).toEqual([]);
        await close();
    });

    test('consent then locate then share; a visible countdown from 15:00; Stop ends it at once', async () => {
        const { page, close } = await harness('?state=window');
        await shareWithConsent(page);
        await expect(page.getByTestId('eventday-sharing')).toBeVisible(READY);
        expect(await names(page)).toEqual(['locate', 'share']);
        const shared = (await calls(page)).find((c) => c.name === 'share');
        expect(shared?.input).toMatchObject({ accuracyMeters: 18 });
        await expect(page.getByTestId('share-countdown')).toHaveText(/^(15:00|14:5\d)$/);
        // The timer is silent; one polite sentence per minute carries it to screen readers.
        await expect(page.getByTestId('share-countdown')).toHaveAttribute('aria-live', 'off');
        await expect(page.getByTestId('share-spoken')).toHaveAttribute('aria-live', 'polite');
        await expect(page.getByTestId('share-spoken')).toContainText('Sharing your location for about 15 more minutes');
        await page.getByTestId('eventday-stop').click();
        await expect(page.getByTestId('eventday-sharing')).toHaveCount(0);
        await expect(page.getByTestId('eventday-share')).toBeVisible();
        expect(await names(page)).toEqual(['locate', 'share', 'stop']);
        await expect(page.getByTestId('eventday-announce')).toContainText('You stopped sharing');
        // Sharing again asks again.
        await page.getByTestId('eventday-share').click();
        await expect(page.getByTestId('share-consent')).toBeVisible();
        expect(await names(page)).toEqual(['locate', 'share', 'stop']);
        await close();
    });

    test('the share ends by itself at expiry', async () => {
        const { page, close } = await harness('?state=window&ttl=4');
        await shareWithConsent(page);
        await expect(page.getByTestId('eventday-sharing')).toBeVisible(READY);
        await expect(page.getByTestId('eventday-sharing')).toHaveCount(0, { timeout: 15_000 });
        await expect(page.getByTestId('eventday-announce')).toContainText('Your location sharing ended');
        expect(await names(page)).toEqual(['locate', 'share', 'stop']);
        await close();
    });

    test('leaving the card while sharing stops the share', async () => {
        const { page, close } = await harness('?state=sharing');
        await expect(page.getByTestId('eventday-sharing')).toBeVisible(READY);
        expect(await names(page)).toEqual([]);
        await page.getByTestId('harness-unmount').click();
        await expect(page.getByTestId('meeting-detail')).toHaveCount(0);
        await expect.poll(() => names(page)).toEqual(['stop']);
        await close();
    });

    test('the other person\'s pin is only a link to Maps, and the card never prints coordinates', async () => {
        const { page, close } = await harness('?state=other-sharing');
        const pin = page.getByTestId('eventday-their-pin');
        await expect(pin).toBeVisible(READY);
        await expect(pin).toContainText('David Owusu is sharing a location pin with you');
        const link = page.getByTestId('eventday-open-pin');
        await expect(link).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=5.605100,-0.186900');
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', /noopener/);
        const text = await page.getByTestId('eventday-card').innerText();
        expect(text).not.toMatch(/5\.60|0\.18/);
        await close();
    });

    test('geolocation denied: a clear message, no retry button, and nothing is sent', async () => {
        const { page, close } = await harness('?state=geo-denied');
        await shareWithConsent(page);
        const err = page.getByTestId('eventday-geo-error');
        await expect(err).toHaveAttribute('data-reason', 'denied', READY);
        await expect(err).toContainText('Location access is blocked');
        await expect(page.getByTestId('eventday-geo-retry')).toHaveCount(0);
        expect(await names(page)).toEqual(['locate']);
        await expect(page.getByTestId('eventday-sharing')).toHaveCount(0);
        await close();
    });

    test('geolocation unavailable and timed out: a retry that goes back through consent', async () => {
        for (const [state, reason, text] of [['geo-unavailable', 'unavailable', "couldn't work out your location"], ['geo-timeout', 'timeout', 'took too long']] as const) {
            const { page, close } = await harness(`?state=${state}`);
            await shareWithConsent(page);
            await expect(page.getByTestId('eventday-geo-error')).toHaveAttribute('data-reason', reason, READY);
            await expect(page.getByTestId('eventday-geo-error')).toContainText(text);
            await page.getByTestId('eventday-geo-retry').click();
            await expect(page.getByTestId('share-consent')).toBeVisible();
            expect(await names(page)).toEqual(['locate']);
            await close();
        }
    });
});

test.describe('quality', () => {
    test('every state: no ids on screen, no console errors, no horizontal scroll at 360px', async () => {
        for (const state of ['window', 'arrived', 'other-arrived', 'sharing', 'other-sharing', 'they-cant-find', 'online', 'geo-denied']) {
            const { page, errors, close } = await harness(`?state=${state}`, { width: 360, height: 740 });
            await expect(page.getByTestId('eventday-card'), state).toBeVisible(READY);
            const text = withoutHrefs(await page.getByTestId('meeting-detail').innerHTML());
            expect(text, state).not.toMatch(UUID);
            expect(text, state).not.toMatch(/m-fixture|h-david|org-fixture/);
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
            expect(overflow, state).toBeLessThanOrEqual(1);
            expect(errors, state).toEqual([]);
            if (state === 'window' || state === 'sharing') await page.screenshot({ path: `.artifacts/event-day/${state}-360.png`, fullPage: true });
            await close();
        }
    });

    test('buttons are at least 24px tall and keyboard reachable', async () => {
        const { page, close } = await harness('?state=window');
        for (const id of ['eventday-profile', 'eventday-message', 'eventday-arrived', 'eventday-cant-find', 'eventday-share']) {
            const box = await page.getByTestId(id).boundingBox();
            expect(box?.height ?? 0, id).toBeGreaterThanOrEqual(24);
        }
        await page.getByTestId('eventday-arrived').focus();
        await expect(page.getByTestId('eventday-arrived')).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(page.getByTestId('eventday-cant-find')).toBeFocused();
        await close();
    });
});

test.describe('flag off (production default): real routes show nothing and send nothing', () => {
    const m7Ops = (ops: string[]) => ops.filter((o) => /EventDay|Arrived|CantFind|ShareLocation|StopSharing|Feedback|Recap/i.test(o));

    test('hub: no Recap tab, ?tab=recap falls back to Discover, no M7 operation', async () => {
        const { page, graphql } = await openPage(browser, `/events/${EVENT_ID}/networking?tab=recap`, networkingOverrides());
        await expect(page.getByTestId('goals-editor')).toBeVisible(READY);
        await expect(page.getByTestId('tab-recap')).toHaveCount(0);
        await expect(page.getByTestId('recap')).toHaveCount(0);
        expect(m7Ops(graphql.ops)).toEqual([]);
        await page.context().close();
    });

    test('person page and the hub send no event-day or feedback operation', async () => {
        const { page, graphql } = await openPage(browser, `/events/${EVENT_ID}/networking`, networkingOverrides());
        await expect(page.getByTestId('goals-editor')).toBeVisible(READY);
        await expect(page.getByTestId('eventday-card')).toHaveCount(0);
        await expect(page.getByTestId('feedback-entry')).toHaveCount(0);
        expect(m7Ops(graphql.ops)).toEqual([]);
        await page.context().close();
    });
});
