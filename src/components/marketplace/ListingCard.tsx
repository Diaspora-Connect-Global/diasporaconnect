'use client';

import { Package, Plus, Wrench } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ICON_CHIP_CLASS, TONE_CLASS } from '@/components/more/MoreLinkCard';
import { CATEGORY_PHOTOS } from '@/lib/redesignImages';

export type ListingCardData = {
  id: string;
  name: string;
  /** Already formatted for display (the one ÷100 happens before this). */
  priceText: string;
  image?: string;
  tags?: string[];
  isService?: boolean;
};

/**
 * A marketplace listing, drawn like the redesign's `MediaCard` (photo, tag chip,
 * title, price). The marketplace opens listings in place rather than by route, so
 * the card body is a button; "add to cart" is a SIBLING of it (never nested).
 * There is no rating or review data on a list row, so none is drawn.
 */
export function ListingCard({ item, onOpen, onAdd, testId }: { item: ListingCardData; onOpen: () => void; onAdd?: () => void; testId?: string }) {
  const t = useTranslations('marketplacePage');
  const isService = !!item.isService;
  const photo = item.image || (isService ? CATEGORY_PHOTOS.service.src : CATEGORY_PHOTOS.product.src);
  const Icon = isService ? Wrench : Package;
  return (
    <div className="relative h-full min-w-0">
      <button
        type="button"
        onClick={onOpen}
        data-testid={testId}
        aria-label={`${item.name}. ${t('viewListing')}`}
        className="group flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-default text-left shadow-sm transition-[border-color,box-shadow] hover:border-border-brand hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
      >
        <div className={`relative aspect-[16/10] w-full overflow-hidden ${photo ? 'bg-surface-subtle' : ICON_CHIP_CLASS}`}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" width={360} height={225} loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
          ) : (
            <span className="grid size-full place-items-center">
              <Icon className="size-10 opacity-80" strokeWidth={1.5} aria-hidden />
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3.5">
          <span className={`w-fit max-w-full truncate rounded-md px-2 py-0.5 text-[11px] font-medium ${TONE_CLASS[isService ? 'success' : 'info']}`}>{isService ? t('serviceTag') : t('productTag')}</span>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-text-primary">{item.name}</h3>
          {item.tags && item.tags.length > 0 && <p className="truncate text-xs text-muted-foreground">{item.tags.slice(0, 3).join(' · ')}</p>}
          <p className={`mt-auto pt-1 text-sm font-semibold text-text-success ${onAdd ? 'pr-12' : ''}`}>{isService ? t('priceFrom', { price: item.priceText }) : item.priceText}</p>
        </div>
      </button>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          aria-label={t('addToCart', { name: item.name })}
          className="absolute bottom-2.5 right-2.5 z-10 grid size-11 place-items-center rounded-full bg-surface-brand text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2"
        >
          <Plus className="size-5" strokeWidth={2} aria-hidden />
        </button>
      )}
    </div>
  );
}

/** Loading placeholder with the card's exact box, so the grid does not shift when data arrives. */
export function ListingCardSkeleton() {
  return (
    <div aria-hidden className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-default shadow-sm">
      <div className="aspect-[16/10] w-full animate-pulse bg-surface-subtle" />
      <div className="space-y-2 p-3.5">
        <div className="h-4 w-16 animate-pulse rounded-md bg-surface-subtle" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-surface-subtle" />
        <div className="h-4 w-20 animate-pulse rounded bg-surface-subtle" />
      </div>
    </div>
  );
}
