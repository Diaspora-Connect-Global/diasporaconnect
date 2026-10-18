/**
 * Onboarding after the phone and join-a-community steps were removed:
 * 1 name, 2 local/diaspora, 3 country (creates the account, NO phone),
 * 4 emailed code (gates completion), 5 topics. Mocked GraphQL, no backend.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { fakeGraphql, wireNetwork } from '../support/fakeSession';

// A cold dev server compiles each step's chunks on first use.
test.setTimeout(300_000);

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser.close();
});

const REG = {
    success: true,
    registrationToken: 'reg-token',
    expiresIn: 900,
    message: 'ok',
    verificationMethod: 'EMAIL',
    smsSent: false,
    emailSent: true,
    verificationExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    verificationTtlSeconds: 900,
    meta: { __typename: 'RegistrationMeta', registrationFlow: 'x', userEmail: 'ama@example.com', phoneNumber: null },
};

const VERIFIED = {
    verifyRegistrationOtp: {
        __typename: 'VerifyOtpPayload',
        success: true,
        message: 'ok',
        sessionToken: 'tok',
        requires2fa: false,
        user: { __typename: 'AuthUser', id: '00000000-0000-4000-8000-0000000000a1', email: 'ama@example.com', firstName: 'Ama', lastName: 'Mensah', role: 'diaspora' },
        deviceMetadata: { __typename: 'DeviceMetadata', fingerprint: 'f', ipAddress: '1.1.1.1', userAgent: 'ua', deviceId: 'dev' },
    },
};

async function open(kind: 'password' | 'oauth', opts: { width?: number; badCode?: boolean } = {}) {
    const context = await browser.newContext({
        baseURL: test.info().project.use.baseURL,
        viewport: { width: opts.width ?? 1280, height: opts.width && opts.width < 500 ? 740 : 900 },
    });
    await context.addInitScript(
        ({ kind }) => {
            localStorage.setItem('privacy_policy_accepted', 'true');
            if (kind === 'password') {
                sessionStorage.setItem('signupEmail', 'ama@example.com');
                sessionStorage.setItem('signupPassword', 'Sup3r-secret-pass!');
            } else {
                sessionStorage.setItem('oauthRegistration', JSON.stringify({ oauthRegistrationToken: 'oauth-token' }));
            }
        },
        { kind },
    );
    const gql = fakeGraphql({
        RegisterUser: { registerUser: { __typename: 'RegisterPayload', ...REG } },
        CompleteOAuthRegistration: { completeOAuthRegistration: { __typename: 'RegisterPayload', ...REG } },
        VerifyOtp: opts.badCode ? { __errors: [{ message: 'Invalid verification code', code: 'BAD_USER_INPUT' }] } : VERIFIED,
        SetOnboardingInterests: { setOnboardingInterests: { __typename: 'Ok', success: true } },
    });
    await wireNetwork(context, gql);
    const page = await context.newPage();
    await page.goto('/en/onboarding', { waitUntil: 'load' });
    return { page, gql, context };
}

async function throughNameRoleCountry(page: Page, { clickFinal = true } = {}) {
    await page.locator('#firstName').fill('Ama');
    await page.locator('#lastName').fill('Mensah');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Diaspora member' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.locator('#country').click();
    await page.getByRole('option', { name: 'Germany' }).click();
    if (clickFinal) await page.getByRole('button', { name: 'Continue' }).click();
}

const stepLabel = (page: Page) => page.getByText(/^Step \d of \d$/);

for (const kind of ['password', 'oauth'] as const) {
    test(`${kind}: five steps, no phone or community step, account created without a phone, code gates completion`, async () => {
        const { page, gql, context } = await open(kind);
        const create = kind === 'password' ? 'RegisterUser' : 'CompleteOAuthRegistration';

        if (kind === 'password') await page.locator('#firstName').waitFor();
        else await page.locator('#firstName').waitFor();
        await expect(stepLabel(page)).toHaveText('Step 1 of 5');
        await page.locator('#firstName').fill('Ama');
        await page.locator('#lastName').fill('Mensah');
        await page.getByRole('button', { name: 'Continue' }).click();

        await expect(stepLabel(page)).toHaveText('Step 2 of 5');
        await page.getByRole('button', { name: 'Diaspora member' }).click();
        await page.getByRole('button', { name: 'Continue' }).click();

        await expect(stepLabel(page)).toHaveText('Step 3 of 5');
        await expect(page.getByText(/phone/i)).toHaveCount(0);
        await page.locator('#country').click();
        await page.getByRole('option', { name: 'Germany' }).click();
        expect(gql.calls.some((c) => c.name === create)).toBe(false); // not created before the last info step
        await page.getByRole('button', { name: 'Continue' }).click();

        // Account creation call: no phone anywhere in the input.
        await expect(stepLabel(page)).toHaveText('Step 4 of 5');
        const call = gql.calls.find((c) => c.name === create)!;
        const input = call.variables.input as Record<string, unknown>;
        expect(input).toBeTruthy();
        expect('phone' in input).toBe(false);
        expect(JSON.stringify(call.variables)).not.toMatch(/phone/i);
        expect(input).toMatchObject({ firstName: 'Ama', lastName: 'Mensah', country: 'DE', role: 'diaspora' });

        // Code step: email-only copy; completion is gated by the code.
        await expect(page.getByText('Enter the verification code that was sent to your email (ama@example.com)')).toBeVisible();
        await expect(page.getByText(/phone/i)).toHaveCount(0);
        const submit = page.getByRole('button', { name: 'Submit' });
        await expect(submit).toBeDisabled();
        await page.getByRole('button', { name: 'Resend code' }).waitFor();
        await page.locator('input[autocomplete="one-time-code"]').pressSequentially('12345');
        await expect(submit).toBeDisabled();
        expect(gql.calls.some((c) => c.name === 'VerifyOtp')).toBe(false);
        await page.locator('input[autocomplete="one-time-code"]').pressSequentially('6');
        await expect(submit).toBeEnabled();
        await submit.click();

        // Only after verification: topics (last step), then home.
        await expect(stepLabel(page)).toHaveText('Step 5 of 5');
        expect(gql.calls.find((c) => c.name === 'VerifyOtp')!.variables).toMatchObject({ registrationToken: 'reg-token', otp: '123456' });
        await expect(page.getByText(/community/i)).toHaveCount(0);
        await page.getByRole('button', { name: 'Technology' }).click();
        await page.getByRole('button', { name: 'Finish' }).click();
        await expect.poll(() => gql.calls.some((c) => c.name === 'SetOnboardingInterests')).toBe(true);
        expect(gql.calls.find((c) => c.name === 'SetOnboardingInterests')!.variables).toEqual({ topics: ['technology'] });
        await page.waitForURL(/\/home/, { waitUntil: 'commit', timeout: 120_000 });
        await context.close();
    });
}

test('a wrong code keeps the user on the code step (no session, no topics)', async () => {
    const { page, gql, context } = await open('password', { badCode: true });
    await throughNameRoleCountry(page);
    await expect(stepLabel(page)).toHaveText('Step 4 of 5');
    await page.locator('input[autocomplete="one-time-code"]').pressSequentially('000000');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect.poll(() => gql.calls.some((c) => c.name === 'VerifyOtp')).toBe(true);
    await expect(stepLabel(page)).toHaveText('Step 4 of 5');
    await expect(page.locator('p', { hasText: 'Invalid verification code' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('auth-store') ?? '')).not.toContain('"sessionToken":"tok"');
    await context.close();
});

test('360px: every step fits, no horizontal scroll, inputs are 16px', async () => {
    const { page, context } = await open('password', { width: 360 });
    const noOverflow = async () =>
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.locator('#firstName').waitFor();
    await noOverflow();
    const sizes = await page.locator('input:visible').evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).fontSize)));
    expect(sizes.length).toBeGreaterThan(0);
    for (const s of sizes) expect(s).toBeGreaterThanOrEqual(16);
    await throughNameRoleCountry(page, { clickFinal: false });
    await noOverflow();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(stepLabel(page)).toHaveText('Step 4 of 5');
    await noOverflow();
    const otp = await page.locator('input[autocomplete="one-time-code"]').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
    expect(otp).toBeGreaterThanOrEqual(16);
    await page.locator('input[autocomplete="one-time-code"]').pressSequentially('123456');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(stepLabel(page)).toHaveText('Step 5 of 5');
    await noOverflow();
    // Headings step down on phones.
    const h = await page.getByRole('heading', { level: 3 }).evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
    expect(h).toBeLessThanOrEqual(28);
    await page.setViewportSize({ width: 1280, height: 900 });
    expect(await page.getByRole('heading', { level: 3 }).evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBe(32);
    await context.close();
});
