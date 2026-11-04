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

/**
 * Filter changes can arrive faster than the router re-renders the page with the
 * new URL. Building each URL from props would let the second change overwrite
 * the first, so the next URL is built from the latest query we have already
 * issued (`pending`) until the URL catches up. The URL stays the source of truth:
 * any URL we did not issue (back, forward, a shared link) discards `pending`.
 */
export type PendingMarketplaceQuery = { latest: string; merged: MarketplaceQuery; issued: string[] };

export function nextMarketplaceUrl(
  current: MarketplaceQuery,
  pending: PendingMarketplaceQuery | null,
  change: Partial<MarketplaceQuery>,
): { qs: string; pending: PendingMarketplaceQuery } {
  const merged = { ...(pending?.merged ?? current), ...change };
  const qs = marketplaceQueryString(merged);
  return { qs, pending: { latest: qs, merged, issued: [...(pending?.issued ?? []), qs] } };
}

/** Called when the URL the page renders changes: drop `pending` once it has landed or been bypassed. */
export function reconcilePendingQuery(pending: PendingMarketplaceQuery | null, renderedQs: string): PendingMarketplaceQuery | null {
  if (!pending || renderedQs === pending.latest) return null;
  return pending.issued.includes(renderedQs) ? pending : null;
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
