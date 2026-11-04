'use client';

import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { REDESIGN_IMAGES } from '@/lib/redesignImages';
import { PageHero } from '@/components/redesign/PageHero';
import { CategoryTileRow } from '@/components/redesign/CategoryTileRow';
import { LazyMount } from '@/components/redesign/LazyMount';
import { DiscoverHelpCard, RefinePanel } from './RefinePanel';
import { EventsSection, LatestSection, OpportunitySection, ProductsSection, RecommendedOpportunitiesSection, ServicesSection, useLatestMix, useRecommendedOpportunities, withoutRepeats } from './DiscoverSections';
import { DISCOVER_CATEGORY_KEYS, DISCOVER_ICONS, DISCOVER_SECTION_ORDER, DISCOVER_TONES, isOpportunityKey, parseCategories, parseSort, type DiscoverCategoryKey, type DiscoverSort, type DiscoverViewKey } from './discoverCategories';

/** One row of 4 per section, for "For you", Latest and rows narrowed only by place or sort. */
const OVERVIEW_SHOWN = 4;
/** A row shows 3 of those beside the refine rail, so a 4th listing is only reachable through "View all". */
const SMALLEST_ROW = 3;
const EXPANDED_LIMIT = 12;
/** Latest's "View all". Fetched with room for what "For you" takes out of the row, and the same query for both. */
const LATEST_FETCH = EXPANDED_LIMIT + OVERVIEW_SHOWN;
/** Sections mounted (and queried) immediately; the rest wait until they near the viewport. */
const EAGER_SECTIONS = 2;

/**
 * `/discover`: hero search, category tiles, then only one row of "For you" (the
 * viewer's recommended opportunities of every type, ranked on the server, each
 * with why) and one of "Latest opportunities" (the newest of every kind), each
 * with its own "View all". Choosing a category, place or sort swaps those for
 * real, queryable sections (services, a row per kind of opportunity — together
 * every type — products, events).
 * The URL carries the filters (`?cat=jobs,events&loc=Accra&sort=closing`), so a
 * view can be shared and the back button works. A section with nothing to show
 * is not rendered.
 */
