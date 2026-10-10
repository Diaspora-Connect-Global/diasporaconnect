import type { AvailabilitySlot } from '@/services/gql/networking';

/**
 * Availability is picked as parts of each event day, in the EVENT's time zone
 * (the event's own clock is what both people will be looking at).
 */
export type DayPart = 'morning' | 'afternoon' | 'evening';
export const DAY_PARTS: Record<DayPart, [number, number]> = {
  morning: [8, 12],
  afternoon: [12, 17],
  evening: [17, 21],
};

function partsOf(ms: number, timeZone: string) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const p: Record<string, number> = {};
  for (const x of f.formatToParts(new Date(ms))) if (x.type !== 'literal') p[x.type] = Number(x.value);
  return p;
}

/** The UTC instant at which a wall clock `day` (YYYY-MM-DD) `hour`:00 is shown in `timeZone`. */
export function zonedWallToUtc(day: string, hour: number, timeZone: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  let guess = Date.UTC(y, m - 1, d, hour, 0, 0);
  for (let i = 0; i < 2; i += 1) {
    const p = partsOf(guess, timeZone);
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    guess -= shown - Date.UTC(y, m - 1, d, hour, 0, 0);
  }
  return new Date(guess);
}

export function dayKeyIn(ms: number, timeZone: string): string {
  const p = partsOf(ms, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** The calendar days (YYYY-MM-DD, event zone) the event spans; at most `max`. */
export function eventDays(startAt: string, endAt: string | null | undefined, timeZone: string, max = 7): string[] {
  const start = new Date(startAt).getTime();
  const end = endAt ? new Date(endAt).getTime() : start;
  if (!Number.isFinite(start)) return [];
  const days: string[] = [];
  let cursor = start;
  const last = dayKeyIn(Number.isFinite(end) ? end : start, timeZone);
  for (let i = 0; i < max + 1; i += 1) {
    const k = dayKeyIn(cursor, timeZone);
    if (!days.includes(k)) days.push(k);
    if (k >= last || days.length >= max) break;
    cursor += 24 * 3600 * 1000;
  }
  return days;
}

export const slotKey = (day: string, part: DayPart) => `${day}|${part}`;

export function slotFor(day: string, part: DayPart, timeZone: string): AvailabilitySlot {
  const [a, b] = DAY_PARTS[part];
  return { startAt: zonedWallToUtc(day, a, timeZone).toISOString(), endAt: zonedWallToUtc(day, b, timeZone).toISOString() };
}

/** Which day-part cells the saved slots correspond to (slots that match none are ignored). */
export function selectedFromSlots(slots: AvailabilitySlot[], days: string[], timeZone: string): Set<string> {
  const out = new Set<string>();
  for (const day of days) {
    for (const part of Object.keys(DAY_PARTS) as DayPart[]) {
      const want = slotFor(day, part, timeZone);
      if (slots.some((s) => new Date(s.startAt).getTime() === new Date(want.startAt).getTime() && new Date(s.endAt).getTime() === new Date(want.endAt).getTime())) {
        out.add(slotKey(day, part));
      }
    }
  }
  return out;
}

export function slotsFromSelected(selected: Set<string>, timeZone: string): AvailabilitySlot[] {
  return Array.from(selected)
    .sort()
    .map((k) => {
      const [day, part] = k.split('|') as [string, DayPart];
      return slotFor(day, part, timeZone);
    });
}
