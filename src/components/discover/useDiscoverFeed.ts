'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import type { OpportunityItem, ProductItem, ServiceItem } from '@/hooks/redesign/useFreshListings';
import { LIST_OPPORTUNITIES } from '@/services/gql/opportunities';
import { LIST_EVENTS, getEventLocationDisplay, type Event, type ListEventsData } from '@/services/gql/events';
import { SEARCH_MARKETPLACE_SERVICES, SEARCH_PRODUCTS } from '@/services/gql/marketplace';
import type { DiscoverCategoryKey, DiscoverSort } from './discoverCategories';
import { activeKinds, byClosing, byNewest, interleave, opportunitySpecs, uniqueBy, upcomingEvents, type FeedKind, type OpportunitySpec } from './feedLogic';

/** Items asked for per source and per "Load more". */
export const FEED_PAGE = 12;
/** Events come oldest first, so the page is read wider and the past ones dropped here. */
const EVENT_READ = 40;
const EVENT_MAX_READS = 4;

export type FeedItem =
  | { kind: 'opportunities'; id: string; item: OpportunityItem }
  | { kind: 'events'; id: string; item: Event }
  | { kind: 'products'; id: string; item: ProductItem }
  | { kind: 'services'; id: string; item: ServiceItem };

type Page<T, C> = { items: T[]; next: C | null };
const SILENT = { silentErrors: true } as const;

/**
 * One source read a page at a time. `resetKey` restarts it (filters changed);
 * a stale response from before a restart is ignored. A failed read ends the
 * source quietly — the rest of the feed still shows.
 */
function usePagedSource<T, C>(resetKey: string, enabled: boolean, fetchPage: (cursor: C | null) => Promise<Page<T, C>>) {
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const generation = useRef(0);
  const [state, setState] = useState<{ items: T[]; next: C | null; loading: boolean; done: boolean }>({ items: [], next: null, loading: false, done: true });

  const run = useCallback((cursor: C | null, reset: boolean) => {
    const mine = reset ? ++generation.current : generation.current;
    setState((s) => ({ ...s, loading: true }));
    fetchRef.current(cursor).then(
      (page) => {
        if (mine !== generation.current) return;
        setState((s) => ({ items: reset ? page.items : [...s.items, ...page.items], next: page.next, loading: false, done: page.next === null }));
      },
      () => {
        if (mine !== generation.current) return;
        setState((s) => ({ ...s, loading: false, done: true }));
      },
    );
  }, []);

  useEffect(() => {
    if (!enabled) {
      generation.current++;
      setState({ items: [], next: null, loading: false, done: true });
      return;
    }
    run(null, true);
  }, [enabled, resetKey, run]);

  const loadMore = useCallback(() => {
    if (state.loading || state.done) return;
    run(state.next, false);
  }, [state.loading, state.done, state.next, run]);

  return { items: state.items, loading: state.loading, done: state.done, loadMore };
}

/**
 * Everything Discover lists, in pages. Each kind is its own paged source
 * (opportunities of every owner, upcoming events, marketplace products and
 * services); the kinds take turns so the feed mixes them. With no category
 * chosen every kind is on; categories, place and sort narrow it.
 */
