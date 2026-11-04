'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Briefcase, Search, ShoppingBag, ShoppingCart } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { REDESIGN_IMAGES } from '@/lib/redesignImages';
import { formatAmountWithCurrency } from '@/lib/displayCurrency';
import { PageHero } from '@/components/redesign/PageHero';
import { ForYouRail } from '@/components/discover/DiscoverSections';
import { EmptyState, ErrorState, NoResults } from '@/components/feedback';
import { ListingCard, ListingCardSkeleton } from './ListingCard';
import { MarketplaceRefinePanel } from './RefinePanel';
import { marketplaceQueryString, nextMarketplaceUrl, reconcilePendingQuery, type MarketplaceQuery, type MarketplaceTab, type PendingMarketplaceQuery } from './filters';

/** What the browse view needs of a listing. Prices are MAJOR units here (the ÷100 happened once, on mapping). */
export type BrowseItem = {
  id: string;
  name: string;
  price: number;
  currency?: string;
  image: string;
  tags?: string[];
  isService?: boolean;
};

const SKELETONS = 8;

/**
 * `/marketplace` landing: hero with search, Products / Services tabs, refine
 * rail, container-query card grid, skeletons, and empty / error states. The URL
 * carries every filter (`?tab=&q=&tag=&cur=&min=&max=`) and the container turns
 * the same values into the real GraphQL variables.
 */
