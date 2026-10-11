/**
 * Interests, matches, Connect, block and report against the in-memory GraphQL double.
 * The hidden-sender confirm step, the sender's three states (never "declined"), the
 * recipient's Accept / Not now, "Already connected", Block (confirmed) and Report
 * (reason + details, case reference shown).
 */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { openPage } from '../support/eventFixtures';
import { EVENT_ID, UUID, card, mine, networkingOverrides, DECK } from '../support/networkingFixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const BASE = `/events/${EVENT_ID}/networking`;
const READY = { timeout: 90_000 };
const withoutHrefs = (html: string) => html.replace(/href="[^"]*"/g, '');

const sent = (over: Record<string, unknown> = {}) => ({ eventNetworkingExpressInterest: { __typename: 'EventNetworkingInterestResult', success: true, matched: false, profileRevealed: false, ...over } });
const calls = (g: { calls: Array<{ name: string; variables: Record<string, unknown> }> }, name: string) => g.calls.filter((c) => c.name === name);
const hiddenMine = () => mine({}, { visibility: 'HIDDEN' });

test('visible sender: Interested sends straight away, no confirm step', async () => {
    const { page, graphql } = await openPage(browser, `${BASE}/recommended`, networkingOverrides({ NetworkingExpressInterest: sent() }));
    await expect(page.getByTestId('deck-card')).toHaveAttribute('data-handle', 'h-david-71c', READY);
    await page.getByTestId('deck-interested').click();
    await expect(page.getByTestId('deck-card')).toHaveAttribute('data-handle', 'h-sarah-a02');
    await expect(page.getByTestId('reveal-confirm')).toHaveCount(0);
    const c = calls(graphql, 'NetworkingExpressInterest');
    expect(c).toHaveLength(1);
    expect(c[0].variables.handle).toBe('h-david-71c');
    expect(c[0].variables.acknowledgeProfileReveal ?? null).toBeNull();
    await page.context().close();
});

test('hidden sender: the confirm step comes first, cancel sends nothing, confirm sends with the acknowledgement', async () => {
    const { page, graphql } = await openPage(browser, `${BASE}/recommended`, networkingOverrides({ NetworkingMyParticipation: hiddenMine(), NetworkingExpressInterest: sent({ profileRevealed: true }) }));
    await expect(page.getByTestId('deck-card')).toHaveAttribute('data-handle', 'h-david-71c', READY);
    await page.getByTestId('deck-interested').click();
    await expect(page.getByTestId('reveal-confirm')).toContainText('Sending an interest reveals your profile to this person');
    expect(calls(graphql, 'NetworkingExpressInterest')).toHaveLength(0);
    await page.getByTestId('reveal-cancel').click();
    await expect(page.getByTestId('reveal-confirm')).toHaveCount(0);
    await expect(page.getByTestId('deck-card')).toHaveAttribute('data-handle', 'h-david-71c');
    expect(calls(graphql, 'NetworkingExpressInterest')).toHaveLength(0);

    await page.getByTestId('deck-interested').click();
    await page.getByTestId('reveal-send').click();
    await expect(page.getByTestId('deck-card')).toHaveAttribute('data-handle', 'h-sarah-a02');
    const c = calls(graphql, 'NetworkingExpressInterest');
    expect(c).toHaveLength(1);
    expect(c[0].variables.acknowledgeProfileReveal).toBe(true);
    await page.context().close();
});

test('a server that asks for the confirmation shows the confirm step, then resends acknowledged', async () => {
    let n = 0;
    const answer = (v: Record<string, unknown>) => (v.acknowledgeProfileReveal ? sent() : (n += 1, { __errors: [{ message: 'x', code: 'EVENT_NETWORKING_REVEAL_CONFIRMATION_REQUIRED' }] }));
    const { page, graphql } = await openPage(browser, `${BASE}/recommended`, networkingOverrides({ NetworkingExpressInterest: answer as never }));
    await expect(page.getByTestId('deck-card')).toBeVisible(READY);
    await page.getByTestId('deck-interested').click();
    await expect(page.getByTestId('reveal-confirm')).toBeVisible();
    await page.getByTestId('reveal-send').click();
    await expect(page.getByTestId('deck-card')).toHaveAttribute('data-handle', 'h-sarah-a02');
    expect(calls(graphql, 'NetworkingExpressInterest').map((c) => c.variables.acknowledgeProfileReveal ?? false)).toEqual([false, true]);
    expect(n).toBe(1);
    await page.context().close();
});

