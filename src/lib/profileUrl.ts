/**
 * Canonical links to a user's profile.
 *
 * `/@username` when the user has one, otherwise the legacy id route `/{userId}`.
 * Both are locale-less on purpose: pass them to the next-intl `Link`/router
 * (which adds the locale), or share them as-is — the proxy (`src/proxy.ts`)
 * rewrites `/@username` and `/{locale}/@username` to the internal
 * `/{locale}/u/{username}` route while the address bar keeps `/@username`.
 */

import { BASE } from '@/lib/seo';

export interface ProfileUrlInput {
  username?: string | null;
  userId?: string | null;
}

export function profileUrl({ username, userId }: ProfileUrlInput): string {
  const handle = (username ?? '').trim().replace(/^@/, '');
  if (handle) return `/@${encodeURIComponent(handle.toLowerCase())}`;
  return `/${encodeURIComponent(userId ?? '')}`;
}

/**
 * Absolute URL for sharing/copying. Uses `window.location.origin` on the
 * client; during SSR (no window) falls back to the configured site origin
 * (`BASE` in lib/seo — NEXT_PUBLIC_APP_URL, else https://diaspoplug.com).
 */
export function absoluteProfileUrl(input: ProfileUrlInput): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : BASE;
  return `${origin}${profileUrl(input)}`;
}
