/**
 * The Register tab: prefilled details, the UNTICKED "Also join {organiser}" box
 * (hidden for members, a link for paid communities), hybrid attendance format,
 * terms consent, and the rule that a community-join outcome is reported on its
 * own and never as a registration failure. Refusals arrive the way Apollo's
 * errorPolicy 'all' delivers them: a resolved result with `data: null`.
 */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { EVENT_ID, OWNER_ID, ORGANISER_NAME, eventFixture, eventPageOverrides, openPage, organiserFixture } from '../support/eventFixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const REGISTER = (extra: Record<string, unknown> = {}) => ({
    registerForEvent: {
        __typename: 'RegisterForEventResult',
        registrationId: 'reg-1',
        paymentIntentClientSecret: null,
        waitlistPosition: null,
        registrationStatus: 'CONFIRMED',
        organiserCommunityJoin: null,
        ...extra,
    },
});

const org = (over: Record<string, unknown> = {}) => ({ GetEventOrganiserCommunity: { getCommunity: organiserFixture(over) } });

test('the join box is unticked by default and the submit needs the terms', async () => {
    const { page } = await openPage(browser, `/events/${EVENT_ID}?tab=register`, eventPageOverrides(eventFixture(), { ...org(), RegisterForEventM2: REGISTER() }));
    const join = page.getByTestId('join-organiser-checkbox');
    await expect(join).toBeVisible({ timeout: 90_000 });
    await expect(join).not.toBeChecked();
    await expect(page.getByText(`Also join ${ORGANISER_NAME}`)).toBeVisible();
    await expect(page.getByText('Registering for the event never makes you a member.')).toBeVisible();
    // Submit is disabled until the terms are accepted, and says what is missing.
    await expect(page.getByTestId('register-submit')).toBeDisabled();
    await expect(page.getByTestId('register-missing')).toContainText('your acceptance of the terms');
    await page.getByTestId('terms-checkbox').check();
    await expect(page.getByTestId('register-submit')).toBeEnabled();
    await page.context().close();
});

test('registering without ticking the box never asks to join', async () => {
    const { page, graphql } = await openPage(browser, `/events/${EVENT_ID}?tab=register`, eventPageOverrides(eventFixture(), { ...org(), RegisterForEventM2: REGISTER() }));
    await page.getByTestId('terms-checkbox').check({ timeout: 90_000 });
    await page.getByTestId('register-submit').click();
    await expect.poll(() => graphql.calls.some((c) => c.name === 'RegisterForEventM2')).toBe(true);
    const sent = graphql.calls.find((c) => c.name === 'RegisterForEventM2')!.variables.input as Record<string, unknown>;
    expect(sent.joinOrganiserCommunity ?? false).toBe(false);
    expect(sent.termsAccepted).toBe(true);
    expect(typeof sent.termsHash).toBe('string');
    expect(sent.eventId).toBe(EVENT_ID);
    expect(graphql.calls.some((c) => c.name === 'JoinEventOrganiserCommunity')).toBe(false);
    await page.context().close();
});

