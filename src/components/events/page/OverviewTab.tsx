'use client';

import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, CalendarDays, ExternalLink, Globe2, Mail, MapPin, Phone, ShieldCheck, Sparkles, Ticket } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { getEventLocationDisplay } from '@/services/gql/events';
import type { EventPageEvent, EventSpeaker, EventVenueInfo, ProgrammeSession } from '@/services/gql/eventsM2';
import { formatInZone, formatTimeInZone, timezoneLabel, zoneDiffersFromViewer } from '@/lib/eventCalendar';
import { httpUrlOrNull } from '@/lib/safeUrl';
import { canJoinFromEvent, type OrganiserView } from './organiser';

const CARD = 'rounded-2xl border border-border-subtle bg-surface-default p-4 sm:p-5';
const PREVIEW_SPEAKERS = 4;
const PREVIEW_SESSIONS = 6;

/** Overview: about + organiser + contact, details tiles, speakers and programme previews, community banner. */
export function OverviewTab({
  event,
  priceLabel,
  organiser,
  speakers,
  sessions,
  venueInfo,
  onOpenTab,
}: {
  event: EventPageEvent;
  priceLabel: string;
  organiser: OrganiserView | null;
  speakers: EventSpeaker[];
  sessions: ProgrammeSession[];
  venueInfo?: EventVenueInfo | null;
  onOpenTab: (tab: 'speakers' | 'programme') => void;
}) {
  const t = useTranslations('eventPage.overview');
  const tFmt = useTranslations('eventPage.format');
  const tSp = useTranslations('eventPage.speakers');
  const tOrg = useTranslations('eventPage.organiser');
  const locale = useLocale();
  const zone = timezoneLabel(event.startAt, locale, event.timezone);
  const differs = zoneDiffersFromViewer(event.timezone);
  const place = getEventLocationDisplay(event);
  const orgName = organiser?.entity.name;
  const contactEmail = venueInfo?.contactPublic ? venueInfo.contactEmail : null;
  const contactPhone = venueInfo?.contactPublic ? venueInfo.contactPhone : null;
  const hasContact = Boolean(contactEmail || contactPhone);
  const external = httpUrlOrNull(event.registrationLink);

  const access = event.requiresApproval ? t('accessApproval') : t('accessRegistration');
  const tiles: Array<{ key: string; icon: typeof CalendarDays; label: string; lines: string[] }> = [
    { key: 'date', icon: CalendarDays, label: t('date'), lines: [`${formatInZone(event.startAt, locale, event.timezone)}${zone ? ` (${zone})` : ''}`] },
    { key: 'location', icon: MapPin, label: t('location'), lines: [place] },
    { key: 'format', icon: Globe2, label: t('format'), lines: [tFmt(event.locationType), tFmt(`${event.locationType}Sub`)] },
    { key: 'access', icon: ShieldCheck, label: t('access'), lines: [access] },
    { key: 'price', icon: Ticket, label: t('price'), lines: [priceLabel] },
  ];
  if (event.capacity) {
    tiles.push({ key: 'capacity', icon: Sparkles, label: t('capacity'), lines: [event.availableSpots != null ? t('spotsLeft', { count: event.availableSpots }) : String(event.capacity)] });
  }
  const sortedSpeakers = [...speakers].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const sortedSessions = [...sessions].sort((a, b) => a.startAt.localeCompare(b.startAt) || a.sortOrder - b.sortOrder);
  const showJoinBanner = organiser && organiser.standing === 'none';

  return (
    <div className="space-y-4" data-testid="overview-tab">
      <div className={`grid gap-4 ${organiser || hasContact ? 'lg:grid-cols-[minmax(0,1fr)_16rem]' : ''}`}>
        <section aria-labelledby="ov-about" className={CARD}>
          <h2 id="ov-about" className="text-lg font-bold text-text-primary">{t('about')}</h2>
          {event.description ? (
            <p className="mt-2 whitespace-pre-line break-words text-text-primary">{event.description}</p>
          ) : (
            <p className="mt-2 text-sm text-text-secondary">{t('noDescription')}</p>
          )}
          {event.tags && event.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label={t('tags')} data-testid="highlight-chips">
              {event.tags.map((tag) => (
                <li key={tag} className="inline-flex items-center gap-2 rounded-full bg-surface-info px-3 py-1.5 text-xs font-medium text-text-brand">
                  <Sparkles className="size-3.5" aria-hidden />
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </section>

        {(organiser || hasContact) && (
          <div className="space-y-4">
            {organiser && (
              <section aria-labelledby="ov-organiser" className={`${CARD} bg-surface-subtle/40`} data-testid="overview-organiser">
                <h2 id="ov-organiser" className="text-sm font-semibold text-text-primary">{t('organisedByHeading')}</h2>
                <div className="mt-3 flex items-center gap-3">
                  <ImageWithFallback src={organiser.entity.avatarUrl} alt="" className="size-12 shrink-0 rounded-full bg-surface-subtle object-cover" />
                  <p className="min-w-0 break-words text-sm font-semibold text-text-primary">{orgName}</p>
                </div>
                <Link
                  href={organiser.href}
                  className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-border-brand px-4 text-sm font-medium text-text-brand hover:bg-surface-info"
                >
                  {tOrg('viewCommunity')} <ArrowRight className="size-4" aria-hidden />
                </Link>
              </section>
            )}
            {hasContact && (
              <section aria-labelledby="ov-contact" className={CARD} data-testid="event-contact">
                <h2 id="ov-contact" className="text-sm font-semibold text-text-primary">{t('contactHeading')}</h2>
                <div className="mt-2 space-y-1.5 text-sm">
                  {contactEmail && (
                    <p className="flex items-center gap-2"><Mail className="size-4 shrink-0 text-text-secondary" aria-hidden /><a className="break-all text-text-brand hover:underline" href={`mailto:${contactEmail}`}>{contactEmail}</a></p>
                  )}
                  {contactPhone && (
                    <p className="flex items-center gap-2"><Phone className="size-4 shrink-0 text-text-secondary" aria-hidden /><a className="text-text-brand hover:underline" href={`tel:${contactPhone}`}>{contactPhone}</a></p>
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <section aria-labelledby="ov-facts" className={CARD}>
        <h2 id="ov-facts" className="text-lg font-bold text-text-primary">{t('facts')}</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {tiles.map(({ key, icon: Icon, label, lines }) => (
            <div key={key} data-testid={`fact-${key}`} className="flex items-start gap-3 rounded-xl border border-border-subtle p-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-info text-text-brand"><Icon className="size-5" strokeWidth={1.75} aria-hidden /></span>
              <div className="min-w-0">
                <dt className="text-xs font-semibold text-text-primary">{label}</dt>
                {lines.filter(Boolean).map((l, i) => (
                  <dd key={i} className="break-words text-xs text-text-secondary">{l}</dd>
                ))}
              </div>
            </div>
          ))}
        </dl>
        {zone && (
          <p className="pt-3 text-xs text-text-secondary">
            {t('timesIn', { zone: event.timezone ?? zone })}
            {differs ? ` ${t('differsFromYou')}` : ''}
          </p>
        )}
        {external && (
          <a href={external} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 pt-2 text-sm font-medium text-text-brand hover:underline">
            {t('externalRegistration')} <ExternalLink className="size-3.5" aria-hidden />
          </a>
        )}
      </section>

      {sortedSpeakers.length > 0 && (
        <section aria-labelledby="ov-speakers" className={CARD} data-testid="overview-speakers">
          <div className="flex items-center justify-between gap-2">
            <h2 id="ov-speakers" className="text-lg font-bold text-text-primary">{t('featuredSpeakers')}</h2>
            {sortedSpeakers.length > PREVIEW_SPEAKERS && (
              <button type="button" onClick={() => onOpenTab('speakers')} className="inline-flex items-center gap-1 text-xs font-medium text-text-brand hover:underline">
                {t('viewAll')} <ArrowRight className="size-3.5" aria-hidden />
              </button>
            )}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {sortedSpeakers.slice(0, PREVIEW_SPEAKERS).map((s) => (
              <li key={s.id} className="min-w-0 rounded-xl border border-border-subtle p-3">
                <ImageWithFallback src={s.photoUrl} alt={tSp('photoAlt', { name: s.name })} className="aspect-square w-full rounded-lg bg-surface-subtle object-cover" />
                <p className="mt-2 break-words text-sm font-semibold text-text-primary">{s.name}</p>
                {(s.title || s.organization) && <p className="break-words text-xs text-text-secondary">{[s.title, s.organization].filter(Boolean).join(', ')}</p>}
                <span className="mt-2 inline-block rounded-full bg-surface-success px-2 py-0.5 text-[11px] font-medium text-text-success">{tSp(`roles.${s.roleLabel}`)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sortedSessions.length > 0 && (
        <section aria-labelledby="ov-programme" className={CARD} data-testid="overview-programme">
          <div className="flex items-center justify-between gap-2">
            <h2 id="ov-programme" className="text-lg font-bold text-text-primary">{t('programmeHeading')}</h2>
            <button type="button" onClick={() => onOpenTab('programme')} className="inline-flex items-center gap-1 text-xs font-medium text-text-brand hover:underline">
              {t('viewProgramme')} <ArrowRight className="size-3.5" aria-hidden />
            </button>
          </div>
          <ol className="mt-3 space-y-2.5 border-l border-border-subtle pl-4">
            {sortedSessions.slice(0, PREVIEW_SESSIONS).map((s) => (
              <li key={s.id} className="relative grid gap-0.5 text-sm sm:grid-cols-[6rem_1fr] sm:gap-3">
                <span aria-hidden className="absolute -left-[1.3rem] top-1.5 size-2 rounded-full bg-surface-brand" />
                <span className="font-medium text-text-secondary">{formatTimeInZone(s.startAt, locale, s.timezone || event.timezone)}</span>
                <span className="break-words text-text-primary">{s.title}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {showJoinBanner && (
        <section aria-label={t('joinBannerTitle')} className="flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-surface-info to-surface-brand-subtle p-4 sm:flex-row sm:items-center sm:justify-between" data-testid="join-banner">
          <div className="flex items-center gap-3">
            <ImageWithFallback src={organiser.entity.avatarUrl} alt="" className="size-12 shrink-0 rounded-full bg-surface-subtle object-cover" />
            <div>
              <p className="text-sm font-semibold text-text-primary">{t('joinBannerTitle')}</p>
              <p className="text-xs text-text-secondary">{t('joinBannerBody', { name: orgName ?? '' })}</p>
            </div>
          </div>
          <Link href={organiser.href} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-surface-brand px-5 text-sm font-medium text-text-white">
            {canJoinFromEvent(organiser) ? tOrg('viewCommunity') : tOrg('openCommunity', { name: orgName ?? '' })} <ArrowRight className="size-4" aria-hidden />
          </Link>
        </section>
      )}
    </div>
  );
}
