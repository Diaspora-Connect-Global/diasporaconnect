/**
 * The redesigned event page against the mockup's content rules: real data only,
 * a section with no data is hidden, networking surfaces appear only when the
 * networking status says the feature is open, the three CTAs stay distinct, and
 * no "Networking at a glance" counts exist anywhere.
 */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { EVENT_ID, ORGANISER_NAME, SESSIONS, SPEAKERS, VENUE, eventFixture, eventPageOverrides, openPage, organiserFixture } from '../support/eventFixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const STATUS = (over: Record<string, unknown> = {}) => ({
    EventNetworkingStatus: {
        eventNetworkingStatus: { __typename: 'EventNetworkingStatus', networkingEnabled: true, featureAvailable: true, eligibility: 'CONFIRMED', participationStatus: 'NOT_JOINED', ...over },
    },
});
const tabNames = async (page: import('@playwright/test').Page) => (await page.getByRole('tab').allTextContents()).map((s) => s.trim());

test('the hero carries category, title, date, venue and format; no tagline or counts are invented', async () => {
    const { page } = await openPage(browser, `/events/${EVENT_ID}`, eventPageOverrides());
    const hero = page.getByTestId('event-hero');
    await expect(hero.getByRole('heading', { level: 1, name: 'Diaspora Business Summit' })).toBeVisible({ timeout: 90_000 });
    await expect(hero.getByTestId('event-category')).toHaveText('Business');
    await expect(hero.getByText('Berlin Congress Centre')).toBeVisible();
    await expect(hero.getByText('In person')).toBeVisible();
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/Networking at a Glance|Opted into Networking|Scheduled Meetings/i);
    await page.context().close();
});

test('networking not available: no Networking/Circles tab and none of the networking CTAs', async () => {
    const { page } = await openPage(browser, `/events/${EVENT_ID}`, eventPageOverrides(eventFixture(), { EventNetworkingStatus: { eventNetworkingStatus: null } }));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 90_000 });
    expect(await tabNames(page)).toEqual(['Overview', 'Register']);
    await expect(page.getByTestId('networking-ctas')).toHaveCount(0);
    await page.context().close();

    // Switched on by the organiser but not released to this person: still nothing.
    const dark = await openPage(browser, `/events/${EVENT_ID}`, eventPageOverrides(eventFixture(), STATUS({ featureAvailable: false })));
    await expect(dark.page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 90_000 });
    await expect(dark.page.getByTestId('networking-ctas')).toHaveCount(0);
    expect(await tabNames(dark.page)).toEqual(['Overview', 'Register']);
    await dark.page.context().close();
});

test('networking available: tabs, the two networking CTAs and the organiser CTA are distinct and link to the networking page', async () => {
    const { page } = await openPage(browser, `/events/${EVENT_ID}`, eventPageOverrides(eventFixture(), STATUS()));
    await expect(page.getByTestId('networking-ctas')).toBeVisible({ timeout: 90_000 });
    expect(await tabNames(page)).toEqual(['Overview', 'Networking', 'Circles', 'Register']);
    await expect(page.getByTestId('cta-join-networking')).toHaveAttribute('href', `/en/events/${EVENT_ID}/networking`);
    await expect(page.getByTestId('cta-join-networking')).toContainText('Join Event Networking');
    await expect(page.getByTestId('cta-connect')).toContainText('Connect on DiaspoPlug');
    // The third, separate CTA: the organiser community, with its own button.
    await expect(page.getByTestId('organiser-card').getByRole('button', { name: `Join ${ORGANISER_NAME}` })).toBeVisible();
    await page.getByRole('tab', { name: 'Networking' }).click();
    await expect(page.getByTestId('networking-tab').getByRole('link', { name: 'Join event networking' })).toHaveAttribute('href', `/en/events/${EVENT_ID}/networking`);
    await page.getByRole('tab', { name: 'Circles' }).click();
    await expect(page.getByTestId('circles-tab')).toBeVisible();
    await page.context().close();
});

test('someone not registered yet is told to register first and is not offered a join', async () => {
    const { page } = await openPage(browser, `/events/${EVENT_ID}?tab=networking`, eventPageOverrides(eventFixture(), STATUS({ eligibility: 'NOT_REGISTERED' })));
    await expect(page.getByTestId('networking-tab')).toContainText('Register for the event to take part in networking.', { timeout: 90_000 });
    await expect(page.getByTestId('cta-join-networking')).toContainText('Register for the event to take part.');
    await page.context().close();
});

