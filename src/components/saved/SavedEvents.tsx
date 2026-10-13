'use client';

import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { CalendarDays, MapPin } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { USER_EVENTS, UserEventsData, Event } from '@/services/gql/events';
import { EmptyState } from '@/components/feedback';
import { Spinner } from '@/components/ui/spinner';
import { toCdnUrl } from '@/lib/cdn';
import { CATEGORY_PHOTOS } from '@/lib/redesignImages';
import { useImageFallback } from '@/components/ui/ImageWithFallback';

const SILENT = { context: { silentErrors: true } } as const;

function EventRow({ event }: { event: Event }) {
  const t = useTranslations('savedPage');
  const fallback = CATEGORY_PHOTOS.event;
  const { src, onError } = useImageFallback(event.coverImageUrl ? toCdnUrl(event.coverImageUrl) : undefined, fallback.src);

  const start = new Date(event.startAt);
  const dateStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  const location =
    event.locationType === 'virtual'
      ? t('virtual')
      : event.locationDetails?.city
        ? `${event.locationDetails.city}${event.locationDetails.country ? `, ${event.locationDetails.country}` : ''}`
        : event.locationDetails?.venueName ?? null;

  return (
    <li>
      <Link
        href={`/events/${encodeURIComponent(event.id)}`}
        prefetch={false}
        className="flex min-w-0 items-start gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-text-brand"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          width={64}
          height={64}
          onError={onError}
          className="size-16 shrink-0 rounded-xl border border-border-subtle object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text-primary">{event.title}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="size-3 shrink-0" aria-hidden />
            {dateStr} · {timeStr}
          </p>
          {location && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" aria-hidden />
              {location}
            </p>
          )}
          {event.isPaid && (
            <span className="mt-1 inline-block rounded-full bg-surface-warning-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-warning">
              {t('paid')}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

export function SavedEvents() {
  const t = useTranslations('savedPage');

  const { data, loading } = useQuery<UserEventsData>(USER_EVENTS, {
    fetchPolicy: 'cache-and-network',
    ...SILENT,
  });

  const saved = data?.userEvents?.saved ?? [];

  if (loading && !data) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="size-6 text-text-brand" />
      </div>
    );
  }

  if (saved.length === 0) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface-default p-8">
        <EmptyState size="sm" icon={CalendarDays} title={t('empty.events')} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-default">
      <ul className="divide-y divide-border-subtle px-2">
        {saved.map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
      </ul>
    </div>
  );
}
