/**
 * The redesigned event page (/events/[id]): tabs driven by ?tab=, content tabs
 * hidden for attendees when empty and shown (empty) to managers, the registration
 * state in plain words, the organiser card, share + QR, similar events.
 * GraphQL is the in-memory double from e2e/support/fakeSession.ts.
 */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import {
    ADMIN_OF_ORGANISER,
    EVENT_ID,
    MEMBER_ONLY,
    ORGANISER_NAME,
    SESSIONS,
    SPEAKERS,
    UPDATES,
    VENUE,
    eventFixture,
    eventPageOverrides,
    openPage,
    organiserFixture,
} from '../support/eventFixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const tabNames = async (page: import('@playwright/test').Page) =>
    (await page.getByRole('tab').allTextContents()).map((s) => s.trim());

test('an attendee sees only Overview and Register when nothing else is published', async () => {
    const { page } = await openPage(browser, `/events/${EVENT_ID}`, eventPageOverrides());
    await expect(page.getByRole('heading', { level: 1, name: 'Diaspora Business Summit' })).toBeVisible({ timeout: 90_000 });
    expect(await tabNames(page)).toEqual(['Overview', 'Register']);
    // The overview carries the facts, and the times are in the EVENT's timezone with its zone named.
    await expect(page.getByText('Berlin Congress Centre').first()).toBeVisible();
    await expect(page.getByText(/GMT\+1|CET/).first()).toBeVisible();
    await page.context().close();
});

