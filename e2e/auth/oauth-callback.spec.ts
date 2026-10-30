/**
 * The Google/Facebook callback page.
 *
 * The gateway now sends the session token and pre-fill data in the URL FRAGMENT (never sent to a
 * server, so never in the web host's request logs) and no longer names the user in the redirect,
 * so the page loads the signed-in profile itself. Until that gateway is live it still sends
 * everything in the query, so both shapes must sign the browser in.
 */
import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { fakeGraphql, ME, wireNetwork } from '../support/fakeSession';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const FLAGS = 'success=true&requires2fa=false&phoneVerificationRequired=false';

async function open(overrides: Parameters<typeof fakeGraphql>[0] = {}): Promise<{ context: BrowserContext; page: Page; graphql: ReturnType<typeof fakeGraphql> }> {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 1280, height: 900 } });
    await context.addInitScript(() => localStorage.setItem('privacy_policy_accepted', 'true'));
    const graphql = fakeGraphql(overrides);
    await wireNetwork(context, graphql);
    const page = await context.newPage();
    return { context, page, graphql };
}

const stored = (page: Page) =>
    page.evaluate(() => ({
        sessionToken: JSON.parse(localStorage.getItem('auth-store') ?? '{}')?.state?.tokens?.sessionToken ?? null,
        userId: JSON.parse(localStorage.getItem('user-store') ?? '{}')?.state?.user?.userId ?? null,
    }));

test.describe('OAuth callback', () => {
    test.describe.configure({ timeout: 600_000 });

    test('token in the fragment: signs in and loads the profile', async () => {
        const { context, page, graphql } = await open();
        await page.goto(`/en/callback?${FLAGS}&oauthRegistrationRequired=false#sessionToken=e2e-oauth-session&role=diaspora`, { waitUntil: 'load' });
        await expect(page).toHaveURL(/\/home/, { timeout: 400_000 });
        expect(graphql.ops).toContain('GetMyProfile');
        expect(await stored(page)).toEqual({ sessionToken: 'e2e-oauth-session', userId: ME });
        expect(page.url()).not.toContain('e2e-oauth-session');
        await context.close();
    });

    test('token in the query (gateway before the fragment change): still signs in', async () => {
        const { context, page } = await open();
        await page.goto(`/en/callback?success=true&sessionToken=e2e-legacy-session&oauthRegistrationRequired=false&userId=${ME}&role=diaspora`, { waitUntil: 'load' });
        await expect(page).toHaveURL(/\/home/, { timeout: 400_000 });
        expect(await stored(page)).toEqual({ sessionToken: 'e2e-legacy-session', userId: ME });
        await context.close();
    });

    test('profile cannot be loaded: back to sign-in, nothing kept', async () => {
        const { context, page } = await open({
            GetMyProfile: { getProfile: { __typename: 'ProfileResponse', success: false, message: 'no', profile: null } },
        });
        await page.goto(`/en/callback?${FLAGS}&oauthRegistrationRequired=false#sessionToken=e2e-dead-session&role=diaspora`, { waitUntil: 'load' });
        await expect(page).toHaveURL(/\/signin\?error=/, { timeout: 400_000 });
        expect(await stored(page)).toEqual({ sessionToken: null, userId: null });
        await context.close();
    });

    test('new user: registration token and pre-fill come from the fragment', async () => {
        const { context, page } = await open();
        await page.goto(
            `/en/callback?${FLAGS}&oauthRegistrationRequired=true#oauthRegistrationToken=e2e-reg&email=ama%40example.com&firstName=Ama&lastName=Mensah&provider=google`,
            { waitUntil: 'load' },
        );
        await expect(page).toHaveURL(/\/onboarding/, { timeout: 400_000 });
        const saved = await page.evaluate(() => ({
            oauth: JSON.parse(sessionStorage.getItem('oauthRegistration') ?? 'null'),
            form: JSON.parse(sessionStorage.getItem('accountFormData') ?? 'null'),
        }));
        expect(saved.oauth).toEqual({ oauthRegistrationToken: 'e2e-reg', provider: 'google', email: 'ama@example.com' });
        expect(saved.form).toMatchObject({ firstName: 'Ama', lastName: 'Mensah' });
        await context.close();
    });

    test('a role the web app does not admit is refused before anything is stored', async () => {
        const { context, page, graphql } = await open();
        await page.goto(`/en/callback?${FLAGS}&oauthRegistrationRequired=false#sessionToken=e2e-admin-session&role=SYSTEM_ADMIN`, { waitUntil: 'load' });
        await expect(page).toHaveURL(/\/signin\?error=/, { timeout: 400_000 });
        expect(graphql.ops).not.toContain('GetMyProfile');
        expect(await stored(page)).toEqual({ sessionToken: null, userId: null });
        await context.close();
    });
});
