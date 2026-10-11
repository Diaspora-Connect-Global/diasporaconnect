'use client';

import type { LucideIcon } from 'lucide-react';
import { Briefcase, Building2, CalendarDays, GraduationCap, HandHeart, Landmark, MapPin, Package, TrendingUp, Wrench } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { MediaCard } from './MediaCard';
import { toCdnUrl } from '@/lib/cdn';
import { formatMoney } from '@/types/money';
import { getEventCoverImage, getEventLocationDisplay, type Event } from '@/services/gql/events';
import type { OpportunityItem, ProductItem, ServiceItem } from '@/hooks/redesign/useFreshListings';
import type { MoreTone } from '@/components/more/moreLinks';

const OPPORTUNITY_LOOK: Record<string, { icon: LucideIcon; tone: MoreTone }> = {
  EMPLOYMENT: { icon: Briefcase, tone: 'warning' },
  INVESTMENT: { icon: TrendingUp, tone: 'success' },
  SCHOLARSHIP: { icon: GraduationCap, tone: 'info' },
  FELLOWSHIP: { icon: GraduationCap, tone: 'info' },
  GRANT: { icon: Landmark, tone: 'brand' },
  VOLUNTEER: { icon: HandHeart, tone: 'danger' },
};

/** Opportunity card. No photo exists for an opportunity, so the tile carries an icon for its kind. */
export function OpportunityCard({ item, testId }: { item: OpportunityItem; testId?: string }) {
  const t = useTranslations('redesign');
  const format = useFormatter();
  const isRealEstate = item.category === 'REAL_ESTATE_INFRASTRUCTURE';
  const look = isRealEstate ? { icon: Building2, tone: 'brand' as MoreTone } : (OPPORTUNITY_LOOK[item.type ?? ''] ?? { icon: Briefcase, tone: 'brand' as MoreTone });
  const tag = isRealEstate ? t('kinds.realEstate') : item.type && t.has(`opportunityTypes.${item.type}`) ? t(`opportunityTypes.${item.type}`) : t('kinds.opportunity');
  const place = item.location?.trim() || (item.deliveryMode === 'REMOTE' || item.deliveryMode === 'ONLINE' ? t('remote') : '');
  const deadline = item.deadline && !Number.isNaN(new Date(item.deadline).getTime()) ? new Date(item.deadline) : null;
  return (
    <MediaCard
      testId={testId}
      href={`/opportunities/${encodeURIComponent(item.id)}`}
      fallbackIcon={look.icon}
      tone={look.tone}
      tag={tag}
      title={item.title}
      meta={
        <>
          {place && (
            <>
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{place}</span>
            </>
          )}
        </>
      }
      footer={
        deadline ? <span className="text-xs font-medium text-muted-foreground">{t('closes', { date: format.dateTime(deadline, { dateStyle: 'medium' }) })}</span> : undefined
      }
    />
  );
}

export function ProductCard({ item, testId }: { item: ProductItem; testId?: string }) {
  const t = useTranslations('redesign');
  const format = useFormatter();
  const image = item.images?.[0] ? toCdnUrl(item.images[0]) : null;
  void format;
  return (
    <MediaCard
      testId={testId}
      href="/marketplace"
      imageSrc={image}
      fallbackIcon={Package}
      tone="info"
      tag={t('kinds.product')}
      title={item.title}
      footer={<span className="text-success">{formatMoney(item.price, item.currency ?? 'GHS')}</span>}
    />
  );
}

export function ServiceCard({ item, testId }: { item: ServiceItem; testId?: string }) {
  const t = useTranslations('redesign');
  return (
    <MediaCard
      testId={testId}
      href="/marketplace?tab=services"
      fallbackIcon={Wrench}
      tone="success"
      tag={t('kinds.service')}
      title={item.title}
      footer={<span>{t('priceFrom', { price: formatMoney(item.base_price, item.currency ?? 'GHS') })}</span>}
    />
  );
}

export function EventTile({ event, testId }: { event: Event; testId?: string }) {
  const t = useTranslations('redesign');
  const format = useFormatter();
  const cover = event.coverImageUrl?.trim() ? getEventCoverImage(event) : null;
  const start = new Date(event.startAt);
  return (
    <MediaCard
      testId={testId}
      href={`/events/${encodeURIComponent(event.id)}`}
      imageSrc={cover}
      fallbackIcon={CalendarDays}
      tone="danger"
      tag={t('kinds.event')}
      title={event.title}
      meta={
        <>
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{event.locationDetails || event.locationType ? getEventLocationDisplay(event) : ''}</span>
        </>
      }
      footer={!Number.isNaN(start.getTime()) ? <span className="text-xs font-medium text-muted-foreground">{format.dateTime(start, { dateStyle: 'medium', timeStyle: 'short' })}</span> : undefined}
    />
  );
}