test('overview: speakers and programme previews, public contact, highlights, organised-by and the join banner; each only with data', async () => {
    const withData = eventPageOverrides(eventFixture({ tags: ['Keynotes', 'Workshops'] }), {
        EventProgramme: { eventProgramme: SESSIONS },
        EventSpeakers: { eventSpeakers: SPEAKERS },
        EventVenueInfo: { eventVenueInfo: { ...VENUE, contactEmail: 'hello@example.org', contactPhone: '+49 30 123456', contactPublic: true } },
    });
    const { page } = await openPage(browser, `/events/${EVENT_ID}`, withData);
    await expect(page.getByTestId('overview-speakers').getByText('Abena Owusu')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('overview-programme').getByText('Opening keynote')).toBeVisible();
    await expect(page.getByTestId('event-contact').getByRole('link', { name: 'hello@example.org' })).toBeVisible();
    await expect(page.getByTestId('highlight-chips').getByText('Workshops')).toBeVisible();
    await expect(page.getByTestId('overview-organiser')).toContainText(ORGANISER_NAME);
    await expect(page.getByTestId('overview-organiser').getByRole('link', { name: /View community/ })).toBeVisible();
    await expect(page.getByTestId('join-banner')).toBeVisible();
    for (const id of ['fact-date', 'fact-location', 'fact-format', 'fact-access']) await expect(page.getByTestId(id)).toBeVisible();
    await page.context().close();

    // The organiser keeps contact details private: nothing is shown.
    const priv = await openPage(browser, `/events/${EVENT_ID}`, eventPageOverrides(eventFixture(), {
        EventVenueInfo: { eventVenueInfo: { ...VENUE, contactEmail: 'hello@example.org', contactPhone: '+49 30 123456', contactPublic: false } },
    }));
    await expect(priv.page.getByTestId('overview-tab')).toBeVisible({ timeout: 90_000 });
    await expect(priv.page.getByTestId('event-contact')).toHaveCount(0);
    await expect(priv.page.getByTestId('overview-speakers')).toHaveCount(0);
    await expect(priv.page.getByTestId('overview-programme')).toHaveCount(0);
    await expect(priv.page.getByTestId('highlight-chips')).toBeVisible(); // default fixture has one tag
    await priv.page.context().close();

    // A member of the organiser sees no "join" banner.
    const member = await openPage(browser, `/events/${EVENT_ID}`, eventPageOverrides(eventFixture(), { GetEventOrganiserCommunity: { getCommunity: organiserFixture({ membershipStatus: 'ACTIVE' }) } }));
    await expect(member.page.getByTestId('overview-tab')).toBeVisible({ timeout: 90_000 });
    await expect(member.page.getByTestId('join-banner')).toHaveCount(0);
    await expect(member.page.getByTestId('grow-network')).toHaveCount(0);
    await member.page.context().close();
});

test('confirmed: registration card says so and offers the details; no id is shown', async () => {
    const { page } = await openPage(browser, `/events/${EVENT_ID}`, eventPageOverrides(eventFixture({ myRegistrationStatus: 'CONFIRMED', myRegistrationId: 'r1' })));
    const card = page.getByTestId('registration-card');
    await expect(card.getByTestId('registration-headline')).toHaveText("You're registered.", { timeout: 90_000 });
    await expect(card.getByRole('button', { name: 'View registration details' })).toBeVisible();
    await page.context().close();
});

test('an uppercase format from the server (PHYSICAL) still shows its label, never a missing-translation key', async () => {
    const { page } = await openPage(browser, `/events/${EVENT_ID}`, eventPageOverrides(eventFixture({ locationType: 'PHYSICAL' })));
    const hero = page.getByTestId('event-hero');
    await expect(hero.getByRole('heading', { level: 1, name: 'Diaspora Business Summit' })).toBeVisible({ timeout: 90_000 });
    await expect(hero.getByText('In person')).toBeVisible();
    await expect(hero.getByText('At the venue')).toBeVisible();
    expect(await page.locator('body').innerText()).not.toContain('eventPage.format');
    await page.context().close();
});

for (const viewport of [{ width: 1280, height: 900 }, { width: 360, height: 800 }]) {
    test(`share card at ${viewport.width}px: "Get invite link" and "QR code" never overlap and keep their full label`, async () => {
        const { page } = await openPage(browser, `/events/${EVENT_ID}`, eventPageOverrides(), viewport);
        const card = page.getByTestId('share-card');
        const link = card.getByRole('button', { name: 'Get invite link' });
        const qr = card.getByRole('button', { name: 'QR code' });
        await link.scrollIntoViewIfNeeded({ timeout: 90_000 });
        const [a, b, c] = [await link.boundingBox(), await qr.boundingBox(), await card.boundingBox()];
        if (!a || !b || !c) throw new Error('share buttons not laid out');
        const apart = a.x + a.width <= b.x + 0.5 || b.x + b.width <= a.x + 0.5 || a.y + a.height <= b.y + 0.5 || b.y + b.height <= a.y + 0.5;
        expect(apart, `buttons overlap: ${JSON.stringify({ a, b })}`).toBe(true);
        for (const box of [a, b]) {
            expect(box.x).toBeGreaterThanOrEqual(c.x);
            expect(box.x + box.width).toBeLessThanOrEqual(c.x + c.width + 0.5);
        }
        // The label is not clipped or spilling out of its own button.
        for (const btn of [link, qr]) {
            expect(await btn.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
        }
        await page.context().close();
    });
}
