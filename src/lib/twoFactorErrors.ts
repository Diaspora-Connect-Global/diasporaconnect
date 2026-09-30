/**
 * Two-factor refusals → translation keys.
 *
 * The backend answers 2FA refusals with a stable code in the `error` field
 * (TWO_FACTOR_CODE_INVALID, …). We translate the CODE, never the server's
 * English text. Keys live under `authentication.twoFactor.errors.*` and are
 * shared by the Settings dialog and the sign-in code step.
 */

export type TwoFactorErrorKey =
  | 'codeInvalid'
  | 'codeExpired'
  | 'sessionExpired'
  | 'tooManyAttempts'
  | 'resendTooSoon'
  | 'passwordInvalid'
  | 'reauthRequired'
  | 'alreadyEnabled'
  | 'notEnabled'
  | 'deliveryFailed'
  | 'unavailable';

const BY_CODE: Record<string, TwoFactorErrorKey> = {
  TWO_FACTOR_CODE_INVALID: 'codeInvalid',
  TWO_FACTOR_CODE_EXPIRED: 'codeExpired',
  TWO_FACTOR_SESSION_EXPIRED: 'sessionExpired',
  TWO_FACTOR_TOO_MANY_ATTEMPTS: 'tooManyAttempts',
  TWO_FACTOR_RESEND_TOO_SOON: 'resendTooSoon',
  TWO_FACTOR_PASSWORD_INVALID: 'passwordInvalid',
  TWO_FACTOR_REAUTH_REQUIRED: 'reauthRequired',
  TWO_FACTOR_ALREADY_ENABLED: 'alreadyEnabled',
  TWO_FACTOR_NOT_ENABLED: 'notEnabled',
  TWO_FACTOR_DELIVERY_FAILED: 'deliveryFailed',
  TWO_FACTOR_UNAVAILABLE: 'unavailable',
};

/**
 * Classify a 2FA outcome. `error` is the payload's `error` field; `transport`
 * is the Apollo error (GraphQL errors resolve under errorPolicy 'all', so the
 * caller passes `result.error`). Returns null when the refusal is not a 2FA
 * one (e.g. an account-status message on sign-in) so the caller can apply its
 * own mapping.
 */
export function twoFactorErrorKey(
  error?: string | null,
  transport?: { message?: string } | null,
): TwoFactorErrorKey | null {
  if (error && BY_CODE[error]) return BY_CODE[error];

  const transportMessage = (transport?.message ?? '').toLowerCase();
  if (transportMessage) {
    // The gateway's per-endpoint rate limit (ThrottlerException).
    if (transportMessage.includes('too many requests') || transportMessage.includes('throttl')) {
      return 'tooManyAttempts';
    }
    return 'unavailable';
  }
  return null;
}

/** True for refusals that end the pending sign-in (the user must start again). */
export function endsTwoFactorSignIn(key: TwoFactorErrorKey | null): boolean {
  return key === 'sessionExpired';
}
