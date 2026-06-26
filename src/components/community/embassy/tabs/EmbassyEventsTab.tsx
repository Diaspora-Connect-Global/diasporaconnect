'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useQuery } from '@apollo/client/react';
import {
  Search,
  CalendarDays,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Users,
  GraduationCap,
  Video,
  Tag,
  ArrowUpDown,
  Loader2,
  Maximize2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { GET_EVENTS_BY_OWNER, type EventLocation } from '@/services/gql/events';
import type { EmbassyViewProps } from '../types';
import { getEmbassyProfile } from '../embassyMock';
import { EmbassyEventDetail } from './EmbassyEventDetail';
import { EmbassyEventsCalendar } from './EmbassyEventsCalendar';

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
}

interface GetEventsByOwnerResponse {
  getEventsByOwner: { total: number; events: OwnerEvent[] };
}

type SubTab = 'upcoming' | 'past' | 'registrations';

// ─── Date helpers (native Date — no date-fns) ───────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function parseDate(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateParts(iso: string): { month: string; day: string } {
  const d = parseDate(iso);
  if (!d) return { month: '', day: '' };
  return {
    month: d.toLocaleString(undefined, { month: 'short' }).toUpperCase(),
    day: d.toLocaleString(undefined, { day: '2-digit' }),
  };
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
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  const endStr = end.toLocaleString(undefined, {
    ...(sameDay
      ? {}
      : { weekday: 'short', day: '2-digit', month: 'short' }),
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${startStr} – ${endStr}`;
}

function locationDisplay(evt: OwnerEvent): string {
  const loc = evt.locationDetails;
  if (loc) {
    if (loc.type === 'virtual' || evt.locationType === 'virtual') {
      return loc.platform || loc.virtualLink || 'Online';
    }
    const parts = [loc.venueName, loc.city, loc.country].filter(Boolean);
    if (parts.length) return parts.join(', ');
  }
  if (evt.locationType === 'virtual') return 'Online';
  if (evt.locationType === 'hybrid') return 'Hybrid';
  return 'Location to be announced';
}

interface Badge {
  label: string;
  ring: string;
  fg: string;
}
function statusBadge(evt: OwnerEvent): Badge {
  const isVirtual = evt.locationType === 'virtual' || evt.locationDetails?.type === 'virtual';
  if (isVirtual) {
    return { label: 'Online', ring: 'bg-green-50', fg: 'text-green-600' };
  }
  return { label: 'Public', ring: 'bg-blue-50', fg: 'text-blue-600' };
}

// ─── Categories config ──────────────────────────────────────────────────────

interface CategoryRow {
  key: string;
  label: string;
  icon: typeof Sparkles;
  ring: string;
  fg: string;
  mockCount: number;
  /** keywords matched against event.eventCategory */
  match: string[];
}
const CATEGORY_ROWS: CategoryRow[] = [
  { key: 'cultural', label: 'Cultural', icon: Sparkles, ring: 'bg-purple-50', fg: 'text-purple-600', mockCount: 7, match: ['cultural', 'culture'] },
  { key: 'community', label: 'Community', icon: Users, ring: 'bg-blue-50', fg: 'text-blue-600', mockCount: 6, match: ['community'] },
  { key: 'educational', label: 'Educational', icon: GraduationCap, ring: 'bg-orange-50', fg: 'text-orange-600', mockCount: 5, match: ['educational', 'education'] },
  { key: 'webinars', label: 'Webinars', icon: Video, ring: 'bg-teal-50', fg: 'text-teal-600', mockCount: 4, match: ['webinar', 'webinars', 'online'] },
  { key: 'others', label: 'Others', icon: Tag, ring: 'bg-rose-50', fg: 'text-rose-500', mockCount: 2, match: [] },
];

/** Resolve an event to one of the CATEGORY_ROWS keys ('others' if no match). */
function eventCategoryKey(evt: OwnerEvent): string {
  const cat = (evt.eventCategory ?? '').toLowerCase();
  const hit = CATEGORY_ROWS.find(
    (r) => r.match.length > 0 && r.match.some((m) => cat.includes(m)),
  );
  return hit ? hit.key : 'others';
}

// ─── Calendar ────────────────────────────────────────────────────────────────

/** Month/year of the nearest upcoming event, falling back to today. */
function initialCalendarView(events: OwnerEvent[]): { year: number; month: number } {
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

function EventCalendar({
  events,
  calendarHref,
}: {
  events: OwnerEvent[];
  calendarHref: { pathname: string; query: Record<string, string> };
}) {
  const today = new Date();
  const [view, setView] = useState(() => initialCalendarView(events));
  // Once events load (the calendar may mount empty), snap to the nearest
  // upcoming event's month unless the user has already navigated.
  const [userNavigated, setUserNavigated] = useState(false);
  useEffect(() => {
    if (userNavigated || events.length === 0) return;
    setView(initialCalendarView(events));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length]);

  const eventDayKeys = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      const d = parseDate(e.startAt);
      if (d) set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
    return set;
  }, [events]);

  // Build a 6-week grid (Monday-first).
  const firstOfMonth = new Date(view.year, view.month, 1);
  const jsDay = firstOfMonth.getDay(); // 0 = Sun
  const leadingBlanks = (jsDay + 6) % 7; // Monday-first offset
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < leadingBlanks; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const shift = (delta: number) => {
    setUserNavigated(true);
    setView((v) => {
      const m = v.month + delta;
      return {
        year: v.year + Math.floor(m / 12),
        month: ((m % 12) + 12) % 12,
      };
    });
  };

  const isToday = (day: number) =>
    today.getFullYear() === view.year &&
    today.getMonth() === view.month &&
    today.getDate() === day;

  const hasEvent = (day: number) =>
    eventDayKeys.has(`${view.year}-${view.month}-${day}`);

  return (
    <Card className="border-border-subtle">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="label-large text-text-primary">Event Calendar</h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shift(-1)}
              aria-label="Previous month"
              className="flex size-7 items-center justify-center rounded-md text-text-secondary hover:bg-surface-subtle"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <span className="caption-large min-w-[7.5rem] text-center text-text-primary">
              {MONTH_NAMES[view.month]} {view.year}
            </span>
            <button
              type="button"
              onClick={() => shift(1)}
              aria-label="Next month"
              className="flex size-7 items-center justify-center rounded-md text-text-secondary hover:bg-surface-subtle"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAY_LABELS.map((w) => (
            <span key={w} className="caption-small py-1 text-text-secondary">
              {w}
            </span>
          ))}
          {cells.map((day, idx) => {
            if (day === null) return <span key={`b-${idx}`} className="py-1" />;
            const todayCell = isToday(day);
            const eventCell = hasEvent(day);
            return (
              <span
                key={`d-${day}`}
                className={[
                  'caption-medium relative flex h-8 items-center justify-center rounded-md',
                  todayCell
                    ? 'bg-blue-600 font-semibold text-white'
                    : eventCell
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-text-primary',
                ].join(' ')}
              >
                {day}
                {eventCell && !todayCell && (
                  <span className="absolute bottom-1 size-1 rounded-full bg-blue-500" />
                )}
              </span>
            );
          })}
        </div>

        <Link
          href={calendarHref}
          scroll={false}
          className="label-medium mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border-subtle py-2 text-text-brand transition-colors hover:bg-surface-subtle"
        >
          <Maximize2 className="size-4" aria-hidden />
          View Full Calendar
        </Link>
      </CardContent>
    </Card>
  );
}

// ─── Event row ───────────────────────────────────────────────────────────────

function EventRow({
  evt,
  detailHref,
}: {
  evt: OwnerEvent;
  detailHref: { pathname: string; query: Record<string, string> };
}) {
  const { month, day } = dateParts(evt.startAt);
  const badge = statusBadge(evt);
  const going = typeof evt.registrationCount === 'number' ? evt.registrationCount : 0;

  return (
    <Card className="border-border-subtle">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
        {/* Thumbnail */}
        <div className="relative h-28 w-full flex-shrink-0 overflow-hidden rounded-lg bg-surface-subtle sm:h-24 sm:w-24">
          {evt.coverImageUrl ? (
            <Image
              src={evt.coverImageUrl}
              alt={evt.title}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center">
              <span className="caption-small text-text-danger">{month}</span>
              <span className="heading-xsmall text-text-primary">{day}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="label-large truncate text-text-primary">{evt.title}</p>
              <p className="caption-medium mt-1 flex items-center gap-1.5 text-text-secondary">
                <CalendarDays className="size-4 flex-shrink-0" aria-hidden />
                <span className="truncate">{formatDateTimeRange(evt.startAt, evt.endAt)}</span>
              </p>
              <p className="caption-medium mt-1 flex items-center gap-1.5 text-text-secondary">
                <MapPin className="size-4 flex-shrink-0" aria-hidden />
                <span className="truncate">{locationDisplay(evt)}</span>
              </p>
            </div>
            <span className={`caption-small flex-shrink-0 rounded-full px-2 py-0.5 ${badge.ring} ${badge.fg}`}>
              {badge.label}
            </span>
          </div>

          {evt.description && (
            <p className="caption-medium mt-2 line-clamp-2 text-text-secondary">
              {evt.description}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-6 rounded-full border-2 border-surface-default bg-surface-subtle"
                  />
                ))}
              </div>
              <span className="caption-small text-text-secondary">{going} going</span>
            </div>
            <Link
              href={detailHref}
              scroll={false}
              className="label-medium rounded-lg bg-blue-600 px-4 py-1.5 text-white transition-colors hover:bg-blue-700"
            >
              View Details
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function EmbassyEventsTab({ props }: { props: EmbassyViewProps }) {
  const { community } = props;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedEventId = searchParams.get('event');
  const calendarOpen = searchParams.get('calendar') === '1';
  const profile = getEmbassyProfile(community.id, props.variant, community);

  /** `?tab=events&event=<id>` link for an event card's "View Details". */
  function eventHref(id: string): { pathname: string; query: Record<string, string> } {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'events');
    params.set('event', id);
    const query: Record<string, string> = {};
    params.forEach((value, name) => {
      query[name] = value;
    });
    return { pathname, query };
  }

  /** `?tab=events&calendar=1` link for the full calendar sub-view. */
  function calendarHref(): { pathname: string; query: Record<string, string> } {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'events');
    params.set('calendar', '1');
    params.delete('event');
    const query: Record<string, string> = {};
    params.forEach((value, name) => {
      query[name] = value;
    });
    return { pathname, query };
  }

  const [activeTab, setActiveTab] = useState<SubTab>('upcoming');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(20);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'soonest' | 'latest'>('soonest');
  const [showAllCategories, setShowAllCategories] = useState(false);

  const { data, loading } = useQuery<GetEventsByOwnerResponse>(GET_EVENTS_BY_OWNER, {
    variables: { ownerId: community.id, ownerType: 'community', limit, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });

  const total = data?.getEventsByOwner?.total ?? 0;
  const allEvents = data?.getEventsByOwner?.events ?? [];
  // Prefer published events (cancelled always hidden). If the community has no
  // published events yet, fall back to showing the rest (drafts included) so the
  // list isn't empty — registration stays gated on the detail view for drafts.
  // Case-insensitive since the backend returns uppercase status.
  const visibleEvents = useMemo(() => {
    const up = (s: string) => String(s).toUpperCase();
    const nonCancelled = allEvents.filter((e) => up(e.status) !== 'CANCELLED');
    const published = nonCancelled.filter((e) => up(e.status) !== 'DRAFT');
    return published.length > 0 ? published : nonCancelled;
  }, [allEvents]);
  // "View More" stays keyed off the raw fetched page vs server total.
  const hasMore = allEvents.length < total;
  const loadingMore = loading && allEvents.length > 0;

  const now = Date.now();
  const upcoming = useMemo(
    () => visibleEvents.filter((e) => (parseDate(e.startAt)?.getTime() ?? 0) >= now),
    [visibleEvents, now],
  );
  const past = useMemo(
    () => visibleEvents.filter((e) => (parseDate(e.startAt)?.getTime() ?? 0) < now),
    [visibleEvents, now],
  );

  // Category counts derived solely from this community's real events (0 when empty).
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of CATEGORY_ROWS) counts[row.key] = 0;
    for (const e of visibleEvents) {
      const key = eventCategoryKey(e);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [visibleEvents]);

  // Visible list = active sub-tab filtered by search + category, then sorted.
  const visible = useMemo(() => {
    const base = activeTab === 'upcoming' ? upcoming : activeTab === 'past' ? past : [];
    const q = search.trim().toLowerCase();
    let result = q
      ? base.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            (e.description ?? '').toLowerCase().includes(q),
        )
      : base.slice();

    if (selectedCategory) {
      result = result.filter((e) => eventCategoryKey(e) === selectedCategory);
    }

    result.sort((a, b) => {
      const ta = parseDate(a.startAt)?.getTime() ?? 0;
      const tb = parseDate(b.startAt)?.getTime() ?? 0;
      return sortOrder === 'soonest' ? ta - tb : tb - ta;
    });

    return result;
  }, [activeTab, upcoming, past, search, selectedCategory, sortOrder]);

  const subTabs: { key: SubTab; label: string }[] = [
    { key: 'upcoming', label: 'Upcoming Events' },
    { key: 'past', label: 'Past Events' },
    { key: 'registrations', label: 'My Registrations' },
  ];

  // Detail view — when `?event=<id>` is present, replace the grid entirely
  // (mirrors EmbassyServicesTab's `?service=<id>` early-return).
  if (selectedEventId) {
    return (
      <EmbassyEventDetail eventId={selectedEventId} community={community} profile={profile} />
    );
  }

  // Full calendar sub-view — `?tab=events&calendar=1` (no `?event=`). The event
  // detail early-return above takes precedence.
  if (calendarOpen) {
    return <EmbassyEventsCalendar community={community} profile={profile} />;
  }

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 lg:px-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
        {/* Main column */}
        <div className="min-w-0">
          <Card className="border-border-subtle">
            <CardContent className="p-5">
              {/* Header */}
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="heading-xsmall text-text-primary">Events</h2>
                  <p className="body-small text-text-secondary">
                    Stay connected and participate in upcoming events.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 lg:w-56">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search events..."
                      className="w-full rounded-lg border border-border-subtle bg-surface-default py-2 pl-9 pr-3 body-small text-text-primary outline-none focus:border-border-brand"
                    />
                  </div>
                </div>
              </div>

              {/* Sub-tab pills */}
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {subTabs.map((tab) => {
                    const active = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={[
                          'label-medium rounded-full px-4 py-1.5 transition-colors',
                          active
                            ? 'bg-blue-600 text-white'
                            : 'border border-border-subtle text-text-secondary hover:bg-surface-subtle',
                        ].join(' ')}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="label-medium inline-flex items-center gap-1 rounded-lg border border-border-subtle px-3 py-1.5 text-text-secondary hover:bg-surface-subtle"
                    >
                      <ArrowUpDown className="size-4" aria-hidden />
                      {sortOrder === 'soonest' ? 'Soonest first' : 'Latest first'}
                      <ChevronDown className="size-4" aria-hidden />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setSortOrder('soonest')}>
                      Soonest first
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setSortOrder('latest')}>
                      Latest first
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Event list */}
              {activeTab === 'registrations' ? (
                <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                  <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-surface-subtle">
                    <CalendarDays className="size-6 text-text-secondary" aria-hidden />
                  </span>
                  <p className="body-small text-text-primary">No registrations yet.</p>
                  <p className="caption-medium mt-1 text-text-secondary">
                    Events you register for will appear here.
                  </p>
                </div>
              ) : loading && allEvents.length === 0 ? (
                <p className="body-small py-8 text-center text-text-secondary">Loading events…</p>
              ) : visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                  <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-surface-subtle">
                    {search ? (
                      <Search className="size-6 text-text-secondary" aria-hidden />
                    ) : (
                      <CalendarDays className="size-6 text-text-secondary" aria-hidden />
                    )}
                  </span>
                  <p className="body-small text-text-primary">
                    {search
                      ? 'No events match your search.'
                      : activeTab === 'upcoming'
                        ? 'No upcoming events.'
                        : 'No past events.'}
                  </p>
                  {!search && (
                    <p className="caption-medium mt-1 text-text-secondary">
                      {activeTab === 'upcoming'
                        ? 'Check back soon for new events.'
                        : 'There are no past events to show.'}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {visible.map((evt) => (
                    <EventRow key={evt.id} evt={evt} detailHref={eventHref(evt.id)} />
                  ))}
                </div>
              )}

              {/* View more */}
              {activeTab !== 'registrations' && hasMore && (
                <button
                  type="button"
                  onClick={() => setLimit((l) => l + 20)}
                  disabled={loadingMore}
                  className="label-medium mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border-subtle py-2.5 text-text-brand transition-colors hover:bg-surface-subtle disabled:opacity-60"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Loading…
                    </>
                  ) : (
                    'View More Events'
                  )}
                </button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right rail */}
        <aside className="space-y-6">
          <EventCalendar events={visibleEvents} calendarHref={calendarHref()} />

          {/* Categories */}
          <Card className="border-border-subtle">
            <CardContent className="p-5">
              <h3 className="label-large mb-3 text-text-primary">Event Categories</h3>
              <ul className="space-y-1">
                <li>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    aria-pressed={selectedCategory === null}
                    className={[
                      'flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors',
                      selectedCategory === null ? 'bg-surface-subtle' : 'hover:bg-surface-subtle',
                    ].join(' ')}
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex size-8 flex-shrink-0 items-center justify-center rounded-md bg-surface-subtle">
                        <CalendarDays className="size-4 text-text-brand" aria-hidden />
                      </span>
                      <span className="caption-large text-text-primary">All Events</span>
                    </span>
                    <span className="caption-small rounded-md bg-surface-subtle px-1.5 py-0.5 text-text-secondary">
                      {visibleEvents.length}
                    </span>
                  </button>
                </li>
                {(showAllCategories ? CATEGORY_ROWS : CATEGORY_ROWS.slice(0, 3)).map((row) => {
                  const count = categoryCounts[row.key] ?? 0;
                  const Icon = row.icon;
                  const active = selectedCategory === row.key;
                  return (
                    <li key={row.key}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCategory((prev) => (prev === row.key ? null : row.key))
                        }
                        aria-pressed={active}
                        className={[
                          'flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors',
                          active ? 'bg-surface-subtle ring-1 ring-border-brand' : 'hover:bg-surface-subtle',
                        ].join(' ')}
                      >
                        <span className="flex items-center gap-3">
                          <span className={`flex size-8 flex-shrink-0 items-center justify-center rounded-md ${row.ring}`}>
                            <Icon className={`size-4 ${row.fg}`} aria-hidden />
                          </span>
                          <span className="caption-large text-text-primary">{row.label}</span>
                        </span>
                        <span className="caption-small rounded-md bg-surface-subtle px-1.5 py-0.5 text-text-secondary">
                          {count}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {CATEGORY_ROWS.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllCategories((s) => !s)}
                  className="label-medium mt-3 inline-flex items-center gap-1 text-text-brand"
                >
                  {showAllCategories ? 'Show Less' : 'View All Categories'}
                  <ChevronRight
                    className={[
                      'size-4 transition-transform',
                      showAllCategories ? 'rotate-90' : '',
                    ].join(' ')}
                    aria-hidden
                  />
                </button>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export default EmbassyEventsTab;
