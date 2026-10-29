'use client';

import { useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { Section } from '@/components/redesign/Section';
import { SectionHeader } from '@/components/redesign/SectionHeader';
import { EventTile, JobCard, OpportunityCard, ProductCard, ServiceCard } from '@/components/redesign/ListingCards';
import { useFeaturedProducts, useFeaturedServices, useOpportunities, type OpportunityItem, type OpportunitySortBy } from '@/hooks/redesign/useFreshListings';
import { LIST_EVENTS, getEventLocationDisplay, type Event, type ListEventsData } from '@/services/gql/events';
import {
  RECOMMENDED_EVENTS,
  RECOMMENDED_OPPORTUNITIES,
  RECOMMENDED_PRODUCTS,
  RECOMMENDED_SERVICES,
  type RecommendedEventsData,
  type RecommendedOpportunitiesData,
  type RecommendedProductsData,
  type RecommendedServicesData,
} from '@/services/gql/recommendations';
import { RecommendationReasons } from '@/components/redesign/RecommendationReasons';
import type { DiscoverCategoryKey, DiscoverSort } from './discoverCategories';

// opportunity-service accepts only CREATED_AT | DEADLINE | COMPENSATION | RELEVANCE and refuses
// anything else with an INTERNAL error, which the gateway's circuit breaker counts as an outage.
const SORT_INPUT: Record<DiscoverSort, { sortBy: OpportunitySortBy; sortOrder: 'ASC' | 'DESC' }> = {
  newest: { sortBy: 'CREATED_AT', sortOrder: 'DESC' },
  closing: { sortBy: 'DEADLINE', sortOrder: 'ASC' },
};

type OppKey = 'jobs' | 'investments' | 'realEstate';
const OPP_SOURCE: Record<OppKey, { type?: string; category?: string }> = {
  jobs: { type: 'EMPLOYMENT' },
  investments: { type: 'INVESTMENT' },
  realEstate: { category: 'REAL_ESTATE_INFRASTRUCTURE' },
};

/** One place builds the opportunity query, so the "Latest" row and the sections share Apollo's cache (one request each). */
function oppInput(k: OppKey, location: string, sort: DiscoverSort, limit: number) {
  return { ...OPP_SOURCE[k], location: location || undefined, limit, ...SORT_INPUT[sort] };
}

/**
 * Card grid whose columns follow the SECTION's width, not the window's, so cards
 * keep a usable size beside the refine rail: 2 → 3 → 4 columns. In the overview a
 * section is one row, so the 4th card hides while there are only 3 columns
 * (display:none also takes it out of the tab order).
 */
function Grid({ children, overview, listRows = false }: { children: ReactNode[]; overview: boolean; listRows?: boolean }) {
  // Row-shaped cards (jobs) read badly squeezed into two phone columns: one per row until there is room for two.
  const cols = listRows ? 'grid-cols-1 @[26rem]:grid-cols-2' : 'grid-cols-2';
  return (
    <div className="@container">
      <ul className={`grid ${cols} gap-3 @[38rem]:grid-cols-3 @[52rem]:grid-cols-4`}>
        {children.map((c, i) => (
          <li key={i} className={`min-w-0 ${overview && i === 3 ? '@[38rem]:hidden @[52rem]:block' : ''}`}>
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}

type Common = {
  /** How many to fetch. */
  limit: number;
  /** How many to show (after leaving out `exclude`). */
  shown: number;
  expanded: boolean;
  onViewAll: () => void;
  /** Items already shown in the "Latest opportunities" row, left out here so nothing repeats. */
  exclude?: ReadonlySet<string>;
};

function keep<T extends { id: string }>(items: T[], exclude: ReadonlySet<string> | undefined, shown: number): T[] {
  return (exclude?.size ? items.filter((i) => !exclude.has(i.id)) : items).slice(0, shown);
}

function Frame({ k, count, onViewAll, expanded, children }: { k: DiscoverCategoryKey | 'latest' | 'forYou'; count: number; onViewAll?: () => void; expanded: boolean; children: ReactNode }) {
  const t = useTranslations('discover.sections');
  const tAll = useTranslations('redesign');
  if (count === 0) return null;
  const showAll = !expanded && !!onViewAll;
  return (
    <Section labelledBy={`discover-${k}-title`} testId={`discover-section-${k}`}>
      <SectionHeader id={`discover-${k}-title`} title={t(`${k}.title`)} subtitle={t(`${k}.subtitle`)} onViewAll={showAll ? onViewAll : undefined} viewAllLabel={showAll ? tAll('viewAll') : undefined} />
      {children}
    </Section>
  );
}

export function OpportunitySection({ k, location, sort, limit, shown, expanded, onViewAll, exclude }: Common & { k: OppKey; location: string; sort: DiscoverSort }) {
  const { items: all } = useOpportunities(oppInput(k, location, sort, limit));
  const items = keep(all, exclude, shown);
  const Card = k === 'jobs' ? JobCard : OpportunityCard;
  return (
    <Frame k={k} count={items.length} onViewAll={onViewAll} expanded={expanded}>
      <Grid overview={!expanded} listRows={k === 'jobs'}>{items.map((o) => <Card key={o.id} item={o} testId={`discover-card-${k}`} />)}</Grid>
    </Frame>
  );
}

export function ServicesSection({ limit, shown, expanded, onViewAll, exclude }: Common) {
  const { items: all } = useFeaturedServices(limit);
  const items = keep(all, exclude, shown);
  return (
    <Frame k="services" count={items.length} onViewAll={onViewAll} expanded={expanded}>
      <Grid overview={!expanded}>{items.map((s) => <ServiceCard key={s.id} item={s} testId="discover-card-services" />)}</Grid>
    </Frame>
  );
}

export function ProductsSection({ limit, shown, expanded, onViewAll, exclude }: Common) {
  const { items: all } = useFeaturedProducts(limit);
  const items = keep(all, exclude, shown);
  return (
    <Frame k="products" count={items.length} onViewAll={onViewAll} expanded={expanded}>
      <Grid overview={!expanded}>{items.map((p) => <ProductCard key={p.id} item={p} testId="discover-card-products" />)}</Grid>
    </Frame>
  );
}

export function EventsSection({ shown, expanded, onViewAll, location }: Common & { location: string }) {
  const { data } = useQuery<ListEventsData>(LIST_EVENTS, { variables: { input: { limit: 20, offset: 0 } }, fetchPolicy: 'cache-first', context: { silentErrors: true } });
  const events = useMemo(() => {
    const now = Date.now();
    const needle = location.trim().toLowerCase();
    return (data?.listEvents?.events ?? [])
      .filter((e): e is Event => !!e && !!e.id && !!e.startAt)
      .filter((e) => !['cancelled', 'draft'].includes(String(e.status).toLowerCase()))
      .filter((e) => new Date(e.endAt || e.startAt).getTime() > now)
      .filter((e) => !needle || getEventLocationDisplay(e).toLowerCase().includes(needle))
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, shown);
  }, [data, shown, location]);
  return (
    <Frame k="events" count={events.length} onViewAll={onViewAll} expanded={expanded}>
      <Grid overview={!expanded}>{events.map((e) => <EventTile key={e.id} event={e} testId="discover-card-events" />)}</Grid>
    </Frame>
  );
}

export type MixEntry = { id: string; node: ReactNode };

const SILENT = { context: { silentErrors: true } } as const;

/**
 * Personalised picks across events, opportunities, services and products,
 * ranked per viewer on the server. Interleaved one kind at a time so a single
 * busy kind cannot fill the row. Each card shows why it was picked. A failed
 * or empty query just contributes nothing (the row hides when all are empty).
 */
export type ForYouKind = 'events' | 'opportunities' | 'services' | 'products';
const ALL_KINDS: readonly ForYouKind[] = ['events', 'opportunities', 'services', 'products'];

export function useForYou(perKind: number, enabled: boolean, kinds: readonly ForYouKind[] = ALL_KINDS): MixEntry[] {
  // A kind that is not asked for is skipped, so a page-level rail sends only its own query.
  const skipFor = (k: ForYouKind) => !enabled || !kinds.includes(k);
  const events = useQuery<RecommendedEventsData>(RECOMMENDED_EVENTS, { variables: { limit: perKind }, fetchPolicy: 'cache-first', skip: skipFor('events'), ...SILENT });
  const opps = useQuery<RecommendedOpportunitiesData>(RECOMMENDED_OPPORTUNITIES, { variables: { limit: perKind }, fetchPolicy: 'cache-first', skip: skipFor('opportunities'), ...SILENT });
  const services = useQuery<RecommendedServicesData>(RECOMMENDED_SERVICES, { variables: { limit: perKind }, fetchPolicy: 'cache-first', skip: skipFor('services'), ...SILENT });
  const products = useQuery<RecommendedProductsData>(RECOMMENDED_PRODUCTS, { variables: { limit: perKind }, fetchPolicy: 'cache-first', skip: skipFor('products'), ...SILENT });
  return useMemo(() => {
    if (!enabled) return [];
    const withReasons = (node: ReactNode, reasons?: string[] | null) => (
      <>
        {node}
        <RecommendationReasons codes={reasons} />
      </>
    );
    const kinds: MixEntry[][] = [
      (events.data?.recommendedEvents ?? [])
        .filter((r): r is { event: Event; reasons?: string[] | null } => !!r?.event?.id && !!r.event.startAt)
        .map((r) => ({ id: r.event.id, node: withReasons(<EventTile event={r.event} testId="discover-foryou-events" />, r.reasons) })),
      (opps.data?.recommendedOpportunities?.opportunities ?? [])
        .filter((o): o is OpportunityItem & { reasons?: string[] | null } => !!o?.id && !!o.title)
        .map((o) => ({ id: o.id, node: withReasons(<OpportunityCard item={o} testId="discover-foryou-opportunities" />, o.reasons) })),
      (services.data?.recommendedMarketplaceServices?.services ?? [])
        .filter((s): s is NonNullable<typeof s> => !!s?.id && !!s.title)
        .map((s) => ({ id: s.id, node: withReasons(<ServiceCard item={s} testId="discover-foryou-services" />, s.reasons) })),
      (products.data?.getRecommendedProducts?.products ?? [])
        .filter((p): p is NonNullable<typeof p> => !!p?.id && !!p.title)
        .map((p) => ({ id: p.id, node: withReasons(<ProductCard item={p} testId="discover-foryou-products" />, p.reasons) })),
    ];
    const out: MixEntry[] = [];
    for (let i = 0; kinds.some((k) => i < k.length); i++) {
      for (const k of kinds) if (i < k.length) out.push(k[i]);
    }
    return out;
  }, [enabled, events.data, opps.data, services.data, products.data]);
}

/** The "For you" row: one row of picks, hidden when there is nothing to recommend. */
export function ForYouSection({ entries }: { entries: MixEntry[] }) {
  return (
    <Frame k="forYou" count={entries.length} expanded={false}>
      <Grid overview>{entries.map((e) => e.node)}</Grid>
    </Frame>
  );
}

const RAIL_SHOWN = 4;

/**
 * A "For you" rail for a listing page: only the given kinds are fetched
 * (small limit, cache-first, errors silent). Renders nothing while loading,
 * on error, or when there is nothing to recommend.
 */
export function ForYouRail({ kinds, className }: { kinds: readonly ForYouKind[]; className?: string }) {
  const entries = useForYou(RAIL_SHOWN, true, kinds);
  const shown = useMemo(() => entries.slice(0, RAIL_SHOWN), [entries]);
  if (shown.length === 0) return null;
  return (
    <div data-testid="for-you-rail" className={className}>
      <ForYouSection entries={shown} />
    </div>
  );
}

/**
 * The newest property, service, investment and job — one of each, like the
 * mockup's mixed first row. It reads the very same queries the sections below
 * use (same variables ⇒ Apollo serves both from one request). The caller shows
 * as many as fit (see `LatestSection`) and leaves exactly those out of the
 * sections, so a card never appears twice — and never disappears either.
 */
export function useLatestMix(limit: number, enabled: boolean): MixEntry[] {
  const realEstate = useOpportunities(oppInput('realEstate', '', 'newest', limit), !enabled);
  const services = useFeaturedServices(limit, !enabled);
  const investments = useOpportunities(oppInput('investments', '', 'newest', limit), !enabled);
  const jobs = useOpportunities(oppInput('jobs', '', 'newest', limit), !enabled);
  return useMemo(() => {
    if (!enabled) return [];
    const opp = (o: OpportunityItem | undefined, k: OppKey): MixEntry | null => (o ? { id: o.id, node: <OpportunityCard item={o} testId={`discover-latest-${k}`} /> } : null);
    const s = services.items[0];
    const entries = [
      opp(realEstate.items[0], 'realEstate'),
      s ? { id: s.id, node: <ServiceCard item={s} testId="discover-latest-services" /> } : null,
      opp(investments.items[0], 'investments'),
      opp(jobs.items[0], 'jobs'),
    ].filter((e): e is MixEntry => e !== null);
    return entries;
  }, [enabled, realEstate.items, services.items, investments.items, jobs.items]);
}

/** Cards the Latest row can show without hiding any: 2×2 on phones, one row of 3 or 4 beside the rail. */
const capacityFor = (cols: number) => (cols === 3 ? 3 : 4);

/**
 * The Latest row measures its own width (the same thresholds as `Grid`) and
 * reports how many cards fit, so the page leaves exactly the shown ones out of
 * the sections below. Measured before paint, so the row never flashes.
 */
export function LatestSection({ entries, onCapacity }: { entries: MixEntry[]; onCapacity: (n: number) => void }) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [cols, setCols] = useState(3);
  useLayoutEffect(() => {
    if (!el) return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const measure = () => {
      const w = el.clientWidth / rem;
      const c = w >= 52 ? 4 : w >= 38 ? 3 : 2;
      setCols(c);
      onCapacity(capacityFor(c));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el, onCapacity]);
  return (
    <Frame k="latest" count={entries.length} expanded={false}>
      <div ref={setEl}>
        <ul className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {entries.map((e) => (
            <li key={e.id} className="min-w-0">
              {e.node}
            </li>
          ))}
        </ul>
      </div>
    </Frame>
  );
}
