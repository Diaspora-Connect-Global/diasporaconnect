/**
 * Two-factor authentication on the isolated harness (`/en/dev-harness/two-factor`):
 * the REAL Settings section and the REAL sign-in form, with GraphQL answered
 * here via page.route. Covers:
 *  - the Settings switch never claims "on" unless the server says so
 *    (loading, error + retry, off, on) and only changes after the server does;
 *  - turning on (password account; OAuth account without a password) and off
 *    (password; emailed code instead), with translated refusals;
 *  - the sign-in code step: wrong / expired / throttled codes, resend with its
 *    cooldown, an expired sign-in, success;
 *  - the Google/Facebook hand-off (?oauth2fa=1 + sessionStorage token).
 */
import { test, expect, type Browser, type BrowserContext, type Page, type Route } from '@playwright/test';
import { openBrowser } from '../support/browser';

const HARNESS = '/en/dev-harness/two-factor';
const USER_ID = '00000000-0000-4000-8000-0000000000a1';
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

/**
 * A GraphQL double keyed by operation name. Each handler returns either
 * `{ data }` / `{ errors }` bodies or a plain `data` object. Every operation is
 * recorded (name + variables) so specs can assert what was sent.
 */
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

const status = (enabled: boolean, passwordRequired = true) => ({
    twoFactorStatus: { __typename: 'TwoFactorStatus', enabled, method: enabled ? 'email' : null, passwordRequired },
});
const ok = (field: string) => ({ [field]: { __typename: 'TwoFactorResponse', success: true, message: 'ok', error: null } });
const refused = (field: string, code: string) => ({
    [field]: { __typename: 'TwoFactorResponse', success: false, message: 'refused', error: code },
});

const signedIn = (field: 'login' | 'completeTwoFactorLogin') => ({
    [field]: {
        __typename: 'LoginResponse',
        success: true,
        message: 'ok',
        sessionToken: 'session-token-1',
        accessToken: 'access-token-1',
        refreshToken: 'refresh-token-1',
        sessionId: 'session-token-1',
        expiresIn: null,
        requiresTwoFactor: false,
        twoFactorToken: null,
        user: { __typename: 'VerifiedUserSummary', id: USER_ID, email: 'ama@example.com', firstName: 'Ama', lastName: 'Mensah', role: 'diaspora', avatarUrl: null },
        deviceMetadata: { __typename: 'DeviceMetadata', fingerprint: 'fp', ipAddress: '203.0.113.9', userAgent: 'ua', deviceId: 'fp' },
        error: null,
    },
});
const loginNeedsCode = {
    login: {
        __typename: 'LoginResponse',
        success: false,
        message: 'Enter the 6-digit code we emailed you',
        sessionToken: null,
        accessToken: null,
        refreshToken: null,
        sessionId: null,
        expiresIn: null,
        requiresTwoFactor: true,
        twoFactorToken: 'pending-2fa-token',
        user: null,
        deviceMetadata: null,
        error: null,
    },
};
const completeRefused = (code: string) => ({
    completeTwoFactorLogin: { ...signedIn('completeTwoFactorLogin').completeTwoFactorLogin, success: false, sessionToken: null, user: null, error: code },
});

async function open(server: ReturnType<typeof fakeServer>, query: string, setup?: (ctx: BrowserContext) => Promise<void>): Promise<Page> {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
    if (setup) await setup(context);
    const page = await context.newPage();
    await page.route('**/graphql', server.handle);
    await page.goto(`${HARNESS}${query}`, { waitUntil: 'load' });
    await expect(page.getByTestId('harness-ready')).toBeVisible({ timeout: 90_000 });
    return page;
}

const sw = (p: Page) => p.getByTestId('two-factor-switch');
// Scoped: Next's route announcer is also role="alert".
const codeError = (p: Page) => p.getByTestId('signin-two-factor').getByRole('alert');
const dialog = (p: Page) => p.getByTestId('two-factor-dialog');
const primary = (p: Page) => p.getByTestId('two-factor-primary');
const typeCode = async (locator: ReturnType<Page['getByTestId']>, code: string) => {
    await locator.click();
    await locator.fill(code);
};

