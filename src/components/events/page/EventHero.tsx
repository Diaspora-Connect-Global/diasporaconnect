'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Bookmark, BookmarkCheck, CalendarDays, Globe2, MapPin, Settings2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { EVENT_PLACEHOLDER_IMAGE, getEventCoverImage, getEventLocationDisplay, getEventVenueLines } from '@/services/gql/events';
import type { EventPageEvent } from '@/services/gql/eventsM2';
import { formatInZone, timezoneLabel } from '@/lib/eventCalendar';

const ICON_BTN =
  'inline-flex size-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white';

/**
 * Hero banner: the event's own image under a dark gradient, with its category,
 * title and the three facts people look for first. A tagline is not shown: events
 * have none. Save and manage sit top-right.
 */
export default function EventHero({
  event,
  canManage,
  saved,
  onToggleSave,
  children,
}: {
  event: EventPageEvent;
  canManage: boolean;
  saved: boolean;
  onToggleSave: () => void;
  children?: React.ReactNode;
}) {
  const t = useTranslations('eventPage');
  const tFmt = useTranslations('eventPage.format');
  const locale = useLocale();
  const zone = timezoneLabel(event.startAt, locale, event.timezone);
  const venue = getEventVenueLines(event);
  const place = venue.venueName ?? getEventLocationDisplay(event);
  const placeSub = venue.venueName ? venue.addressLines.join(', ') : '';

  return (
    <header className="relative mb-4 overflow-hidden rounded-2xl bg-slate-900 text-white" data-testid="event-hero">
      <ImageWithFallback src={getEventCoverImage(event)} fallbackSrc={EVENT_PLACEHOLDER_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-slate-950/20" />
      <div className="relative flex min-h-64 flex-col justify-end gap-3 p-4 sm:min-h-72 sm:p-6">
        <div className="absolute right-3 top-3 flex items-center gap-2">
          {canManage && (
            <Link href={`/events/${event.id}/manage`} aria-label={t('manageCta')} className={ICON_BTN} data-testid="manage-link">
              <Settings2 className="size-5" aria-hidden />
            </Link>
          )}
          <button type="button" onClick={onToggleSave} aria-pressed={saved} aria-label={saved ? t('unsave') : t('save')} className={ICON_BTN}>
            {saved ? <BookmarkCheck className="size-5" aria-hidden /> : <Bookmark className="size-5" aria-hidden />}
          </button>
        </div>

        {event.eventCategory && (
          <span className="w-fit rounded-full bg-surface-brand px-3 py-1 text-xs font-medium text-text-white" data-testid="event-category">{event.eventCategory}</span>
        )}
        <h1 className="max-w-3xl break-words pr-24 text-2xl font-bold leading-tight sm:text-4xl">{event.title}</h1>

        <dl className="mt-1 grid gap-3 text-sm sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-white/25">
          <div className="flex items-start gap-3 sm:pr-5">
            <CalendarDays className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <dt className="sr-only">{t('overview.date')}</dt>
              <dd className="font-semibold">{formatInZone(event.startAt, locale, event.timezone)}</dd>
              {zone && <dd className="text-xs text-white/75">{zone}</dd>}
            </div>
          </div>
          <div className="flex items-start gap-3 sm:px-5">
            <MapPin className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <dt className="sr-only">{t('overview.location')}</dt>
              <dd className="break-words font-semibold">{place}</dd>
              {placeSub && <dd className="break-words text-xs text-white/75">{placeSub}</dd>}
            </div>
          </div>
          <div className="flex items-start gap-3 sm:pl-5">
            <Globe2 className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <dt className="sr-only">{t('overview.format')}</dt>
              <dd className="font-semibold">{tFmt(event.locationType)}</dd>
              <dd className="text-xs text-white/75">{tFmt(`${event.locationType}Sub`)}</dd>
            </div>
          </div>
        </dl>
        {children}
      </div>
    </header>
  );
}
