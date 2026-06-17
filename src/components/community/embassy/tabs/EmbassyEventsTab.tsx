'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useQuery } from '@apollo/client/react';
import {
  Search,
  CalendarDays,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Bell,
  Sparkles,
  Users,
  GraduationCap,
  Video,
  Tag,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { GET_EVENTS_BY_OWNER, type EventLocation } from '@/services/gql/events';
import type { EmbassyViewProps } from '../types';

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

// ─── Calendar ────────────────────────────────────────────────────────────────

function EventCalendar({ events }: { events: OwnerEvent[] }) {
  const today = new Date();
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });

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

        <button
          type="button"
          className="label-medium mt-4 w-full rounded-lg border border-border-subtle py-2 text-text-brand transition-colors hover:bg-surface-subtle"
        >
          View Full Calendar
        </button>
      </CardContent>
    </Card>
  );
}

// ─── Event row ───────────────────────────────────────────────────────────────

function EventRow({ evt }: { evt: OwnerEvent }) {
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
            <button
              type="button"
              className="label-medium rounded-lg bg-blue-600 px-4 py-1.5 text-white transition-colors hover:bg-blue-700"
            >
              View Details
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function EmbassyEventsTab({ props }: { props: EmbassyViewProps }) {
  const { community } = props;
  const [activeTab, setActiveTab] = useState<SubTab>('upcoming');
  const [search, setSearch] = useState('');

  const { data, loading } = useQuery<GetEventsByOwnerResponse>(GET_EVENTS_BY_OWNER, {
    variables: { ownerId: community.id, ownerType: 'community', limit: 20, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });

  const allEvents = data?.getEventsByOwner?.events ?? [];

  const now = Date.now();
  const upcoming = useMemo(
    () => allEvents.filter((e) => (parseDate(e.startAt)?.getTime() ?? 0) >= now),
    [allEvents, now],
  );
  const past = useMemo(
    () => allEvents.filter((e) => (parseDate(e.startAt)?.getTime() ?? 0) < now),
    [allEvents, now],
  );

  // Category counts derived from real events; fall back to mock for empties.
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of CATEGORY_ROWS) counts[row.key] = 0;
    let matchedOthers = 0;
    for (const e of allEvents) {
      const cat = (e.eventCategory ?? '').toLowerCase();
      const hit = CATEGORY_ROWS.find(
        (r) => r.match.length > 0 && r.match.some((m) => cat.includes(m)),
      );
      if (hit) counts[hit.key] += 1;
      else matchedOthers += 1;
    }
    counts.others = matchedOthers;
    return counts;
  }, [allEvents]);

  // Visible list = active sub-tab filtered by search.
  const visible = useMemo(() => {
    const base = activeTab === 'upcoming' ? upcoming : activeTab === 'past' ? past : [];
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q),
    );
  }, [activeTab, upcoming, past, search]);

  const subTabs: { key: SubTab; label: string }[] = [
    { key: 'upcoming', label: 'Upcoming Events' },
    { key: 'past', label: 'Past Events' },
    { key: 'registrations', label: 'My Registrations' },
  ];

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
                <button
                  type="button"
                  className="label-medium inline-flex items-center gap-1 rounded-lg border border-border-subtle px-3 py-1.5 text-text-secondary hover:bg-surface-subtle"
                >
                  All Events
                  <ChevronDown className="size-4" aria-hidden />
                </button>
              </div>

              {/* Event list */}
              {activeTab === 'registrations' ? (
                <p className="body-small py-8 text-center text-text-secondary">
                  No registrations yet.
                </p>
              ) : loading && allEvents.length === 0 ? (
                <p className="body-small py-8 text-center text-text-secondary">Loading events…</p>
              ) : visible.length === 0 ? (
                <p className="body-small py-8 text-center text-text-secondary">
                  {search
                    ? 'No events match your search.'
                    : activeTab === 'upcoming'
                      ? 'No upcoming events.'
                      : 'No past events.'}
                </p>
              ) : (
                <div className="space-y-4">
                  {visible.map((evt) => (
                    <EventRow key={evt.id} evt={evt} />
                  ))}
                </div>
              )}

              {/* View more */}
              {visible.length > 0 && (
                <button
                  type="button"
                  className="label-medium mt-5 w-full rounded-lg border border-border-subtle py-2.5 text-text-brand transition-colors hover:bg-surface-subtle"
                >
                  View More Events
                </button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right rail */}
        <aside className="space-y-6">
          <EventCalendar events={allEvents} />

          {/* Categories */}
          <Card className="border-border-subtle">
            <CardContent className="p-5">
              <h3 className="label-large mb-3 text-text-primary">Event Categories</h3>
              <ul className="space-y-1">
                <li>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-surface-subtle"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex size-8 flex-shrink-0 items-center justify-center rounded-md bg-surface-subtle">
                        <CalendarDays className="size-4 text-text-brand" aria-hidden />
                      </span>
                      <span className="caption-large text-text-primary">All Events</span>
                    </span>
                    <span className="caption-small rounded-md bg-surface-subtle px-1.5 py-0.5 text-text-secondary">
                      {allEvents.length}
                    </span>
                  </button>
                </li>
                {CATEGORY_ROWS.map((row) => {
                  const real = categoryCounts[row.key] ?? 0;
                  const count = real > 0 ? real : row.mockCount;
                  const Icon = row.icon;
                  return (
                    <li key={row.key}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-surface-subtle"
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
              <button
                type="button"
                className="label-medium mt-3 inline-flex items-center gap-1 text-text-brand"
              >
                View All Categories
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Notifications banner */}
      <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-xl border border-border-subtle bg-surface-brand-subtle p-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <Bell className="size-5 flex-shrink-0 text-text-brand" aria-hidden />
          <div>
            <p className="label-medium text-text-primary">Never miss an event</p>
            <p className="caption-medium text-text-secondary">
              Enable notifications to get updates about new events and changes.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="label-medium flex-shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          Enable Notifications
        </button>
      </div>
    </div>
  );
}

export default EmbassyEventsTab;
