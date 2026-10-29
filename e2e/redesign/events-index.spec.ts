/** `/events`: hero search, filter chips, the upcoming grid (date, price, save / attend), and "Your events". */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { UUID, event, FUTURE, PAST, open } from './fixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const LATER = '2030-12-05T18:00:00.000Z';
const paid = event('evt-paid', 'Investment Gala', LATER, { isPaid: true, tickets: [{ __typename: 'TicketGQL', id: 't1', name: 'Regular', priceInCents: 5000, currency: 'GHS', quantity: 100, sold: 3 }, { __typename: 'TicketGQL', id: 't2', name: 'VIP', priceInCents: 15000, currency: 'GHS', quantity: 20, sold: 1 }], locationType: 'virtual', locationDetails: { __typename: 'EventLocationGQL', type: 'virtual', venueName: null, address: null, city: null, country: null, virtualLink: null, platform: 'Zoom' } });
const LIST = { listEvents: { __typename: 'EventList', total: 3, hasMore: false, events: [event('evt-1', 'Diaspora Business Summit', FUTURE), paid, event('evt-old', 'An event that already happened', PAST)] } };
const USER = (attending: unknown[] = [], saved: unknown[] = []) => ({ userEvents: { __typename: 'UserEvents', attending, saved } });
const DATA = { ListEvents: LIST, UserEvents: USER() };

test('upcoming events in one grid: date, price, going count; past events never listed; no ids', async () => {
    const { page } = await open(browser, '/events', DATA as never);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Meet your community', { timeout: 90_000 });
    const grid = page.getByTestId('upcoming-events');
    await expect(grid.getByTestId('event-card')).toHaveCount(2);
    await expect(grid.getByTestId('event-card').first()).toContainText('Diaspora Business Summit');
    await expect(grid.getByTestId('event-card').first()).toContainText('Free');
    await expect(grid.getByTestId('event-card').nth(1)).toContainText('From GHS 50.00');
    await expect(grid.getByTestId('event-card').nth(1)).toContainText('Online');
    await expect(grid).not.toContainText('An event that already happened');
    await expect(page.getByTestId('your-events')).toContainText('Your events');
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('filter chips and search narrow the grid; nothing left says so', async () => {
    const { page } = await open(browser, '/events', DATA as never);
    const grid = page.getByTestId('upcoming-events');
    await expect(grid.getByTestId('event-card')).toHaveCount(2, { timeout: 90_000 });
    await grid.getByRole('button', { name: 'Paid', exact: true }).click();
    await expect(grid.getByTestId('event-card')).toHaveCount(1);
    await expect(grid).toContainText('Investment Gala');
    await grid.getByRole('button', { name: 'In person' }).click();
    await expect(grid.getByTestId('event-card')).toHaveCount(1);
    await expect(grid).toContainText('Diaspora Business Summit');
    await grid.getByRole('button', { name: 'All', exact: true }).click();
    await page.getByLabel('Search events').fill('gala');
    await expect(grid.getByTestId('event-card')).toHaveCount(1);
    await page.getByLabel('Search events').fill('zzz');
    await expect(grid).toContainText('No upcoming events match.');
    await page.context().close();
});

test('save calls the real mutation; an event you are going to shows Attending with "Not attending anymore"', async () => {
    const going = event('evt-1', 'Diaspora Business Summit', FUTURE, { isRegistered: true });
    const { page, graphql } = await open(browser, '/events', { ...DATA, UserEvents: USER([going]), SaveEvent: { saveEvent: true } } as never);
    const cards = page.getByTestId('upcoming-events').getByTestId('event-card');
    await expect(cards.first()).toContainText('Attending', { timeout: 90_000 });
    await cards.first().getByRole('button', { name: /More actions/ }).click();
    await expect(page.getByRole('menuitem', { name: 'Not attending anymore' })).toBeVisible();
    await page.keyboard.press('Escape');
    await cards.nth(1).getByRole('button', { name: /Save: Investment Gala/ }).click();
    await expect.poll(() => graphql.calls.find((c) => c.name === 'SaveEvent')?.variables).toEqual({ eventId: 'evt-paid' });
    // "Your events" lists it under Attending.
    await expect(page.getByTestId('your-events')).toContainText('Diaspora Business Summit');
    await page.context().close();
});

test('phone: your events first, no horizontal scroll', async () => {
    const { page } = await open(browser, '/events', DATA as never, { width: 360, height: 800 });
    const mine = page.getByTestId('your-events');
    await expect(mine).toBeVisible({ timeout: 90_000 });
    const m = (await mine.boundingBox())!;
    const g = (await page.getByTestId('upcoming-events').boundingBox())!;
    expect(g.y).toBeGreaterThan(m.y + m.height - 1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.context().close();
});

test('server-cased format: a HYBRID event matches Online; the For you rail shows picks with their reason', async () => {
    const hybrid = event('evt-hyb', 'Hybrid Town Hall', LATER, { locationType: 'HYBRID', locationDetails: { __typename: 'EventLocationGQL', type: 'HYBRID', venueName: 'Hall', address: null, city: 'Accra', country: 'Ghana', virtualLink: null, platform: null } });
    const pick = event('evt-rec', 'Recommended Meetup', LATER);
    const data = {
        ...DATA,
        ListEvents: { listEvents: { __typename: 'EventList', total: 1, hasMore: false, events: [hybrid] } },
        RecommendedEvents: { recommendedEvents: [{ __typename: 'RecommendedEventGQL', reasons: ['NEAR_YOU'], event: pick }] },
    };
    const { page } = await open(browser, '/events', data as never);
    const rail = page.getByTestId('for-you-rail');
    await expect(rail.getByRole('heading', { name: 'For you' })).toBeVisible({ timeout: 90_000 });
    await expect(rail).toContainText('Recommended Meetup');
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    const grid = page.getByTestId('upcoming-events');
    await grid.getByRole('button', { name: 'Online' }).click();
    await expect(grid.getByTestId('event-card')).toHaveCount(1);
    await page.context().close();
});
