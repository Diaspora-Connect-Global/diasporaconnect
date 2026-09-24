import { routing } from '@/i18n/routing';

const SUPPORTED_LOCALES = new Set<string>(routing.locales);

/**
 * `/@username` profile URLs.
 *
 * A folder named `@...` is a parallel-route slot in the App Router, so the
 * handle cannot be a real route segment. Instead `/@steven` and
 * `/{locale}/@steven` are REWRITTEN (not redirected — the address bar keeps
 * `/@steven`) to the internal `/{locale}/u/steven` route.
 *
 * Only a single segment is matched: `/@steven/anything` is not a profile URL
 * and falls through to the normal handling. `%40` is accepted as an encoded `@`.
 */
const HANDLE_PATH = /^\/(?:([a-z]{2})\/)?(?:@|%40)([^/]+)\/?$/i;

export function matchHandlePath(pathname: string): { locale: string | null; handle: string } | null {
  const m = HANDLE_PATH.exec(pathname);
  if (!m) return null;
  const maybeLocale = m[1]?.toLowerCase() ?? null;
  // A 2-letter prefix that is not one of our locales is not a locale prefix.
  if (maybeLocale && !SUPPORTED_LOCALES.has(maybeLocale)) {
    return null;
  }
  let handle = m[2];
  try {
    handle = decodeURIComponent(handle);
  } catch {
    // leave as-is; the page treats an implausible handle as not found
  }
  handle = handle.trim().toLowerCase();
  if (!handle) return null;
  return { locale: maybeLocale, handle };
}