test('ticking the box sends joinOrganiserCommunity, and a failed join is reported apart from the registration', async () => {
    let registered = false;
    const overrides = eventPageOverrides(eventFixture(), {
        ...org(),
        GetEventPage: () => ({ getEvent: eventFixture(registered ? { myRegistrationStatus: 'CONFIRMED', myRegistrationId: 'reg-1' } : {}) }),
        RegisterForEventM2: () => {
            registered = true;
            return REGISTER({ organiserCommunityJoin: { __typename: 'EventOrganiserCommunityJoin', status: 'FAILED', requiresPayment: false } });
        },
    });
    const { page, graphql } = await openPage(browser, `/events/${EVENT_ID}?tab=register`, overrides);
    await page.getByTestId('join-organiser-checkbox').check({ timeout: 90_000 });
    await page.getByTestId('terms-checkbox').check();
    await page.getByTestId('register-submit').click();

    const sent = graphql.calls.find((c) => c.name === 'RegisterForEventM2')!.variables.input as Record<string, unknown>;
    expect(sent.joinOrganiserCommunity).toBe(true);

    const result = page.getByTestId('registration-result');
    await expect(result).toContainText("You're registered.", { timeout: 30_000 });
    await expect(result).not.toContainText(/couldn't|failed|error/i);
    const outcome = page.getByTestId('organiser-join-outcome').first();
    await expect(outcome).toContainText("We couldn't send your request to join");
    await expect(outcome).toContainText('Your event registration is not affected');
    // The tab is now "My event" and the rail agrees.
    await expect(page.getByRole('tab', { name: 'My event' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('registration-card')).toHaveAttribute('data-state', 'confirmed');
    await page.context().close();
});

test('a member gets no join box; a paid community gets a link, not a checkbox', async () => {
    const member = await openPage(browser, `/events/${EVENT_ID}?tab=register`, eventPageOverrides(eventFixture(), org({ membershipStatus: 'ACTIVE' })));
    await expect(member.page.getByTestId('terms-checkbox')).toBeVisible({ timeout: 90_000 });
    await expect(member.page.getByTestId('join-organiser-checkbox')).toHaveCount(0);
    await expect(member.page.getByTestId('join-organiser-link')).toHaveCount(0);
    await member.page.context().close();

    const pending = await openPage(browser, `/events/${EVENT_ID}?tab=register`, eventPageOverrides(eventFixture(), org({ membershipStatus: 'PENDING' })));
    await expect(pending.page.getByTestId('terms-checkbox')).toBeVisible({ timeout: 90_000 });
    await expect(pending.page.getByTestId('join-organiser-checkbox')).toHaveCount(0);
    await pending.page.context().close();

    const paid = await openPage(browser, `/events/${EVENT_ID}?tab=register`, eventPageOverrides(eventFixture(), org({ paymentType: 'SUBSCRIPTION', priceAmount: 1000, priceCurrency: 'GHS' })));
    await expect(paid.page.getByTestId('terms-checkbox')).toBeVisible({ timeout: 90_000 });
    await expect(paid.page.getByTestId('join-organiser-checkbox')).toHaveCount(0);
    await expect(paid.page.getByTestId('join-organiser-link').getByRole('link', { name: `Open ${ORGANISER_NAME}` })).toHaveAttribute('href', `/en/community/${OWNER_ID}`);
    await paid.page.context().close();
});

test('a community that needs approval says "request" and a user-owned event shows nothing about joining', async () => {
    const request = await openPage(browser, `/events/${EVENT_ID}?tab=register`, eventPageOverrides(eventFixture(), org({ joinPolicy: 'REQUEST' })));
    await expect(request.page.getByText(`Also request to join ${ORGANISER_NAME}`)).toBeVisible({ timeout: 90_000 });
    await request.page.context().close();

    const legacy = await openPage(browser, `/events/${EVENT_ID}?tab=register`, eventPageOverrides(eventFixture({ ownerType: 'user' })));
    await expect(legacy.page.getByTestId('terms-checkbox')).toBeVisible({ timeout: 90_000 });
    await expect(legacy.page.getByTestId('join-organiser-checkbox')).toHaveCount(0);
    await legacy.page.context().close();
});

test('a hybrid event needs an attendance format before it can be submitted', async () => {
    const { page, graphql } = await openPage(browser, `/events/${EVENT_ID}?tab=register`, eventPageOverrides(eventFixture({ locationType: 'hybrid' }), { RegisterForEventM2: REGISTER() }));
    await page.getByTestId('terms-checkbox').check({ timeout: 90_000 });
    await expect(page.getByTestId('register-submit')).toBeDisabled();
    await expect(page.getByTestId('register-missing')).toContainText('how you will attend');
    await page.getByLabel('Online').check();
    await page.getByTestId('register-submit').click();
    await expect.poll(() => graphql.calls.some((c) => c.name === 'RegisterForEventM2')).toBe(true);
    expect((graphql.calls.find((c) => c.name === 'RegisterForEventM2')!.variables.input as Record<string, unknown>).attendanceFormat).toBe('ONLINE');
    await page.context().close();

    // A physical event never asks.
    const physical = await openPage(browser, `/events/${EVENT_ID}?tab=register`, eventPageOverrides());
    await expect(physical.page.getByTestId('terms-checkbox')).toBeVisible({ timeout: 90_000 });
    await expect(physical.page.getByText('How will you attend?')).toHaveCount(0);
    await physical.page.context().close();
});

test('approval events say so, and a pending registration is reported as pending (not as registered)', async () => {
    let registered = false;
    const overrides = eventPageOverrides(eventFixture({ requiresApproval: true }), {
        GetEventPage: () => ({ getEvent: eventFixture(registered ? { requiresApproval: true, myRegistrationStatus: 'PENDING_APPROVAL', myRegistrationId: 'reg-1' } : { requiresApproval: true }) }),
        RegisterForEventM2: () => {
            registered = true;
            return REGISTER({ registrationStatus: 'PENDING_APPROVAL' });
        },
    });
    const { page } = await openPage(browser, `/events/${EVENT_ID}?tab=register`, overrides);
    await expect(page.getByText('The organiser approves each registration.').first()).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('register-submit')).toHaveText('Request to register');
    await page.getByTestId('terms-checkbox').check();
    await page.getByTestId('register-submit').click();
    await expect(page.getByTestId('registration-result')).toContainText('Registration received. The organiser will review it.', { timeout: 30_000 });
    await expect(page.getByTestId('registration-result')).not.toContainText("You're registered");
    await expect(page.getByTestId('registration-card')).toHaveAttribute('data-state', 'pendingApproval');
    await page.context().close();
});

test('a waitlist registration shows the position it was given', async () => {
    let registered = false;
    const overrides = eventPageOverrides(eventFixture({ isFull: true, availableSpots: 0 }), {
        GetEventPage: () => ({ getEvent: eventFixture(registered ? { isFull: true, myRegistrationStatus: 'WAITLISTED', myRegistrationId: 'reg-1' } : { isFull: true, availableSpots: 0 }) }),
        RegisterForEventM2: () => {
            registered = true;
            return REGISTER({ registrationStatus: 'WAITLISTED', waitlistPosition: 4 });
        },
    });
    const { page } = await openPage(browser, `/events/${EVENT_ID}?tab=register`, overrides);
    await expect(page.getByTestId('register-submit')).toHaveText('Join the waitlist', { timeout: 90_000 });
    await page.getByTestId('terms-checkbox').check();
    await page.getByTestId('register-submit').click();
    await expect(page.getByTestId('registration-result')).toContainText("You're number 4 on the waitlist.", { timeout: 30_000 });
    await expect(page.getByTestId('registration-card').getByTestId('registration-headline')).toHaveText("You're number 4 on the waitlist.");
    await page.context().close();
});

test('a refused registration resolves with data:null and is shown as the friendly reason', async () => {
    const overrides = eventPageOverrides(eventFixture(), {
        RegisterForEventM2: { __errors: [{ message: 'EVENT_REGISTRATION_WINDOW_CLOSED: closed 2026-01-01T00:00:00Z for 3f9a2b1c', code: 'EVENT_REGISTRATION_WINDOW_CLOSED' }] },
    });
    const { page } = await openPage(browser, `/events/${EVENT_ID}?tab=register`, overrides);
    await page.getByTestId('terms-checkbox').check({ timeout: 90_000 });
    await page.getByTestId('register-submit').click();
    await expect(page.getByText('Registration for this event has closed.')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('registration-result')).toHaveCount(0);
    // The server's English (with timestamps and ids) is never shown.
    await expect(page.getByText(/3f9a2b1c|2026-01-01/)).toHaveCount(0);
    await page.context().close();
});

test('the dark-launch refusal of the rail Join button reads as "not available yet", not as an error', async () => {
    const overrides = eventPageOverrides(eventFixture(), {
        JoinEventOrganiserCommunity: { __errors: [{ message: "That isn't available yet.", code: 'EVENT_FEATURE_UNAVAILABLE' }] },
    });
    const { page } = await openPage(browser, `/events/${EVENT_ID}`, overrides);
    await page.getByTestId('organiser-card').getByRole('button', { name: `Join ${ORGANISER_NAME}` }).click({ timeout: 90_000 });
    const outcome = page.getByTestId('organiser-join-outcome');
    await expect(outcome).toContainText("isn't available yet");
    await expect(outcome).not.toContainText(/error|failed|wrong/i);
    await page.context().close();
});

test('the rail Join button reports success and the standing it created', async () => {
    const overrides = eventPageOverrides(eventFixture(), {
        JoinEventOrganiserCommunity: { joinEventOrganiserCommunity: { __typename: 'EventOrganiserCommunityJoin', status: 'REQUESTED', requiresPayment: false } },
    });
    const { page, graphql } = await openPage(browser, `/events/${EVENT_ID}`, overrides);
    await page.getByTestId('organiser-card').getByRole('button', { name: `Join ${ORGANISER_NAME}` }).click({ timeout: 90_000 });
    await expect(page.getByTestId('organiser-join-outcome')).toContainText(`Your request to join ${ORGANISER_NAME} was sent.`);
    expect(graphql.calls.find((c) => c.name === 'JoinEventOrganiserCommunity')!.variables.eventId).toBe(EVENT_ID);
    await page.context().close();
});
