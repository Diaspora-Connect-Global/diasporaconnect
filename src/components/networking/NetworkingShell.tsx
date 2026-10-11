'use client';

import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, CalendarDays, MapPin } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { formatInZone } from '@/lib/eventCalendar';
import { focusRing } from './primitives';

export type NetworkingTab = 'discover' | 'recommended' | 'people' | 'interested' | 'matches' | 'interests' | 'circles';

export interface NetworkingEventContext {
  id: string;
  title: string;
  startAt?: string | null;
  endAt?: string | null;
  timezone?: string | null;
  venue?: string | null;
}

export function tabHref(eventId: string, tab: NetworkingTab): string {
  const base = `/events/${eventId}/networking`;
  if (tab === 'discover') return base;
  if (tab === 'recommended') return `${base}/recommended`;
  return `${base}?tab=${tab}`;
}

/** Event context header (name, dates, venue) with the back link. No sidebar: the tabs below are the navigation. */
export function NetworkingHeader({ event, title }: { event: NetworkingEventContext; title?: string }) {
  const t = useTranslations('networking.header');
  const locale = useLocale();
  const when = event.startAt
    ? `${formatInZone(event.startAt, locale, event.timezone)}${event.endAt ? ` – ${formatInZone(event.endAt, locale, event.timezone)}` : ''}`
    : '';
  return (
    <header className="relative overflow-hidden rounded-2xl border border-border-subtle bg-gradient-to-r from-surface-info via-surface-brand-subtle to-surface-default p-5 sm:p-7">
      <Link href={`/events/${event.id}`} className={`-ml-1 inline-flex min-h-6 items-center gap-2 rounded-md px-1 text-sm font-semibold text-text-primary hover:text-text-brand ${focusRing}`}>
        <ArrowLeft className="size-4" aria-hidden />
        {t('backToEvent')}
      </Link>
      <p className="mt-3 inline-flex max-w-full items-center rounded-full border border-border-subtle bg-surface-default px-3 py-1 text-xs font-medium text-text-brand">
        <CalendarDays className="mr-1.5 size-3.5 shrink-0" aria-hidden />
        <span className="truncate" data-testid="event-title">{event.title}</span>
      </p>
      <h1 className="mt-3 text-2xl font-bold text-text-primary sm:text-3xl">{title ?? t('title')}</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t('subtitle', { event: event.title })}</p>
      {(when || event.venue) && (
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-primary">
          {when && (
            <div className="flex items-center gap-2">
              <dt className="sr-only">{t('when')}</dt>
              <CalendarDays className="size-4 text-text-brand" aria-hidden />
              <dd>{when}</dd>
            </div>
          )}
          {event.venue && (
            <div className="flex items-center gap-2">
              <dt className="sr-only">{t('where')}</dt>
              <MapPin className="size-4 text-text-brand" aria-hidden />
              <dd>{event.venue}</dd>
            </div>
          )}
        </dl>
      )}
    </header>
  );
}

export function NetworkingTabs({ eventId, active, interests, circles }: { eventId: string; active: NetworkingTab; interests: boolean; circles: boolean }) {
  const t = useTranslations('networking.tabs');
  const tabs: NetworkingTab[] = ['discover', 'recommended', 'people'];
  if (interests) tabs.push('interested', 'matches', 'interests');
  if (circles) tabs.push('circles');
  return (
    <nav aria-label={t('label')} className="overflow-x-auto rounded-2xl border border-border-subtle bg-surface-default">
      <ul className="flex min-w-max gap-1 px-2">
        {tabs.map((tab) => {
          const on = tab === active;
          return (
            <li key={tab}>
              <Link
                href={tabHref(eventId, tab)}
                aria-current={on ? 'page' : undefined}
                data-testid={`tab-${tab}`}
                className={`inline-flex min-h-11 items-center border-b-2 px-4 text-sm font-medium ${on ? 'border-border-brand text-text-brand' : 'border-transparent text-muted-foreground hover:text-text-primary'} ${focusRing}`}
              >
                {t(tab)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
