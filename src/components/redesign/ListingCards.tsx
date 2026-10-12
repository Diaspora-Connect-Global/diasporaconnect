'use client';

import type { LucideIcon } from 'lucide-react';
import { Briefcase, Building2, CalendarDays, GraduationCap, HandHeart, Landmark, MapPin, Package, TrendingUp, Wrench } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { TONE_CLASS } from '@/components/more/MoreLinkCard';
import { MediaCard } from './MediaCard';
import { OpportunityBookmark } from './OpportunityBookmark';
import { CATEGORY_PHOTOS } from '@/lib/redesignImages';
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
      fallbackPhoto={(isRealEstate ? CATEGORY_PHOTOS.property : item.type === 'INVESTMENT' || item.type === 'GRANT' ? CATEGORY_PHOTOS.investment : CATEGORY_PHOTOS.job).src}
      action={<OpportunityBookmark id={item.id} saved={!!item.isSavedByCurrentUser} />}
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

const LOOKS_LIKE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-|^[0-9a-f]{16,}$/i;

/**
 * Job card, laid out like the mockup's job row: icon tile, title, who is hiring,
 * where, then the commitment (Full-time…) and the closing date. No salary: the
 * unit of `compensationMin/Max` is not confirmed, and a wrong unit is a 100×
 * error. The bookmark is a sibling of the link, never nested inside it.
 */
export function JobCard({ item, testId }: { item: OpportunityItem; testId?: string }) {
  const t = useTranslations('redesign');
  const format = useFormatter();
  const place = item.location?.trim() || (item.deliveryMode === 'REMOTE' || item.deliveryMode === 'ONLINE' ? t('remote') : '');
  const org = item.owner?.name?.trim();
  const hiring = org && !LOOKS_LIKE_ID.test(org) ? org : '';
  const commitment = item.commitmentType && t.has(`commitmentTypes.${item.commitmentType}`) ? t(`commitmentTypes.${item.commitmentType}`) : '';
  const deadline = item.deadline && !Number.isNaN(new Date(item.deadline).getTime()) ? new Date(item.deadline) : null;
  return (
    <div className="relative h-full min-w-0">
      <Link
        href={`/opportunities/${encodeURIComponent(item.id)}`}
        prefetch={false}
        data-testid={testId}
        className="group flex h-full min-w-0 flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-default p-3.5 shadow-sm transition-[border-color,box-shadow] hover:border-border-brand hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${TONE_CLASS.warning}`}>
            <Briefcase className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-text-primary">{item.title}</h3>
            {hiring && <p className="truncate text-xs text-text-secondary">{hiring}</p>}
            {place && (
              <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{place}</span>
              </p>
            )}
          </div>
        </div>
        {(commitment || deadline) && (
          <div className="mt-auto flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pr-9 text-xs">
            {commitment && <span className={`rounded-md px-2 py-0.5 font-medium ${TONE_CLASS.success}`}>{commitment}</span>}
            {deadline && <span className="font-medium text-muted-foreground">{t('closes', { date: format.dateTime(deadline, { dateStyle: 'medium' }) })}</span>}
          </div>
        )}
      </Link>
      <div className="absolute bottom-2.5 right-2.5 z-10">
        <OpportunityBookmark id={item.id} saved={!!item.isSavedByCurrentUser} />
      </div>
    </div>
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
      fallbackPhoto={CATEGORY_PHOTOS.product.src}
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
      fallbackPhoto={CATEGORY_PHOTOS.service.src}
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
      fallbackPhoto={CATEGORY_PHOTOS.event.src}
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
