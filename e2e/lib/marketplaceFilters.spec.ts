/** Marketplace filter URL merging (pure, no browser). */
import { test, expect } from '@playwright/test';
import { nextMarketplaceUrl, parseMarketplaceQuery, reconcilePendingQuery } from '../../src/components/marketplace/filters';

const base = parseMarketplaceQuery(new URLSearchParams(''));
const parse = (qs: string) => parseMarketplaceQuery(new URLSearchParams(qs));

test('two changes issued before the URL lands both survive', () => {
    const a = nextMarketplaceUrl(base, null, { tag: 'fabric' });
    const b = nextMarketplaceUrl(base, a.pending, { cur: 'USD' }); // props still show the empty query
    expect(parse(b.qs)).toMatchObject({ tag: 'fabric', cur: 'USD' });
});

test('without a pending change the next URL is built from the rendered query', () => {
    const current = parse('tag=gifts&min=10');
    expect(parse(nextMarketplaceUrl(current, null, { cur: 'EUR' }).qs)).toMatchObject({ tag: 'gifts', min: '10', cur: 'EUR' });
});

test('pending stays while an intermediate URL renders, and clears once the latest lands', () => {
    const a = nextMarketplaceUrl(base, null, { tag: 'fabric' });
    const b = nextMarketplaceUrl(base, a.pending, { cur: 'USD' });
    expect(reconcilePendingQuery(b.pending, a.qs)).toBe(b.pending);
    expect(reconcilePendingQuery(b.pending, b.qs)).toBeNull();
});

test('a URL we did not issue (back, forward, shared link) discards pending', () => {
    const a = nextMarketplaceUrl(base, null, { tag: 'fabric' });
    expect(reconcilePendingQuery(a.pending, 'tab=services')).toBeNull();
    expect(reconcilePendingQuery(null, '')).toBeNull();
});

test('a later change can clear a filter set earlier in the same burst', () => {
    const a = nextMarketplaceUrl(base, null, { tag: 'fabric', min: '5' });
    const b = nextMarketplaceUrl(base, a.pending, { tag: '' });
    expect(parse(b.qs)).toMatchObject({ tag: '', min: '5' });
});
