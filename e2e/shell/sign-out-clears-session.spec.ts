/**
 * Signing out from the account menu must actually sign this browser out.
 *
 * The menu's local sign-out only cleared sessionStorage, while the login lives in the persisted
 * `auth-store` / `user-store` (localStorage) — so after "Logout" the tokens survived a reload and
 * the app still treated the browser as signed in (owner report, 2026-10-20).
 */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { fakeGraphql, ME, ME_PROFILE, SHELL_OVERRIDES, wireNetwork } from '../support/fakeSession';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

test.describe('account menu sign-out', () => {
    test.describe.configure({ timeout: 600_000 });

    test('clears the saved login, so it is still gone after a reload', async () => {
        const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 1280, height: 900 } });
        // Seed the session ONCE. seedSession() re-seeds on every navigation, which would undo the
        // very sign-out this test checks; a localStorage marker survives the sign-out (only the two
        // stores are reset), so later navigations leave the signed-out state alone.
        await context.addInitScript(({ me }) => {
            if (localStorage.getItem('e2e-seeded')) return;
            localStorage.setItem('e2e-seeded', '1');
            const expiresAt = Date.now() + 24 * 3600 * 1000;
            localStorage.setItem(
                'auth-store',
                JSON.stringify({
                    state: {
                        tokens: { sessionToken: 'e2e-session', accessToken: 'e2e-session', sessionId: 'e2e', expiresIn: 86400, expiresAt, refreshTokenExpiresAt: expiresAt },
                        deviceMetadata: null,
                    },
                    version: 0,
                }),
            );
            localStorage.setItem(
                'user-store',
                JSON.stringify({ state: { user: { userId: me, firstName: 'Ama', lastName: 'Mensah', username: 'ama' }, rememberMe: false }, version: 0 }),
            );
            localStorage.setItem('privacy_policy_accepted', 'true');
        }, { me: ME });

        const graphql = fakeGraphql({
            ...SHELL_OVERRIDES,
            GetMyProfile: { getProfile: { __typename: 'ProfileResponse', success: true, message: 'ok', profile: { ...ME_PROFILE } } },
            Logout: { logout: { __typename: 'LogoutResponse', success: true, message: 'ok', error: null } },
        });
        await wireNetwork(context, graphql);
        const page = await context.newPage();

        await page.goto('/en/profile', { waitUntil: 'load' });
        const trigger = page.getByRole('button', { name: 'Profile', exact: true }).filter({ visible: true }).first();
        await expect(trigger).toBeVisible({ timeout: 400_000 });
        await trigger.click();

        await page.getByRole('dialog').getByRole('button', { name: 'Logout', exact: true }).click();
        // The confirm modal's own button.
        await page.getByRole('dialog').filter({ hasText: 'Confirm logout' }).getByRole('button', { name: 'Logout', exact: true }).click();

        await expect(page).toHaveURL(/\/signin/, { timeout: 120_000 });
        expect(graphql.ops).toContain('Logout');

        const stored = async () =>
            page.evaluate(() => ({
                tokens: JSON.parse(localStorage.getItem('auth-store') ?? '{}')?.state?.tokens ?? null,
                user: JSON.parse(localStorage.getItem('user-store') ?? '{}')?.state?.user ?? null,
            }));
        expect(await stored()).toEqual({ tokens: null, user: null });

        await page.reload({ waitUntil: 'load' });
        expect(await stored()).toEqual({ tokens: null, user: null });
        await context.close();
    });
});
