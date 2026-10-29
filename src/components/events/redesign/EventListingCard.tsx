'use client';

import { Bookmark, Check, EllipsisVertical, Globe2, Lock, MapPin, Users } from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CATEGORY_PHOTOS } from '@/lib/redesignImages';
import { formatMoney } from '@/types/money';
import { getEventCoverImage, getEventLocationDisplay, isEventSoldOut, type Event } from '@/services/gql/events';
import { eventFormat } from '@/lib/eventFormat';

/** "Free", one ticket price, or "From <lowest>" when tickets differ. Prices are integer minor units. */
export function useEventPrice() {
  const t = useTranslations('eventsPage');
  const tRedesign = useTranslations('redesign');
  return (event: Event) => {
    if (!event.isPaid) return t('free');
    const paid = (event.tickets ?? []).filter((tk) => (tk?.priceInCents ?? 0) > 0);
    if (paid.length === 0) return t('paid');
    const lowest = paid.reduce((a, b) => ((b.priceInCents ?? 0) < (a.priceInCents ?? 0) ? b : a));
    const price = formatMoney(lowest.priceInCents ?? 0, lowest.currency || event.currency || 'GHS');
    const distinct = new Set(paid.map((tk) => tk.priceInCents)).size;
    return distinct > 1 ? tRedesign('priceFrom', { price }) : price;
  };
}

/** Month + day tile ("OCT" / "12") for the viewer's locale. */
export function DateTile({ iso, size = 'md' }: { iso: string; size?: 'sm' | 'md' }) {
  const locale = useLocale();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const month = new Intl.DateTimeFormat(locale, { month: 'short' }).format(d).replace('.', '').toUpperCase();
  const day = new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(d);
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-xl bg-surface-default text-center shadow-sm ${size === 'sm' ? 'size-11' : 'size-12'}`}>
      <span className="block text-[10px] font-bold leading-none text-text-danger">{month}</span>
      <span className={`block font-bold leading-none text-text-primary ${size === 'sm' ? 'text-base' : 'text-lg'}`}>{day}</span>
    </span>
  );
}

/**
 * One event in the /events grid: cover photo with its date tile and price,
 * title, when, where, how many are going, and the actions — save, attend (the
 * paid checkout opens from the page's handler) and, once you are going,
 * "Not attending anymore" in a menu. The card body is a link to the event; the
 * buttons are siblings, never nested inside it.
 */
export function EventListingCard({
  event,
  isSaved,
  isRegistered,
  onAttend,
  onSave,
  onCancelAttend,
}: {
  event: Event;
  isSaved: boolean;
  isRegistered: boolean;
  onAttend: () => void;
  onSave: () => void;
  onCancelAttend: () => void;
}) {
  const t = useTranslations('eventsPage');
  const tActions = useTranslations('actions');
  const format = useFormatter();
  const priceOf = useEventPrice();
  const cover = event.coverImageUrl?.trim() ? getEventCoverImage(event) : CATEGORY_PHOTOS.event.src;
  const start = new Date(event.startAt);
  const when = Number.isNaN(start.getTime()) ? '' : format.dateTime(start, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const place = event.locationDetails || event.locationType ? getEventLocationDisplay(event) : '';
  const online = eventFormat(event.locationType) === 'virtual';
  const soldOut = isEventSoldOut(event);
  const going = event.registrationCount ?? 0;
  const restricted = event.visibility && String(event.visibility).toLowerCase() !== 'public';
  const href = `/events/${encodeURIComponent(event.id)}`;
  const btn = 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <article data-testid="event-card" className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-default shadow-sm transition-[border-color,box-shadow] hover:border-border-brand hover:shadow-md">
      <Link href={href} prefetch={false} className="group flex min-w-0 flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-text-brand">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-subtle">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" width={480} height={270} loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
          <span className="absolute left-3 top-3">
            <DateTile iso={event.startAt} />
          </span>
          <span className="absolute right-3 top-3 rounded-full bg-surface-default/95 px-2.5 py-1 text-xs font-semibold text-text-primary shadow-sm">{priceOf(event)}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1 p-4 pb-3">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-text-primary">{event.title}</h3>
          {when && <p className="text-sm font-medium text-text-brand">{when}</p>}
          {(place || online) && (
            <p className="flex min-w-0 items-center gap-1 text-xs text-text-secondary">
              {online ? <Globe2 className="size-3.5 shrink-0" aria-hidden /> : <MapPin className="size-3.5 shrink-0" aria-hidden />}
              <span className="truncate">{online ? (place ? `${t('online')} · ${place}` : t('online')) : place}</span>
            </p>
          )}
          <p className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-text-secondary">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" aria-hidden />
              {tActions('going', { count: going })}
            </span>
            {restricted && (
              <span className="inline-flex items-center gap-1">
                <Lock className="size-3.5" aria-hidden />
                {t('membersOnly')}
              </span>
            )}
          </p>
        </div>
      </Link>
      <div className="flex items-center gap-2 px-4 pb-4">
        <button
          type="button"
          onClick={onSave}
          aria-pressed={isSaved}
          aria-label={`${isSaved ? tActions('saved') : tActions('save')}: ${event.title}`}
          className={`${btn} w-9 shrink-0 border px-0 ${isSaved ? 'border-text-brand bg-surface-brand text-white' : 'border-border-subtle bg-surface-default text-text-primary hover:bg-surface-subtle'}`}
        >
          <Bookmark className={`size-4 ${isSaved ? 'fill-current' : ''}`} aria-hidden />
        </button>
        {isRegistered ? (
          <>
            <span className={`${btn} flex-1 border border-border-subtle bg-surface-success text-text-success`}>
              <Check className="size-4" aria-hidden />
              {tActions('attending')}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label={`${t('moreActions')}: ${event.title}`} className={`${btn} w-9 shrink-0 border border-border-subtle bg-surface-default px-0 text-text-primary hover:bg-surface-subtle`}>
                  <EllipsisVertical className="size-4" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onCancelAttend}>{tActions('notAttendingAnymore')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <button type="button" onClick={onAttend} disabled={soldOut} className={`${btn} flex-1 bg-surface-brand text-white hover:opacity-90`}>
            {soldOut ? tActions('soldOut') : tActions('attend')}
          </button>
        )}
      </div>
    </article>
  );
}
