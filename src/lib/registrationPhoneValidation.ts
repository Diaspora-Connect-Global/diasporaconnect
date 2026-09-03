/**
 * Live validation for the national portion of a phone number (no country prefix).
 * Aligns with {@link formatPhone} in onboarding: digits only, one leading 0 stripped.
 * NANP (+1) uses exactly 10 national digits; other regions use ITU E.164 length limits.
 */

export type RegistrationPhoneInputStatus = 'empty' | 'incomplete' | 'valid';

export interface NationalNumberBounds {
  min: number;
  max: number;
}

/** Country calling code digits only, e.g. "+233" → "233", "+1" → "1". */
function dialCodeDigits(dialCode: string): string {
  return (dialCode || '').replace(/\D/g, '');
}

/**
 * Min/max length of the national significant number (what the user types after the dial code).
 */
export function getNationalNumberBounds(dialCode: string): NationalNumberBounds {
  const cc = dialCodeDigits(dialCode);
  if (!cc) {
    return { min: 6, max: 12 };
  }
  // North American Numbering Plan (+1): national number is always 10 digits.
  if (cc === '1') {
    return { min: 10, max: 10 };
  }
  // E.164: max 15 digits total; national length ≤ 15 − len(country calling code).
  const nationalMax = Math.min(15 - cc.length, 14);
  return { min: 6, max: Math.max(nationalMax, 6) };
}

/**
 * Normalizes raw input to national digits: non-digits removed, optional country code
 * prefix removed if it matches the selected dial code, one leading national trunk 0 removed.
 */
export function normalizeNationalPhoneInput(raw: string, dialCode: string): string {
  let digits = (raw || '').replace(/\D/g, '');
  const cc = dialCodeDigits(dialCode);
  if (cc && digits.startsWith(cc)) {
    digits = digits.slice(cc.length);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  const { max } = getNationalNumberBounds(dialCode);
  return digits.slice(0, max);
}

export function getRegistrationPhoneInputStatus(
  dialCode: string | undefined,
  nationalDigits: string
): RegistrationPhoneInputStatus {
  const bounds = getNationalNumberBounds(dialCode || '');
  const len = nationalDigits.length;
  if (len === 0) return 'empty';
  if (bounds.min === bounds.max) {
    if (len === bounds.min) return 'valid';
    return 'incomplete';
  }
  if (len >= bounds.min && len <= bounds.max) return 'valid';
  return 'incomplete';
}

export function isNationalPhoneComplete(
  dialCode: string | undefined,
  nationalDigits: string
): boolean {
  return getRegistrationPhoneInputStatus(dialCode, nationalDigits) === 'valid';
}
