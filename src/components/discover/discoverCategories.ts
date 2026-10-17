import { Briefcase, Building2, CalendarDays, Package, TrendingUp, Wrench, type LucideIcon } from 'lucide-react';
import type { MoreTone } from '@/components/more/moreLinks';

/**
 * Discover categories. Each one is a real, queryable source:
 * - jobs / investments        → opportunities of that `type`
 * - realEstate                → opportunities in `REAL_ESTATE_INFRASTRUCTURE`
 * - services / products       → the marketplace's featured services / products
 * - events                    → upcoming events
 * Businesses, Property listings and Projects have no source on the web yet, so
 * they are not offered.
 */
export const DISCOVER_CATEGORY_KEYS = ['services', 'products', 'jobs', 'investments', 'realEstate', 'events'] as const;
export type DiscoverCategoryKey = (typeof DISCOVER_CATEGORY_KEYS)[number];

/** Order of the sections on the page (the mockup leads with services, then jobs). */
export const DISCOVER_SECTION_ORDER: readonly DiscoverCategoryKey[] = ['services', 'jobs', 'investments', 'realEstate', 'products', 'events'];

export const DISCOVER_ICONS: Record<DiscoverCategoryKey, LucideIcon> = {
  services: Wrench,
  products: Package,
  jobs: Briefcase,
  investments: TrendingUp,
  realEstate: Building2,
  events: CalendarDays,
};

export const DISCOVER_TONES: Record<DiscoverCategoryKey, MoreTone> = {
  services: 'info',
  products: 'brand',
  jobs: 'warning',
  investments: 'success',
  realEstate: 'brand',
  events: 'danger',
};

/** Parse `?cat=jobs,events`, dropping anything that is not a known key. */
export function parseCategories(raw: string | null): DiscoverCategoryKey[] {
  if (!raw) return [];
  const wanted = new Set(raw.split(','));
  return DISCOVER_CATEGORY_KEYS.filter((k) => wanted.has(k));
}

// No "most applications" sort: opportunity-service cannot sort by it, and a label must describe the real order.
export type DiscoverSort = 'newest' | 'closing';
export function parseSort(raw: string | null): DiscoverSort {
  return raw === 'closing' ? raw : 'newest';
}
