/**
 * Calendar + timezone helpers shared by the event page, its Register / My event
 * tab and the ticket page. Pure functions: nothing here reads the DOM except
 * `downloadIcs`.
 */

export interface CalendarEvent {
  /** Stable per-event key used for the .ics UID. Never shown to anyone. */
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startIso: string;
  endIso?: string | null;
  /** Public event page URL, added to the description. */
  url?: string | null;
}

/** `20261031T180000Z`. Returns '' for an unparsable date. */
export function toCalendarUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function endOrDefault(ev: CalendarEvent): string {
  if (ev.endIso && !Number.isNaN(new Date(ev.endIso).getTime())) return ev.endIso;
  // No end: assume one hour so calendars do not render a zero-length entry.
  return new Date(new Date(ev.startIso).getTime() + 3600_000).toISOString();
}

function describe(ev: CalendarEvent): string {
  return [ev.description?.trim(), ev.url].filter(Boolean).join('\n\n');
}

/** A "create event" link for Google Calendar. */
export function buildGoogleCalendarUrl(ev: CalendarEvent): string {
  const start = toCalendarUtc(ev.startIso);
  const end = toCalendarUtc(endOrDefault(ev));
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${start}/${end}`,
  });
  const details = describe(ev);
  if (details) params.set('details', details.slice(0, 1500));
  if (ev.location) params.set('location', ev.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;');
}

/** RFC 5545 line folding at 75 octets (characters are close enough for these fields). */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) parts.push(' ' + line.slice(i, i + 74));
  return parts.join('\r\n');
}

/** An RFC 5545 calendar with one event. */
export function buildIcs(ev: CalendarEvent, now: Date = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DiaspoPlug//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ev.uid}@diaspoplug`,
    `DTSTAMP:${toCalendarUtc(now.toISOString())}`,
    `DTSTART:${toCalendarUtc(ev.startIso)}`,
    `DTEND:${toCalendarUtc(endOrDefault(ev))}`,
    `SUMMARY:${icsEscape(ev.title)}`,
  ];
  const details = describe(ev);
  if (details) lines.push(`DESCRIPTION:${icsEscape(details)}`);
  if (ev.location) lines.push(`LOCATION:${icsEscape(ev.location)}`);
  if (ev.url) lines.push(`URL:${ev.url}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function icsFileName(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60);
  return `${slug || 'event'}.ics`;
}

/** Save the .ics through a temporary object URL. Browser only. */
export function downloadIcs(ev: CalendarEvent): void {
  const blob = new Blob([buildIcs(ev)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = icsFileName(ev.title);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeZone(timeZone?: string | null): string | undefined {
  if (!timeZone) return undefined;
  try {
    new Intl.DateTimeFormat('en', { timeZone });
    return timeZone;
  } catch {
    return undefined;
  }
}

/** "Sat, 31 Oct 2026, 18:00" in the event's own timezone (falls back to the viewer's). */
export function formatInZone(iso: string, locale: string, timeZone?: string | null): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: safeZone(timeZone),
  }).format(new Date(iso));
}

/** Time only, in the event's timezone. */
export function formatTimeInZone(iso: string, locale: string, timeZone?: string | null): string {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: safeZone(timeZone) }).format(
    new Date(iso),
  );
}

/** Calendar day key (YYYY-MM-DD) in a timezone — used to group programme sessions by day. */
export function dayKeyInZone(iso: string, timeZone?: string | null): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: safeZone(timeZone),
  }).format(new Date(iso));
}

export function formatDayHeading(iso: string, locale: string, timeZone?: string | null): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: safeZone(timeZone),
  }).format(new Date(iso));
}

/** Short zone name at that instant, e.g. "GMT+1" / "UTC". Empty when the zone is unknown. */
export function timezoneLabel(iso: string, locale: string, timeZone?: string | null): string {
  const zone = safeZone(timeZone);
  if (!zone) return '';
  const part = new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: 'short' })
    .formatToParts(new Date(iso))
    .find((p) => p.type === 'timeZoneName');
  return part?.value ?? '';
}

/** True when the viewer's browser zone differs from the event's (worth saying so). */
export function zoneDiffersFromViewer(timeZone?: string | null, at: Date = new Date()): boolean {
  const zone = safeZone(timeZone);
  if (!zone || typeof Intl === 'undefined') return false;
  const viewer = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (viewer === zone) return false;
  const offset = (z: string) =>
    new Intl.DateTimeFormat('en', { timeZone: z, timeZoneName: 'longOffset' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value;
  return offset(viewer) !== offset(zone);
}
