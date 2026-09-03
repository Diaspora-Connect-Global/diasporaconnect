/**
 * Centralized classification + mapping of auth backend errors to friendly,
 * translatable messages. Shared across login, registration, password-reset and
 * onboarding so the same backend failure always reads the same to the user.
 *
 * Pattern: classify the raw string into a stable category, then let each flow
 * translate that category with its own i18n namespace. `mapAuthError` is a
 * convenience for the `authentication` namespace (login + signup).
 */

export type AuthErrorCategory =
    | 'invalidCredentials'
    | 'accountLocked'
    | 'tooManyAttempts'
    | 'emailTaken'
    | 'userNotFound'
    | 'invalidCode'
    | 'expiredCode'
    | 'network'
    | 'generic';

/**
 * Minimal translator shape compatible with next-intl's `useTranslations`.
 * Loosely typed so the strongly-typed next-intl translator assigns cleanly.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Translator = (key: any, values?: any) => string;

const has = (haystack: string, ...needles: string[]) =>
    needles.some((n) => haystack.includes(n));

/**
 * Classify a raw backend/error message into a stable category. Lowercases
 * internally, so callers can pass the original message verbatim.
 */
export function classifyAuthError(raw?: string | null): AuthErrorCategory {
    const text = (raw || '').toLowerCase();

    if (!text) return 'generic';

    if (has(text, 'network', 'failed to fetch', 'fetch', 'timeout', 'offline', 'connection')) {
        return 'network';
    }
    if (has(text, 'invalid credentials', 'invalid email', 'invalid password', 'incorrect password', 'wrong password', 'invalid login')) {
        return 'invalidCredentials';
    }
    if (has(text, 'locked', 'suspended', 'disabled account')) {
        return 'accountLocked';
    }
    if (has(text, 'too many', 'rate limit', 'try again later')) {
        return 'tooManyAttempts';
    }
    if (has(text, 'already exists', 'already registered', 'email taken', 'in use', 'not available')) {
        return 'emailTaken';
    }
    if (has(text, 'not found', 'does not exist', 'no account', 'no user')) {
        return 'userNotFound';
    }
    if (has(text, 'expired')) {
        return 'expiredCode';
    }
    if (has(text, 'invalid code', 'invalid otp', 'incorrect code', 'wrong code', 'verification failed')) {
        return 'invalidCode';
    }
    return 'generic';
}

/** True when the error is a transport/system failure (use a toast, not a banner). */
export function isNetworkError(err: unknown): boolean {
    const message =
        err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : (err as { message?: string })?.message || '';
    return classifyAuthError(message) === 'network';
}

/**
 * Map a raw auth error to a friendly message using the `authentication`
 * i18n namespace (login + signup flows). Falls back to the raw message, then
 * a generic key, so the user never sees an empty banner.
 */
export function mapAuthError(raw: string | null | undefined, t: Translator): string {
    const category = classifyAuthError(raw);

    switch (category) {
        case 'invalidCredentials':
            return t('login.invalidCredentials');
        case 'accountLocked':
            return t('login.accountLocked');
        case 'tooManyAttempts':
            return t('login.tooManyAttempts');
        case 'emailTaken':
            return t('form.email.exists');
        case 'network':
            return t('login.networkError');
        case 'userNotFound':
        case 'invalidCode':
        case 'expiredCode':
        case 'generic':
        default:
            return raw || t('formBanner.generic');
    }
}
