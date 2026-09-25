/**
 * Pure unit tests (no browser) for the country → KYC-method rule. They run
 * under the Playwright runner because it is the only test runner in the repo:
 *   E2E_BASE_URL=http://localhost npx playwright test e2e/kyc/providers.spec.ts
 */
import { test, expect } from '@playwright/test';
import { availableKycProviders, isBelgiumResidence } from '../../src/lib/kycProviders';

test.describe('availableKycProviders', () => {
    for (const be of ['BEL', 'bel', 'BE', ' be ', 'Belgium', 'BELGIQUE', 'België']) {
        test(`Belgium residence "${be}" gets both methods`, () => {
            expect(availableKycProviders(be)).toEqual(['ONFIDO', 'ITSME']);
        });
    }

    // Includes the `.slice(0, 2)` traps: Benin ("BEN", "Benin") and Belarus/Belize.
    for (const other of ['GHA', 'GH', 'Ghana', 'NGA', 'BEN', 'BJ', 'Benin', 'BLR', 'BLZ', 'NLD', 'FRA', 'XYZ', 'B']) {
        test(`"${other}" gets Document & selfie only`, () => {
            expect(availableKycProviders(other)).toEqual(['ONFIDO']);
        });
    }

    for (const unknown of [null, undefined, '', '   ']) {
        test(`unknown country ${JSON.stringify(unknown)} gets Document & selfie only`, () => {
            expect(availableKycProviders(unknown)).toEqual(['ONFIDO']);
            expect(isBelgiumResidence(unknown)).toBe(false);
        });
    }
});