const SENT = {
    eventNetworkingMyInterests: {
        __typename: 'EventNetworkingSentInterestPage', nextCursor: null, pendingCount: 1,
        interests: [
            { __typename: 'EventNetworkingSentInterest', handle: 'h-david-71c', status: 'PENDING', note: null, sentAt: null, expiresAt: null, personAvailable: true, card: card('h-david-71c', 'David Owusu') },
            { __typename: 'EventNetworkingSentInterest', handle: 'h-sarah-a02', status: 'MUTUAL', note: null, sentAt: null, expiresAt: null, personAvailable: true, card: card('h-sarah-a02', 'Sarah Mensah') },
            { __typename: 'EventNetworkingSentInterest', handle: 'h-kwame-9d4', status: 'EXPIRED', note: null, sentAt: null, expiresAt: null, personAvailable: true, card: card('h-kwame-9d4', 'Kwame Asante') },
            { __typename: 'EventNetworkingSentInterest', handle: 'h-gone-000', status: 'PENDING', note: null, sentAt: null, expiresAt: null, personAvailable: false, card: null },
        ],
    },
};

test('my interests: only Pending / Mutual / Expired, never declined wording; withdraw on pending', async () => {
    const { page, graphql } = await openPage(browser, `${BASE}?tab=interests`, networkingOverrides({ NetworkingMyInterests: SENT, NetworkingWithdrawInterest: { eventNetworkingWithdrawInterest: { __typename: 'EventNetworkingActionResult', success: true } } }));
    await expect(page.getByTestId('panel-interests').getByTestId('person-card')).toHaveCount(3, READY);
    await expect(page.getByTestId('interest-unavailable')).toHaveCount(1);
    const statuses = await page.getByTestId('interest-status').evaluateAll((els) => els.map((e) => e.getAttribute('data-status')));
    expect(statuses).toEqual(['PENDING', 'MUTUAL', 'EXPIRED', 'PENDING']);
    // Withdraw exists on the pending ones only.
    await expect(page.getByTestId('interest-withdraw')).toHaveCount(2);
    const html = await page.getByTestId('panel-interests').innerText();
    expect(html).not.toMatch(/declin|rejected|turned down|not interested|said no/i);
    expect(withoutHrefs(await page.getByTestId('panel-interests').innerHTML())).not.toMatch(UUID);
    await page.getByTestId('panel-interests').getByTestId('person-card').first().getByTestId('interest-withdraw').click();
    await expect(page.getByTestId('panel-interests').getByTestId('person-card')).toHaveCount(2);
    expect(calls(graphql, 'NetworkingWithdrawInterest').map((c) => c.variables.handle)).toEqual(['h-david-71c']);
    await page.context().close();
});

const INBOUND = { eventNetworkingInterestedInMe: { __typename: 'EventNetworkingIncomingInterestPage', nextCursor: null, total: 2, cards: DECK.eventNetworkingDeck.cards.slice(0, 2) } };

test('interested in you: Accept answers accept, Not now answers decline; copy is for the recipient only', async () => {
    const { page, graphql } = await openPage(browser, `${BASE}?tab=interested`, networkingOverrides({ NetworkingInterestedInMe: INBOUND, NetworkingRespondToInterest: (v: Record<string, unknown>) => ({ eventNetworkingRespondToInterest: { __typename: 'EventNetworkingRespondResult', success: true, matched: v.accept === true } }) as never }));
    await expect(page.getByTestId('panel-interested').getByTestId('person-card')).toHaveCount(2, READY);
    await page.getByTestId('inbox-accept').first().click();
    await expect(page.getByText("It's a match with David Owusu!")).toBeVisible();
    await expect(page.getByTestId('panel-interested').getByTestId('person-card')).toHaveCount(1);
    await page.getByTestId('inbox-not-now').first().click();
    await expect(page.getByText("This person won't be shown here again.", { exact: false })).toBeVisible();
    await expect(page.getByTestId('panel-interested').getByTestId('person-card')).toHaveCount(0);
    expect(calls(graphql, 'NetworkingRespondToInterest').map((c) => [c.variables.handle, c.variables.accept])).toEqual([['h-david-71c', true], ['h-sarah-a02', false]]);
    await page.context().close();
});

const MATCHES = (cards: unknown[]) => ({ eventNetworkingMyMatches: { __typename: 'EventNetworkingMatchPage', nextCursor: null, total: cards.length, matches: cards.map((c) => ({ __typename: 'EventNetworkingMatch', matchedAt: null, card: c })) } });

