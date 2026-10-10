'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { useLocale, useTranslations } from 'next-intl';
import { ExternalLink, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { ButtonType1 } from '@/components/custom/button';
import { getEventLocationDisplay, getEventVenueLines } from '@/services/gql/events';
import {
  EVENT_UPDATES,
  type EventSpeaker,
  type EventUpdatesData,
  type EventVenueInfo,
  type EventPageEvent,
  type ProgrammeSession,
} from '@/services/gql/eventsM2';
import { dayKeyInZone, formatDayHeading, formatInZone, formatTimeInZone, timezoneLabel, zoneDiffersFromViewer } from '@/lib/eventCalendar';
import { profileUrl } from '@/lib/profileUrl';
import { httpUrlOrNull } from '@/lib/safeUrl';

const PROSE = 'whitespace-pre-line break-words text-text-primary';

export function Panel({ title, children, id }: { title?: string; children: React.ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="space-y-2 rounded-2xl border border-border-subtle bg-surface-default p-4">
      {title && <h2 id={id} className="text-base font-semibold text-text-primary">{title}</h2>}
      {children}
    </section>
  );
}

/** What a manager sees in place of a tab with nothing in it yet. Attendees never see it (the tab is hidden). */
export function ManagerEmpty({ eventId, text, section }: { eventId: string; text: string; section: string }) {
  const t = useTranslations('eventPage');
  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-border-subtle p-6 text-center" data-testid="manager-empty">
      <p className="text-sm text-text-secondary">{text}</p>
      <Link href={`/events/${eventId}/manage?tab=${section}`} className="inline-block text-sm font-medium text-text-brand hover:underline">
        {t('manageCta')}
      </Link>
    </div>
  );
}

// ─── Overview ────────────────────────────────────────────────────────────────

