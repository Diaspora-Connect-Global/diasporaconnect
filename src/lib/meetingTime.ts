import type { MeetingSlot } from '@/services/gql/networkingMeetings';

/**
 * Pure helpers for meeting times. The gateway already prints every slot in the
 * EVENT's wall clock (`localDate`, `localStart`, `localEnd`, `utcOffset`), so the
 * screens group and label by those fields and never redo zone arithmetic.
 */

export interface SlotDay {
  date: string;
  slots: MeetingSlot[];
}

/** Slots grouped by event-local day, days and slots in time order. */
export function groupSlotsByDay(slots: MeetingSlot[]): SlotDay[] {
  const sorted = [...slots].filter((s) => s && s.startAt).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const days: SlotDay[] = [];
  for (const slot of sorted) {
    const last = days[days.length - 1];
    if (last && last.date === slot.localDate) last.slots.push(slot);
    else days.push({ date: slot.localDate, slots: [slot] });
  }
  return days;
}

/** "14:00–14:30" in the event clock. */
export function slotRange(slot: MeetingSlot): string {
  return `${slot.localStart}–${slot.localEnd}`;
}

/** Only an https:// link is ever opened or sent. */
export function isHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'https:' && Boolean(u.hostname);
  } catch {
    return false;
  }
}

/** A short, human zone name for a UTC offset like "+01:00" → "UTC+1". */
export function offsetLabel(utcOffset: string): string {
  const m = /^([+-])(\d{2}):?(\d{2})$/.exec(utcOffset ?? '');
  if (!m) return utcOffset ?? '';
  const hours = String(Number(m[2]));
  return `UTC${m[1]}${hours}${m[3] === '00' ? '' : `:${m[3]}`}`;
}
