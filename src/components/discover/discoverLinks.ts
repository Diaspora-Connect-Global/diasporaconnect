import type { MoreTone } from '@/components/more/moreLinks';

/**
 * Discover v1 categories, as data (no React imports, so the e2e spec can check
 * every href against the route list).
 *
 * Only categories with a real page to land on: the mockup's Businesses, Jobs,
 * Investments, Property and Projects have no browsable destination yet (the
 * full Discover arrives in M9, with the gateway filters those tiles need), so
 * they are not shown.
 */
export const DISCOVER_CATEGORIES: readonly { key: 'services' | 'events'; href: string; tone: MoreTone }[] = [
  { key: 'services', href: '/marketplace?tab=services', tone: 'warning' },
  { key: 'events', href: '/events', tone: 'danger' },
];