/* ================================ Settings ================================ */

test.describe('Settings switch', () => {
    test('while the status loads the switch is disabled and OFF — never a guessed "on"', async () => {
        let release!: () => void;
        const gate = new Promise<void>((r) => (release = r));
        const server = fakeServer({
            TwoFactorStatus: async () => {
                await gate;
                return status(true);
            },
        });
        const page = await open(server, '?view=settings');

        await expect(page.getByTestId('two-factor-status')).toContainText('Checking');
        await expect(sw(page)).toBeDisabled();
        await expect(sw(page)).toHaveAttribute('aria-checked', 'false');

        release();
        await expect(sw(page)).toHaveAttribute('aria-checked', 'true');
        await expect(sw(page)).toBeEnabled();
        await expect(page.getByTestId('two-factor-status')).toHaveText('On — codes go to your email');
        await page.context().close();
    });

    test('a server that says OFF shows OFF (the old switch said "on" for everyone)', async () => {
        const page = await open(fakeServer({ TwoFactorStatus: () => status(false) }), '?view=settings');
        await expect(page.getByTestId('two-factor-status')).toHaveText('Off');
        await expect(sw(page)).toHaveAttribute('aria-checked', 'false');
        await page.context().close();
    });

    test('a failed status read shows a translated error + Retry, the switch stays disabled/off; Retry recovers', async () => {
        let attempts = 0;
        const server = fakeServer({
            TwoFactorStatus: () => {
                attempts += 1;
                return attempts === 1
                    ? { data: null, errors: [{ message: 'Two-factor status is temporarily unavailable', extensions: { code: 'TWO_FACTOR_UNAVAILABLE' } }] }
                    : status(true);
            },
        });
        const page = await open(server, '?view=settings');

        await expect(page.getByTestId('two-factor-error')).toContainText("We couldn't check your two-factor authentication setting.");
        await expect(sw(page)).toBeDisabled();
        await expect(sw(page)).toHaveAttribute('aria-checked', 'false');
        // The page shows its own message, not the global "Something went wrong" toast.
        await expect(page.getByText('Something went wrong. Please try again.')).toHaveCount(0);

        await page.getByTestId('two-factor-retry').click();
        await expect(sw(page)).toHaveAttribute('aria-checked', 'true');
        await page.context().close();
    });

    test('turn ON (password account): wrong password, wrong code, then success — switch flips only after the server', async () => {
        let enabled = false;
        const server = fakeServer({
            TwoFactorStatus: () => status(enabled),
            EnableTwoFactor: (op) =>
                op.variables.password === 'right-password' ? ok('enableTwoFactor') : refused('enableTwoFactor', 'TWO_FACTOR_PASSWORD_INVALID'),
            ConfirmTwoFactor: (op) => {
                if (op.variables.code !== '246810') return refused('verifyTwoFactor', 'TWO_FACTOR_CODE_INVALID');
                enabled = true;
                return ok('verifyTwoFactor');
            },
        });
        const page = await open(server, '?view=settings');
        await expect(sw(page)).toHaveAttribute('aria-checked', 'false');

        await sw(page).click();
        await expect(dialog(page)).toContainText('Turn on two-factor authentication');
        // Opening the dialog does not flip the switch.
        await expect(sw(page)).toHaveAttribute('aria-checked', 'false');

        await page.getByTestId('two-factor-password').fill('wrong-password');
        await primary(page).click();
        await expect(page.getByTestId('two-factor-form-error')).toHaveText("That password isn't right.");

        await page.getByTestId('two-factor-password').fill('right-password');
        await primary(page).click();
        await expect(page.getByTestId('two-factor-info')).toHaveText('We emailed you a 6-digit code.');

        await typeCode(page.getByTestId('two-factor-code'), '111111');
        await primary(page).click();
        await expect(page.getByTestId('two-factor-form-error')).toHaveText("That code isn't right. Check the email and try again.");
        await expect(sw(page)).toHaveAttribute('aria-checked', 'false');

        await typeCode(page.getByTestId('two-factor-code'), '246810');
        await primary(page).click();
        await expect(dialog(page)).toHaveCount(0);
        await expect(sw(page)).toHaveAttribute('aria-checked', 'true');

        // The status was RE-READ after the change, not assumed.
        expect(server.calls('TwoFactorStatus').length).toBeGreaterThanOrEqual(2);
        await page.context().close();
    });

    test('turn ON (Google/Facebook account): no password asked — the emailed code is the proof', async () => {
        let enabled = false;
        const server = fakeServer({
            TwoFactorStatus: () => status(enabled, false),
            EnableTwoFactor: () => ok('enableTwoFactor'),
            ConfirmTwoFactor: () => {
                enabled = true;
                return ok('verifyTwoFactor');
            },
        });
        const page = await open(server, '?view=settings');

        await sw(page).click();
        await expect(page.getByTestId('two-factor-password')).toHaveCount(0);
        await primary(page).click();
        await typeCode(page.getByTestId('two-factor-code'), '135790');
        await primary(page).click();
        await expect(sw(page)).toHaveAttribute('aria-checked', 'true');
        expect(server.calls('EnableTwoFactor')[0].variables.password).toBeNull();
        await page.context().close();
    });

    test('turn OFF with the password', async () => {
        let enabled = true;
        const server = fakeServer({
            TwoFactorStatus: () => status(enabled),
            DisableTwoFactor: (op) => {
                if (op.variables.password !== 'right-password') return refused('disableTwoFactor', 'TWO_FACTOR_PASSWORD_INVALID');
                enabled = false;
                return ok('disableTwoFactor');
            },
        });
        const page = await open(server, '?view=settings');
        await expect(sw(page)).toHaveAttribute('aria-checked', 'true');

        await sw(page).click();
        await expect(dialog(page)).toContainText('Turn off two-factor authentication');
        await primary(page).click(); // empty password
        await expect(page.getByTestId('two-factor-form-error')).toHaveText('Enter your password.');
        expect(server.calls('DisableTwoFactor')).toHaveLength(0);

        await page.getByTestId('two-factor-password').fill('right-password');
        await primary(page).click();
        await expect(sw(page)).toHaveAttribute('aria-checked', 'false');
        await page.context().close();
    });

    test('turn OFF with an emailed code instead; an expired code and a throttled attempt are explained', async () => {
        let enabled = true;
        let disableCalls = 0;
        const server = fakeServer({
            TwoFactorStatus: () => status(enabled),
            SendTwoFactorDisableCode: () => ok('sendTwoFactorDisableCode'),
            DisableTwoFactor: (op) => {
                disableCalls += 1;
                if (disableCalls === 1) return refused('disableTwoFactor', 'TWO_FACTOR_CODE_EXPIRED');
                if (disableCalls === 2) return { data: null, errors: [{ message: 'ThrottlerException: Too Many Requests' }] };
                expect(op.variables).toEqual({ password: null, code: '975310' });
                enabled = false;
                return ok('disableTwoFactor');
            },
        });
        const page = await open(server, '?view=settings');

        await sw(page).click();
        await page.getByTestId('two-factor-use-code').click();
        await expect(page.getByTestId('two-factor-info')).toHaveText('We emailed you a 6-digit code.');

        await typeCode(page.getByTestId('two-factor-code'), '975310');
        await primary(page).click();
        await expect(page.getByTestId('two-factor-form-error')).toHaveText('That code has expired. Send a new one.');

        await typeCode(page.getByTestId('two-factor-code'), '975310');
        await primary(page).click();
        await expect(page.getByTestId('two-factor-form-error')).toHaveText('Too many attempts. Wait 15 minutes, then try again.');

        await primary(page).click();
        await expect(sw(page)).toHaveAttribute('aria-checked', 'false');
        await page.context().close();
    });

    test('German locale uses the formal register', async () => {
        const server = fakeServer({ TwoFactorStatus: () => status(false) });
        const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
        const page = await context.newPage();
        await page.route('**/graphql', server.handle);
        await page.goto('/de/dev-harness/two-factor?view=settings', { waitUntil: 'load' });
        await expect(page.getByText('Ihre E-Mail-Adresse senden', { exact: false })).toBeVisible({ timeout: 90_000 });
        await context.close();
    });
});

