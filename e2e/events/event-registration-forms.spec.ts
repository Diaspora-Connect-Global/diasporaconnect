/**
 * Organiser-built registration forms + external registration, in a real browser against the
 * in-memory GraphQL double: the builder (add / reorder / remove / restore, the saved payload
 * with the reserved default ids), registering with prefilled defaults and a client-side
 * refusal, the "Register on {domain}" CTA with its leaving notice, the CSV export and the
 * answers view, and the list entry point that must not register directly.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { ADMIN_OF_ORGANISER, EVENT_ID, ORGANISER_NAME, OWNER_ID, eventFixture, eventPageOverrides, openPage } from '../support/eventFixtures';
import { event as listEvent, FUTURE, open as openRedesign } from '../redesign/fixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const F = (id: string, label: string, type: string, required: boolean, builtin: string | null = null, options: string[] | null = null) => ({
    __typename: 'RegistrationFormFieldGQL',
    id,
    label,
    type,
    required,
    options,
    builtin,
});
const DEFAULTS = [
    F('full_name', 'Full name', 'text', true, 'full_name'),
    F('email', 'Email address', 'email', true, 'email'),
    F('phone', 'Phone number', 'phone', false, 'phone'),
    F('job_title', 'Job title', 'text', false, 'job_title'),
];
const DIET = F('q-diet', 'Dietary needs', 'select', false, null, ['Vegan', 'Halal']);

const REGISTER = { registerForEvent: { __typename: 'RegisterForEventResult', registrationId: 'reg-1', paymentIntentClientSecret: null, waitlistPosition: null, registrationStatus: 'CONFIRMED', organiserCommunityJoin: null } };
const lastCall = (graphql: { calls: Array<{ name: string; variables: Record<string, unknown> }> }, name: string) => graphql.calls.filter((c) => c.name === name).at(-1);

// ─── The builder ────────────────────────────────────────────────────────────────

const manageOverrides = (fields: unknown[], over: Record<string, unknown> = {}) => ({
    ...ADMIN_OF_ORGANISER,
    GetEvent: { getEvent: eventFixture({ registrationFormFields: fields, registrationMode: 'IN_APP', registrationCount: 4, ...over }) },
    UpdateEventFormFields: { updateEventFormFields: { __typename: 'EventGQL', id: EVENT_ID, registrationFormFields: fields } },
    UpdateEvent: { updateEvent: { __typename: 'EventGQL', id: EVENT_ID, title: 'x', status: 'published', updatedAt: '2030-01-01T00:00:00.000Z' } },
});

test('builder: remove, reorder, add a question, restore the defaults; the saved form carries reserved ids and English default labels', async () => {
    const { page, graphql } = await openPage(browser, `/events/${EVENT_ID}/manage?tab=formBuilder`, manageOverrides([...DEFAULTS, DIET]));
    const builder = page.getByTestId('registration-form-builder');
    await expect(builder).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('builder-field-0')).toContainText('Full name');
    await expect(page.getByTestId('builder-field-0')).toContainText('Default');
    await expect(page.getByTestId('no-new-questions')).toContainText("People who already registered won't be asked new questions.");

    await page.getByRole('button', { name: 'Remove “Phone number”' }).click();
    await expect(builder.locator('[data-testid^="builder-field-"]')).toHaveCount(4);
    await page.getByRole('button', { name: 'Move “Dietary needs” up' }).click();
    await expect(page.getByTestId('builder-field-2').getByLabel('Question', { exact: true })).toHaveValue('Dietary needs');

    await page.getByTestId('add-question').click();
    const added = page.getByTestId('builder-field-4');
    await added.getByLabel('Question', { exact: true }).fill('T-shirt size');
    await added.getByLabel('Answer type').selectOption('multiselect');
    await added.getByLabel('Options (one per line)').fill('S\nM\nS');
    await added.getByLabel('Required').check();
    await page.getByTestId('builder-save').click();

    await expect.poll(() => lastCall(graphql, 'UpdateEventFormFields')).toBeTruthy();
    expect(lastCall(graphql, 'UpdateEventFormFields')!.variables).toEqual({
        input: {
            eventId: EVENT_ID,
            fields: [
                { id: 'full_name', label: 'Full name', type: 'text', required: true },
                { id: 'email', label: 'Email address', type: 'email', required: true },
                { id: 'q-diet', label: 'Dietary needs', type: 'select', required: false, options: ['Vegan', 'Halal'] },
                { id: 'job_title', label: 'Job title', type: 'text', required: false },
                { label: 'T-shirt size', type: 'multiselect', required: true, options: ['S', 'M'] },
            ],
        },
    });

    // The removed default comes back at its place among the defaults, with its reserved id.
    await page.getByTestId('restore-defaults').click();
    await expect(page.getByTestId('builder-field-3')).toContainText('Phone number');
    await expect(page.getByTestId('restore-defaults')).toHaveCount(0);
    await page.getByTestId('builder-save').click();
    await expect.poll(() => graphql.calls.filter((c) => c.name === 'UpdateEventFormFields').length).toBe(2);
    const fields = (lastCall(graphql, 'UpdateEventFormFields')!.variables.input as { fields: Array<{ id?: string }> }).fields;
    expect(fields.map((f) => f.id)).toEqual(['full_name', 'email', 'q-diet', 'phone', 'job_title', undefined]);
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('builder: an empty form offers "Add default fields", and a choice question without options is refused before saving', async () => {
    const { page, graphql } = await openPage(browser, `/events/${EVENT_ID}/manage?tab=formBuilder`, manageOverrides([], { registrationCount: 0 }));
    await expect(page.getByTestId('registration-form-builder')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('no-new-questions')).toHaveCount(0);
    await page.getByTestId('restore-defaults').click();
    await expect(page.getByTestId('restore-defaults')).toHaveCount(0);
    await page.getByTestId('builder-save').click();
    await expect.poll(() => lastCall(graphql, 'UpdateEventFormFields')).toBeTruthy();
    expect((lastCall(graphql, 'UpdateEventFormFields')!.variables.input as { fields: Array<{ id: string }> }).fields.map((f) => f.id)).toEqual(['full_name', 'email', 'phone', 'job_title']);

    await page.getByTestId('add-question').click();
    await page.getByTestId('builder-field-4').getByLabel('Question', { exact: true }).fill('Pick one');
    await page.getByTestId('builder-field-4').getByLabel('Answer type').selectOption('select');
    await page.getByTestId('builder-save').click();
    await expect(page.getByTestId('builder-problem')).toContainText('Add at least one option to “Pick one”.');
    expect(graphql.calls.filter((c) => c.name === 'UpdateEventFormFields')).toHaveLength(1);
    await page.context().close();
});

test('where do people register: external needs a web link, gets https://, warns about people already registered, and folds the form away', async () => {
    const { page, graphql } = await openPage(browser, `/events/${EVENT_ID}/manage?tab=formBuilder`, manageOverrides(DEFAULTS, { registrationCount: 3 }));
    await expect(page.getByTestId('where-register')).toBeVisible({ timeout: 90_000 });
    await page.getByRole('radio', { name: /On another website/ }).check();
    await expect(page.getByTestId('where-already-registered')).toContainText('3 people have already registered here and keep their registration.');
    await expect(page.getByTestId('add-question')).toHaveCount(0);
    await expect(page.getByTestId('external-form-note')).toBeVisible();

    await page.getByLabel('Registration website').fill('javascript:alert(1)');
    await page.getByTestId('where-save').click();
    await expect(page.getByText('Enter a valid web address')).toBeVisible();
    expect(graphql.calls.filter((c) => c.name === 'UpdateEvent')).toHaveLength(0);

    await page.getByLabel('Registration website').fill('example.org/signup');
    await page.getByTestId('where-save').click();
    await expect.poll(() => lastCall(graphql, 'UpdateEvent')).toBeTruthy();
    expect(lastCall(graphql, 'UpdateEvent')!.variables).toEqual({ id: EVENT_ID, input: { registrationMode: 'EXTERNAL', registrationLink: 'https://example.org/signup' } });
    await page.getByRole('button', { name: 'Show the questions anyway' }).click();
    await expect(page.getByTestId('add-question')).toBeVisible();

    await page.getByRole('radio', { name: /On DiaspoPlug/ }).check();
    await page.getByTestId('where-save').click();
    await expect.poll(() => graphql.calls.filter((c) => c.name === 'UpdateEvent').length).toBe(2);
    expect(lastCall(graphql, 'UpdateEvent')!.variables).toEqual({ id: EVENT_ID, input: { registrationMode: 'IN_APP', registrationLink: '' } });
    await page.context().close();
});

// ─── Registering ────────────────────────────────────────────────────────────────

const ALL_TYPES = [
    ...DEFAULTS,
    F('q-notes', 'Anything we should know?', 'textarea', false),
    F('q-age', 'Age', 'number', false),
    F('q-when', 'Arrival date', 'date', false),
    F('q-days', 'Days attending', 'multiselect', false, null, ['Day 1', 'Day 2']),
    DIET,
    F('q-agree', 'I accept the code of conduct', 'checkbox', true),
];

test('register: defaults are prefilled and editable, errors are linked and announced, the answers are sent in their wire shapes', async () => {
    const { page, graphql } = await openPage(
        browser,
        `/events/${EVENT_ID}?tab=register`,
        eventPageOverrides(eventFixture({ registrationFormFields: ALL_TYPES }), { RegisterForEventM2: REGISTER }),
    );
    const tab = page.getByTestId('register-tab');
    await expect(tab).toBeVisible({ timeout: 90_000 });
    await expect(page.getByLabel('Full name')).toHaveValue('Ama Mensah');
    await expect(page.getByLabel('Email address')).toHaveValue('ama@example.com');
    await expect(page.getByLabel('Phone number')).toHaveValue('');
    // The name/email shown read-only before are now the editable fields.
    await expect(tab.locator('dt')).toHaveCount(0);
    await expect(page.getByTestId('answers-shared-note')).toContainText(`Your answers are shared with ${ORGANISER_NAME}.`);

    const email = page.getByLabel('Email address');
    await email.fill('not-an-email');
    await email.blur();
    await expect(page.getByTestId('error-email')).toHaveText('Enter a valid email address.');
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(email).toHaveAttribute('aria-describedby', 'regfield-email-error');
    await expect(page.locator('#regfield-email-error')).toHaveAttribute('aria-live', 'polite');
    await page.getByTestId('terms-checkbox').check();
    await page.getByLabel('I accept the code of conduct').check();
    await expect(page.getByTestId('register-submit')).toBeDisabled();
    await expect(page.getByTestId('register-missing')).toContainText('the required details');
    expect(graphql.calls.some((c) => c.name === 'RegisterForEventM2')).toBe(false);

    await email.fill('ama.mensah@example.org');
    await expect(page.getByTestId('error-email')).toHaveCount(0);
    await page.getByLabel('Phone number').fill('+233 20 123 4567');
    await page.getByLabel('Anything we should know?').fill('Window seat please');
    await page.locator('#regfield-q-age').fill('34');
    await page.getByLabel('Arrival date').fill('2030-11-20');
    await page.getByLabel('Day 2').check();
    await page.getByLabel('Dietary needs').selectOption('Halal');
    await expect(page.getByTestId('register-submit')).toBeEnabled();
    await page.getByTestId('register-submit').click();

    await expect.poll(() => lastCall(graphql, 'RegisterForEventM2')).toBeTruthy();
    const input = lastCall(graphql, 'RegisterForEventM2')!.variables.input as { formResponsesJson: string };
    expect(JSON.parse(input.formResponsesJson)).toEqual({
        full_name: 'Ama Mensah',
        email: 'ama.mensah@example.org',
        phone: '+233 20 123 4567',
        job_title: '',
        'q-notes': 'Window seat please',
        'q-age': '34',
        'q-when': '2030-11-20',
        'q-days': ['Day 2'],
        'q-diet': 'Halal',
        'q-agree': true,
    });
    await page.context().close();
});

test('register: a server refusal about the form is shown with its code prefix stripped', async () => {
    const refusal = { __errors: [{ message: 'EVENT_REGISTRATION_FORM_INVALID: "Email address" must be a valid email address', code: 'EVENT_INVALID_ARGUMENT' }] };
    const { page } = await openPage(browser, `/events/${EVENT_ID}?tab=register`, eventPageOverrides(eventFixture({ registrationFormFields: DEFAULTS }), { RegisterForEventM2: refusal }));
    await page.getByTestId('terms-checkbox').check({ timeout: 90_000 });
    await page.getByTestId('register-submit').click();
    await expect(page.getByTestId('register-form-refusal')).toHaveText('"Email address" must be a valid email address');
    await page.context().close();
});

test('register: without name/email default fields the read-only "registering as" block stays', async () => {
    const { page } = await openPage(browser, `/events/${EVENT_ID}?tab=register`, eventPageOverrides(eventFixture({ registrationFormFields: [F('q-x', 'Company', 'text', false)] })));
    const tab = page.getByTestId('register-tab');
    await expect(tab).toBeVisible({ timeout: 90_000 });
    await expect(tab.locator('dt')).toHaveCount(2);
    await expect(tab).toContainText('Ama Mensah');
    await expect(tab).toContainText('ama@example.com');
    await page.context().close();
});

test('at 360 px the builder and the register form do not scroll sideways', async () => {
    const narrow = { width: 360, height: 800 };
    const b = await openPage(browser, `/events/${EVENT_ID}/manage?tab=formBuilder`, manageOverrides([...DEFAULTS, DIET]), narrow);
    await expect(b.page.getByTestId('registration-form-builder')).toBeVisible({ timeout: 90_000 });
    expect(await b.page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    await b.page.context().close();
    const r = await openPage(browser, `/events/${EVENT_ID}?tab=register`, eventPageOverrides(eventFixture({ registrationFormFields: ALL_TYPES })), narrow);
    await expect(r.page.getByTestId('register-tab')).toBeVisible({ timeout: 90_000 });
    expect(await r.page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    await r.page.context().close();
});

// ─── External registration ──────────────────────────────────────────────────────

const stubWindowOpen = (page: Page) =>
    page.evaluate(() => {
        const w = window as unknown as { __opened: unknown[][] };
        w.__opened = [];
        window.open = ((...a: unknown[]) => {
            w.__opened.push(a);
            return null;
        }) as typeof window.open;
    });
const opened = (page: Page) => page.evaluate(() => (window as unknown as { __opened: unknown[][] }).__opened);

const EXTERNAL = { registrationMode: 'EXTERNAL', registrationLink: 'https://www.example.org/signup?ref=dp' };

test('external event: no Register tab, "Register on {domain}" asks first, and Continue opens a new tab with noopener,noreferrer', async () => {
    const { page } = await openPage(browser, `/events/${EVENT_ID}`, eventPageOverrides(eventFixture(EXTERNAL)));
    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible({ timeout: 90_000 });
    await expect(page.getByRole('tab', { name: 'Register' })).toHaveCount(0);
    await stubWindowOpen(page);

    const cta = page.locator('[data-testid="external-register-cta"]:visible').first();
    await expect(cta).toContainText('Register on example.org');
    await cta.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText("You're leaving DiaspoPlug");
    await expect(dialog).toContainText("Registration continues on example.org. DiaspoPlug doesn't see what you enter there.");
    await dialog.getByRole('button', { name: 'Stay here' }).click();
    await expect(dialog).toHaveCount(0);
    expect(await opened(page)).toHaveLength(0);

    await cta.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Continue' }).click();
    expect(await opened(page)).toEqual([['https://www.example.org/signup?ref=dp', '_blank', 'noopener,noreferrer']]);

    // The small link in the Overview goes through the same notice.
    await page.getByTestId('overview-external-link').click();
    await expect(page.getByRole('dialog')).toContainText("You're leaving DiaspoPlug");
    await page.context().close();
});

test('external event: someone who registered here keeps "My event", and an unsafe link is not offered', async () => {
    const mine = await openPage(browser, `/events/${EVENT_ID}?tab=register`, eventPageOverrides(eventFixture({ ...EXTERNAL, myRegistrationStatus: 'CONFIRMED', myRegistrationId: 'reg-1', isRegistered: true })));
    await expect(mine.page.getByRole('tab', { name: 'My event' })).toHaveAttribute('aria-selected', 'true', { timeout: 90_000 });
    await mine.page.context().close();

    const bad = await openPage(browser, `/events/${EVENT_ID}`, eventPageOverrides(eventFixture({ registrationMode: 'EXTERNAL', registrationLink: 'javascript:alert(1)' })));
    await expect(bad.page.getByTestId('registration-card')).toBeVisible({ timeout: 90_000 });
    await expect(bad.page.getByTestId('external-register-cta')).toHaveCount(0);
    await expect(bad.page.getByTestId('external-no-link')).toBeVisible();
    await bad.page.context().close();
});

// ─── Answers and CSV ────────────────────────────────────────────────────────────

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const TOTAL = 130;
const ANSWER_FIELDS = [DEFAULTS[0], DEFAULTS[1], F('q-diet', 'Dietary needs', 'multiselect', false, null, ['Vegan', 'Halal']), F('q-agree', 'I accept the code of conduct', 'checkbox', false), F('q-notes', 'Notes', 'textarea', false)];
const NAME_OF = (n: number) => (n === 0 ? { first: 'Eve "Quote",', last: 'Jr' } : n === 1 ? { first: '=cmd|', last: "' /C calc'!A0" } : { first: 'Person', last: String(n) });

const registrationRow = (n: number) => ({
    __typename: 'EventRegistration',
    id: ID(1000 + n),
    userId: ID(n),
    ticketId: null,
    quantity: 1,
    status: 'confirmed',
    totalAmount: null,
    currency: null,
    registeredAt: '2030-01-15T10:00:00.000Z',
    confirmedAt: null,
    cancelledAt: null,
    formResponsesJson:
        n === 0
            ? JSON.stringify({ full_name: 'Eve "Quote", Jr', email: 'eve@example.com', 'q-diet': ['Vegan', 'Halal'], 'q-agree': true, 'q-notes': '=SUM(1,1)\nsecond line' })
            : n === 2
              ? null
              : JSON.stringify({ full_name: `Person ${n}`, email: `p${n}@example.com`, 'q-agree': false }),
});

const registrationsOverrides = () => ({
    ...ADMIN_OF_ORGANISER,
    GetEvent: { getEvent: eventFixture({ registrationFormFields: ANSWER_FIELDS, registrationCount: TOTAL }) },
    GetEventRegistrations: (v: Record<string, unknown>) => {
        const offset = Number(v.offset ?? 0);
        const limit = Number(v.limit ?? 25);
        const rows = Array.from({ length: TOTAL }, (_, i) => registrationRow(i)).slice(offset, offset + limit);
        return { getEventRegistrations: { __typename: 'EventRegistrationList', total: TOTAL, hasMore: offset + limit < TOTAL, registrations: rows } };
    },
    GetUserProfile: (v: Record<string, unknown>) => {
        const n = Number(String(v.userId).slice(-12));
        const nm = NAME_OF(n);
        return { getProfile: { __typename: 'ProfileResponse', success: true, message: 'ok', profile: { __typename: 'Profile', userId: v.userId, firstName: nm.first, lastName: nm.last, avatarUrl: null } } };
    },
});

test('registrations: the Answers view shows question → answer by name, never an id', async () => {
    const { page } = await openPage(browser, `/events/${EVENT_ID}/manage?tab=registrations`, registrationsOverrides());
    const first = page.getByTestId('view-answers').first();
    await expect(first).toBeVisible({ timeout: 90_000 });
    await expect(page.locator('tbody')).toContainText('Eve "Quote", Jr');
    await first.click();
    const dialog = page.getByTestId('answers-dialog');
    await expect(dialog).toContainText('Full name');
    await expect(dialog).toContainText('Eve "Quote", Jr');
    await expect(dialog).toContainText('Dietary needs');
    await expect(dialog).toContainText('Vegan, Halal');
    await expect(dialog).toContainText('I accept the code of conduct');
    await expect(dialog).toContainText('Yes');
    expect(await dialog.innerText()).not.toMatch(UUID);
    await page.keyboard.press('Escape');
    await page.getByTestId('view-answers').nth(2).click();
    await expect(page.getByTestId('answers-dialog')).toContainText('This person gave no answers.');
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('registrations: Download CSV pages through ALL registrations 100 at a time, neutralises formulas and writes no ids', async () => {
    const { page, graphql } = await openPage(browser, `/events/${EVENT_ID}/manage?tab=registrations`, registrationsOverrides());
    await expect(page.getByTestId('download-csv')).toBeVisible({ timeout: 90_000 });
    // Capture the file the page hands to the browser (works the same in every browser build).
    await page.evaluate(() => {
        const w = window as unknown as { __csv: Promise<number[]> };
        const make = URL.createObjectURL.bind(URL);
        // Bytes, not text(): Blob.text() silently drops a leading BOM, which is exactly what is asserted.
        w.__csv = new Promise((resolve) => {
            URL.createObjectURL = (b: Blob | MediaSource) => {
                void (b as Blob).arrayBuffer().then((buf) => resolve(Array.from(new Uint8Array(buf))));
                return make(b);
            };
        });
    });
    await page.getByTestId('download-csv').click();
    const bytes = Buffer.from(await page.evaluate(() => (window as unknown as { __csv: Promise<number[]> }).__csv));
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = bytes.toString('utf8');

    const pages = graphql.calls.filter((c) => c.name === 'GetEventRegistrations' && c.variables.limit === 100).map((c) => c.variables.offset);
    expect(pages).toEqual([0, 100]);
    expect(text.startsWith('﻿')).toBe(true);
    const lines = text.slice(1).split('\r\n');
    expect(lines[0]).toBe('Attendee,Status,Ticket,Quantity,Registered on,Full name,Email address,Dietary needs,I accept the code of conduct,Notes');
    expect(text.match(/,confirmed,/g)).toHaveLength(TOTAL);
    // RFC 4180 quoting: embedded quote and comma; formulas defused with a leading apostrophe.
    expect(text).toContain('"Eve ""Quote"", Jr"');
    expect(text).toContain("'=cmd|");
    expect(text).toContain("\"'=SUM(1,1)\nsecond line\"");
    expect(text).toContain('"Vegan, Halal"');
    expect(text).not.toMatch(UUID);
    await page.context().close();
});

// ─── Entry points that must not register directly ───────────────────────────────

test('events list: an event with questions goes to its Register tab, an external one asks first, a plain free one still quick-registers', async () => {
    const withForm = listEvent('evt-form', 'Gala with questions', FUTURE, { registrationMode: 'IN_APP', registrationFormFields: [{ __typename: 'RegistrationFormFieldGQL', id: 'full_name' }] });
    const external = listEvent('evt-ext', 'Summit elsewhere', '2030-12-01T09:00:00.000Z', { registrationMode: 'EXTERNAL', registrationLink: 'https://tickets.example.com/summit', registrationFormFields: [] });
    const plain = listEvent('evt-plain', 'Plain meetup', '2030-12-02T09:00:00.000Z', { registrationMode: 'IN_APP', registrationFormFields: [] });
    const LIST = { listEvents: { __typename: 'EventList', total: 3, hasMore: false, events: [withForm, external, plain] } };
    const { page, graphql } = await openRedesign(browser, '/events', { ListEvents: LIST, UserEvents: { userEvents: { __typename: 'UserEvents', attending: [], saved: [] } } } as never);
    const cards = page.getByTestId('upcoming-events').getByTestId('event-card');
    await expect(cards).toHaveCount(3, { timeout: 90_000 });
    await stubWindowOpen(page);

    await cards.filter({ hasText: 'Summit elsewhere' }).getByRole('button', { name: 'Attend' }).click();
    await expect(page.getByRole('dialog')).toContainText('Registration continues on tickets.example.com');
    await page.getByRole('dialog').getByRole('button', { name: 'Continue' }).click();
    expect(await opened(page)).toEqual([['https://tickets.example.com/summit', '_blank', 'noopener,noreferrer']]);
    expect(graphql.calls.some((c) => c.name === 'RegisterForEvent')).toBe(false);

    await cards.filter({ hasText: 'Plain meetup' }).getByRole('button', { name: 'Attend' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(page.url()).not.toContain('tab=register');
    await page.keyboard.press('Escape');

    await cards.filter({ hasText: 'Gala with questions' }).getByRole('button', { name: 'Attend' }).click();
    await page.waitForURL(/\/events\/evt-form\?tab=register/);
    expect(graphql.calls.some((c) => c.name === 'RegisterForEvent')).toBe(false);
    await page.context().close();
});

const COMMUNITY_PAGE = {
    GetCommunityDetails: {
        getCommunity: {
            __typename: 'Community', id: OWNER_ID, name: ORGANISER_NAME, description: 'A place for Ghanaians abroad.', joinPolicy: 'OPEN', visibility: 'PUBLIC',
            paymentType: 'NONE', priceAmount: null, priceCurrency: null, memberCount: 42, avatarUrl: null, defaultGroupId: null, createdAt: '2026-01-01T00:00:00.000Z',
            membershipStatus: 'ACTIVE', isContentLocked: false, enabledServices: null, communityRules: null, bannerUrl: null, contactEmail: null, contactPhone: null,
            address: null, locationCountry: null, communityType: null, embassyProfile: null,
        },
    },
    CheckCommunityMembership: { checkCommunityMembership: { __typename: 'MembershipCheck', isMember: true, role: 'MEMBER', status: 'ACTIVE' } },
};

test('community Events tab (detail): Register goes to the event page for an event with questions and asks first for an external one', async () => {
    const withForm = openPage(browser, `/community/${OWNER_ID}?tab=events&event=${EVENT_ID}`, {
        ...eventPageOverrides(eventFixture({ registrationFormFields: DEFAULTS })),
        ...COMMUNITY_PAGE,
        GetEvent: { getEvent: eventFixture({ registrationFormFields: DEFAULTS, registrationMode: 'IN_APP' }) },
    });
    const a = await withForm;
    await a.page.getByRole('button', { name: 'Register for Event' }).click({ timeout: 90_000 });
    await a.page.waitForURL(new RegExp(`/events/${EVENT_ID}\\?tab=register`));
    expect(a.graphql.calls.some((c) => c.name === 'RegisterForEvent')).toBe(false);
    await a.page.context().close();

    const b = await openPage(browser, `/community/${OWNER_ID}?tab=events&event=${EVENT_ID}`, {
        ...eventPageOverrides(eventFixture(EXTERNAL)),
        ...COMMUNITY_PAGE,
        GetEvent: { getEvent: eventFixture(EXTERNAL) },
    });
    await stubWindowOpen(b.page).catch(() => undefined);
    await b.page.getByRole('button', { name: 'Register for Event' }).click({ timeout: 90_000 });
    await expect(b.page.getByRole('dialog')).toContainText("You're leaving DiaspoPlug");
    expect(b.graphql.calls.some((c) => c.name === 'RegisterForEvent')).toBe(false);
    await b.page.context().close();
});

test('community pages: events with questions or an external site are routed, not registered', async () => {
    // The embassy tabs share one rule with the list; it is exercised here without the heavy page fixture.
    const { registrationRoute } = await import('../../src/lib/eventRegistrationForm');
    const safe = (v?: string | null) => (v && /^https?:\/\//.test(v) ? v : null);
    expect(registrationRoute({ registrationFormFields: [{ id: 'full_name' }] }, safe)).toEqual({ kind: 'page' });
    expect(registrationRoute({ registrationMode: 'EXTERNAL', registrationLink: 'https://a.example/x' }, safe)).toEqual({ kind: 'external', url: 'https://a.example/x' });
    expect(registrationRoute({ registrationMode: 'EXTERNAL', registrationLink: 'javascript:alert(1)' }, safe)).toEqual({ kind: 'page' });
    expect(registrationRoute({ registrationMode: 'IN_APP', registrationFormFields: [] }, safe)).toEqual({ kind: 'quick' });
    expect(registrationRoute({}, safe)).toEqual({ kind: 'quick' });
});
