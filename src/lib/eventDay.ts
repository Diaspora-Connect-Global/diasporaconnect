/**
 * Pure helpers for the event-day card (M7). No React, no browser APIs: the window
 * logic, the countdown text and the map links are unit-testable on their own.
 *
 * Rules mirrored from the plan (README §3, state-machines.md): arrival and
 * location pins exist only for a CONFIRMED in-person meeting, from 30 minutes
 * before it starts to 15 minutes after it ends. The server enforces the same
 * window; this only decides when to SHOW the card and ask.
 */

export const EVENT_DAY_LEAD_MS = 30 * 60_000;
export const EVENT_DAY_TAIL_MS = 15 * 60_000;
/** How long one location share lasts (the server's pin TTL). */
export const SHARE_MINUTES = 15;

export type EventDayPhase = 'before' | 'open' | 'after' | 'unknown';

export interface EventDaySlotLike {
  startAt: string;
  endAt: string;
}

/** Where `nowMs` falls relative to the event-day window of a meeting slot. */
export function eventDayPhase(slot: EventDaySlotLike | null | undefined, nowMs: number): EventDayPhase {
  if (!slot) return 'unknown';
  const start = Date.parse(slot.startAt);
  const end = Date.parse(slot.endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(nowMs)) return 'unknown';
  if (nowMs < start - EVENT_DAY_LEAD_MS) return 'before';
  if (nowMs > end + EVENT_DAY_TAIL_MS) return 'after';
  return 'open';
}

export interface EventDayMeetingLike {
  status: string;
  format?: string | null;
  slot?: EventDaySlotLike | null;
}

/** The card is for a CONFIRMED meeting inside its window. Online meetings get the join link only. */
export function showsEventDayCard(meeting: EventDayMeetingLike, nowMs: number): boolean {
  return meeting.status === 'CONFIRMED' && eventDayPhase(meeting.slot, nowMs) === 'open';
}

/** Arrival and location apply to in-person meetings only. */
export function allowsArrivalAndLocation(meeting: EventDayMeetingLike): boolean {
  return meeting.format === 'IN_PERSON';
}

/** Milliseconds left until `iso`, never negative; 0 for a missing or invalid instant. */
export function remainingMs(iso: string | null | undefined, nowMs: number): number {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, t - nowMs);
}

/** "14:05" style countdown; whole seconds, rounded up so it never shows 0:00 while time is left. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Whole minutes left, rounded up (for the polite screen-reader announcement). */
export function wholeMinutesLeft(ms: number): number {
  return Math.max(0, Math.ceil(ms / 60_000));
}

export function validCoordinates(latitude: unknown, longitude: unknown): boolean {
  return (
    typeof latitude === 'number' && typeof longitude === 'number' &&
    Number.isFinite(latitude) && Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
  );
}

/** A map link to one point. Null for anything that is not a valid coordinate pair. */
export function mapsPointUrl(latitude: number, longitude: number): string | null {
  if (!validCoordinates(latitude, longitude)) return null;
  return `https://www.google.com/maps/search/?api=1&query=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}

/**
 * A map link for a real street address supplied by the organiser. Null when there is none.
 * A spot inside the venue ("Hall A", "Stand 4") is not an address: searching a map for it
 * sends people across town. An address has a comma (street, city) or a number, and some length.
 */
export function mapsAddressUrl(address: string | null | undefined): string | null {
  const a = (address ?? '').trim();
  if (a.length < 8 || !(/,/.test(a) || /\d/.test(a))) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
}