/* ================================ Sign-in ================================= */

async function signInWithPassword(page: Page) {
    await page.locator('#email').fill('ama@example.com');
    await page.locator('#password').fill('Correct$Horse9');
    await page.getByRole('button', { name: 'Login' }).click();
}

test.describe('Sign-in code step', () => {
    test('password sign-in → code step (password dropped); wrong, expired and throttled codes are translated; the right code signs in', async () => {
        let attempts = 0;
        const server = fakeServer({
            Login: () => loginNeedsCode,
            CompleteTwoFactorLogin: (op) => {
                attempts += 1;
                const input = op.variables.input as { twoFactorToken: string; code: string };
                expect(input.twoFactorToken).toBe('pending-2fa-token');
                if (attempts === 1) return completeRefused('TWO_FACTOR_CODE_INVALID');
                if (attempts === 2) return completeRefused('TWO_FACTOR_CODE_EXPIRED');
                if (attempts === 3) return { data: null, errors: [{ message: 'ThrottlerException: Too Many Requests' }] };
                return signedIn('completeTwoFactorLogin');
            },
        });
        const page = await open(server, '?view=signin');

        await signInWithPassword(page);
        await expect(page.getByTestId('signin-two-factor')).toBeVisible();
        await expect(page.getByText('Check your email')).toBeVisible();
        await expect(page.locator('#password')).toHaveCount(0);

        const code = page.getByTestId('signin-two-factor-code');
        await typeCode(code, '111111');
        await page.getByRole('button', { name: 'Verify' }).click();
        await expect(codeError(page)).toHaveText("That code isn't right. Check the email and try again.");

        await typeCode(code, '222222');
        await page.getByRole('button', { name: 'Verify' }).click();
        await expect(codeError(page)).toHaveText('That code has expired. Send a new one.');

        await typeCode(code, '333333');
        await page.getByRole('button', { name: 'Verify' }).click();
        await expect(codeError(page)).toHaveText('Too many attempts. Wait 15 minutes, then try again.');

        await typeCode(code, '444444');
        await page.getByRole('button', { name: 'Verify' }).click();
        await page.waitForURL(/\/en\/home/, { waitUntil: 'commit' });

        // Read storage through the context: the page itself is mid-navigation.
        const state = await page.context().storageState();
        const stored = JSON.stringify(state.origins.flatMap((o) => o.localStorage).filter((e) => e.name === 'auth-store'));
        expect(stored).toContain('session-token-1');
        // Nothing user-visible ever showed an id.
        expect(server.calls('Login')).toHaveLength(1);
        await page.context().close();
    });

    test('an incomplete code is caught before any request', async () => {
        const server = fakeServer({ Login: () => loginNeedsCode });
        const page = await open(server, '?view=signin');
        await signInWithPassword(page);
        await typeCode(page.getByTestId('signin-two-factor-code'), '12');
        await page.getByRole('button', { name: 'Verify' }).click();
        await expect(codeError(page)).toHaveText('Please enter a valid 6-digit code');
        expect(server.calls('CompleteTwoFactorLogin')).toHaveLength(0);
        await page.context().close();
    });

    test('resend is locked for 60 s, then sends a new code; a cooldown refusal is explained', async () => {
        let resends = 0;
        const server = fakeServer({
            Login: () => loginNeedsCode,
            ResendTwoFactorLoginCode: (op) => {
                resends += 1;
                expect(op.variables.twoFactorToken).toBe('pending-2fa-token');
                return resends === 1 ? ok('resendTwoFactorLoginCode') : refused('resendTwoFactorLoginCode', 'TWO_FACTOR_RESEND_TOO_SOON');
            },
        });
        const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
        const page = await context.newPage();
        await page.clock.install();
        await page.route('**/graphql', server.handle);
        await page.goto(`${HARNESS}?view=signin`, { waitUntil: 'load' });
        await expect(page.getByTestId('harness-ready')).toBeVisible({ timeout: 90_000 });

        await signInWithPassword(page);
        const resend = page.getByTestId('signin-two-factor-resend');
        await expect(resend).toBeDisabled();
        await expect(resend).toContainText('Send a new code in');

        await page.clock.runFor(61_000);
        await expect(resend).toBeEnabled();
        await expect(resend).toHaveText('Send a new code');
        await resend.click();
        await expect(resend).toBeDisabled(); // cooldown restarted after a successful resend
        expect(resends).toBe(1);

        await page.clock.runFor(61_000);
        await resend.click();
        await expect(codeError(page)).toHaveText("We sent a code a moment ago. Wait a minute before asking for another.");
        await context.close();
    });

    test('an expired sign-in returns to the sign-in form with an explanation', async () => {
        const server = fakeServer({
            Login: () => loginNeedsCode,
            CompleteTwoFactorLogin: () => completeRefused('TWO_FACTOR_SESSION_EXPIRED'),
        });
        const page = await open(server, '?view=signin');
        await signInWithPassword(page);
        await typeCode(page.getByTestId('signin-two-factor-code'), '123456');
        await page.getByRole('button', { name: 'Verify' }).click();

        await expect(page.getByTestId('signin-two-factor')).toHaveCount(0);
        await expect(page.locator('#email')).toBeVisible();
        await expect(page.getByText('Your sign-in timed out. Please sign in again.')).toBeVisible();
        await page.context().close();
    });

    test('a suspended account is refused like a password sign-in, never with raw ids', async () => {
        const server = fakeServer({
            Login: () => loginNeedsCode,
            CompleteTwoFactorLogin: () => completeRefused('Your account has been suspended.'),
        });
        const page = await open(server, '?view=signin');
        await signInWithPassword(page);
        await typeCode(page.getByTestId('signin-two-factor-code'), '123456');
        await page.getByRole('button', { name: 'Verify' }).click();
        await expect(codeError(page)).toHaveText('Your account has been locked. Please contact support.');
        expect(await page.locator('main').innerText()).not.toMatch(UUID_RE);
        await page.context().close();
    });

    test('non-2FA accounts still sign in straight away', async () => {
        const server = fakeServer({ Login: () => signedIn('login') });
        const page = await open(server, '?view=signin');
        await signInWithPassword(page);
        await page.waitForURL(/\/en\/home/, { waitUntil: 'commit' });
        expect(server.calls('CompleteTwoFactorLogin')).toHaveLength(0);
        await page.context().close();
    });
});