export function useDiscoverFeed(categories: readonly DiscoverCategoryKey[], location: string, sort: DiscoverSort) {
  const client = useApolloClient();
  const kinds = useMemo(() => activeKinds(categories, location), [categories, location]);
  const specs = useMemo(() => opportunitySpecs(categories), [categories]);
  const on = (k: FeedKind) => kinds.includes(k);

  const opportunities = usePagedSource<OpportunityItem, (number | null)[]>(
    JSON.stringify([specs, location, sort]),
    on('opportunities'),
    async (cursor) => {
      const offsets = cursor ?? specs.map(() => 0);
      const sortInput = sort === 'closing' ? { sortBy: 'DEADLINE', sortOrder: 'ASC' } : { sortBy: 'CREATED_AT', sortOrder: 'DESC' };
      const pages = await Promise.all(
        specs.map(async (spec: OpportunitySpec, i) => {
          const offset = offsets[i];
          if (offset === null) return { items: [] as OpportunityItem[], next: null as number | null };
          const { data } = await client.query<{ listOpportunities?: { opportunities?: (OpportunityItem | null)[] | null } | null }>({
            query: LIST_OPPORTUNITIES,
            variables: { input: { ...(spec.type ? { type: spec.type } : {}), ...(spec.category ? { category: spec.category } : {}), location: location || undefined, limit: FEED_PAGE, offset, ...sortInput } },
            fetchPolicy: 'cache-first',
            context: SILENT,
          });
          const rows = (data?.listOpportunities?.opportunities ?? []).filter((o): o is OpportunityItem => !!o?.id && !!o.title);
          return { items: rows, next: rows.length < FEED_PAGE ? null : offset + FEED_PAGE };
        }),
      );
      const next = pages.map((p) => p.next);
      return { items: pages.flatMap((p) => p.items), next: next.every((n) => n === null) ? null : next };
    },
  );

  const events = usePagedSource<Event, number>(JSON.stringify([location]), on('events'), async (cursor) => {
    const now = Date.now();
    const kept: Event[] = [];
    let offset = cursor ?? 0;
    for (let reads = 0; reads < EVENT_MAX_READS; reads++) {
      const { data } = await client.query<ListEventsData>({ query: LIST_EVENTS, variables: { input: { limit: EVENT_READ, offset } }, fetchPolicy: 'cache-first', context: SILENT });
      const rows = data?.listEvents?.events ?? [];
      kept.push(...upcomingEvents(rows as Event[], now, location, getEventLocationDisplay));
      offset += EVENT_READ;
      if (rows.length < EVENT_READ || !data?.listEvents?.hasMore) return { items: kept, next: null };
      if (kept.length >= FEED_PAGE) break;
    }
    return { items: kept, next: offset };
  });

  const products = usePagedSource<ProductItem, number>('p', on('products'), async (cursor) => {
    const page = cursor ?? 1;
    const { data } = await client.query<{ searchProducts?: { products?: (ProductItem | null)[] | null } | null }>({ query: SEARCH_PRODUCTS, variables: { input: { page, limit: FEED_PAGE } }, fetchPolicy: 'cache-first', context: SILENT });
    const rows = (data?.searchProducts?.products ?? []).filter((p): p is ProductItem => !!p?.id && !!p.title);
    return { items: rows, next: rows.length < FEED_PAGE ? null : page + 1 };
  });

  const services = usePagedSource<ServiceItem, number>('s', on('services'), async (cursor) => {
    const page = cursor ?? 1;
    const { data } = await client.query<{ searchMarketplaceServices?: { services?: (ServiceItem | null)[] | null } | null }>({ query: SEARCH_MARKETPLACE_SERVICES, variables: { input: { page, limit: FEED_PAGE } }, fetchPolicy: 'cache-first', context: SILENT });
    const rows = (data?.searchMarketplaceServices?.services ?? []).filter((s): s is ServiceItem => !!s?.id && !!s.title);
    return { items: rows, next: rows.length < FEED_PAGE ? null : page + 1 };
  });

  const items = useMemo<FeedItem[]>(() => {
    const opps = uniqueBy(opportunities.items, (o) => o.id).sort(sort === 'closing' ? byClosing : byNewest);
    const groups: Record<FeedKind, FeedItem[]> = {
      opportunities: opps.map((item) => ({ kind: 'opportunities', id: item.id, item })),
      events: uniqueBy(events.items, (e) => e.id).map((item) => ({ kind: 'events', id: item.id, item })),
      services: uniqueBy(services.items, (s) => s.id).map((item) => ({ kind: 'services', id: item.id, item })),
      products: uniqueBy(products.items, (p) => p.id).map((item) => ({ kind: 'products', id: item.id, item })),
    };
    return interleave(kinds.map((k) => groups[k]));
  }, [kinds, sort, opportunities.items, events.items, services.items, products.items]);

  const sources = [
    [opportunities, 'opportunities'],
    [events, 'events'],
    [products, 'products'],
    [services, 'services'],
  ] as const;
  const live = sources.filter(([, k]) => on(k)).map(([s]) => s);
  const loading = live.some((s) => s.loading);
  const hasMore = live.some((s) => !s.done);

  const loadMore = () => live.forEach((s) => s.loadMore());
  const singleOpportunityRow = categories.length === 1 && categories[0] === 'jobs';

  return { items, loading, hasMore, loadMore, jobsOnly: singleOpportunityRow };
}
