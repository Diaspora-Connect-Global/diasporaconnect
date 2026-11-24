import { DISCOVER_CATEGORY_KEYS, OPPORTUNITY_SOURCES, isOpportunityKey, type DiscoverCategoryKey } from './discoverCategories';

/** The four kinds of content Discover lists. */
export type FeedKind = 'opportunities' | 'events' | 'products' | 'services';

/** Order the kinds take turns in, so no one busy kind buries the others. */
export const FEED_KIND_ORDER: readonly FeedKind[] = ['opportunities', 'events', 'services', 'products'];

/** One opportunity query: a type and/or a category (both empty = every opportunity). */
export type OpportunitySpec = { type?: string; category?: string };

/**
 * Which kinds a view lists. No category chosen = everything. Products and
 * services have no place to filter on, so a location filter leaves them out.
 */
export function activeKinds(categories: readonly DiscoverCategoryKey[], location: string): FeedKind[] {
  const chosen = categories.filter((k) => (DISCOVER_CATEGORY_KEYS as readonly string[]).includes(k));
  const kinds = new Set<FeedKind>();
  if (chosen.length === 0) FEED_KIND_ORDER.forEach((k) => kinds.add(k));
  for (const k of chosen) {
    if (isOpportunityKey(k)) kinds.add('opportunities');
    else kinds.add(k as FeedKind);
  }
  if (location.trim()) {
    kinds.delete('products');
    kinds.delete('services');
  }
  return FEED_KIND_ORDER.filter((k) => kinds.has(k));
}

/** The opportunity queries a view needs: one per type/category of the chosen rows, or a single unfiltered one. */
export function opportunitySpecs(categories: readonly DiscoverCategoryKey[]): OpportunitySpec[] {
  const keys = categories.filter(isOpportunityKey);
  if (keys.length === 0) return [{}];
  const specs: OpportunitySpec[] = [];
  const seen = new Set<string>();
  for (const k of keys) {
    const { types = [], category } = OPPORTUNITY_SOURCES[k];
    const list: OpportunitySpec[] = types.length ? types.map((type) => ({ type })) : [{ category }];
    for (const s of list) {
      const id = `${s.type ?? ''}|${s.category ?? ''}`;
      if (!seen.has(id)) {
        seen.add(id);
        specs.push(s);
      }
    }
  }
  return specs;
}

/** Drops repeats of an id, keeping the first. */
export function uniqueBy<T>(items: readonly T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const k = key(i);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Round-robin: first of each list, then second of each, and so on. Lists keep their own order. */
export function interleave<T>(lists: readonly (readonly T[])[]): T[] {
  const out: T[] = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}

const when = (iso?: string | null) => {
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isNaN(t) ? null : t;
};

export const byNewest = (a: { createdAt?: string | null }, b: { createdAt?: string | null }) => (when(b.createdAt) ?? 0) - (when(a.createdAt) ?? 0);
/** Soonest deadline first, no deadline last (the server's DEADLINE ASC). */
export const byClosing = (a: { deadline?: string | null }, b: { deadline?: string | null }) => (when(a.deadline) ?? Infinity) - (when(b.deadline) ?? Infinity);

/** Events still to come (or running), not cancelled or draft, matching the place text; soonest first. */
export function upcomingEvents<E extends { id: string; status?: string | null; startAt: string; endAt?: string | null }>(
  events: readonly (E | null | undefined)[],
  now: number,
  place: string,
  placeOf: (e: E) => string,
): E[] {
  const needle = place.trim().toLowerCase();
  return events
    .filter((e): e is E => !!e && !!e.id && !!e.startAt)
    .filter((e) => !['cancelled', 'draft'].includes(String(e.status).toLowerCase()))
    .filter((e) => (when(e.endAt || e.startAt) ?? 0) > now)
    .filter((e) => !needle || placeOf(e).toLowerCase().includes(needle))
    .sort((a, b) => (when(a.startAt) ?? 0) - (when(b.startAt) ?? 0));
}
