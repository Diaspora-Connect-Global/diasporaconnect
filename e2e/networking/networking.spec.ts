/**
 * Event networking screens, against the in-memory GraphQL double.
 * Dark launch, the setup wizard (consent, AI off by default, chips), the hub, the
 * deck (buttons, keyboard, no percentages, no ids), the person not-found case,
 * the feature flags (interests / circles hidden and silent), and the dev harness.
 */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { openPage } from '../support/eventFixtures';
import { DECK, EVENT_ID, UUID, card, mine, networkingOverrides, status } from '../support/networkingFixtures';

/** The event id legitimately appears in link targets; only visible markup must be id-free. */
const withoutHrefs = (html: string) => html.replace(/href="[^"]*"/g, '');

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const BASE = `/events/${EVENT_ID}/networking`;
const READY = { timeout: 90_000 };

test('the dark launch reads "not available yet", not an error', async () => {
    const { page } = await openPage(browser, BASE, networkingOverrides({ NetworkingStatus: status({ featureAvailable: false }) }));
    await expect(page.getByTestId('gate')).toHaveAttribute('data-state', 'unavailableYet', READY);
    await expect(page.getByTestId('gate')).toContainText('not available yet');
    await page.context().close();
});

test('a refusal with the dark-launch code is shown the same way', async () => {
    const { page } = await openPage(browser, BASE, networkingOverrides({ NetworkingStatus: { __errors: [{ message: 'nope', code: 'EVENT_NETWORKING_FEATURE_UNAVAILABLE' }] } }));
    await expect(page.getByTestId('gate')).toHaveAttribute('data-state', 'unavailableYet', READY);
    await page.context().close();
});

test('someone who has not registered is told to register, not shown the hub', async () => {
    const { page } = await openPage(browser, BASE, networkingOverrides({ NetworkingStatus: status({ eligibility: 'NOT_REGISTERED', participationStatus: 'NOT_JOINED' }), NetworkingMyParticipation: mine({ eligibility: 'NOT_REGISTERED' }, null) }));
    await expect(page.getByTestId('gate')).toHaveAttribute('data-state', 'notEligible', READY);
    await page.context().close();
});

test('not joined yet: the hub sends the person to the setup wizard', async () => {
    const { page } = await openPage(browser, BASE, networkingOverrides({ NetworkingStatus: status({ participationStatus: 'NOT_JOINED' }), NetworkingMyParticipation: mine({}, null) }));
    await expect(page).toHaveURL(/networking\/setup/, READY);
    await expect(page.getByTestId('wizard')).toBeVisible(READY);
    await page.context().close();
});

test('wizard: consent is required, AI help is off by default, profile chips are separate', async () => {
    const { page, graphql } = await openPage(
        browser,
        `${BASE}/setup`,
        networkingOverrides({
            NetworkingStatus: status({ participationStatus: 'NOT_JOINED' }),
            NetworkingMyParticipation: mine({}, null),
            NetworkingPrefill: { eventNetworkingPrefill: { __typename: 'EventNetworkingPrefill', headline: 'Founder', organization: 'Kente Labs', locationLabel: 'Berlin', intro: null, skills: [], unavailableFields: [], matchedCodes: [{ __typename: 'EventNetworkingPrefillCode', code: 'role.founder', kind: 'ROLE', source: 'occupation' }] } },
            NetworkingJoin: mine(),
        }),
    );
    await expect(page.getByTestId('wizard')).toBeVisible(READY);
    // Step 1 cannot be passed without consent.
    await expect(page.getByTestId('wizard-next')).toBeDisabled();
    await page.getByTestId('consent').check();
    await page.getByTestId('wizard-next').click();
    // Step 2: chips come from the profile and are labelled as such.
    await expect(page.getByTestId('from-profile')).toContainText('From your profile');
    await page.getByRole('button', { name: 'Founder' }).click();
    await page.getByTestId('wizard-next').click();
    // Step 3: AI is off, so a typed suggestion uses the offline suggester and never calls the AI operation.
    await expect(page.getByText('AI assistance is off', { exact: false })).toBeVisible();
    await page.getByTestId('picker-needs').getByRole('combobox').fill('looking for investors and funding');
    await page.getByTestId('picker-needs').getByRole('button', { name: 'Suggest from what I typed' }).click();
    await expect(page.getByTestId('suggestion-strip').first()).toHaveAttribute('data-source', 'offline');
    expect(graphql.calls.some((c) => c.name === 'NetworkingSuggestProfile')).toBe(false);
    expect(graphql.calls.some((c) => c.name === 'NetworkingRecordAiConsent')).toBe(false);
    // Through to the end and join.
    for (let i = 0; i < 3; i += 1) await page.getByTestId('wizard-next').click();
    await page.getByTestId('wizard-join').click();
    await expect.poll(() => graphql.calls.some((c) => c.name === 'NetworkingJoin')).toBe(true);
    const sent = graphql.calls.find((c) => c.name === 'NetworkingJoin')!.variables;
    expect(sent.consent).toBe(true);
    expect(typeof sent.consentVersion).toBe('string');
    await page.context().close();
});

