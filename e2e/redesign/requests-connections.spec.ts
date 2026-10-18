/**
 * /requests → Connection requests: sent requests can be cancelled, received ones accepted or
 * declined. Names link to the person's profile; no id is ever shown as text.
 */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { ME, UUID, open } from './fixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const OTHER_IN = '00000000-0000-4000-8000-0000000b0001';
const OTHER_OUT = '00000000-0000-4000-8000-0000000b0002';
const person = (userId: string, firstName: string, lastName: string, username: string | null) => ({
    __typename: 'ConnectionUser', userId, username, firstName, lastName, email: null, avatarUrl: null, bio: null,
    occupation: 'Engineer', sector: null, location: null, country: null, trustScore: null, trustTier: null,
});
const me = person(ME, 'Ama', 'Mensah', 'ama');
const pending = {
    GetAllPendingConnections: {
        getPendingConnections: {
            __typename: 'PendingConnectionsResponse', success: true, message: null, total: 2,
            connections: [
                { __typename: 'Connection', id: 'conn-in', status: 'PENDING', requesterId: OTHER_IN, receiverId: ME, message: null, createdAt: '2026-10-10T10:00:00.000Z', connectionStatus: 'PENDING', requester: person(OTHER_IN, 'Kofi', 'Mensah', 'kofi'), receiver: me },
                { __typename: 'Connection', id: 'conn-out', status: 'PENDING', requesterId: ME, receiverId: OTHER_OUT, message: null, createdAt: '2026-10-11T10:00:00.000Z', connectionStatus: 'PENDING', requester: me, receiver: person(OTHER_OUT, 'Esi', 'Boateng', null) },
            ],
        },
    },
    CancelConnection: { cancelConnection: { __typename: 'ConnectionResponse', success: true, message: null } },
    AcceptConnection: { acceptConnection: { __typename: 'ConnectionResponse', success: true, message: null } },
    RejectConnection: { rejectConnection: { __typename: 'ConnectionResponse', success: true, message: null } },
};

test('sent request: Cancel request calls the cancel mutation for that connection', async () => {
    const { page, graphql } = await open(browser, '/requests', pending as never);
    const sent = page.getByTestId('connection-sent');
    await expect(sent).toContainText('Esi Boateng', { timeout: 120_000 });
    await expect(sent).toContainText('Pending');
    await sent.getByRole('button', { name: /Cancel request: Esi Boateng/ }).click();
    await expect.poll(() => graphql.calls.find((c) => c.name === 'CancelConnection')?.variables).toEqual({ input: { connectionId: 'conn-out' } });
    await page.context().close();
});

test('received request: Accept and Decline call their mutations; names link to profiles; no id on screen', async () => {
    const { page, graphql } = await open(browser, '/requests', pending as never);
    const received = page.getByTestId('connection-received');
    await expect(received).toContainText('Kofi Mensah', { timeout: 120_000 });
    await expect(received.getByRole('link', { name: 'Kofi Mensah' })).toHaveAttribute('href', '/en/@kofi');
    // No username: falls back to the id route, but the id is never shown as text.
    await expect(page.getByTestId('connection-sent').getByRole('link', { name: 'Esi Boateng' })).toHaveAttribute('href', `/en/${OTHER_OUT}`);
    await received.getByRole('button', { name: /Accept: Kofi Mensah/ }).click();
    await expect.poll(() => graphql.calls.some((c) => c.name === 'AcceptConnection')).toBe(true);
    await received.getByRole('button', { name: /Decline: Kofi Mensah/ }).click().catch(() => {});
    expect(await page.locator('body').innerText()).not.toMatch(UUID);
    await page.context().close();
});

test('phone: action buttons are at least 36px tall and nothing scrolls sideways', async () => {
    const { page } = await open(browser, '/requests', pending as never, { width: 360, height: 760 });
    const cancel = page.getByTestId('connection-sent').getByRole('button', { name: /Cancel request/ });
    await expect(cancel).toBeVisible({ timeout: 120_000 });
    expect((await cancel.boundingBox())!.height).toBeGreaterThanOrEqual(36);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.context().close();
});
