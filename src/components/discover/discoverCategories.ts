import { Briefcase, Building2, CalendarDays, GraduationCap, HandHeart, Landmark, Package, Rocket, TrendingUp, Wrench, type LucideIcon } from 'lucide-react';
import type { MoreTone } from '@/components/more/moreLinks';

/**
 * Discover categories. Each one is a real, queryable source:
 * - jobs … investments        → opportunities of those `type`s (together they cover every type)
 * - realEstate                → opportunities in `REAL_ESTATE_INFRASTRUCTURE`
 * - services / products       → the marketplace's featured services / products
 * - events                    → upcoming events
 * Businesses, Property listings and Projects have no source on the web yet, so
 * they are not offered.
 */
export const DISCOVER_CATEGORY_KEYS = ['services', 'products', 'jobs', 'scholarships', 'grants', 'programs', 'volunteering', 'investments', 'realEstate', 'events'] as const;
export type DiscoverCategoryKey = (typeof DISCOVER_CATEGORY_KEYS)[number];

/** What `?cat=` may hold: a category, or "For you" — the viewer's recommended opportunities ("View all" on that row; not a tile). */
export type DiscoverViewKey = DiscoverCategoryKey | 'forYou';

/** Order of the sections on the page (the mockup leads with services, then jobs). */
export const DISCOVER_SECTION_ORDER: readonly DiscoverCategoryKey[] = ['services', 'jobs', 'scholarships', 'grants', 'programs', 'volunteering', 'investments', 'realEstate', 'products', 'events'];

export type OpportunityKey = 'jobs' | 'scholarships' | 'grants' | 'programs' | 'volunteering' | 'investments' | 'realEstate';

/**
 * Which opportunities each row lists. Between them the type rows cover every
 * opportunity type the platform has, so nothing posted is missing from Discover.
 * The query takes one type at a time; a two-type row sends two requests and merges them.
 */
export const OPPORTUNITY_SOURCES: Record<OpportunityKey, { types?: readonly string[]; category?: string }> = {
  jobs: { types: ['EMPLOYMENT', 'CONTRACT'] },
  scholarships: { types: ['SCHOLARSHIP', 'FELLOWSHIP'] },
  grants: { types: ['GRANT'] },
  programs: { types: ['PROGRAM', 'INITIATIVE'] },
  volunteering: { types: ['VOLUNTEER'] },
  investments: { types: ['INVESTMENT'] },
  realEstate: { category: 'REAL_ESTATE_INFRASTRUCTURE' },
};

export const isOpportunityKey = (k: DiscoverCategoryKey): k is OpportunityKey => k in OPPORTUNITY_SOURCES;

export const DISCOVER_ICONS: Record<DiscoverCategoryKey, LucideIcon> = {
  services: Wrench,
  products: Package,
  jobs: Briefcase,
  scholarships: GraduationCap,
  grants: Landmark,
  programs: Rocket,
  volunteering: HandHeart,
  investments: TrendingUp,
  realEstate: Building2,
  events: CalendarDays,
};

export const DISCOVER_TONES: Record<DiscoverCategoryKey, MoreTone> = {
  services: 'info',
  products: 'brand',
  jobs: 'warning',
  scholarships: 'info',
  grants: 'brand',
  programs: 'success',
  volunteering: 'danger',
  investments: 'success',
  realEstate: 'brand',
  events: 'danger',
};

/** Parse `?cat=jobs,events`, dropping anything that is not a known key. */
export function parseCategories(raw: string | null): DiscoverViewKey[] {
  if (!raw) return [];
  const wanted = new Set(raw.split(','));
  return (['forYou', ...DISCOVER_CATEGORY_KEYS] as const).filter((k) => wanted.has(k));
}

// No "most applications" sort: opportunity-service cannot sort by it, and a label must describe the real order.
export type DiscoverSort = 'newest' | 'closing';
export function parseSort(raw: string | null): DiscoverSort {
  return raw === 'closing' ? raw : 'newest';
}
