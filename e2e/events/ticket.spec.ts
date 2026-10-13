/** The ticket page: ticket card with the check-in code, details, receipt, calendar links; nothing before confirmation. */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { EVENT_ID, eventFixture, eventPageOverrides, openPage } from '../support/eventFixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const FREE_TICKET = [{ __typename: 'EventTicket', id: 't1', name: '', priceInCents: 0, currency: null, description: null, availableQuantity: 50 }];

test('a confirmed registration shows the ticket: code, holder, when, where, receipt and calendar links', async () => {
    const { page } = await openPage(browser, `/events/${EVENT_ID}/ticket`, eventPageOverrides(eventFixture({ myRegistrationStatus: 'CONFIRMED', myRegistrationId: 'reg-1', tickets: FREE_TICKET })));
    const ticket = page.getByTestId('ticket');
    await expect(ticket).toBeVisible({ timeout: 90_000 });
    await expect(ticket.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(ticket.getByRole('img', { name: 'Check-in code for this ticket' })).toBeVisible();
    for (const label of ['Ticket holder', 'Date & time', 'Location', 'Ticket', 'Receipt', 'Total paid']) await expect(ticket).toContainText(label);
    await expect(ticket).toContainText('Free admission');
    await expect(page.getByTestId('ticket-status')).toContainText('Confirmed');
    await expect(ticket.getByRole('link', { name: 'Add to Google Calendar' })).toHaveAttribute('href', /calendar\.google\.com/);
    await expect(page.getByRole('button', { name: 'Download ticket' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to the event' })).toHaveAttribute('href', `/en/events/${EVENT_ID}`);
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('before confirmation there is no ticket, only the way back to registration', async () => {
    const { page } = await openPage(browser, `/events/${EVENT_ID}/ticket`, eventPageOverrides(eventFixture({ myRegistrationStatus: 'PENDING_APPROVAL', myRegistrationId: 'reg-1', tickets: FREE_TICKET })));
    await expect(page.getByTestId('ticket-unavailable')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('ticket')).toHaveCount(0);
    await page.context().close();
});

test('phone: no horizontal scroll', async () => {
    const { page } = await openPage(browser, `/events/${EVENT_ID}/ticket`, eventPageOverrides(eventFixture({ myRegistrationStatus: 'CONFIRMED', myRegistrationId: 'reg-1', tickets: FREE_TICKET })), { width: 360, height: 800 });
    await expect(page.getByTestId('ticket')).toBeVisible({ timeout: 90_000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.context().close();
});
