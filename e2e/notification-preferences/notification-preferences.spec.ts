/**
 * Settings → Notifications (email / SMS / push) on the isolated harness
 * (`/en/dev-harness/notification-preferences`): the REAL section, with GraphQL
 * answered here via page.route. The switches must show the server's values and
 * nothing else — loading, error + retry, saved, refused — and only move after
 * the server has answered and been re-read. Every email's "Notification
 * preferences" link lands on this section, so it is the working opt-out.
 */
import { test, expect, type Browser, type Page, type Route } from '@playwright/test';
import { openBrowser } from '../support/browser';

const HARNESS = '/en/dev-harness/notification-preferences';
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser.close();
});

type Op = { name: string; variables: Record<string, unknown> };
type Responder = (op: Op) => unknown | Promise<unknown>;
type Prefs = { email: boolean; push: boolean; sms: boolean };

/** A GraphQL double keyed by operation name; records every operation sent. */
function fakeServer(handlers: Record<string, Responder>) {
    const ops: Op[] = [];
    async function handle(route: Route) {
        const body = route.request().postDataJSON() as { operationName?: string; variables?: Record<string, unknown> };
        const op = { name: body?.operationName ?? '', variables: body?.variables ?? {} };
        ops.push(op);
        const handler = handlers[op.name];
        const result = handler ? await handler(op) : { data: null };
        const payload =
            result && typeof result === 'object' && ('data' in (result as object) || 'errors' in (result as object))
                ? result
                : { data: result };
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
    }
    return { handle, ops, calls: (name: string) => ops.filter((o) => o.name === name) };
}

const read = (p: Prefs) => ({
    myNotificationPreferences: { __typename: 'NotificationChannelPreferences', ...p },
});
const saved = (p: Prefs) => ({
    updateMyNotificationPreferences: { __typename: 'NotificationChannelPreferences', ...p },
});
const failure = (message: string) => ({ data: null, errors: [{ message, extensions: { code: 'INTERNAL_SERVER_ERROR' } }] });

async function open(server: ReturnType<typeof fakeServer>): Promise<Page> {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
    const page = await context.newPage();
    await page.route('**/graphql', server.handle);
    await page.goto(HARNESS, { waitUntil: 'load' });
    await expect(page.getByTestId('harness-ready')).toBeVisible({ timeout: 90_000 });
    return page;
}

const sw = (p: Page, channel: 'email' | 'sms' | 'push') => p.getByTestId(`notification-${channel}-switch`);

test('while the settings load every switch is disabled and OFF — never a guessed value', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const page = await open(
        fakeServer({
            MyNotificationPreferences: async () => {
                await gate;
                return read({ email: true, push: true, sms: false });
            },
        }),
    );

    await expect(page.getByTestId('notification-preferences-status')).toContainText('Checking');
    for (const c of ['email', 'sms', 'push'] as const) {
        await expect(sw(page, c)).toBeDisabled();
        await expect(sw(page, c)).toHaveAttribute('aria-checked', 'false');
    }

    release();
    await expect(sw(page, 'email')).toHaveAttribute('aria-checked', 'true');
    await expect(sw(page, 'push')).toHaveAttribute('aria-checked', 'true');
    await expect(sw(page, 'sms')).toHaveAttribute('aria-checked', 'false');
    await expect(sw(page, 'email')).toBeEnabled();
    // People are told what the switches cannot turn off.
    await expect(page.getByTestId('notification-preferences-note')).toContainText(
        'Security, account, payment and legal messages are always sent.',
    );
    await page.context().close();
});

test('a failed read shows a translated error + Retry, switches stay disabled/off; Retry recovers', async () => {
    let attempts = 0;
    const page = await open(
        fakeServer({
            MyNotificationPreferences: () => {
                attempts += 1;
                return attempts === 1
                    ? failure('Your notification settings are temporarily unavailable')
                    : read({ email: false, push: true, sms: false });
            },
        }),
    );

    await expect(page.getByTestId('notification-preferences-error')).toContainText(
        'We couldn’t load your notification settings.',
    );
    await expect(sw(page, 'push')).toBeDisabled();
    await expect(sw(page, 'push')).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByText('Something went wrong. Please try again.')).toHaveCount(0);

    await page.getByTestId('notification-preferences-retry').click();
    await expect(sw(page, 'push')).toHaveAttribute('aria-checked', 'true');
    await expect(sw(page, 'email')).toHaveAttribute('aria-checked', 'false');
    await page.context().close();
});

test('turning email off sends only that channel, moves only after the server answers, and is re-read', async () => {
    let prefs: Prefs = { email: true, push: true, sms: false };
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const server = fakeServer({
        MyNotificationPreferences: () => read(prefs),
        UpdateMyNotificationPreferences: async (op) => {
            await gate;
            prefs = { ...prefs, ...(op.variables.input as Partial<Prefs>) };
            return saved(prefs);
        },
    });
    const page = await open(server);
    await expect(sw(page, 'email')).toHaveAttribute('aria-checked', 'true');

    await sw(page, 'email').click();
    // Saving: every switch disabled, email still shows the server's last answer.
    await expect(sw(page, 'email')).toBeDisabled();
    await expect(sw(page, 'push')).toBeDisabled();
    await expect(sw(page, 'email')).toHaveAttribute('aria-checked', 'true');
    expect(server.calls('UpdateMyNotificationPreferences').map((o) => o.variables)).toEqual([
        { input: { email: false } },
    ]);

    release();
    await expect(page.getByText('Notification settings saved.')).toBeVisible();
    await expect(sw(page, 'email')).toHaveAttribute('aria-checked', 'false');
    await expect(sw(page, 'push')).toHaveAttribute('aria-checked', 'true');
    await expect(sw(page, 'email')).toBeEnabled();
    expect(server.calls('MyNotificationPreferences').length).toBeGreaterThanOrEqual(2);

    expect(await page.locator('body').innerText()).not.toMatch(UUID_RE);
    await page.context().close();
});

test('every channel can be turned off — a complete opt-out from optional notifications', async () => {
    let prefs: Prefs = { email: true, push: true, sms: true };
    const page = await open(
        fakeServer({
            MyNotificationPreferences: () => read(prefs),
            UpdateMyNotificationPreferences: (op) => {
                prefs = { ...prefs, ...(op.variables.input as Partial<Prefs>) };
                return saved(prefs);
            },
        }),
    );
    for (const c of ['email', 'sms', 'push'] as const) {
        await expect(sw(page, c)).toBeEnabled();
        await sw(page, c).click();
        await expect(sw(page, c)).toHaveAttribute('aria-checked', 'false');
        await expect(sw(page, c)).toBeEnabled();
    }
    await page.context().close();
});

test('a refused save (resolved with errors, data null) says so and leaves the server value in place', async () => {
    const server = fakeServer({
        MyNotificationPreferences: () => read({ email: true, push: true, sms: false }),
        UpdateMyNotificationPreferences: () => failure('Could not save your notification settings. Please try again.'),
    });
    const page = await open(server);
    await expect(sw(page, 'push')).toHaveAttribute('aria-checked', 'true');

    await sw(page, 'push').click();
    await expect(page.getByText('Couldn’t save your notification settings. Please try again.')).toBeVisible();
    await expect(sw(page, 'push')).toHaveAttribute('aria-checked', 'true');
    await expect(sw(page, 'push')).toBeEnabled();
    await expect(page.getByText('Notification settings saved.')).toHaveCount(0);
    await page.context().close();
});
