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
import { CommunityPosts } from '@/components/home/HomeCommunityPosts';
import { DiscoverHelpCard, RefinePanel } from './RefinePanel';
import { EventsSection, LatestSection, OpportunitySection, ProductsSection, ServicesSection, useLatestMix } from './DiscoverSections';
import { DISCOVER_CATEGORY_KEYS, DISCOVER_ICONS, DISCOVER_SECTION_ORDER, DISCOVER_TONES, parseCategories, parseSort, type DiscoverCategoryKey, type DiscoverSort } from './discoverCategories';

/** Overview: one row of 4 per section, fetched with one spare so the "Latest" row can take an item without leaving a gap. */
const OVERVIEW_SHOWN = 4;
const OVERVIEW_FETCH = OVERVIEW_SHOWN + 1;
const EXPANDED_LIMIT = 12;
/** Sections mounted (and queried) immediately; the rest wait until they near the viewport. */
const EAGER_SECTIONS = 2;

/**
 * `/discover`: hero search, category tiles, a "Latest opportunities" row mixing
 * the newest of each kind, then real, queryable sections (services, jobs,
 * investments, real estate, products, events, community posts).
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
    (next: { cat?: readonly DiscoverCategoryKey[]; loc?: string; sort?: DiscoverSort }) => {
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

  const toggle = (key: DiscoverCategoryKey) => update({ cat: categories.includes(key) ? categories.filter((k) => k !== key) : [...categories, key] });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      inputRef.current?.focus();
      return;
    }
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const filtered = categories.length > 0;
  const limit = filtered ? EXPANDED_LIMIT : OVERVIEW_FETCH;
  const shown = filtered ? EXPANDED_LIMIT : OVERVIEW_SHOWN;
  // The mixed row is part of the untouched overview only; any refinement shows the plain sections.
  const overview = !filtered && !location && sort === 'newest';
  const mix = useLatestMix(OVERVIEW_FETCH, overview);
  // How many Latest cards fit in one row (reported by the row itself); exactly those leave the sections below.
  const [mixCapacity, setMixCapacity] = useState(3);
  const mixShown = useMemo(() => mix.slice(0, mixCapacity), [mix, mixCapacity]);
  const mixIds = useMemo(() => new Set(mixShown.map((e) => e.id)), [mixShown]);
  // Products and services have no place to filter on, so a location filter leaves them out.
  const visible = DISCOVER_SECTION_ORDER.filter((k) => (!filtered || categories.includes(k)) && !(location && (k === 'services' || k === 'products')));

  const renderSection = (k: DiscoverCategoryKey) => {
    const common = { limit, shown, expanded: filtered, exclude: overview ? mixIds : undefined, onViewAll: () => update({ cat: [k] }) };
    switch (k) {
      case 'jobs':
      case 'investments':
      case 'realEstate':
        return <OpportunitySection {...common} k={k} location={location} sort={sort} />;
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
            {overview && <LatestSection entries={mixShown} onCapacity={setMixCapacity} />}
            {visible.map((k, i) => (
              <div key={`${k}-${limit}-${location}-${sort}`} className="empty:hidden">{i < EAGER_SECTIONS ? renderSection(k) : <LazyMount root={scrollEl} minHeight={120}>{renderSection(k)}</LazyMount>}</div>
            ))}
            {!filtered && !location && (
              <LazyMount root={scrollEl} minHeight={120}>
                <CommunityPosts testId="discover-community-posts" ns="discover.sections.community" titleKey="title" subtitleKey="subtitle" />
              </LazyMount>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
