import { test, expect } from '@playwright/test';
import {
    deriveProfileGuardStatus,
    PROFILE_GUARD_MAX_AUTO_RETRIES,
    type ProfileGuardInputs,
} from '../../src/hooks/profileGuardStatus';

/**
 * Pure logic, no browser/page: the boot gate's profile check must end in
 * either `ok` or a retryable `error` — never spin forever on a network error.
 * (Run without a dev server: `E2E_BASE_URL=http://localhost:1 npx playwright test e2e/shell`.)
 */
const base: ProfileGuardInputs = {
    enabled: true,
    redirected: false,
    loading: false,
    hasError: false,
    hasProfile: false,
    attempts: 0,
    timedOut: false,
};

test.describe('deriveProfileGuardStatus', () => {
    test('disabled until auth is confirmed', () => {
        expect(deriveProfileGuardStatus({ ...base, enabled: false, hasProfile: true })).toBe('checking');
    });

    test('ok once a profile arrives — even after a stale error or deadline', () => {
        expect(deriveProfileGuardStatus({ ...base, hasProfile: true })).toBe('ok');
        expect(deriveProfileGuardStatus({ ...base, hasProfile: true, hasError: true, timedOut: true })).toBe('ok');
    });

    test('redirecting wins while the missing-profile redirect is in flight', () => {
        expect(deriveProfileGuardStatus({ ...base, redirected: true })).toBe('redirecting');
    });

    test('a network error keeps checking while auto-retries remain', () => {
        for (let attempts = 0; attempts < PROFILE_GUARD_MAX_AUTO_RETRIES; attempts++) {
            expect(deriveProfileGuardStatus({ ...base, hasError: true, attempts })).toBe('checking');
        }
    });

    test('a network error becomes a retryable error once the budget is spent', () => {
        expect(
            deriveProfileGuardStatus({ ...base, hasError: true, attempts: PROFILE_GUARD_MAX_AUTO_RETRIES }),
        ).toBe('error');
    });

    test('a retry that is still loading is not reported as error', () => {
        expect(
            deriveProfileGuardStatus({
                ...base,
                hasError: true,
                loading: true,
                attempts: PROFILE_GUARD_MAX_AUTO_RETRIES,
            }),
        ).toBe('checking');
    });

    test('a request that never settles hits the deadline', () => {
        expect(deriveProfileGuardStatus({ ...base, loading: true, timedOut: true })).toBe('error');
    });
});
