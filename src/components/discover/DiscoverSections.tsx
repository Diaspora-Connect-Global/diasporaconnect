'use client';

import { Fragment, useMemo, type ReactNode } from 'react';
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
import { OPPORTUNITY_SOURCES, type DiscoverCategoryKey, type DiscoverSort, type OpportunityKey } from './discoverCategories';

// opportunity-service accepts only CREATED_AT | DEADLINE | COMPENSATION | RELEVANCE and refuses
// anything else with an INTERNAL error, which the gateway's circuit breaker counts as an outage.
const SORT_INPUT: Record<DiscoverSort, { sortBy: OpportunitySortBy; sortOrder: 'ASC' | 'DESC' }> = {
  newest: { sortBy: 'CREATED_AT', sortOrder: 'DESC' },
  closing: { sortBy: 'DEADLINE', sortOrder: 'ASC' },
};

const time = (iso?: string | null) => {
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isNaN(t) ? null : t;
};
const byNewest = (a: OpportunityItem, b: OpportunityItem) => (time(b.createdAt) ?? 0) - (time(a.createdAt) ?? 0);
// Same order as the server's DEADLINE ASC: soonest first, no deadline last.
const byClosing = (a: OpportunityItem, b: OpportunityItem) => (time(a.deadline) ?? Infinity) - (time(b.deadline) ?? Infinity);

/**
 * The opportunities one row lists. The query takes one `type` at a time, so a
 * two-type row (jobs = EMPLOYMENT + CONTRACT) sends two requests and merges them
 * in the row's order.
 */
function useOpportunityRow(k: OpportunityKey, location: string, sort: DiscoverSort, limit: number): OpportunityItem[] {
  const { types = [], category } = OPPORTUNITY_SOURCES[k];
  const base = { ...(category ? { category } : {}), location: location || undefined, limit, ...SORT_INPUT[sort] };
  const first = useOpportunities(types[0] ? { ...base, type: types[0] } : base);
  const second = useOpportunities({ ...base, type: types[1] ?? types[0] }, types.length < 2);
  const pair = types.length > 1;
  return useMemo(() => {
    if (!pair) return first.items;
    const seen = new Set<string>();
    return [...first.items, ...second.items]
      .filter((o) => !seen.has(o.id) && !!seen.add(o.id))
      .sort(sort === 'closing' ? byClosing : byNewest)
      .slice(0, limit);
  }, [pair, first.items, second.items, sort, limit]);
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
  /** How many to show. */
  shown: number;
  expanded: boolean;
  onViewAll: () => void;
};

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

export function OpportunitySection({ k, location, sort, limit, shown, expanded, onViewAll }: Common & { k: OpportunityKey; location: string; sort: DiscoverSort }) {
  const all = useOpportunityRow(k, location, sort, limit);
  const items = all.slice(0, shown);
  const Card = k === 'jobs' ? JobCard : OpportunityCard;
  return (
    <Frame k={k} count={items.length} onViewAll={onViewAll} expanded={expanded}>
      <Grid overview={!expanded} listRows={k === 'jobs'}>{items.map((o) => <Card key={o.id} item={o} testId={`discover-card-${k}`} />)}</Grid>
    </Frame>
  );
}

export type RecommendedOpportunity = OpportunityItem & { reasons?: string[] | null };

/**
 * The viewer's recommended opportunities, every type, ranked on the server
 * (`[]` while loading, on error or when not asked for). Read at page level so
 * the cards it shows can be left out of the rows below.
 */
export function useRecommendedOpportunities(limit: number, enabled: boolean): RecommendedOpportunity[] {
  const { data } = useQuery<RecommendedOpportunitiesData>(RECOMMENDED_OPPORTUNITIES, { variables: { limit }, fetchPolicy: 'cache-first', skip: !enabled, ...SILENT });
  return useMemo(
    () => (enabled ? (data?.recommendedOpportunities?.opportunities ?? []).filter((o): o is RecommendedOpportunity => !!o?.id && !!o.title) : []),
    [data, enabled],
  );
}

/** Discover's "For you": the viewer's recommended opportunities — jobs, scholarships, grants… — each saying why. Hidden when empty. */
export function RecommendedOpportunitiesSection({ items, expanded, onViewAll }: { items: RecommendedOpportunity[]; expanded: boolean; onViewAll: () => void }) {
  return (
    <Frame k="forYou" count={items.length} onViewAll={onViewAll} expanded={expanded}>
      <Grid overview={!expanded}>
        {items.map((o) => (
          <Fragment key={o.id}>
            <OpportunityCard item={o} testId="discover-foryou-opportunities" />
            <RecommendationReasons codes={o.reasons} />
          </Fragment>
        ))}
      </Grid>
    </Frame>
  );
}

export function ServicesSection({ limit, shown, expanded, onViewAll }: Common) {
  const { items: all } = useFeaturedServices(limit);
  const items = all.slice(0, shown);
  return (
    <Frame k="services" count={items.length} onViewAll={onViewAll} expanded={expanded}>
      <Grid overview={!expanded}>{items.map((s) => <ServiceCard key={s.id} item={s} testId="discover-card-services" />)}</Grid>
    </Frame>
  );
}

export function ProductsSection({ limit, shown, expanded, onViewAll }: Common) {
  const { items: all } = useFeaturedProducts(limit);
  const items = all.slice(0, shown);
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
 * The newest opportunities of every kind, with one service the platform features
 * second. The unfiltered page lists nothing else, so a kind left out here would
 * not be on it at all.
 */
export function useLatestMix(limit: number, enabled: boolean): MixEntry[] {
  const { items: opportunities } = useOpportunities({ limit }, !enabled);
  const { items: services } = useFeaturedServices(1, !enabled);
  return useMemo(() => {
    if (!enabled) return [];
    const entries = opportunities.map((o): MixEntry => ({ id: o.id, node: <OpportunityCard key={o.id} item={o} testId="discover-latest-opportunities" /> }));
    const s = services[0];
    if (s) entries.splice(1, 0, { id: s.id, node: <ServiceCard key={s.id} item={s} testId="discover-latest-services" /> });
    return entries.slice(0, limit);
  }, [enabled, opportunities, services, limit]);
}

/**
 * Leaves out what "For you" already shows, unless that would leave fewer than
 * `minimum`: with few listings the two rows overlap, rather than Latest vanishing.
 */
export function withoutRepeats(entries: MixEntry[], shownAbove: ReadonlySet<string>, minimum: number): MixEntry[] {
  const fresh = entries.filter((e) => !shownAbove.has(e.id));
  if (fresh.length >= minimum) return fresh;
  return [...fresh, ...entries.filter((e) => shownAbove.has(e.id)).slice(0, minimum - fresh.length)];
}

/** The "Latest opportunities" section: one row, or every card it was given on its own "View all". */
export function LatestSection({ entries, expanded, onViewAll }: { entries: MixEntry[]; expanded: boolean; onViewAll?: () => void }) {
  return (
    <Frame k="latest" count={entries.length} onViewAll={onViewAll} expanded={expanded}>
      <Grid overview={!expanded}>{entries.map((e) => e.node)}</Grid>
    </Frame>
  );
}
