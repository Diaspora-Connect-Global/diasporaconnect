/**
 * Wall-clock <-> instant conversion in a named IANA zone, for `datetime-local`
 * inputs: an organiser types "18:00" meaning 18:00 in the EVENT's timezone, not
 * their browser's.
 */

function offsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const hour = Number(v.hour) === 24 ? 0 : Number(v.hour);
  return Date.UTC(Number(v.year), Number(v.month) - 1, Number(v.day), hour, Number(v.minute), Number(v.second)) - date.getTime();
}

/** `2026-10-31T18:00` typed in `timeZone` -> ISO instant. '' for unusable input. */
export function localInputToIso(local: string, timeZone?: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) return '';
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const guess = new Date(Date.UTC(y, mo - 1, d, h, mi, 0));
  let zone = timeZone || undefined;
  try {
    if (zone) new Intl.DateTimeFormat('en', { timeZone: zone });
  } catch {
    zone = undefined;
  }
  if (!zone) return new Date(y, mo - 1, d, h, mi, 0).toISOString();
  const first = new Date(guess.getTime() - offsetMs(guess, zone));
  return new Date(guess.getTime() - offsetMs(first, zone)).toISOString();
}

/** ISO instant -> `YYYY-MM-DDTHH:mm` as it reads in `timeZone` (for a `datetime-local` value). */
export function isoToLocalInput(iso: string, timeZone?: string | null): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  let zone = timeZone || undefined;
  try {
    if (zone) new Intl.DateTimeFormat('en', { timeZone: zone });
  } catch {
    zone = undefined;
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const hour = v.hour === '24' ? '00' : v.hour;
  return `${v.year}-${v.month}-${v.day}T${hour}:${v.minute}`;
}