export function MarketplaceBrowse({
  query,
  items,
  total,
  pending,
  refreshing,
  error,
  onRetry,
  onShowMore,
  knownTags,
  cartCount,
  onCart,
  onOpen,
  onAdd,
}: {
  query: MarketplaceQuery;
  items: BrowseItem[];
  total: number;
  pending: boolean;
  refreshing: boolean;
  error: boolean;
  onRetry: () => void;
  onShowMore: () => void;
  knownTags: readonly string[];
  cartCount: number;
  onCart: () => void;
  onOpen: (item: BrowseItem) => void;
  onAdd: (item: BrowseItem) => void;
}) {
  const t = useTranslations('marketplacePage');
  const tFeedback = useTranslations('feedback');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(query.q);
  const [seenQ, setSeenQ] = useState(query.q);
  // Keep the box in step with the URL (back button, "clear") without an effect.
  if (seenQ !== query.q) {
    setSeenQ(query.q);
    setDraft(query.q);
  }

  // Latest URL we issued but the page has not rendered yet (see nextMarketplaceUrl).
  const pendingRef = useRef<PendingMarketplaceQuery | null>(null);
  const renderedQs = marketplaceQueryString(query);
  useEffect(() => {
    pendingRef.current = reconcilePendingQuery(pendingRef.current, renderedQs);
  }, [renderedQs]);

  const go = (next: Partial<MarketplaceQuery>) => {
    const { qs, pending } = nextMarketplaceUrl(query, pendingRef.current, next);
    pendingRef.current = pending;
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const isProducts = query.tab === 'products';
  const hasFilters = !!(query.q || (isProducts && (query.tag || query.cur)) || query.min || query.max);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    go({ q: draft.trim() });
  };

  const tabs: { key: MarketplaceTab; label: string }[] = [
    { key: 'products', label: t('products') },
    { key: 'services', label: t('services') },
  ];

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    go({ tab: next.key });
    document.getElementById(`mp-tab-${next.key}`)?.focus();
  };

  return (
    <div className="h-app-inner overflow-y-auto scrollbar-hide bg-background">
      <div className="mx-auto w-full space-y-5 px-4 py-4 pb-10 lg:w-[80vw] lg:px-0 lg:py-6">
        <PageHero id="mp-title" eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} tagline={t('tagline')} image={REDESIGN_IMAGES.discoverHero} priority>
          <form role="search" onSubmit={onSubmit} className="flex max-w-xl items-center gap-2 rounded-full border border-border-subtle bg-surface-default p-1.5 pl-4 shadow-sm focus-within:border-border-brand">
            <label htmlFor="mp-search" className="sr-only">{t('searchLabel')}</label>
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              ref={inputRef}
              id="mp-search"
              type="search"
              name="q"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('searchPlaceholder')}
              autoComplete="off"
              enterKeyHint="search"
              maxLength={200}
              className="min-w-0 flex-1 bg-transparent text-base text-text-primary outline-none placeholder:text-muted-foreground md:text-sm"
            />
            <button type="submit" className="shrink-0 rounded-full bg-surface-brand px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2">
              {t('searchButton')}
            </button>
          </form>
        </PageHero>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface-default p-1.5 shadow-sm">
          <div role="tablist" aria-label={t('tabsLabel')} className="flex gap-1">
            {tabs.map((tab, i) => {
              const on = query.tab === tab.key;
              return (
                <button
                  key={tab.key}
                  id={`mp-tab-${tab.key}`}
                  role="tab"
                  type="button"
                  aria-selected={on}
                  aria-controls="mp-results"
                  tabIndex={on ? 0 : -1}
                  onClick={() => go({ tab: tab.key })}
                  onKeyDown={(e) => onTabKey(e, i)}
                  className={`flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand ${on ? 'bg-surface-brand-subtle text-text-brand' : 'text-text-primary hover:bg-surface-subtle'}`}
                >
                  {tab.key === 'products' ? <ShoppingBag className="size-4" aria-hidden /> : <Briefcase className="size-4" aria-hidden />}
                  {tab.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onCart}
            aria-label={t('cartLabel', { count: cartCount })}
            className="relative flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-text-primary hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
          >
            <ShoppingCart className="size-5" aria-hidden />
            <span className="hidden sm:inline">{t('cart')}</span>
            <span aria-hidden className={`grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold ${cartCount === 0 ? 'bg-surface-subtle text-text-secondary' : 'bg-surface-brand text-white'}`}>
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="lg:col-start-2 lg:row-start-1">
            <div className="lg:sticky lg:top-0">
              <MarketplaceRefinePanel
                isProducts={isProducts}
                filters={query}
                tags={knownTags}
                onChange={(next) => go(next)}
                onClear={() => go({ tag: '', cur: '', min: '', max: '', q: '' })}
              />
            </div>
          </div>

          <section id="mp-results" role="tabpanel" aria-labelledby={`mp-tab-${query.tab}`} className="min-w-0 space-y-5 lg:col-start-1 lg:row-start-1" data-testid="mp-results">
            {!hasFilters && <ForYouRail kinds={[isProducts ? 'products' : 'services']} />}

            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold text-text-primary">{isProducts ? t('resultsHeadingProducts') : t('resultsHeadingServices')}</h2>
              {!pending && !error && total > 0 && <p className="text-sm text-muted-foreground" aria-live="polite">{t('resultCount', { count: total })}</p>}
            </div>

            {pending && (
              <div className="@container" role="status" aria-busy="true" aria-label={t('loading')}>
                <div className="grid grid-cols-2 gap-3 @[38rem]:grid-cols-3 @[52rem]:grid-cols-4">
                  {Array.from({ length: SKELETONS }, (_, i) => (
                    <ListingCardSkeleton key={i} />
                  ))}
                </div>
              </div>
            )}

            {!pending && items.length > 0 && (
              <div className={`@container transition-opacity ${refreshing ? 'opacity-70' : ''}`}>
                <ul className="grid grid-cols-2 gap-3 @[38rem]:grid-cols-3 @[52rem]:grid-cols-4">
                  {items.map((item) => (
                    <li key={item.id} className="min-w-0">
                      <ListingCard
                        testId="mp-card"
                        item={{ id: item.id, name: item.name, priceText: formatAmountWithCurrency(item.price, item.currency || 'GHS', locale), image: item.image || undefined, tags: item.tags, isService: item.isService }}
                        onOpen={() => onOpen(item)}
                        onAdd={item.isService ? undefined : () => onAdd(item)}
                      />
                    </li>
                  ))}
                </ul>
                {items.length < total && (
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <p className="text-xs text-muted-foreground">{t('showing', { shown: items.length, total })}</p>
                    <button type="button" onClick={onShowMore} className="min-h-11 rounded-full border border-border-subtle bg-surface-default px-6 text-sm font-semibold text-text-primary hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
                      {t('showMore')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {!pending && items.length === 0 && (
              <div data-testid="mp-empty">
                {error ? (
                  <ErrorState title={tFeedback('error.title')} description={tFeedback('error.description')} retryLabel={tFeedback('error.retry')} onRetry={onRetry} />
                ) : query.q ? (
                  <NoResults query={query.q} title={tFeedback('noResults.title', { query: query.q })} description={tFeedback('noResults.description')} />
                ) : (
                  <EmptyState
                    icon={isProducts ? ShoppingBag : Briefcase}
                    title={tFeedback(hasFilters ? 'noResults.titleGeneric' : isProducts ? 'empty.marketplaceProducts.title' : 'empty.marketplaceServices.title')}
                    description={tFeedback(hasFilters ? 'noResults.description' : isProducts ? 'empty.marketplaceProducts.description' : 'empty.marketplaceServices.description')}
                  />
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