test.describe('Google/Facebook hand-off', () => {
    test('?oauth2fa=1 opens the code step with the stored token, removes it from storage, and completes', async () => {
        const server = fakeServer({ CompleteTwoFactorLogin: () => signedIn('completeTwoFactorLogin') });
        const page = await open(server, '?view=signin&oauth2fa=1', async (ctx) => {
            await ctx.addInitScript(() => {
                if (!sessionStorage.getItem('__seeded')) {
                    sessionStorage.setItem('__seeded', '1');
                    sessionStorage.setItem('twoFaSessionToken', 'oauth-pending-token');
                }
            });
        });

        await expect(page.getByTestId('signin-two-factor')).toBeVisible();
        expect(await page.evaluate(() => sessionStorage.getItem('twoFaSessionToken'))).toBeNull();

        await typeCode(page.getByTestId('signin-two-factor-code'), '123456');
        await page.getByRole('button', { name: 'Verify' }).click();
        await page.waitForURL(/\/en\/home/, { waitUntil: 'commit' });

        const sent = server.calls('CompleteTwoFactorLogin')[0].variables.input as { twoFactorToken: string };
        expect(sent.twoFactorToken).toBe('oauth-pending-token');
        await page.context().close();
    });

    test('?oauth2fa=1 without a stored token explains the sign-in expired', async () => {
        const page = await open(fakeServer({}), '?view=signin&oauth2fa=1');
        await expect(page.getByText('Your sign-in timed out. Please sign in again.')).toBeVisible();
        await expect(page.locator('#email')).toBeVisible();
        await page.context().close();
    });
});