test('content tabs appear when there is content, and ?tab= opens them', async () => {
    const overrides = eventPageOverrides(eventFixture(), {
        EventProgramme: { eventProgramme: SESSIONS },
        EventSpeakers: { eventSpeakers: SPEAKERS },
        EventUpdates: { eventUpdates: UPDATES },
        EventVenueInfo: { eventVenueInfo: VENUE },
    });
    const { page } = await openPage(browser, `/events/${EVENT_ID}?tab=programme`, overrides);
    await expect(page.getByTestId('programme-tab')).toBeVisible({ timeout: 90_000 });
    expect(await tabNames(page)).toEqual(['Overview', 'Programme', 'Speakers', 'Venue', 'Updates', 'Register']);
    await expect(page.getByRole('tab', { name: 'Programme' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Opening keynote')).toBeVisible();
    await expect(page.getByText('With Abena Owusu')).toBeVisible();

    await page.getByRole('tab', { name: 'Speakers' }).click();
    await expect(page).toHaveURL(/tab=speakers/);
    await expect(page.getByTestId('speakers-tab').getByText('Abena Owusu')).toBeVisible();
    await expect(page.getByRole('link', { name: 'View profile' })).toHaveAttribute('href', '/en/@abena');

    await page.getByRole('tab', { name: 'Venue' }).click();
    await expect(page.getByTestId('venue-tab').getByText('Step-free entrance.')).toBeVisible();
    await page.getByRole('tab', { name: 'Updates' }).click();
    await expect(page.getByTestId('updates-tab').getByText('Doors open at 8:30')).toBeVisible();

    // Arrow keys move between tabs.
    await page.getByRole('tab', { name: 'Updates' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Register' })).toHaveAttribute('aria-selected', 'true');
    await page.context().close();
});

test('a hidden tab in the URL falls back to Overview for an attendee', async () => {
    const { page } = await openPage(browser, `/events/${EVENT_ID}?tab=programme`, eventPageOverrides());
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true', { timeout: 90_000 });
    await page.context().close();
});

test('an organiser admin sees the empty content tabs, with a way to fill them', async () => {
    const { page } = await openPage(browser, `/events/${EVENT_ID}?tab=programme`, eventPageOverrides(eventFixture(), ADMIN_OF_ORGANISER));
    await expect(page.getByTestId('manager-empty')).toBeVisible({ timeout: 90_000 });
    expect(await tabNames(page)).toEqual(['Overview', 'Programme', 'Speakers', 'Venue', 'Updates', 'Register']);
    await expect(page.getByTestId('manager-empty').getByRole('link', { name: 'Manage event' })).toHaveAttribute('href', `/en/events/${EVENT_ID}/manage?tab=programme`);
    await expect(page.getByTestId('manage-link')).toBeVisible();
    await page.context().close();
});

test('an ordinary member of the organiser is not shown manager tabs', async () => {
    const { page } = await openPage(browser, `/events/${EVENT_ID}`, eventPageOverrides(eventFixture(), MEMBER_ONLY));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 90_000 });
    expect(await tabNames(page)).toEqual(['Overview', 'Register']);
    await expect(page.getByTestId('manage-link')).toHaveCount(0);
    await page.context().close();
});

const STATES: Array<{ name: string; over: Record<string, unknown>; state: string; text: RegExp; tab: string }> = [
    { name: 'open', over: {}, state: 'open', text: /Registration is open/, tab: 'Register' },
    { name: 'confirmed', over: { myRegistrationStatus: 'CONFIRMED', myRegistrationId: 'r1' }, state: 'confirmed', text: /You're registered/, tab: 'My event' },
    { name: 'pending approval', over: { myRegistrationStatus: 'PENDING_APPROVAL', requiresApproval: true }, state: 'pendingApproval', text: /Waiting for the organiser's approval/, tab: 'My event' },
    { name: 'waitlisted (no position invented)', over: { myRegistrationStatus: 'WAITLISTED' }, state: 'waitlisted', text: /^You're on the waitlist\.$/, tab: 'My event' },
    { name: 'rejected', over: { myRegistrationStatus: 'REJECTED' }, state: 'rejected', text: /did not approve your registration/, tab: 'Register' },
    { name: 'awaiting payment', over: { myRegistrationStatus: 'PENDING' }, state: 'awaitingPayment', text: /Complete payment to confirm/, tab: 'My event' },
    { name: 'full', over: { isFull: true, availableSpots: 0 }, state: 'full', text: /This event is full\. You can join the waitlist/, tab: 'Register' },
    { name: 'not yet open', over: { registrationOpensAt: '2030-01-01T10:00:00.000Z', phase: 'PUBLISHED' }, state: 'notYetOpen', text: /Registration opens /, tab: 'Register' },
    { name: 'closed', over: { registrationClosesAt: '2020-01-01T10:00:00.000Z', phase: 'REGISTRATION_CLOSED' }, state: 'closed', text: /Registration is closed/, tab: 'Register' },
    { name: 'cancelled event', over: { status: 'cancelled' }, state: 'eventCancelled', text: /This event was cancelled/, tab: 'Register' },
];
for (const c of STATES) {
    test(`registration state in words: ${c.name}`, async () => {
        const { page } = await openPage(browser, `/events/${EVENT_ID}`, eventPageOverrides(eventFixture(c.over)));
        const card = page.getByTestId('registration-card');
        await expect(card).toHaveAttribute('data-state', c.state, { timeout: 90_000 });
        await expect(card.getByTestId('registration-headline')).toHaveText(c.text);
        await expect(page.getByRole('tab').last()).toHaveText(c.tab);
        // No raw ids anywhere on the page.
        const body = await page.locator('body').innerText();
        expect(body).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        await page.context().close();
    });
}

test('the right rail: organiser card with the viewer standing, share + QR, similar events only when real', async () => {
    const similar = {
        SimilarEvents: {
            searchEvents: {
                __typename: 'EventListResponse',
                events: [
                    { __typename: 'EventGQL', id: 'e-2', title: 'Founders Brunch', startAt: '2030-12-01T10:00:00.000Z', endAt: '2030-12-01T12:00:00.000Z', eventCategory: 'Business', status: 'published', visibility: 'public', locationType: 'virtual', locationDetails: null, coverImageUrl: null, registrationCount: 3 },
                    { __typename: 'EventGQL', id: 'e-3', title: 'Football Night', startAt: '2030-12-02T10:00:00.000Z', endAt: '2030-12-02T12:00:00.000Z', eventCategory: 'Sports', status: 'published', visibility: 'public', locationType: 'virtual', locationDetails: null, coverImageUrl: null, registrationCount: 3 },
                    { __typename: 'EventGQL', id: 'e-4', title: 'Past Summit', startAt: '2020-12-02T10:00:00.000Z', endAt: '2020-12-02T12:00:00.000Z', eventCategory: 'Business', status: 'published', visibility: 'public', locationType: 'virtual', locationDetails: null, coverImageUrl: null, registrationCount: 3 },
                ],
            },
        },
    };
    const { page } = await openPage(browser, `/events/${EVENT_ID}`, eventPageOverrides(eventFixture(), similar));
    const organiser = page.getByTestId('organiser-card');
    await expect(organiser).toContainText(ORGANISER_NAME, { timeout: 90_000 });
    await expect(organiser.getByRole('button', { name: `Join ${ORGANISER_NAME}` })).toBeVisible();
    await expect(page.getByTestId('event-qr')).toBeVisible();
    // Only the future, same-category, other event is listed.
    const list = page.getByTestId('similar-events');
    await expect(list.getByText('Founders Brunch')).toBeVisible();
    await expect(list.getByText('Football Night')).toHaveCount(0);
    await expect(list.getByText('Past Summit')).toHaveCount(0);
    await page.context().close();

    const none = await openPage(browser, `/events/${EVENT_ID}`, eventPageOverrides());
    await expect(none.page.getByTestId('share-card')).toBeVisible({ timeout: 90_000 });
    await expect(none.page.getByTestId('similar-events')).toHaveCount(0);
    await none.page.context().close();
});

test('organiser standing: member, pending, paid and invite-only never offer a Join button', async () => {
    const cases: Array<[Record<string, unknown>, RegExp]> = [
        [{ membershipStatus: 'ACTIVE' }, /You're a member of/],
        [{ membershipStatus: 'PENDING' }, /Your request to join .* is waiting/],
        [{ paymentType: 'ONE_TIME', priceAmount: 500, priceCurrency: 'GHS' }, /is a paid community/],
        [{ joinPolicy: 'INVITE_ONLY' }, /is invitation only/],
    ];
    for (const [over, text] of cases) {
        const { page } = await openPage(browser, `/events/${EVENT_ID}`, eventPageOverrides(eventFixture(), { GetEventOrganiserCommunity: { getCommunity: organiserFixture(over) } }));
        const card = page.getByTestId('organiser-card');
        await expect(card).toContainText(text, { timeout: 90_000 });
        await expect(card.getByRole('button')).toHaveCount(0);
        await page.context().close();
    }
});

test('a legacy user-owned event has no organiser card', async () => {
    const { page } = await openPage(browser, `/events/${EVENT_ID}`, eventPageOverrides(eventFixture({ ownerType: 'user' })));
    await expect(page.getByTestId('share-card')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('organiser-card')).toHaveCount(0);
    await page.context().close();
});

test('no sideways scroll at 360px, with the primary action reachable at the top', async () => {
    const { page } = await openPage(browser, `/events/${EVENT_ID}`, eventPageOverrides(), { width: 360, height: 740 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 90_000 });
    const size = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    expect(size.sw).toBeLessThanOrEqual(size.iw);
    await expect(page.getByRole('button', { name: 'Register' }).first()).toBeVisible();
    await page.context().close();
});
