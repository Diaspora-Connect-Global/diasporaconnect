'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/redesign/Section';
import { SectionHeader } from '@/components/redesign/SectionHeader';
import { OpportunityCard, ProductCard, ServiceCard } from '@/components/redesign/ListingCards';
import { useFeaturedProducts, useFeaturedServices, useOpportunities } from '@/hooks/redesign/useFreshListings';

/**
 * The newest opportunities plus the products and services the platform features —
 * labelled as exactly that, never as personalised ("Recommended for you" would
 * claim a ranking that does not exist here). Hidden when nothing came back.
 */
export function LatestListings() {
  const t = useTranslations('homePage.latest');
  const tAll = useTranslations('redesign');
  const opps = useOpportunities({ limit: 2 });
  const services = useFeaturedServices(1);
  const products = useFeaturedProducts(1);

  const cards = [
    ...opps.items.slice(0, 2).map((o) => <OpportunityCard key={`o-${o.id}`} item={o} testId="latest-card" />),
    ...services.items.slice(0, 1).map((s) => <ServiceCard key={`s-${s.id}`} item={s} testId="latest-card" />),
    ...products.items.slice(0, 1).map((p) => <ProductCard key={`p-${p.id}`} item={p} testId="latest-card" />),
  ];
  if (cards.length === 0) return null;
  return (
    <Section labelledBy="home-latest-title" testId="home-latest" className="@container">
      <SectionHeader id="home-latest-title" title={t('title')} subtitle={t('subtitle')} href="/discover" viewAllLabel={tAll('viewAll')} />
      <ul className="grid grid-cols-2 gap-3 @[48rem]:grid-cols-4">
        {cards.map((c, i) => (
          <li key={i} className="min-w-0">
            {c}
          </li>
        ))}
      </ul>
    </Section>
  );
}