test('my matches: Connect, "Already connected" when it pre-existed, Message only with a profile link', async () => {
    const withName = card('h-david-71c', 'David Owusu', { username: 'david' });
    const noName = card('h-sarah-a02', 'Sarah Mensah');
    const { page, graphql } = await openPage(browser, `${BASE}?tab=matches`, networkingOverrides({
        NetworkingMyMatches: MATCHES([withName, noName]),
        NetworkingConnect: (v: Record<string, unknown>) => ({ eventNetworkingConnect: { __typename: 'EventNetworkingConnectResult', success: true, connectionStatus: 'CONNECTED', preExisting: v.handle === 'h-david-71c' } }) as never,
    }));
    const cards = page.getByTestId('panel-matches').getByTestId('person-card');
    await expect(cards).toHaveCount(2, READY);
    await expect(page.getByTestId('match-message')).toHaveCount(1);
    await expect(page.getByTestId('match-message')).toHaveAttribute('href', /\/@david$/);
    await cards.nth(0).getByTestId('match-connect').click();
    await expect(cards.nth(0).getByTestId('match-actions')).toContainText('Already connected');
    await cards.nth(1).getByTestId('match-connect').click();
    await expect(cards.nth(1).getByTestId('match-actions')).toContainText('Connected');
    expect(calls(graphql, 'NetworkingConnect').map((c) => c.variables.handle)).toEqual(['h-david-71c', 'h-sarah-a02']);
    await page.context().close();
});

test('block: asks first, then blocks and the person leaves the list', async () => {
    const { page, graphql } = await openPage(browser, `${BASE}/recommended`, networkingOverrides({ NetworkingBlock: { eventNetworkingBlock: { __typename: 'EventNetworkingActionResult', success: true } } }));
    await expect(page.getByTestId('deck-card')).toHaveAttribute('data-handle', 'h-david-71c', READY);
    await page.getByTestId('deck-card').getByTestId('safety-menu').click();
    await page.getByTestId('safety-block').click();
    await expect(page.getByTestId('block-dialog')).toContainText('Block David Owusu?');
    expect(calls(graphql, 'NetworkingBlock')).toHaveLength(0);
    await page.getByTestId('block-confirm').click();
    await expect(page.getByTestId('deck-card')).toHaveAttribute('data-handle', 'h-sarah-a02');
    expect(calls(graphql, 'NetworkingBlock').map((c) => c.variables.handle)).toEqual(['h-david-71c']);
    await page.context().close();
});

test('report: needs a reason, sends details, shows the case reference', async () => {
    const person = { ...card('h-david-71c', 'David Owusu'), __typename: 'EventNetworkingPerson', intro: null, needsNote: null, offersNote: null };
    const { page, graphql } = await openPage(browser, `${BASE}/people/h-david-71c`, networkingOverrides({
        NetworkingPerson: { eventNetworkingPerson: person },
        NetworkingReport: { eventNetworkingReport: { __typename: 'EventNetworkingReportResult', success: true, caseNumber: 'DP-2030-0042' } },
    }));
    await expect(page.getByTestId('person-view')).toBeVisible(READY);
    await page.getByTestId('person-view').getByTestId('safety-menu').click();
    await page.getByTestId('safety-report').click();
    await expect(page.getByTestId('report-submit')).toBeDisabled();
    await page.getByLabel('Harassment').check();
    await page.getByTestId('report-details').fill('x'.repeat(1200));
    expect(await page.getByTestId('report-details').inputValue()).toHaveLength(1000);
    await page.getByTestId('report-details').fill('Repeated unwanted messages.');
    await page.getByTestId('report-submit').click();
    await expect(page.getByTestId('report-case')).toContainText('DP-2030-0042');
    const c = calls(graphql, 'NetworkingReport');
    expect(c).toHaveLength(1);
    expect(c[0].variables).toMatchObject({ handle: 'h-david-71c', reason: 'HARASSMENT', details: 'Repeated unwanted messages.' });
    await page.context().close();
});

test('report: a refusal is shown inside the dialog and nothing claims success', async () => {
    const person = { ...card('h-david-71c', 'David Owusu'), __typename: 'EventNetworkingPerson', intro: null, needsNote: null, offersNote: null };
    const { page } = await openPage(browser, `${BASE}/people/h-david-71c`, networkingOverrides({ NetworkingPerson: { eventNetworkingPerson: person }, NetworkingReport: { __errors: [{ message: 'x', code: 'EVENT_NETWORKING_RATE_LIMITED' }] } }));
    await expect(page.getByTestId('person-view')).toBeVisible(READY);
    await page.getByTestId('person-view').getByTestId('safety-menu').click();
    await page.getByTestId('safety-report').click();
    await page.getByLabel('Spam').check();
    await page.getByTestId('report-submit').click();
    await expect(page.getByTestId('report-error')).toContainText('too often');
    await expect(page.getByTestId('report-case')).toHaveCount(0);
    await page.context().close();
});
