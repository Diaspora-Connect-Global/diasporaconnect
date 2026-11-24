'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/redesign/Section';
import { SectionHeader } from '@/components/redesign/SectionHeader';
import { EventTile, JobCard, OpportunityCard, ProductCard, ServiceCard } from '@/components/redesign/ListingCards';
import type { DiscoverCategoryKey, DiscoverSort } from './discoverCategories';
import { Grid } from './DiscoverSections';
import { useDiscoverFeed, type FeedItem } from './useDiscoverFeed';

function Card({ entry, jobRows }: { entry: FeedItem; jobRows: boolean }) {
  switch (entry.kind) {
    case 'opportunities':
      return jobRows ? <JobCard item={entry.item} testId="discover-card-jobs" /> : <OpportunityCard item={entry.item} testId="discover-card-opportunities" />;
    case 'events':
      return <EventTile event={entry.item} testId="discover-card-events" />;
    case 'products':
      return <ProductCard item={entry.item} testId="discover-card-products" />;
    case 'services':
      return <ServiceCard item={entry.item} testId="discover-card-services" />;
  }
}

/**
 * Discover's list: every public opportunity (users, communities, associations,
 * the platform), upcoming event, marketplace product and service the viewer may
 * see, a page at a time. Categories, place and sort narrow it; none = everything.
 */
export function DiscoverFeed({ categories, location, sort }: { categories: readonly DiscoverCategoryKey[]; location: string; sort: DiscoverSort }) {
  const t = useTranslations('discover');
  const { items, loading, hasMore, loadMore, jobsOnly } = useDiscoverFeed(categories, location, sort);

  if (items.length === 0 && !loading) {
    return (
      <p className="rounded-2xl border border-border-subtle bg-surface-default p-6 text-center text-sm text-text-secondary" data-testid="discover-empty">
        {t('noResults')}
      </p>
    );
  }

  return (
    <Section labelledBy="discover-feed-title" testId="discover-feed">
      <SectionHeader id="discover-feed-title" title={t('feed.title')} subtitle={t('feed.subtitle')} />
      <Grid overview={false} listRows={jobsOnly}>
        {items.map((e) => (
          <Card key={`${e.kind}-${e.id}`} entry={e} jobRows={jobsOnly} />
        ))}
      </Grid>
      <div className="flex justify-center pt-4" aria-live="polite">
        {loading ? (
          <span className="text-sm text-text-secondary" role="status">{t('feed.loading')}</span>
        ) : hasMore ? (
          <button
            type="button"
            onClick={loadMore}
            data-testid="discover-load-more"
            className="min-h-11 rounded-full border border-border-brand px-6 text-sm font-semibold text-text-brand transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2"
          >
            {t('feed.loadMore')}
          </button>
        ) : (
          <span className="text-sm text-text-secondary">{t('feed.end')}</span>
        )}
      </div>
    </Section>
  );
}