export function OverviewTab({
  event,
  priceLabel,
  organiserName,
}: {
  event: EventPageEvent;
  priceLabel: string;
  organiserName?: string | null;
}) {
  const t = useTranslations('eventPage.overview');
  const locale = useLocale();
  const zone = timezoneLabel(event.startAt, locale, event.timezone);
  const differs = zoneDiffersFromViewer(event.timezone);
  const place = getEventLocationDisplay(event);
  const facts: Array<[string, string]> = [
    [t('date'), `${formatInZone(event.startAt, locale, event.timezone)}${zone ? ` (${zone})` : ''}`],
    [t('location'), place],
    [t('price'), priceLabel],
  ];
  if (event.capacity) {
    facts.push([t('capacity'), event.availableSpots != null ? t('spotsLeft', { count: event.availableSpots }) : String(event.capacity)]);
  }
  if (event.eventCategory) facts.push([t('category'), event.eventCategory]);

  return (
    <div className="space-y-4">
      <Panel title={t('about')} id="ov-about">
        {event.description ? <p className={PROSE}>{event.description}</p> : <p className="text-sm text-text-secondary">{t('noDescription')}</p>}
        {organiserName && <p className="pt-1 text-sm text-text-secondary">{t('organisedBy', { name: organiserName })}</p>}
        {event.tags && event.tags.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-2" aria-label={t('tags')}>
            {event.tags.map((tag) => (
              <li key={tag} className="rounded-full bg-surface-subtle px-3 py-1 text-xs text-text-secondary">{tag}</li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title={t('facts')} id="ov-facts">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt className="text-text-secondary">{k}</dt>
              <dd className="font-medium text-text-primary break-words">{v}</dd>
            </div>
          ))}
        </dl>
        {zone && (
          <p className="pt-1 text-xs text-text-secondary">
            {t('timesIn', { zone: event.timezone ?? zone })}
            {differs ? ` ${t('differsFromYou')}` : ''}
          </p>
        )}
        {httpUrlOrNull(event.registrationLink) && (
          <a href={httpUrlOrNull(event.registrationLink)!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-text-brand hover:underline">
            {t('externalRegistration')} <ExternalLink className="size-3.5" aria-hidden />
          </a>
        )}
      </Panel>
    </div>
  );
}

// ─── Programme ───────────────────────────────────────────────────────────────

export function ProgrammeTab({
  event,
  sessions,
  speakers,
}: {
  event: EventPageEvent;
  sessions: ProgrammeSession[];
  speakers: EventSpeaker[];
}) {
  const t = useTranslations('eventPage.programme');
  const locale = useLocale();
  const zoneFor = (s: ProgrammeSession) => s.timezone || event.timezone;
  const names = useMemo(() => new Map(speakers.map((s) => [s.id, s.name])), [speakers]);
  const days = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => a.startAt.localeCompare(b.startAt) || a.sortOrder - b.sortOrder);
    const groups = new Map<string, ProgrammeSession[]>();
    for (const s of sorted) {
      const key = dayKeyInZone(s.startAt, zoneFor(s));
      groups.set(key, [...(groups.get(key) ?? []), s]);
    }
    return [...groups.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, event.timezone]);
  const zone = sessions[0] ? timezoneLabel(sessions[0].startAt, locale, zoneFor(sessions[0])) : '';

  return (
    <div className="space-y-4" data-testid="programme-tab">
      {zone && <p className="text-xs text-text-secondary">{t('timesIn', { zone })}</p>}
      {days.map((day) => (
        <Panel key={day[0].id} title={formatDayHeading(day[0].startAt, locale, zoneFor(day[0]))} id={`day-${day[0].id}`}>
          <ol className="divide-y divide-border-subtle">
            {day.map((s) => {
              const who = s.speakerIds.map((id) => names.get(id)).filter(Boolean) as string[];
              return (
                <li key={s.id} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                  <p className="text-sm font-medium text-text-secondary">
                    {formatTimeInZone(s.startAt, locale, zoneFor(s))} – {formatTimeInZone(s.endAt, locale, zoneFor(s))}
                  </p>
                  <div className="space-y-1">
                    <p className="font-medium text-text-primary">
                      {s.title}{' '}
                      <span className="ml-1 rounded-full bg-surface-subtle px-2 py-0.5 text-xs font-normal text-text-secondary">{t(`types.${s.sessionType}`)}</span>
                    </p>
                    {s.room && <p className="text-sm text-text-secondary">{t('room', { room: s.room })}</p>}
                    {who.length > 0 && <p className="text-sm text-text-secondary">{t('with', { names: who.join(', ') })}</p>}
                    {s.description && <p className={`text-sm ${PROSE}`}>{s.description}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </Panel>
      ))}
    </div>
  );
}

// ─── Speakers ────────────────────────────────────────────────────────────────

export function SpeakersTab({ speakers }: { speakers: EventSpeaker[] }) {
  const t = useTranslations('eventPage.speakers');
  const sorted = [...speakers].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return (
    <ul className="grid gap-4 sm:grid-cols-2" data-testid="speakers-tab">
      {sorted.map((s) => (
        <li key={s.id} className="flex gap-3 rounded-2xl border border-border-subtle bg-surface-default p-4">
          <ImageWithFallback src={s.photoUrl} alt={t('photoAlt', { name: s.name })} className="size-16 shrink-0 rounded-full bg-surface-subtle object-cover" />
          <div className="min-w-0 space-y-1">
            <p className="font-semibold text-text-primary break-words">{s.name}</p>
            <p className="text-xs text-text-brand">{t(`roles.${s.roleLabel}`)}</p>
            {(s.title || s.organization) && <p className="text-sm text-text-secondary">{[s.title, s.organization].filter(Boolean).join(' · ')}</p>}
            {s.bio && <p className={`text-sm ${PROSE}`}>{s.bio}</p>}
            {s.hasProfile && s.profileUsername && (
              <Link href={profileUrl({ username: s.profileUsername })} className="inline-block text-sm font-medium text-text-brand hover:underline">
                {t('viewProfile')}
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── Venue ───────────────────────────────────────────────────────────────────

export function hasVenueContent(event: Pick<EventPageEvent, 'locationType' | 'locationDetails'>, info?: EventVenueInfo | null): boolean {
  const v = getEventVenueLines(event);
  const base = Boolean(v.venueName) || v.addressLines.length > 0;
  const extra = Boolean(
    info && (info.halls.length || info.directions || info.accessibilityNotes || info.parking || info.contactEmail || info.contactPhone),
  );
  return base || extra;
}

export function VenueTab({
  event,
  info,
  canSeeOnlineLink,
}: {
  event: EventPageEvent;
  info?: EventVenueInfo | null;
  /** Online join details are for people with a confirmed place (and organisers), not the whole internet. */
  canSeeOnlineLink: boolean;
}) {
  const t = useTranslations('eventPage.venue');
  const v = getEventVenueLines(event);
  const mapQuery = [v.venueName, ...v.addressLines].filter(Boolean).join(', ');
  return (
    <div className="space-y-4" data-testid="venue-tab">
      {(v.venueName || v.addressLines.length > 0) && (
        <Panel title={t('where')} id="venue-where">
          {v.venueName && <p className="font-medium text-text-primary">{v.venueName}</p>}
          {v.addressLines.map((l) => <p key={l} className="text-text-secondary">{l}</p>)}
          {mapQuery && (
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-text-brand hover:underline">
              <MapPin className="size-4" aria-hidden /> {t('openMap')}
            </a>
          )}
        </Panel>
      )}
      {(v.virtualLink || v.platform) && (
        <Panel title={t('online')} id="venue-online">
          {v.platform && <p className="text-text-secondary">{v.platform}</p>}
          {canSeeOnlineLink && httpUrlOrNull(v.virtualLink) ? (
            <a href={httpUrlOrNull(v.virtualLink)!} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-text-brand hover:underline break-all">{t('joinOnline')}</a>
          ) : (
            <p className="text-sm text-text-secondary">{t('onlineAfterConfirmed')}</p>
          )}
        </Panel>
      )}
      {info && info.halls.length > 0 && (
        <Panel title={t('halls')} id="venue-halls">
          <ul className="space-y-2">
            {info.halls.map((h) => (
              <li key={h.name}><p className="font-medium text-text-primary">{h.name}</p>{h.description && <p className="text-sm text-text-secondary">{h.description}</p>}</li>
            ))}
          </ul>
        </Panel>
      )}
      {info?.directions && <Panel title={t('directions')} id="venue-dir"><p className={PROSE}>{info.directions}</p></Panel>}
      {info?.accessibilityNotes && <Panel title={t('accessibility')} id="venue-acc"><p className={PROSE}>{info.accessibilityNotes}</p></Panel>}
      {info?.parking && <Panel title={t('parking')} id="venue-park"><p className={PROSE}>{info.parking}</p></Panel>}
      {(info?.contactEmail || info?.contactPhone) && (
        <Panel title={t('contact')} id="venue-contact">
          {info.contactEmail && <p className="flex items-center gap-2 text-sm"><Mail className="size-4 text-text-secondary" aria-hidden /><a className="text-text-brand hover:underline break-all" href={`mailto:${info.contactEmail}`}>{info.contactEmail}</a></p>}
          {info.contactPhone && <p className="flex items-center gap-2 text-sm"><Phone className="size-4 text-text-secondary" aria-hidden /><a className="text-text-brand hover:underline" href={`tel:${info.contactPhone}`}>{info.contactPhone}</a></p>}
        </Panel>
      )}
    </div>
  );
}

// ─── Updates ─────────────────────────────────────────────────────────────────

export const UPDATES_PAGE_SIZE = 10;

export function UpdatesTab({ eventId }: { eventId: string }) {
  const t = useTranslations('eventPage.updates');
  const locale = useLocale();
  const { data, fetchMore, loading } = useQuery<EventUpdatesData>(EVENT_UPDATES, {
    variables: { eventId, pageSize: UPDATES_PAGE_SIZE },
  });
  const page = data?.eventUpdates;
  const updates = page?.updates ?? [];
  const cursor = page?.nextCursor;

  return (
    <div className="space-y-3" data-testid="updates-tab">
      {updates.map((u) => (
        <article key={u.id} className="space-y-1 rounded-2xl border border-border-subtle bg-surface-default p-4">
          <h2 className="font-semibold text-text-primary">{u.title}</h2>
          <p className="text-xs text-text-secondary">{t('postedOn', { date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(u.publishedAt)) })}</p>
          <p className={`pt-1 ${PROSE}`}>{u.body}</p>
        </article>
      ))}
      {cursor && (
        <ButtonType1
          disabled={loading}
          onClick={() =>
            fetchMore({
              variables: { cursor },
              updateQuery: (prev, { fetchMoreResult }) => {
                const next = (fetchMoreResult as EventUpdatesData | undefined)?.eventUpdates;
                if (!next) return prev;
                return { eventUpdates: { ...next, updates: [...(prev.eventUpdates?.updates ?? []), ...next.updates] } };
              },
            })
          }
        >
          {t('loadMore')}
        </ButtonType1>
      )}
    </div>
  );
}