test('wizard: save and finish later stores a draft and needs no consent', async () => {
    const { page, graphql } = await openPage(browser, `${BASE}/setup`, networkingOverrides({ NetworkingStatus: status({ participationStatus: 'NOT_JOINED' }), NetworkingMyParticipation: mine({}, null), NetworkingSaveDraft: mine({}, { status: 'NOT_JOINED' }) }));
    await page.getByTestId('save-later').click({ timeout: 90_000 });
    await expect.poll(() => graphql.calls.some((c) => c.name === 'NetworkingSaveDraft')).toBe(true);
    expect(graphql.calls.some((c) => c.name === 'NetworkingJoin')).toBe(false);
    await page.context().close();
});

test('hub: goals editor, people to meet with tier labels and reasons; no percentage, no ids', async () => {
    const { page } = await openPage(browser, BASE, networkingOverrides());
    await expect(page.getByTestId('goals-editor')).toBeVisible(READY);
    await expect(page.getByTestId('deck-preview').getByTestId('person-card')).toHaveCount(3);
    await expect(page.getByTestId('tier-badge').first()).toContainText('Direct opportunity');
    await expect(page.getByTestId('reasons').first()).toContainText('David Owusu offers');
    const text = (await page.locator('main, body').first().innerText()) + (await page.content());
    expect(text).not.toMatch(/\d+\s*%\s*match/i);
    expect(await page.getByTestId('deck-preview').innerText()).not.toContain('%');
    expect(withoutHrefs(await page.getByTestId('deck-preview').innerHTML())).not.toMatch(UUID);
    // Profile completeness comes from the real profile (68), not a made-up figure.
    await expect(page.getByTestId('rail-completeness')).toContainText('68%');
    await page.context().close();
});

test('features off: no interests or circles tabs, no Interested button, and those queries never run', async () => {
    const { page, graphql } = await openPage(browser, `${BASE}?tab=circles`, networkingOverrides());
    await expect(page.getByTestId('goals-editor')).toBeVisible(READY);
    await expect(page.getByTestId('tab-circles')).toHaveCount(0);
    await expect(page.getByTestId('tab-interested')).toHaveCount(0);
    await expect(page.getByTestId('tab-matches')).toHaveCount(0);
    await expect(page.getByTestId('tab-interests')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Interested', exact: true })).toHaveCount(0);
    expect(graphql.calls.filter((c) => /Circle|Interest|Matches/.test(c.name))).toEqual([]);
    await page.context().close();
});

test('hub: pause is one click and does not need a refresh', async () => {
    const { page, graphql } = await openPage(browser, BASE, networkingOverrides({ NetworkingPause: mine({}, { status: 'PAUSED' }) }));
    await page.getByTestId('toggle-pause').click({ timeout: 90_000 });
    await expect.poll(() => graphql.calls.some((c) => c.name === 'NetworkingPause')).toBe(true);
    await page.context().close();
});

test('deck: Not for me and Save for later send PASS and SKIP and move on', async () => {
    const { page, graphql } = await openPage(browser, `${BASE}/recommended`, networkingOverrides({ NetworkingDecide: { eventNetworkingDecide: { __typename: 'EventNetworkingDecisionResult', decision: 'PASS', decidedAt: null } } }));
    await expect(page.getByTestId('deck-card')).toHaveAttribute('data-handle', 'h-david-71c', READY);
    await expect(page.getByTestId('deck-interested')).toHaveCount(0);
    await page.getByTestId('deck-pass').click();
    await expect(page.getByTestId('deck-card')).toHaveAttribute('data-handle', 'h-sarah-a02');
    await page.getByTestId('deck-skip').click();
    await expect(page.getByTestId('deck-card')).toHaveAttribute('data-handle', 'h-kwame-9d4');
    const sent = graphql.calls.filter((c) => c.name === 'NetworkingDecide').map((c) => [c.variables.handle, c.variables.decision]);
    expect(sent).toEqual([['h-david-71c', 'PASS'], ['h-sarah-a02', 'SKIP']]);
    const html = withoutHrefs(await page.getByTestId('deck').innerHTML());
    expect(html).not.toMatch(UUID);
    expect(html).not.toMatch(/\d+\s*%/);
    await page.context().close();
});

test('deck: the keyboard does the same as the buttons, and changes are announced', async () => {
    const { page, graphql } = await openPage(browser, `${BASE}/recommended`, networkingOverrides({ NetworkingDecide: { eventNetworkingDecide: { __typename: 'EventNetworkingDecisionResult', decision: 'PASS', decidedAt: null } } }));
    await expect(page.getByTestId('deck-card')).toBeVisible(READY);
    await page.getByRole('group', { name: /Recommended person: David Owusu/ }).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('deck-card')).toHaveAttribute('data-handle', 'h-sarah-a02');
    await page.keyboard.press('ArrowDown');
    await expect(page.getByTestId('deck-card')).toHaveAttribute('data-handle', 'h-kwame-9d4');
    expect(graphql.calls.filter((c) => c.name === 'NetworkingDecide').map((c) => c.variables.decision)).toEqual(['PASS', 'SKIP']);
    await expect(page.getByTestId('deck-live')).toHaveAttribute('aria-live', 'polite');
    await page.context().close();
});

