/**
 * Responsive screenshots of the M2 pages at 360 / 768 / 1280, written to
 * `.artifacts/m2-screenshots/`. Skipped unless M2_SCREENSHOTS=1 (it exists to
 * produce evidence for review, not to assert behaviour).
 */
import { test, type Browser } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { openBrowser } from '../support/browser';
import { SHELL_OVERRIDES } from '../support/fakeSession';
import {
    ADMIN_OF_ORGANISER,
    EVENT_ID,
    OWNER_ID,
    SESSIONS,
    SPEAKERS,
    UPDATES,
    VENUE,
    eventFixture,
    eventPageOverrides,
    openPage,
    type Overrides,
} from '../support/eventFixtures';

test.skip(process.env.M2_SCREENSHOTS !== '1', 'set M2_SCREENSHOTS=1 to capture');

const OUT = path.join(process.cwd(), '.artifacts/m2-screenshots');
const SIZES = [360, 768, 1280] as const;

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
    fs.mkdirSync(OUT, { recursive: true });
});
test.afterAll(async () => {
    await browser?.close();
});

const rich = eventPageOverrides(eventFixture({ tags: ['founders', 'investors'] }), {
    EventProgramme: { eventProgramme: SESSIONS },
    EventSpeakers: { eventSpeakers: SPEAKERS },
    EventUpdates: { eventUpdates: UPDATES },
    EventVenueInfo: { eventVenueInfo: VENUE },
});

const shots: Array<{ name: string; path: string; overrides: Overrides }> = [
    { name: 'event-overview', path: `/events/${EVENT_ID}`, overrides: rich },
    { name: 'event-programme', path: `/events/${EVENT_ID}?tab=programme`, overrides: rich },
    { name: 'event-speakers', path: `/events/${EVENT_ID}?tab=speakers`, overrides: rich },
    { name: 'event-register', path: `/events/${EVENT_ID}?tab=register`, overrides: rich },
    { name: 'event-my-event-pending', path: `/events/${EVENT_ID}?tab=register`, overrides: eventPageOverrides(eventFixture({ myRegistrationStatus: 'PENDING_APPROVAL', requiresApproval: true })) },
    { name: 'event-manager-empty', path: `/events/${EVENT_ID}?tab=programme`, overrides: eventPageOverrides(eventFixture(), ADMIN_OF_ORGANISER) },
    {
        name: 'manage-approvals',
        path: `/events/${EVENT_ID}/manage?tab=approvals`,
        overrides: {
            ...SHELL_OVERRIDES,
            ...ADMIN_OF_ORGANISER,
            GetEvent: { getEvent: eventFixture({ requiresApproval: true }) },
            GetEventPage: { getEvent: eventFixture({ requiresApproval: true }) },
            PendingApprovalRegistrations: { getEventRegistrations: { __typename: 'EventRegistrationListResponse', total: 1, registrations: [{ __typename: 'EventRegistrationGQL', id: 'rg-1', userId: '00000000-0000-4000-8000-0000000000b1', quantity: 1, registeredAt: '2030-10-01T10:00:00.000Z', attendanceFormat: null }] } },
            GetUserProfile: { getProfile: { __typename: 'ProfileResponse', success: true, message: 'ok', profile: { __typename: 'Profile', userId: '00000000-0000-4000-8000-0000000000b1', username: 'kofi', email: null, firstName: 'Kofi', middleName: null, lastName: 'Mensah', avatarUrl: null } } },
        },
    },
    { name: 'create-organiser-picker', path: '/events/create', overrides: { ...SHELL_OVERRIDES, ...ADMIN_OF_ORGANISER } },
    { name: 'create-no-organiser', path: '/events/create', overrides: { ...SHELL_OVERRIDES } },
    {
        name: 'ticket',
        path: `/events/${EVENT_ID}/ticket`,
        overrides: eventPageOverrides(eventFixture({ myRegistrationStatus: 'CONFIRMED', myRegistrationId: 'reg-1', tickets: [{ __typename: 'EventTicket', id: 't1', name: 'General', priceInCents: 0, currency: null, description: null, availableQuantity: 50 }] })),
    },
];

for (const shot of shots) {
    test(`screenshot ${shot.name}`, async () => {
        for (const width of SIZES) {
            const { page } = await openPage(browser, shot.path, shot.overrides, { width, height: width === 1280 ? 900 : 800 });
            await page.waitForTimeout(2500);
            await page.screenshot({ path: path.join(OUT, `${shot.name}-${width}.png`), fullPage: false });
            await page.context().close();
        }
    });
}

void OWNER_ID;
