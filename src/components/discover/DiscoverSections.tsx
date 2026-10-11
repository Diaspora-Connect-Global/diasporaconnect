'use client';

import { useMemo, type ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { Section } from '@/components/redesign/Section';
import { SectionHeader } from '@/components/redesign/SectionHeader';
import { EventTile, OpportunityCard, ProductCard, ServiceCard } from '@/components/redesign/ListingCards';
import { useFeaturedProducts, useFeaturedServices, useOpportunities } from '@/hooks/redesign/useFreshListings';
import { LIST_EVENTS, getEventLocationDisplay, type Event, type ListEventsData } from '@/services/gql/events';
import type { DiscoverCategoryKey, DiscoverSort } from './discoverCategories';

const SORT_INPUT: Record<DiscoverSort, { sortBy: 'createdAt' | 'deadline' | 'applicationCount'; sortOrder: 'ASC' | 'DESC' }> = {
  newest: { sortBy: 'createdAt', sortOrder: 'DESC' },
  closing: { sortBy: 'deadline', sortOrder: 'ASC' },
  applications: { sortBy: 'applicationCount', sortOrder: 'DESC' },
};

function Grid({ children }: { children: ReactNode[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {children.map((c, i) => (
        <li key={i} className="min-w-0">
          {c}
        </li>
      ))}
    </ul>
  );
}

type Common = { limit: number; expanded: boolean; onViewAll: () => void };

function Frame({ k, count, onViewAll, expanded, children }: { k: DiscoverCategoryKey; count: number; onViewAll: () => void; expanded: boolean; children: ReactNode }) {
  const t = useTranslations('discover.sections');
  const tAll = useTranslations('redesign');
  if (count === 0) return null;
  return (
    <Section labelledBy={`discover-${k}-title`} testId={`discover-section-${k}`}>
      <SectionHeader id={`discover-${k}-title`} title={t(`${k}.title`)} subtitle={t(`${k}.subtitle`)} onViewAll={expanded ? undefined : onViewAll} viewAllLabel={expanded ? undefined : tAll('viewAll')} />
      {children}
    </Section>
  );
}

export function OpportunitySection({ k, type, category, location, sort, limit, expanded, onViewAll }: Common & { k: 'jobs' | 'investments' | 'realEstate'; type?: string; category?: string; location: string; sort: DiscoverSort }) {
  const { items } = useOpportunities({ type, category, location: location || undefined, limit, ...SORT_INPUT[sort] });
  return (
    <Frame k={k} count={items.length} onViewAll={onViewAll} expanded={expanded}>
      <Grid>{items.map((o) => <OpportunityCard key={o.id} item={o} testId={`discover-card-${k}`} />)}</Grid>
    </Frame>
  );
}

export function ServicesSection({ limit, expanded, onViewAll }: Common) {
  const { items } = useFeaturedServices(limit);
  return (
    <Frame k="services" count={items.length} onViewAll={onViewAll} expanded={expanded}>
      <Grid>{items.map((s) => <ServiceCard key={s.id} item={s} testId="discover-card-services" />)}</Grid>
    </Frame>
  );
}

export function ProductsSection({ limit, expanded, onViewAll }: Common) {
  const { items } = useFeaturedProducts(limit);
  return (
    <Frame k="products" count={items.length} onViewAll={onViewAll} expanded={expanded}>
      <Grid>{items.map((p) => <ProductCard key={p.id} item={p} testId="discover-card-products" />)}</Grid>
    </Frame>
  );
}

export function EventsSection({ limit, expanded, onViewAll, location }: Common & { location: string }) {
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
      .slice(0, limit);
  }, [data, limit, location]);
  return (
    <Frame k="events" count={events.length} onViewAll={onViewAll} expanded={expanded}>
      <Grid>{events.map((e) => <EventTile key={e.id} event={e} testId="discover-card-events" />)}</Grid>
    </Frame>
  );
}
