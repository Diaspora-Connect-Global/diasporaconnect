import { toMinorUnits } from '@/types/money';
import { MARKETPLACE_CURRENCIES, type MarketplaceFilters } from './RefinePanel';

export type MarketplaceTab = 'products' | 'services';

export type MarketplaceQuery = MarketplaceFilters & { tab: MarketplaceTab; q: string };

export const PAGE_SIZE = 20;

type Params = { get(name: string): string | null };

/** A price typed in the refine panel: a plain non-negative decimal, else ignored. */
const cleanPrice = (v: string | null): string => {
  const s = (v ?? '').trim();
  return /^\d{1,9}(\.\d{1,2})?$/.test(s) ? s : '';
};

/** The URL is the source of truth: `?tab=services&q=…&tag=…&cur=USD&min=10&max=200`. Anything malformed is dropped. */
export function parseMarketplaceQuery(params: Params): MarketplaceQuery {
  const cur = (params.get('cur') ?? '').toUpperCase();
  return {
    tab: params.get('tab') === 'services' ? 'services' : 'products',
    q: (params.get('q') ?? '').slice(0, 200),
    tag: (params.get('tag') ?? '').slice(0, 60),
    cur: (MARKETPLACE_CURRENCIES as readonly string[]).includes(cur) ? cur : '',
    min: cleanPrice(params.get('min')),
    max: cleanPrice(params.get('max')),
  };
}

export function marketplaceQueryString(q: MarketplaceQuery): string {
  const p = new URLSearchParams();
  if (q.tab === 'services') p.set('tab', 'services');
  if (q.q) p.set('q', q.q);
  if (q.tab === 'products') {
    if (q.tag) p.set('tag', q.tag);
    if (q.cur) p.set('cur', q.cur);
  }
  if (q.min) p.set('min', q.min);
  if (q.max) p.set('max', q.max);
  return p.toString();
}

// The price boxes hold major units; the API takes integer minor units, so the
// ×100 happens here, once, at the UI input boundary.
const minor = (v: string): number | undefined => (v ? toMinorUnits(Number(v)) : undefined);

export function productSearchInput(q: MarketplaceQuery, limit: number) {
  return {
    query: q.q || undefined,
    tags: q.tag ? [q.tag] : undefined,
    currency: q.cur || undefined,
    min_price: minor(q.min),
    max_price: minor(q.max),
    page: 1,
    limit,
  };
}

export function serviceSearchInput(q: MarketplaceQuery, limit: number) {
  return { query: q.q || undefined, min_price: minor(q.min), max_price: minor(q.max), page: 1, limit };
}
