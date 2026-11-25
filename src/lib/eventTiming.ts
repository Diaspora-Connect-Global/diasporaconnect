/** Shared "has this event ended / been cancelled" rules, so no screen defines its own. */
type Timed = { status?: string | null; startAt?: string | null; endAt?: string | null };

const ms = (iso?: string | null) => {
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isNaN(t) ? null : t;
};

export const isEventCancelled = (e: Timed | null | undefined): boolean => String(e?.status ?? '').toLowerCase() === 'cancelled';

/** Ended: marked completed, or its end (start when there is no end) is before `now`. Unknown times are never "over". */
export function isEventOver(e: Timed | null | undefined, now: number = Date.now()): boolean {
  if (!e) return false;
  if (String(e.status ?? '').toLowerCase() === 'completed') return true;
  const end = ms(e.endAt) ?? ms(e.startAt);
  return end !== null && end < now;
}

/** Can still be acted on: not over and not cancelled. */
export const isEventOpen = (e: Timed | null | undefined, now: number = Date.now()): boolean => !!e && !isEventOver(e, now) && !isEventCancelled(e);

/** Events a person can still act on, soonest start first. Drops anything over, cancelled, or without an id. */
export function openEventsSoonestFirst<E extends Timed & { id?: string | null }>(events: readonly (E | null | undefined)[], now: number = Date.now()): E[] {
  return events
    .filter((e): e is E => !!e && !!e.id && isEventOpen(e, now))
    .sort((a, b) => (ms(a.startAt) ?? 0) - (ms(b.startAt) ?? 0));
}

/** Appends a further page to a list, skipping ids already present (a page can overlap when events shift). */
export function appendUnique<E extends { id: string }>(list: readonly E[], page: readonly (E | null | undefined)[]): E[] {
  const seen = new Set(list.map((e) => e.id));
  const out = [...list];
  for (const e of page) {
    if (e?.id && !seen.has(e.id)) {
      seen.add(e.id);
      out.push(e);
    }
  }
  return out;
}
