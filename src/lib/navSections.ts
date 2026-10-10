/**
 * The four top-level sections of the app shell (Home · Discover · Community ·
 * More) and which one a path belongs to.
 *
 * Kept dependency-free and pure so the active-state rules can be unit-tested
 * without a browser (e2e/shell/nav-header.spec.ts) and shared by the desktop
 * nav and the mobile bottom bar.
 */

import { APP_LOCALES } from './appRoutes';

export type NavKey = 'home' | 'discover' | 'community' | 'more';

/** Locale-less hrefs; the header prefixes the current locale. */
export const NAV_SECTIONS: ReadonlyArray<{ key: NavKey; href: string }> = [
  { key: 'home', href: '/home' },
  { key: 'discover', href: '/discover' },
  { key: 'community', href: '/community' },
  { key: 'more', href: '/more' },
];

/**
 * First path segment → section. A segment owns the section for itself and
 * everything under it (`/events` and `/events/<id>/ticket` are both Discover).
 * `/feed` and `/post/<id>` are views of the home feed, so they light up Home.
 * Paths not listed (chat, notifications, profile, vendor tools…) light up
 * nothing: they are reached from the icons on the right, not from a section.
 */
const SECTION_BY_SEGMENT: Readonly<Record<string, NavKey>> = {
  home: 'home',
  feed: 'home',
  post: 'home',
  discover: 'discover',
  events: 'discover',
  search: 'discover',
  marketplace: 'discover',
  opportunities: 'discover',
  community: 'community',
  association: 'community',
  groups: 'community',
  circles: 'community',
  more: 'more',
  saved: 'more',
  requests: 'more',
  wallet: 'more',
  settings: 'more',
};

/** The path without query/hash, trailing slash or a leading locale segment. */
export function stripLocale(pathname: string): string {
  const path = (pathname || '/').split(/[?#]/, 1)[0];
  const segments = path.split('/').filter(Boolean);
  if (segments[0] && APP_LOCALES.includes(segments[0].toLowerCase())) segments.shift();
  return '/' + segments.join('/');
}

/** Which section is active for `pathname` (locale-prefixed or not), or null. */
export function getActiveNavKey(pathname: string): NavKey | null {
  const first = stripLocale(pathname).split('/')[1] ?? '';
  return SECTION_BY_SEGMENT[first.toLowerCase()] ?? null;
}
