/**
 * Pure decision logic for `useProfileGuard`, kept free of React/Apollo so it can
 * be reasoned about (and tested) in isolation.
 *
 * The failure mode it exists to prevent: a transient network error used to
 * leave the guard in `'checking'` forever — an endless boot loader with no way
 * out. Now a failed check is retried a bounded number of times and the whole
 * check has a deadline; after either runs out the guard reports `'error'` so the
 * shell can offer a retry instead of spinning.
 */

export type ProfileGuardStatus = 'checking' | 'ok' | 'redirecting' | 'error';

/** Backoff before each automatic retry of a failed profile check. */
export const PROFILE_GUARD_RETRY_DELAYS_MS = [1000, 2000, 4000] as const;
export const PROFILE_GUARD_MAX_AUTO_RETRIES = PROFILE_GUARD_RETRY_DELAYS_MS.length;
/** Overall deadline for one check (covers a request that never settles). */
export const PROFILE_GUARD_TIMEOUT_MS = 15000;

export interface ProfileGuardInputs {
  enabled: boolean;
  redirected: boolean;
  loading: boolean;
  hasError: boolean;
  /** `getProfile` came back with `success && profile`. */
  hasProfile: boolean;
  /** Automatic retries already spent on this check. */
  attempts: number;
  timedOut: boolean;
}

export function deriveProfileGuardStatus(i: ProfileGuardInputs): ProfileGuardStatus {
  if (!i.enabled) return 'checking';
  if (i.redirected) return 'redirecting';
  // A good answer wins over everything, including a stale error or a deadline
  // that fired just before the answer arrived.
  if (i.hasProfile) return 'ok';
  if (i.timedOut) return 'error';
  if (i.hasError && !i.loading && i.attempts >= PROFILE_GUARD_MAX_AUTO_RETRIES) return 'error';
  // Loading, a retry pending, or a definitive `success:false` whose redirect
  // effect has not run yet — all of these keep the boot loader up.
  return 'checking';
}
