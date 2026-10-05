/**
 * Which in-app paths actually exist.
 *
 * `APP_ROUTE_PATTERNS` mirrors every `src/app/[locale]/**\/page.tsx` (route groups
 * dropped, the dev harness excluded); `[param]` matches exactly one non-empty
 * segment. A contract test (e2e/notifications/notification-path.spec.ts) walks the
 * route tree and fails if this list drifts from it.
 *
 * `isKnownAppPath` exists so a navigation target built from server-supplied data
 * (notification links) can be checked BEFORE navigating: an unknown multi-segment
 * path is a hard 404, and an unknown single segment (`/orders`) falls into the
 * profile route and renders "user not found". It also doubles as the same-origin
 * guard: only a single-slash relative path can ever pass.
 *
 * Dependency-free on purpose (it is bundled with the notification client code).
 */

export const APP_ROUTE_PATTERNS: readonly string[] = [
  '/',
  '/[id]', // user profile by id: UUID-shaped only (see isKnownAppPath)
  '/about',
  '/association',
  '/association/[id]',
  '/becomeavendor',
  '/becomeavendor/status',
  '/callback',
  '/chat',
  '/circles',
  '/circles/[id]',
  '/circles/[id]/challenges/[challengeId]',
  '/circles/[id]/challenges/new',
  '/circles/[id]/governance',
  '/circles/[id]/history',
  '/circles/[id]/leaderboard',
  '/circles/[id]/members',
  '/circles/[id]/motions/[motionId]',
  '/circles/[id]/motions/new',
  '/circles/[id]/plan',
  '/circles/[id]/projects/[projectId]',
  '/circles/[id]/projects/new',
  '/circles/[id]/report',
  '/circles/[id]/settings',
  '/circles/create',
  '/circles/join',
  '/community',
  '/community/[id]',
  '/contact',
  '/create-post',
  '/events',
  '/events/[id]',
  '/events/[id]/manage',
  '/events/[id]/ticket',
  '/events/create',
  '/feed',
  '/groups/[id]',
  '/help',
  '/home',
  '/home2',
  '/kyc/itsme/error',
  '/kyc/itsme/success',
  '/marketplace',
  '/notification',
  '/onboarding',
  '/opportunities',
  '/opportunities/[id]',
  '/post/[id]',
  '/posts/[id]',
  '/privacy',
  '/profile',
  '/reset',
  '/search',
  '/settings',
  '/signin',
  '/signup',
  '/terms',
  '/u/[username]',
  '/vendors',
  '/vendors/orders',
  '/vendors/orders/[id]',
  '/vendors/payouts',
  '/vendors/payouts/setbankaccount',
  '/vendors/payouts/setmomo',
  '/vendors/products',
  '/vendors/products/[id]/edit',
  '/vendors/products/add-product',
  '/vendors/sales',
  '/vendors/services',
  '/vendors/services/add',
  '/verifykyc',
  '/wallet',
  '/welcome',
];

/** Mirrors `routing.locales` in src/i18n/routing.ts (the contract test pins them equal). */
export const APP_LOCALES: readonly string[] = ['en', 'fr', 'it', 'de', 'nl'];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COMPILED = APP_ROUTE_PATTERNS.map((p) => p.split('/').slice(1).filter((s, i, a) => !(s === '' && a.length === 1)));

function matchesPattern(pattern: string[], segments: string[]): boolean {
  if (pattern.length !== segments.length) return false;
  for (let i = 0; i < pattern.length; i++) {
    const want = pattern[i];
    const got = segments[i];
    if (want.startsWith('[')) {
      if (!got) return false;
      // The single-segment root `[id]` is the profile-by-id route: only real ids,
      // otherwise `/orders` or `/dashboard` would read as "valid".
      if (pattern.length === 1 && !UUID.test(got)) return false;
    } else if (want !== got) {
      return false;
    }
  }
  return true;
}

/**
 * True when `path` (optionally locale-prefixed, optionally with ?query / #hash)
 * resolves to a real page. Anything that is not a plain same-origin relative path
 * (absolute URL, `//host`, backslashes, control characters) is rejected.
 */
export function isKnownAppPath(path: string): boolean {
  if (typeof path !== 'string' || path.length === 0 || path.length > 2048) return false;
  if (path[0] !== '/' || path[1] === '/') return false;
  if (/[\\\u0000-\u001f\u007f\s]/.test(path)) return false;

  const pathname = path.split(/[?#]/, 1)[0];
  const segments = pathname.slice(1).split('/');
  if (segments.length > 1 && segments[segments.length - 1] === '') segments.pop(); // one trailing slash
  if (segments.some((s, i) => s === '' && !(i === 0 && segments.length === 1))) return false;

  if (segments[0] && APP_LOCALES.includes(segments[0].toLowerCase())) segments.shift();
  if (segments.length === 0 || (segments.length === 1 && segments[0] === '')) return true; // `/` or `/{locale}`

  // `/@handle` (proxy rewrite to /u/[handle]); `%40` is an encoded `@`.
  if (segments.length === 1) {
    const m = /^(?:@|%40)(.+)$/i.exec(segments[0]);
    if (m) return true;
  }

  return COMPILED.some((p) => matchesPattern(p, segments));
}
