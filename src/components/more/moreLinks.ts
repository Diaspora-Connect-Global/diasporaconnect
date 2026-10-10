/**
 * Every destination the More page offers, as data.
 *
 * Only REAL destinations: each `href` is a page that exists today (the spec
 * e2e/more/more-links.spec.ts checks every one against `isKnownAppPath`).
 * Mockup tiles with no real source — bookings, projects, investments,
 * documents, receipts, recently used, the app promo, FAQs — are deliberately
 * absent (see docs/event-networking/README.md §9).
 *
 * Kept free of React/icon imports so the spec can import it under Node; the
 * page maps each `key` to its icon.
 */

export type MoreTone = 'brand' | 'info' | 'success' | 'warning' | 'danger';

export type MoreSheetKey = 'requests' | 'saved';

export type MoreItem =
  | { key: string; tone: MoreTone; href: string; sheet?: never }
  | { key: string; tone: MoreTone; sheet: MoreSheetKey; href?: never };

export type MoreSection = { key: 'yourStuff' | 'work' | 'money' | 'connect'; items: readonly MoreItem[] };

export const MORE_SECTIONS: readonly MoreSection[] = [
  {
    key: 'yourStuff',
    items: [
      { key: 'requests', tone: 'info', sheet: 'requests' },
      { key: 'saved', tone: 'danger', sheet: 'saved' },
      // "Tickets & orders" in the mockup: only tickets have a page (the Events
      // Attending tab, its default); buyer orders have none, so they are not claimed.
      { key: 'tickets', tone: 'brand', href: '/events' },
    ],
  },
  {
    key: 'work',
    items: [
      // /vendors sends someone who is not a vendor yet to /becomeavendor.
      { key: 'businesses', tone: 'info', href: '/vendors' },
      { key: 'services', tone: 'warning', href: '/marketplace?tab=services' },
      { key: 'listings', tone: 'brand', href: '/vendors/products' },
      { key: 'applications', tone: 'brand', href: '/opportunities' },
    ],
  },
  {
    key: 'money',
    items: [{ key: 'payments', tone: 'info', href: '/wallet' }],
  },
  {
    key: 'connect',
    items: [
      { key: 'circles', tone: 'success', href: '/circles' },
      { key: 'events', tone: 'brand', href: '/events' },
      // Direct messages AND group chats (the old sidebar's group list) live here.
      { key: 'conversations', tone: 'brand', href: '/chat' },
      { key: 'marketplace', tone: 'warning', href: '/marketplace' },
      { key: 'opportunities', tone: 'info', href: '/opportunities' },
      { key: 'createPost', tone: 'success', href: '/create-post' },
    ],
  },
];

/** The two link lists opened as sheets from "My Requests" and "Saved". */
export const MORE_SHEETS: Readonly<Record<MoreSheetKey, readonly { key: string; href: string }[]>> = {
  requests: [
    // Pending community requests sit in the Community page's "Your communities" column.
    { key: 'membership', href: '/community' },
    // Pending association requests have their own section on the associations page.
    { key: 'associations', href: '/association' },
    // The "Requests received" tab of the connections list (a modal on the profile page).
    { key: 'connections', href: '/profile?m=friends&t=3' },
  ],
  saved: [
    { key: 'posts', href: '/profile?posts=saved' },
    { key: 'events', href: '/events?tab=saved' },
    { key: 'opportunities', href: '/opportunities?tab=saved' },
  ],
};

/** Plain links in the right rail (support and legal). */
export const MORE_RAIL_LINKS: readonly { key: 'contact' | 'privacy' | 'settings' | 'terms' | 'about'; href: string }[] = [
  { key: 'contact', href: '/contact' },
  { key: 'settings', href: '/settings' },
  { key: 'privacy', href: '/privacy' },
  { key: 'terms', href: '/terms' },
  { key: 'about', href: '/about' },
];

/** Account links in the rail's profile card. */
export const MORE_ACCOUNT_LINKS = {
  profile: '/profile',
  notifications: '/notification',
  messages: '/chat',
} as const;