export function DiscoverView() {
  const t = useTranslations('discover');
  const tRefine = useTranslations('discover.refine');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const categories = useMemo(() => parseCategories(searchParams.get('cat')), [searchParams]);
  const location = (searchParams.get('loc') ?? '').slice(0, 80);
  const sort = parseSort(searchParams.get('sort'));

  const update = useCallback(
    (next: { cat?: readonly DiscoverViewKey[]; loc?: string; sort?: DiscoverSort }) => {
      const params = new URLSearchParams();
      const cat = next.cat ?? categories;
      const loc = next.loc ?? location;
      const so = next.sort ?? sort;
      if (cat.length) params.set('cat', cat.join(','));
      if (loc) params.set('loc', loc);
      if (so !== 'newest') params.set('sort', so);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [categories, location, sort, router, pathname],
  );

  // Choosing a category leaves Latest's "View all".
  const toggle = (key: DiscoverCategoryKey) => {
    const rest = categories.filter((k) => k !== 'latest');
    update({ cat: rest.includes(key) ? rest.filter((k) => k !== key) : [...rest, key] });
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      inputRef.current?.focus();
      return;
    }
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  // Latest is a view, not a filter. Latest cannot filter by place or sort by deadline, so either one leaves it for the plain sections.
  const filtered = categories.some((k) => k !== 'latest');
  const unrefined = !filtered && !location && sort === 'newest';
  const latestView = categories.includes('latest') && !location && sort === 'newest';
  const shown = filtered ? EXPANDED_LIMIT : OVERVIEW_SHOWN;
  // The untouched page is one row of "For you" and one of Latest; any refinement shows the plain sections.
  const overview = unrefined && !latestView;
  // "For you" = recommended opportunities. The recommender cannot filter by place or sort by deadline,
  // so the row shows only on the unfiltered page or on its own "View all".
  const showForYou = !latestView && !location && sort === 'newest' && (!filtered || categories.includes('forYou'));
  const forYou = useRecommendedOpportunities(shown, showForYou);
  const forYouShown = useMemo(() => forYou.slice(0, shown), [forYou, shown]);
  const forYouIds = useMemo(() => new Set(forYouShown.map((o) => o.id)), [forYouShown]);
  const mix = useLatestMix(LATEST_FETCH, overview || latestView);
  const mixShown = useMemo(() => (latestView ? mix.slice(0, EXPANDED_LIMIT) : withoutRepeats(mix, forYouIds, OVERVIEW_SHOWN).slice(0, OVERVIEW_SHOWN)), [latestView, mix, forYouIds]);
  // Products and services have no place to filter on, so a location filter leaves them out.
  const visible = unrefined ? [] : DISCOVER_SECTION_ORDER.filter((k) => (!filtered || categories.includes(k)) && !(location && (k === 'services' || k === 'products')));

  const renderSection = (k: DiscoverCategoryKey) => {
    const common = { limit: shown, shown, expanded: filtered, onViewAll: () => update({ cat: [k] }) };
    if (isOpportunityKey(k)) return <OpportunitySection {...common} k={k} location={location} sort={sort} />;
    switch (k) {
      case 'services':
        return <ServicesSection {...common} />;
      case 'products':
        return <ProductsSection {...common} />;
      case 'events':
        return <EventsSection {...common} location={location} />;
    }
  };

  return (
    <div ref={setScrollEl} className="h-app-inner overflow-y-auto scrollbar-hide bg-background">
      <div className="mx-auto w-full space-y-5 px-4 py-4 pb-10 lg:w-[80vw] lg:px-0 lg:py-6">
        <PageHero id="discover-title" eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} image={REDESIGN_IMAGES.discoverHero} tagline={t('tagline')} priority>
          <form role="search" onSubmit={onSubmit} className="flex max-w-xl items-center gap-2 rounded-full border border-border-subtle bg-surface-default p-1.5 pl-4 shadow-sm focus-within:border-border-brand">
            <label htmlFor="discover-search" className="sr-only">
              {t('searchLabel')}
            </label>
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            {/* 16px on phones: iOS Safari zooms the page into smaller fields. */}
            <input
              ref={inputRef}
              id="discover-search"
              type="search"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              autoComplete="off"
              enterKeyHint="search"
              maxLength={200}
              className="min-w-0 flex-1 bg-transparent text-base text-text-primary outline-none placeholder:text-muted-foreground md:text-sm"
            />
            <button type="submit" className="shrink-0 rounded-full bg-surface-brand px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2">
              {t('searchButton')}
            </button>
          </form>
        </PageHero>

        <CategoryTileRow
          label={t('categoriesHeading')}
          tiles={DISCOVER_CATEGORY_KEYS.map((k) => ({ key: k, label: t(`categories.${k}`), icon: DISCOVER_ICONS[k], tone: DISCOVER_TONES[k], active: categories.includes(k) }))}
          onSelect={(k) => toggle(k as DiscoverCategoryKey)}
        />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
          {/* Phones: the refine panel sits above the sections; desktop: right rail. */}
          <div className="lg:col-start-2 lg:row-start-1">
            <div className="space-y-5 lg:sticky lg:top-0">
              <RefinePanel categories={categories} location={location} sort={sort} onToggleCategory={toggle} onLocation={(loc) => update({ loc })} onSort={(so) => update({ sort: so })} onClear={() => update({ cat: [], loc: '', sort: 'newest' })} />
              {!(categories.length === 1 && categories[0] === 'services') && (
                <div className="hidden lg:block">
                  <DiscoverHelpCard onBrowseServices={() => update({ cat: ['services'], loc: '' })} />
                </div>
              )}
            </div>
          </div>
          <div className="min-w-0 space-y-5 lg:col-start-1 lg:row-start-1" data-testid="discover-sections" aria-label={tRefine('title')}>
            {showForYou && <RecommendedOpportunitiesSection items={forYouShown} expanded={filtered} onViewAll={() => update({ cat: ['forYou'] })} />}
            {(overview || latestView) && <LatestSection entries={mixShown} expanded={latestView} onViewAll={mix.length > SMALLEST_ROW ? () => update({ cat: ['latest'] }) : undefined} />}
            {visible.map((k, i) => (
              <div key={`${k}-${shown}-${location}-${sort}`} className="empty:hidden">{i < EAGER_SECTIONS ? renderSection(k) : <LazyMount root={scrollEl} minHeight={120}>{renderSection(k)}</LazyMount>}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