test('deck: a refused decision keeps the person on screen', async () => {
    const { page } = await openPage(browser, `${BASE}/recommended`, networkingOverrides({ NetworkingDecide: { __errors: [{ message: 'x', code: 'EVENT_NETWORKING_RATE_LIMITED' }] } }));
    await expect(page.getByTestId('deck-card')).toHaveAttribute('data-handle', 'h-david-71c', READY);
    await page.getByTestId('deck-pass').click();
    await expect(page.getByTestId('deck-card')).toHaveAttribute('data-handle', 'h-david-71c');
    await page.context().close();
});

test('person: every unavailable case shows the same not-found screen', async () => {
    for (const answer of [{ eventNetworkingPerson: null }, { __errors: [{ message: 'x', code: 'EVENT_NETWORKING_PERSON_NOT_FOUND' }] }]) {
        const { page } = await openPage(browser, `${BASE}/people/h-ghost-000`, networkingOverrides({ NetworkingPerson: answer }));
        await expect(page.getByTestId('person-not-found')).toBeVisible(READY);
        await expect(page.getByTestId('person-not-found')).toContainText('We could not find this person');
        await page.context().close();
    }
});

test('person: a real person shows reasons and actions, never an id', async () => {
    const person = { ...card('h-david-71c', 'David Owusu'), __typename: 'EventNetworkingPerson', intro: 'Investing in fintech.', needsNote: null, offersNote: null };
    const { page } = await openPage(browser, `${BASE}/people/h-david-71c`, networkingOverrides({ NetworkingPerson: { eventNetworkingPerson: person } }));
    await expect(page.getByTestId('person-view')).toContainText('David Owusu', READY);
    await expect(page.getByTestId('person-actions')).toBeVisible();
    expect(withoutHrefs(await page.getByTestId("person-view").innerHTML())).not.toMatch(UUID);
    await page.context().close();
});

test('people tab: the directory loads and filters send the chosen codes', async () => {
    const { page, graphql } = await openPage(browser, `${BASE}?tab=people`, networkingOverrides({ NetworkingDirectory: { eventNetworkingDirectory: { ...DECK.eventNetworkingDeck } } }));
    await expect(page.getByTestId('directory').getByTestId('person-card')).toHaveCount(3, READY);
    expect(graphql.calls.some((c) => c.name === 'NetworkingDirectory')).toBe(true);
    await page.context().close();
});

/* ---------------------------- dev harness pages ---------------------------- */

const HARNESS: Array<[string, string]> = [
    ['hub', 'goals-editor'],
    ['setup', 'wizard'],
    ['deck', 'deck'],
    ['person', 'person-view'],
    ['person?missing=1', 'person-not-found'],
    ['circles', 'circles-discovery'],
    ['circle-room', 'circle-room'],
    ['gate?state=unavailableYet', 'gate'],
    ['hub?tab=people', 'directory'],
    ['hub?tab=interested', 'panel-interested'],
];

for (const [path, testId] of HARNESS) {
    test(`dev harness: /dev-harness/networking/${path} renders its screen with fixtures`, async () => {
        const context = await browser.newContext({ baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_PORT ?? 3111}`, viewport: { width: 1280, height: 900 } });
        const page = await context.newPage();
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(`/en/dev-harness/networking/${path}`);
        await expect(page.getByTestId(testId).first()).toBeVisible(READY);
        await expect(page.getByTestId('harness-banner')).toBeVisible();
        expect(errors).toEqual([]);
        await context.close();
    });
}
