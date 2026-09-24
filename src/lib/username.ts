/**
 * Client-side username rules — a mirror of the server's, for instant feedback.
 *
 * The server is authoritative. It additionally refuses RESERVED names (brand
 * and staff words, route words such as `settings` or `help`), which this file
 * deliberately does NOT replicate: keeping a second copy of that list here would
 * drift, and the UI must not reveal which reserved rule a name hit anyway.
 *
 * Rules (kept in lockstep with the backend):
 *   - input is trimmed, one leading `@` stripped, and lowercased;
 *   - 3–30 characters of `[a-z0-9_.]` only — no spaces, emoji or non-ASCII
 *     lookalikes (they are rejected, never transliterated);
 *   - must start with a letter;
 *   - no leading, trailing or consecutive `.`;
 *   - no trailing `_` (a leading one is already excluded by "starts with a letter").
 */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
/** A custom username can be changed once per this many days (first change is free). */
export const USERNAME_CHANGE_INTERVAL_DAYS = 30;

export type UsernameValidationError =
  | 'EMPTY'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'INVALID_CHARS'
  | 'MUST_START_WITH_LETTER'
  | 'PERIOD_PLACEMENT'
  | 'TRAILING_UNDERSCORE';

export type UsernameValidationResult =
  | { valid: true; username: string }
  | { valid: false; username: string; error: UsernameValidationError };

/** Trim, strip ONE leading `@`, lowercase. Never transliterates. */
export function normalizeUsername(input: string | null | undefined): string {
  let value = (input ?? '').trim();
  if (value.startsWith('@')) value = value.slice(1);
  return value.toLowerCase();
}

/**
 * Validate a raw input. The returned `username` is always the normalized form,
 * so callers send exactly what was validated.
 *
 * Check order matters for the message the user sees: character-set problems
 * are reported before length, because "too short" is a misleading reply to
 * someone who typed an emoji.
 */
export function validateUsername(input: string | null | undefined): UsernameValidationResult {
  const username = normalizeUsername(input);
  const fail = (error: UsernameValidationError): UsernameValidationResult => ({
    valid: false,
    username,
    error,
  });

  if (username.length === 0) return fail('EMPTY');
  if (!/^[a-z0-9_.]+$/.test(username)) return fail('INVALID_CHARS');
  if (!/^[a-z]/.test(username)) return fail('MUST_START_WITH_LETTER');
  if (username.length < USERNAME_MIN_LENGTH) return fail('TOO_SHORT');
  if (username.length > USERNAME_MAX_LENGTH) return fail('TOO_LONG');
  if (username.endsWith('.') || username.includes('..')) return fail('PERIOD_PLACEMENT');
  if (username.endsWith('_')) return fail('TRAILING_UNDERSCORE');
  return { valid: true, username };
}

export function isValidUsername(input: string | null | undefined): boolean {
  return validateUsername(input).valid;
}
