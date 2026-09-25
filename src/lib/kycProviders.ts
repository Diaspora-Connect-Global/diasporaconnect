import type { KycProvider } from '@/services/gql/types/kyc';
import { normalizeToAlpha2 } from '@/lib/countryTimezone';

/**
 * Which identity-verification methods a user can actually use.
 *
 * - Document & selfie (Onfido) works in every country, so it is always offered.
 * - itsme is a Belgian digital identity: offered only when the user's profile
 *   country of residence is Belgium.
 *
 * The profile stores residence as ISO alpha-3 ("BEL") via the gateway, while
 * older rows may carry alpha-2 or a country name. Never compare by
 * `.slice(0, 2)`: "BEN" (Benin) would read as "BE". Unknown → Onfido only.
 * The gateway enforces the same rule on `initiateKYCVerification`.
 */
const BELGIUM_NAMES = new Set(['BELGIUM', 'BELGIQUE', 'BELGIË', 'BELGIE', 'BELGIEN', 'BELGIO']);

export function isBelgiumResidence(residenceCountry: string | null | undefined): boolean {
  if (!residenceCountry) return false;
  const upper = residenceCountry.trim().toUpperCase();
  if (!upper) return false;
  if (BELGIUM_NAMES.has(upper)) return true;
  if (upper.length !== 2 && upper.length !== 3) return false;
  return normalizeToAlpha2(upper) === 'BE';
}

export function availableKycProviders(
  residenceCountry: string | null | undefined,
): KycProvider[] {
  return isBelgiumResidence(residenceCountry) ? ['ONFIDO', 'ITSME'] : ['ONFIDO'];
}
