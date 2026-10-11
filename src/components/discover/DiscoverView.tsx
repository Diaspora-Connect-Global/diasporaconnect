'use client';

import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Briefcase, Building2, CalendarDays, Package, Search, TrendingUp, Wrench, type LucideIcon } from 'lucide-react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { REDESIGN_IMAGES } from '@/lib/redesignImages';
import { PageHero } from '@/components/redesign/PageHero';
import { CategoryTileRow } from '@/components/redesign/CategoryTileRow';
import { LazyMount } from '@/components/redesign/LazyMount';
import { CommunityPosts } from '@/components/home/HomeCommunityPosts';
import { RefinePanel } from './RefinePanel';
import { EventsSection, OpportunitySection, ProductsSection, ServicesSection } from './DiscoverSections';
import { DISCOVER_CATEGORY_KEYS, DISCOVER_TONES, parseCategories, parseSort, type DiscoverCategoryKey, type DiscoverSort } from './discoverCategories';

const ICONS: Record<DiscoverCategoryKey, LucideIcon> = {
  services: Wrench,
  products: Package,
  jobs: Briefcase,
  investments: TrendingUp,
  realEstate: Building2,
  events: CalendarDays,
};

const OVERVIEW_LIMIT = 4;
const EXPANDED_LIMIT = 12;
/** Sections mounted (and queried) immediately; the rest wait until they near the viewport. */
const EAGER_SECTIONS = 2;

/**
 * `/discover`: hero search, category tiles and real, queryable sections
 * (jobs, services, investments, real estate, products, events, community posts).
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
  const limit = filtered ? EXPANDED_LIMIT : OVERVIEW_LIMIT;
  // Products and services have no place to filter on, so a location filter leaves them out.
  const visible = DISCOVER_CATEGORY_KEYS.filter((k) => (!filtered || categories.includes(k)) && !(location && (k === 'services' || k === 'products')));

  const renderSection = (k: DiscoverCategoryKey) => {
    const common = { limit, expanded: filtered, onViewAll: () => update({ cat: [k] }) };
    switch (k) {
      case 'jobs':
        return <OpportunitySection {...common} k="jobs" type="EMPLOYMENT" location={location} sort={sort} />;
      case 'investments':
        return <OpportunitySection {...common} k="investments" type="INVESTMENT" location={location} sort={sort} />;
      case 'realEstate':
        return <OpportunitySection {...common} k="realEstate" category="REAL_ESTATE_INFRASTRUCTURE" location={location} sort={sort} />;
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
          tiles={DISCOVER_CATEGORY_KEYS.map((k) => ({ key: k, label: t(`categories.${k}`), icon: ICONS[k], tone: DISCOVER_TONES[k], active: categories.includes(k) }))}
          onSelect={(k) => toggle(k as DiscoverCategoryKey)}
        />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
          {/* Phones: the refine panel sits above the sections; desktop: right rail. */}
          <div className="lg:col-start-2 lg:row-start-1">
            <div className="lg:sticky lg:top-0">
              <RefinePanel categories={categories} location={location} sort={sort} onToggleCategory={toggle} onLocation={(loc) => update({ loc })} onSort={(so) => update({ sort: so })} onClear={() => update({ cat: [], loc: '', sort: 'newest' })} />
            </div>
          </div>
          <div className="min-w-0 space-y-5 lg:col-start-1 lg:row-start-1" data-testid="discover-sections" aria-label={tRefine('title')}>
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
