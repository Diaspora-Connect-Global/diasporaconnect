'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useQuery, useMutation } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import {
  Search,
  CalendarDays,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  List,
  Filter,
  BadgeCheck,
  CalendarPlus,
  Download,
  CalendarClock,
  Info,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GET_EVENTS_BY_OWNER,
  REGISTER_EVENT,
  getEventLocationDisplay,
  type EventLocation,
  type RegisterEventData,
} from '@/services/gql/events';
import type { EmbassyViewProps } from '../types';
import type { EmbassyProfile } from '../embassyMock';

// ─── Types ─────────────────────────────────────────────────────────────────

interface OwnerEvent {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  visibility?: string | null;
  startAt: string;
  endAt?: string | null;
  eventCategory?: string | null;
  locationType?: 'physical' | 'virtual' | 'hybrid' | null;
  locationDetails?: EventLocation | null;
  registrationCount?: number | null;
  availableSpots?: number | null;
  isPaid?: boolean;
  coverImageUrl?: string | null;
  timezone?: string | null;
}

interface GetEventsByOwnerResponse {
  getEventsByOwner: { total: number; events: OwnerEvent[] };
}

type CalendarView = 'month' | 'week' | 'agenda';
type RsvpStatus = 'going' | 'interested' | 'not_going';

// ─── Date helpers (native Date — no date-fns) ───────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
// Sunday-first to match the design.
const WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function parseDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateTimeRange(startIso: string, endIso?: string | null): string {
  const start = parseDate(startIso);
  if (!start) return '';
  const startStr = start.toLocaleString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const end = endIso ? parseDate(endIso) : null;
  if (!end) return startStr;
  const sd = sameDay(start, end);
  const endStr = end.toLocaleString(undefined, {
    ...(sd ? {} : { weekday: 'short', day: '2-digit', month: 'short' }),
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${startStr} – ${endStr}`;
}

function formatLongDate(iso?: string | null): string {
  const d = parseDate(iso);
  if (!d) return '';
  return d.toLocaleString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTimeRange(startIso?: string | null, endIso?: string | null): string {
  const start = parseDate(startIso);
  if (!start) return '';
  const startStr = start.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' });
  const end = parseDate(endIso);
  if (!end) return startStr;
  const endStr = end.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${startStr} – ${endStr}`;
}

function locationDisplay(evt: OwnerEvent): string {
  return getEventLocationDisplay({
    locationType: (evt.locationType ?? 'physical') as 'physical' | 'virtual' | 'hybrid',
    locationDetails: evt.locationDetails ?? null,
  });
}

// ─── ICS / Google calendar helpers (mirrors EmbassyEventDetail) ─────────────

function toIcsUtc(iso?: string | null): string {
  const d = parseDate(iso);
  if (!d) return '';
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function icsEscape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function downloadIcs(evt: OwnerEvent): void {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Diaspoplug//Embassy Events//EN',
    'BEGIN:VEVENT',
    `UID:${evt.id}@diaspoplug`,
    `DTSTAMP:${toIcsUtc(new Date().toISOString())}`,
    `DTSTART:${toIcsUtc(evt.startAt)}`,
    evt.endAt ? `DTEND:${toIcsUtc(evt.endAt)}` : '',
    `SUMMARY:${icsEscape(evt.title)}`,
    evt.description ? `DESCRIPTION:${icsEscape(evt.description)}` : '',
    `LOCATION:${icsEscape(locationDisplay(evt))}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${evt.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'event'}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function googleCalendarUrl(evt: OwnerEvent): string {
  const start = toIcsUtc(evt.startAt);
  const end = toIcsUtc(evt.endAt) || start;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: evt.title,
    dates: `${start}/${end}`,
    details: evt.description ?? '',
    location: locationDisplay(evt),
  });
  return `https://www.google.com/calendar/render?${params.toString()}`;
}

function outlookCalendarUrl(evt: OwnerEvent): string {
  const start = parseDate(evt.startAt);
  const end = parseDate(evt.endAt) ?? start;
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: evt.title,
    body: evt.description ?? '',
    location: locationDisplay(evt),
    startdt: start ? start.toISOString() : '',
    enddt: end ? end.toISOString() : '',
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

// ─── Category → color map ────────────────────────────────────────────────────

interface CategoryDef {
  key: string;
  /** i18n key under calendar.legend.* */
  labelKey: string;
  dot: string; // raw tailwind bg color for the dot
  chipRing: string;
  chipFg: string;
  match: string[];
}
const CATEGORY_DEFS: CategoryDef[] = [
  { key: 'conference', labelKey: 'conference', dot: 'bg-blue-500', chipRing: 'bg-blue-50', chipFg: 'text-blue-600', match: ['conference'] },
  { key: 'workshop', labelKey: 'workshop', dot: 'bg-green-500', chipRing: 'bg-green-50', chipFg: 'text-green-600', match: ['workshop', 'educational', 'education', 'training'] },
  { key: 'religious', labelKey: 'religious', dot: 'bg-purple-500', chipRing: 'bg-purple-50', chipFg: 'text-purple-600', match: ['religious', 'religion', 'faith', 'cultural', 'culture'] },
  { key: 'networking', labelKey: 'networking', dot: 'bg-orange-500', chipRing: 'bg-orange-50', chipFg: 'text-orange-600', match: ['networking', 'network', 'business', 'community'] },
  { key: 'social', labelKey: 'social', dot: 'bg-teal-500', chipRing: 'bg-teal-50', chipFg: 'text-teal-600', match: ['social', 'webinar', 'online', 'meetup'] },
  { key: 'other', labelKey: 'other', dot: 'bg-gray-400', chipRing: 'bg-surface-subtle', chipFg: 'text-text-secondary', match: [] },
];

function categoryDef(evt: OwnerEvent): CategoryDef {
  const cat = (evt.eventCategory ?? '').toLowerCase();
  const hit = CATEGORY_DEFS.find(
    (c) => c.match.length > 0 && c.match.some((m) => cat.includes(m)),
  );
  return hit ?? CATEGORY_DEFS[CATEGORY_DEFS.length - 1];
}

// ─── Event type (location-based) ────────────────────────────────────────────

const EVENT_TYPES: ReadonlyArray<{ key: string; labelKey: string }> = [
  { key: 'physical', labelKey: 'typePhysical' },
  { key: 'virtual', labelKey: 'typeVirtual' },
  { key: 'hybrid', labelKey: 'typeHybrid' },
];

function eventTypeKey(evt: OwnerEvent): string {
  const t = (evt.locationDetails?.type ?? evt.locationType ?? 'physical').toLowerCase();
  if (t === 'virtual') return 'virtual';
  if (t === 'hybrid') return 'hybrid';
  return 'physical';
}

// ─── Initial month: nearest upcoming event, else today ──────────────────────

function initialMonth(events: OwnerEvent[]): { year: number; month: number } {
  const now = Date.now();
  let nearest: Date | null = null;
  for (const e of events) {
    const d = parseDate(e.startAt);
    if (!d || d.getTime() < now) continue;
    if (!nearest || d.getTime() < nearest.getTime()) nearest = d;
  }
  const base = nearest ?? new Date();
  return { year: base.getFullYear(), month: base.getMonth() };
}

// ─── Main component ──────────────────────────────────────────────────────────

interface Props {
  community: EmbassyViewProps['community'];
  profile: EmbassyProfile;
}

export function EmbassyEventsCalendar({ community, profile }: Props) {
  const t = useTranslations('community.embassy.events.calendar');
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const today = new Date();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [view, setView] = useState<CalendarView>('month');
  const [cursor, setCursor] = useState(() => initialMonth([]));
  const [userNavigated, setUserNavigated] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<Record<string, RsvpStatus>>({});

  const { data, loading } = useQuery<GetEventsByOwnerResponse>(GET_EVENTS_BY_OWNER, {
    variables: { ownerId: community.id, ownerType: 'community', limit: 50, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });

  const [registerMutation] = useMutation<RegisterEventData>(REGISTER_EVENT);

  const allEvents = data?.getEventsByOwner?.events ?? [];
  // Prefer published events (cancelled always hidden); if none are published
  // yet, fall back to the rest (drafts included) so the calendar isn't empty.
  const events = useMemo(() => {
    const up = (s: string) => String(s).toUpperCase();
    const nonCancelled = allEvents.filter((e) => up(e.status) !== 'CANCELLED');
    const published = nonCancelled.filter((e) => up(e.status) !== 'DRAFT');
    return published.length > 0 ? published : nonCancelled;
  }, [allEvents]);

  // Once events load, snap the month cursor to the nearest upcoming event unless
  // the user has navigated.
  useEffect(() => {
    if (userNavigated || events.length === 0) return;
    setCursor(initialMonth(events));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length]);

  // Search + filter applied to the working set.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (q) {
        const hay = `${e.title} ${e.description ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (categoryFilter && categoryDef(e).key !== categoryFilter) return false;
      if (typeFilter && eventTypeKey(e) !== typeFilter) return false;
      return true;
    });
  }, [events, search, categoryFilter, typeFilter]);

  // Upcoming, sorted ascending by start.
  const upcoming = useMemo(() => {
    const now = Date.now();
    return filtered
      .filter((e) => (parseDate(e.startAt)?.getTime() ?? 0) >= now)
      .sort(
        (a, b) =>
          (parseDate(a.startAt)?.getTime() ?? 0) - (parseDate(b.startAt)?.getTime() ?? 0),
      );
  }, [filtered]);

  // Map day → events for the visible month/week.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, OwnerEvent[]>();
    for (const e of filtered) {
      const d = parseDate(e.startAt);
      if (!d) continue;
      const k = dayKey(d);
      const arr = map.get(k);
      if (arr) arr.push(e);
      else map.set(k, [e]);
    }
    for (const arr of map.values()) {
      arr.sort(
        (a, b) =>
          (parseDate(a.startAt)?.getTime() ?? 0) - (parseDate(b.startAt)?.getTime() ?? 0),
      );
    }
    return map;
  }, [filtered]);

  // Selected event (or default to next upcoming).
  const selectedEvent = useMemo(() => {
    if (selectedId) {
      const hit = filtered.find((e) => e.id === selectedId);
      if (hit) return hit;
    }
    return upcoming[0] ?? null;
  }, [selectedId, filtered, upcoming]);

  // Back-to-list link (drops `calendar`, keeps the rest).
  const listHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'events');
    params.delete('calendar');
    params.delete('event');
    const query: Record<string, string> = {};
    params.forEach((value, name) => {
      query[name] = value;
    });
    return { pathname, query };
  }, [pathname, searchParams]);

  // `?tab=events&event=<id>` detail link.
  function eventDetailHref(id: string): { pathname: string; query: Record<string, string> } {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'events');
    params.delete('calendar');
    params.set('event', id);
    const query: Record<string, string> = {};
    params.forEach((value, name) => {
      query[name] = value;
    });
    return { pathname, query };
  }

  const shiftMonth = (delta: number) => {
    setUserNavigated(true);
    setCursor((c) => {
      const m = c.month + delta;
      return { year: c.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  };

  const goToday = () => {
    setUserNavigated(true);
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
  };

  // ── My status (RSVP) ───────────────────────────────────────────────────────

  async function handleStatus(evt: OwnerEvent, status: RsvpStatus) {
    setLocalStatus((prev) => ({ ...prev, [evt.id]: status }));
    if (status === 'going') {
      try {
        await registerMutation({ variables: { input: { eventId: evt.id } } });
        toast.success(t('toastGoing'));
        return;
      } catch {
        // Fall through to the optimistic local toast.
      }
    }
    toast.success(
      status === 'going'
        ? t('toastGoing')
        : status === 'interested'
          ? t('toastInterested')
          : t('toastNotGoing'),
    );
  }

  const currentStatus = (id: string | undefined): RsvpStatus | null =>
    id ? localStatus[id] ?? null : null;

  // ── Render helpers ─────────────────────────────────────────────────────────

  const monthLabel = `${MONTH_NAMES[cursor.month]} ${cursor.year}`;

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 lg:px-6">
      {/* Back breadcrumb */}
      <Link
        href={listHref}
        scroll={false}
        className="label-medium mb-4 inline-flex items-center gap-1 text-text-brand transition-colors hover:underline"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {t('back')}
      </Link>

      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-xsmall text-text-primary">{t('title')}</h1>
          <p className="body-small text-text-secondary">{t('subtitle')}</p>
        </div>
        <Link
          href={listHref}
          scroll={false}
          className="label-medium inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-border-subtle px-4 py-2 text-text-secondary transition-colors hover:bg-surface-subtle"
        >
          <List className="size-4" aria-hidden />
          {t('listView')}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
        {/* Main column */}
        <div className="min-w-0 space-y-6">
          {/* Toolbar */}
          <Card className="border-border-subtle">
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="body-small w-full rounded-lg border border-border-subtle bg-surface-default py-2 pl-9 pr-3 text-text-primary outline-none focus:border-border-brand"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Category filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="label-medium inline-flex items-center gap-1 rounded-lg border border-border-subtle px-3 py-2 text-text-secondary hover:bg-surface-subtle"
                      >
                        {categoryFilter
                          ? t(`legend.${CATEGORY_DEFS.find((c) => c.key === categoryFilter)?.labelKey}`)
                          : t('allCategories')}
                        <ChevronDown className="size-4" aria-hidden />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setCategoryFilter(null)}>
                        {t('allCategories')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {CATEGORY_DEFS.map((c) => (
                        <DropdownMenuItem key={c.key} onSelect={() => setCategoryFilter(c.key)}>
                          <span className={`size-2.5 rounded-full ${c.dot}`} aria-hidden />
                          {t(`legend.${c.labelKey}`)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Event type filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="label-medium inline-flex items-center gap-1 rounded-lg border border-border-subtle px-3 py-2 text-text-secondary hover:bg-surface-subtle"
                      >
                        {typeFilter
                          ? t(EVENT_TYPES.find((e) => e.key === typeFilter)?.labelKey ?? 'allTypes')
                          : t('allTypes')}
                        <ChevronDown className="size-4" aria-hidden />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setTypeFilter(null)}>
                        {t('allTypes')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {EVENT_TYPES.map((e) => (
                        <DropdownMenuItem key={e.key} onSelect={() => setTypeFilter(e.key)}>
                          {t(e.labelKey)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Filters (reset) */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="label-medium inline-flex items-center gap-1 rounded-lg border border-border-subtle px-3 py-2 text-text-secondary hover:bg-surface-subtle"
                      >
                        <Filter className="size-4" aria-hidden />
                        {t('filters')}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t('filters')}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => {
                          setCategoryFilter(null);
                          setTypeFilter(null);
                          setSearch('');
                        }}
                      >
                        {t('clearFilters')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Month nav + view toggle */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={goToday}
                    className="label-medium rounded-lg border border-border-subtle px-3 py-1.5 text-text-secondary hover:bg-surface-subtle"
                  >
                    {t('today')}
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftMonth(-1)}
                    aria-label={t('prevMonth')}
                    className="flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-subtle"
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftMonth(1)}
                    aria-label={t('nextMonth')}
                    className="flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-subtle"
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </button>
                  <span className="label-large ml-1 text-text-primary">{monthLabel}</span>
                </div>

                <div className="inline-flex items-center rounded-lg border border-border-subtle p-0.5">
                  {(['month', 'week', 'agenda'] as CalendarView[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setView(v)}
                      aria-pressed={view === v}
                      className={[
                        'label-medium rounded-md px-3 py-1 transition-colors',
                        view === v
                          ? 'bg-surface-brand text-text-white'
                          : 'text-text-secondary hover:bg-surface-subtle',
                      ].join(' ')}
                    >
                      {t(`view.${v}`)}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar body */}
          <Card className="border-border-subtle">
            <CardContent className="p-4">
              {loading && events.length === 0 ? (
                <p className="body-small py-12 text-center text-text-secondary">{t('loading')}</p>
              ) : view === 'month' ? (
                <MonthGrid
                  cursor={cursor}
                  today={today}
                  eventsByDay={eventsByDay}
                  selectedId={selectedEvent?.id ?? null}
                  onSelect={(id) => setSelectedId(id)}
                  t={t}
                />
              ) : view === 'week' ? (
                <WeekView
                  cursor={cursor}
                  today={today}
                  eventsByDay={eventsByDay}
                  selectedId={selectedEvent?.id ?? null}
                  onSelect={(id) => setSelectedId(id)}
                  t={t}
                />
              ) : (
                <AgendaView
                  events={upcoming}
                  selectedId={selectedEvent?.id ?? null}
                  onSelect={(id) => setSelectedId(id)}
                  t={t}
                />
              )}

              {/* Legend */}
              <div className="mt-5 border-t border-border-subtle pt-4">
                <p className="caption-small mb-2 text-text-secondary">{t('legendTitle')}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {CATEGORY_DEFS.map((c) => (
                    <span key={c.key} className="caption-medium inline-flex items-center gap-1.5 text-text-secondary">
                      <span className={`size-2.5 rounded-full ${c.dot}`} aria-hidden />
                      {t(`legend.${c.labelKey}`)}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tip banner */}
          <Card className="border-border-subtle bg-surface-brand-subtle">
            <CardContent className="flex items-start gap-3 p-4">
              <Info className="mt-0.5 size-5 flex-shrink-0 text-text-brand" aria-hidden />
              <p className="caption-medium text-text-secondary">{t('tip')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Right rail */}
        <aside className="space-y-6">
          <SelectedEventCard
            event={selectedEvent}
            community={community}
            profile={profile}
            detailHref={selectedEvent ? eventDetailHref(selectedEvent.id) : null}
            status={currentStatus(selectedEvent?.id)}
            onStatus={handleStatus}
            t={t}
          />

          {/* Upcoming events */}
          <Card className="border-border-subtle">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="label-large text-text-primary">{t('upcomingTitle')}</h3>
                <Link href={listHref} scroll={false} className="caption-medium text-text-brand hover:underline">
                  {t('viewAll')}
                </Link>
              </div>
              {upcoming.length === 0 ? (
                <p className="caption-medium py-6 text-center text-text-secondary">{t('noUpcoming')}</p>
              ) : (
                <ul className="space-y-2">
                  {upcoming.slice(0, 5).map((evt) => {
                    const d = parseDate(evt.startAt);
                    const active = selectedEvent?.id === evt.id;
                    return (
                      <li key={evt.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(evt.id)}
                          className={[
                            'flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors',
                            active ? 'bg-surface-subtle ring-1 ring-border-brand' : 'hover:bg-surface-subtle',
                          ].join(' ')}
                        >
                          <span className="flex size-11 flex-shrink-0 flex-col items-center justify-center rounded-lg border border-border-subtle bg-surface-brand-subtle">
                            <span className="caption-small font-semibold text-text-brand">
                              {d ? d.toLocaleString(undefined, { month: 'short' }).toUpperCase() : ''}
                            </span>
                            <span className="label-medium leading-none text-text-primary">
                              {d ? d.toLocaleString(undefined, { day: '2-digit' }) : ''}
                            </span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="label-medium block truncate text-text-primary">{evt.title}</span>
                            <span className="caption-small block truncate text-text-secondary">
                              {formatTimeRange(evt.startAt, evt.endAt)}
                            </span>
                          </span>
                          <span className={`size-2.5 flex-shrink-0 rounded-full ${categoryDef(evt).dot}`} aria-hidden />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

// ─── Month grid ───────────────────────────────────────────────────────────────

function MonthGrid({
  cursor,
  today,
  eventsByDay,
  selectedId,
  onSelect,
  t,
}: {
  cursor: { year: number; month: number };
  today: Date;
  eventsByDay: Map<string, OwnerEvent[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const firstOfMonth = new Date(cursor.year, cursor.month, 1);
  const leadingBlanks = firstOfMonth.getDay(); // Sunday-first
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

  // 6-week grid of concrete Date objects (incl. leading/trailing from siblings).
  const cells: Date[] = [];
  const start = new Date(cursor.year, cursor.month, 1 - leadingBlanks);
  for (let i = 0; i < 42; i += 1) {
    cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }

  return (
    <div>
      <div className="grid grid-cols-7">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w} className="caption-small py-2 text-center text-text-secondary">
            {t(`weekday.${w.toLowerCase()}`)}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const inMonth = cell.getMonth() === cursor.month;
          const isToday = sameDay(cell, today);
          const dayEvents = eventsByDay.get(dayKey(cell)) ?? [];
          return (
            <div
              key={cell.toISOString()}
              className={[
                'flex min-h-[5.5rem] flex-col gap-1 rounded-md border p-1.5',
                inMonth ? 'border-border-subtle bg-surface-default' : 'border-transparent bg-surface-subtle/40',
              ].join(' ')}
            >
              <span
                className={[
                  'caption-small flex size-6 items-center justify-center self-start rounded-full',
                  isToday
                    ? 'bg-surface-brand font-semibold text-text-white'
                    : inMonth
                      ? 'text-text-primary'
                      : 'text-text-secondary',
                ].join(' ')}
              >
                {cell.getDate()}
              </span>

              {dayEvents.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  {dayEvents.slice(0, 2).map((evt) => {
                    const cat = categoryDef(evt);
                    const active = evt.id === selectedId;
                    return (
                      <button
                        key={evt.id}
                        type="button"
                        onClick={() => onSelect(evt.id)}
                        title={evt.title}
                        className={[
                          'flex items-center gap-1 rounded px-1 py-0.5 text-left transition-colors',
                          active ? 'bg-surface-subtle ring-1 ring-border-brand' : 'hover:bg-surface-subtle',
                        ].join(' ')}
                      >
                        <span className={`size-2 flex-shrink-0 rounded-full ${cat.dot}`} aria-hidden />
                        <span className="caption-small min-w-0 truncate text-text-primary">{evt.title}</span>
                      </button>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <span className="caption-small px-1 text-text-secondary">
                      {t('moreEvents', { count: dayEvents.length })}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week view ────────────────────────────────────────────────────────────────

function WeekView({
  cursor,
  today,
  eventsByDay,
  selectedId,
  onSelect,
  t,
}: {
  cursor: { year: number; month: number };
  today: Date;
  eventsByDay: Map<string, OwnerEvent[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  // Anchor on today when today is within the cursor's month, else the 1st.
  const anchor =
    today.getFullYear() === cursor.year && today.getMonth() === cursor.month
      ? today
      : new Date(cursor.year, cursor.month, 1);
  const weekStart = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - anchor.getDay());
  const days: Date[] = [];
  for (let i = 0; i < 7; i += 1) {
    days.push(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i));
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
      {days.map((day) => {
        const isToday = sameDay(day, today);
        const dayEvents = eventsByDay.get(dayKey(day)) ?? [];
        return (
          <div key={day.toISOString()} className="rounded-lg border border-border-subtle p-2">
            <div className="mb-2 flex items-center justify-between sm:flex-col sm:items-start sm:gap-0.5">
              <span className="caption-small text-text-secondary">
                {t(`weekday.${WEEKDAY_LABELS[day.getDay()].toLowerCase()}`)}
              </span>
              <span
                className={[
                  'caption-medium flex size-6 items-center justify-center rounded-full',
                  isToday ? 'bg-surface-brand font-semibold text-text-white' : 'text-text-primary',
                ].join(' ')}
              >
                {day.getDate()}
              </span>
            </div>
            <div className="space-y-1">
              {dayEvents.length === 0 ? (
                <span className="caption-small text-text-secondary/60">—</span>
              ) : (
                dayEvents.map((evt) => {
                  const cat = categoryDef(evt);
                  const active = evt.id === selectedId;
                  return (
                    <button
                      key={evt.id}
                      type="button"
                      onClick={() => onSelect(evt.id)}
                      className={[
                        'flex w-full flex-col gap-0.5 rounded-md px-2 py-1 text-left transition-colors',
                        active ? 'bg-surface-subtle ring-1 ring-border-brand' : 'bg-surface-subtle/50 hover:bg-surface-subtle',
                      ].join(' ')}
                    >
                      <span className="caption-small inline-flex items-center gap-1 truncate text-text-primary">
                        <span className={`size-2 flex-shrink-0 rounded-full ${cat.dot}`} aria-hidden />
                        <span className="truncate">{evt.title}</span>
                      </span>
                      <span className="caption-small text-text-secondary">
                        {formatTimeRange(evt.startAt, evt.endAt)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Agenda view ──────────────────────────────────────────────────────────────

function AgendaView({
  events,
  selectedId,
  onSelect,
  t,
}: {
  events: OwnerEvent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  // Group upcoming events by calendar day, preserving chronological order.
  const groups = useMemo(() => {
    const order: string[] = [];
    const byDay = new Map<string, OwnerEvent[]>();
    for (const e of events) {
      const d = parseDate(e.startAt);
      if (!d) continue;
      const k = dayKey(d);
      if (!byDay.has(k)) {
        byDay.set(k, []);
        order.push(k);
      }
      byDay.get(k)!.push(e);
    }
    return order.map((k) => ({ key: k, date: parseDate(byDay.get(k)![0].startAt)!, items: byDay.get(k)! }));
  }, [events]);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-surface-subtle">
          <CalendarDays className="size-6 text-text-secondary" aria-hidden />
        </span>
        <p className="body-small text-text-primary">{t('noUpcoming')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.key}>
          <h4 className="label-medium mb-2 text-text-primary">{formatLongDate(group.date.toISOString())}</h4>
          <ul className="space-y-2">
            {group.items.map((evt) => {
              const cat = categoryDef(evt);
              const active = evt.id === selectedId;
              return (
                <li key={evt.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(evt.id)}
                    className={[
                      'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                      active ? 'border-border-brand bg-surface-subtle' : 'border-border-subtle hover:bg-surface-subtle',
                    ].join(' ')}
                  >
                    <span className={`size-3 flex-shrink-0 rounded-full ${cat.dot}`} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="label-medium block truncate text-text-primary">{evt.title}</span>
                      <span className="caption-medium mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-text-secondary">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3.5" aria-hidden />
                          {formatTimeRange(evt.startAt, evt.endAt)}
                        </span>
                        <span className="inline-flex items-center gap-1 truncate">
                          <MapPin className="size-3.5 flex-shrink-0" aria-hidden />
                          <span className="truncate">{locationDisplay(evt)}</span>
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ─── Selected event card (right rail) ─────────────────────────────────────────

const STATUS_OPTIONS: ReadonlyArray<{ key: RsvpStatus; labelKey: string }> = [
  { key: 'going', labelKey: 'statusGoing' },
  { key: 'interested', labelKey: 'statusInterested' },
  { key: 'not_going', labelKey: 'statusNotGoing' },
];

function SelectedEventCard({
  event,
  community,
  profile,
  detailHref,
  status,
  onStatus,
  t,
}: {
  event: OwnerEvent | null;
  community: EmbassyViewProps['community'];
  profile: EmbassyProfile;
  detailHref: { pathname: string; query: Record<string, string> } | null;
  status: RsvpStatus | null;
  onStatus: (evt: OwnerEvent, status: RsvpStatus) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  if (!event) {
    return (
      <Card className="border-border-subtle">
        <CardContent className="flex flex-col items-center justify-center px-4 py-10 text-center">
          <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-surface-subtle">
            <CalendarDays className="size-6 text-text-secondary" aria-hidden />
          </span>
          <p className="body-small text-text-primary">{t('noSelection')}</p>
          <p className="caption-medium mt-1 text-text-secondary">{t('noSelectionHint')}</p>
        </CardContent>
      </Card>
    );
  }

  const cat = categoryDef(event);
  const isEmbassy = Boolean(community.communityType?.isEmbassy);
  const statusLabel =
    status === 'going'
      ? t('statusGoing')
      : status === 'interested'
        ? t('statusInterested')
        : status === 'not_going'
          ? t('statusNotGoing')
          : t('myStatus');

  return (
    <Card className="overflow-hidden border-border-subtle">
      {/* Cover */}
      <div className="relative h-32 w-full bg-gradient-to-br from-blue-500 to-purple-600">
        {event.coverImageUrl && (
          <Image
            src={event.coverImageUrl}
            alt={event.title}
            fill
            sizes="(max-width: 1024px) 100vw, 22rem"
            className="object-cover"
          />
        )}
      </div>
      <CardContent className="space-y-4 p-5">
        <p className="caption-small font-medium text-text-secondary">{t('selectedTitle')}</p>

        <div>
          {event.eventCategory && (
            <span className={`caption-small inline-flex rounded-full px-2 py-0.5 ${cat.chipRing} ${cat.chipFg}`}>
              {event.eventCategory}
            </span>
          )}
          <h3 className="label-large mt-2 text-text-primary">{event.title}</h3>
        </div>

        <ul className="space-y-2">
          <li className="caption-medium flex items-start gap-2 text-text-secondary">
            <CalendarDays className="mt-0.5 size-4 flex-shrink-0" aria-hidden />
            <span>{formatLongDate(event.startAt)}</span>
          </li>
          <li className="caption-medium flex items-start gap-2 text-text-secondary">
            <Clock className="mt-0.5 size-4 flex-shrink-0" aria-hidden />
            <span>
              {formatTimeRange(event.startAt, event.endAt)}
              {event.timezone ? ` (${event.timezone})` : ''}
            </span>
          </li>
          <li className="caption-medium flex items-start gap-2 text-text-secondary">
            <MapPin className="mt-0.5 size-4 flex-shrink-0" aria-hidden />
            <span>{locationDisplay(event)}</span>
          </li>
          <li className="caption-medium flex items-center gap-1 text-text-secondary">
            {t('organizedBy', { name: community.name })}
            {isEmbassy && <BadgeCheck className="size-4 flex-shrink-0 text-blue-600" aria-hidden />}
          </li>
        </ul>

        {/* View details */}
        {detailHref && (
          <Link
            href={detailHref}
            scroll={false}
            className="label-medium inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-surface-brand px-4 py-2 text-text-white transition-colors hover:opacity-90"
          >
            {t('viewEventDetails')}
          </Link>
        )}

        {/* My status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="label-medium inline-flex w-full items-center justify-between rounded-lg border border-border-subtle px-4 py-2 text-text-secondary transition-colors hover:bg-surface-subtle"
            >
              <span className="inline-flex items-center gap-1.5">
                {status === 'going' && <CheckCircle2 className="size-4 text-green-600" aria-hidden />}
                {statusLabel}
              </span>
              <ChevronDown className="size-4" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {STATUS_OPTIONS.map((opt) => (
              <DropdownMenuItem key={opt.key} onSelect={() => onStatus(event, opt.key)}>
                {t(opt.labelKey)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Add to calendar */}
        <div>
          <p className="caption-small mb-2 flex items-center gap-1.5 text-text-secondary">
            <CalendarPlus className="size-4" aria-hidden />
            {t('addToCalendar')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <CalendarButton
              icon={CalendarClock}
              label={t('calGoogle')}
              onClick={() => window.open(googleCalendarUrl(event), '_blank', 'noopener,noreferrer')}
            />
            <CalendarButton icon={CalendarDays} label={t('calApple')} onClick={() => downloadIcs(event)} />
            <CalendarButton
              icon={CalendarClock}
              label={t('calOutlook')}
              onClick={() => window.open(outlookCalendarUrl(event), '_blank', 'noopener,noreferrer')}
            />
            <CalendarButton icon={Download} label={t('calDownload')} onClick={() => downloadIcs(event)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CalendarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="caption-medium inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-subtle px-2 py-1.5 text-text-secondary transition-colors hover:bg-surface-subtle"
    >
      <Icon className="size-4 flex-shrink-0" aria-hidden />
      {label}
    </button>
  );
}

export default EmbassyEventsCalendar;
