'use client';

import { routing } from '@/i18n/routing';

const REDIRECT_URL_KEY = 'diaspoplug:post-signin-redirect';

/**
 * Remember where someone was heading when we bounced them to sign in, so they
 * land there afterwards instead of on the home feed.
 *
 * ## Why this exists
 *
 * The protected layout redirected to `/signin` with no return URL, and the
 * sign-in form pushed a hardcoded `/home`. Any deep link followed by a
 * signed-out person was therefore lost. That is merely annoying for most
 * routes, and fatal for circle invite links: the recipient is, by definition,
 * usually someone without an account yet. They would sign up and land on the
 * feed with no idea the invite existed, recoverable only by going back to the
 * chat app and clicking the link a second time.
 *
 * ## The locale trap this helper exists to absorb
 *
 * `usePathname()` from `next/navigation` returns a LOCALE-PREFIXED path
 * (`/en/circles/join`), but the sign-in form routes through
 * `@/i18n/navigation`, which adds the locale itself. Storing the raw value
 * would produce `/en/en/circles/join`. So the leading locale segment is
 * stripped on save, and the stored value is always locale-agnostic
 * (`/circles/join?token=…`) — correct for the i18n router, and it also means a
 * person who switches language mid-signup lands in their NEW locale rather than
 * being dragged back to the old one.
 *
 * ## Safety
 *
 * Only same-origin relative paths are stored. Anything protocol-relative
 * (`//evil.com`), absolute, or carrying a scheme is refused — a redirect target
 * read from the URL bar and followed after authentication is a textbook open
 * redirect, and this one is written to storage where it outlives the page.
 */
function isSafeRelativePath(value: string): boolean {
  // Must be rooted, must not be protocol-relative, must carry no scheme.
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//')) return false;
  if (/^\/\\/.test(value)) return false; // `/\evil.com` — some parsers treat as protocol-relative
  return true;
}

/** Strip a leading `/en`, `/de`, … so the stored path suits the i18n router. */
function stripLocalePrefix(path: string): string {
  for (const locale of routing.locales) {
    if (path === `/${locale}`) return '/';
    if (path.startsWith(`/${locale}/`)) return path.slice(locale.length + 1);
  }
  return path;
}

/**
 * Called from the protected layout at the moment it decides to bounce.
 * `search` is taken from the live location rather than `useSearchParams()` so
 * the layout needs no Suspense boundary — this only ever runs in a browser
 * effect.
 */
export function saveRedirectUrl(pathname: string, search = ''): void {
  try {
    if (!pathname) return;
    const full = `${stripLocalePrefix(pathname)}${search}`;
    if (!isSafeRelativePath(full)) return;
    // Never send someone back to an auth screen after authenticating.
    if (/^\/(signin|signup|reset)(\/|$|\?)/.test(full)) return;
    window.sessionStorage.setItem(REDIRECT_URL_KEY, full);
  } catch {
    // sessionStorage can throw in private modes. Losing the destination is a
    // worse landing page, never a broken sign-in.
  }
}

/**
 * Read once and clear. Returns null when there is nothing pending, so callers
 * can `?? '/home'`. Clearing on read is deliberate: a stale destination
 * surfacing on a later, unrelated sign-in would be baffling.
 */
export function getAndClearRedirectUrl(): string | null {
  try {
    const value = window.sessionStorage.getItem(REDIRECT_URL_KEY);
    if (value) window.sessionStorage.removeItem(REDIRECT_URL_KEY);
    return value && isSafeRelativePath(value) ? value : null;
  } catch {
    return null;
  }
}
