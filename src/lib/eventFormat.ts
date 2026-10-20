export type EventFormat = 'physical' | 'virtual' | 'hybrid';

const FORMATS: readonly string[] = ['physical', 'virtual', 'hybrid'];

/**
 * The event's format as the UI keys it. The server can answer in either case
 * (`PHYSICAL` as well as `physical`), while translation keys and comparisons
 * are lowercase — reading the raw value threw MISSING_MESSAGE for
 * `eventPage.format.PHYSICAL` and made a `HYBRID` event never match
 * `=== 'hybrid'`. Unknown or missing → null, so callers can hide the line
 * instead of asking for a key that does not exist.
 */
export function eventFormat(value: string | null | undefined): EventFormat | null {
  const v = (value ?? '').trim().toLowerCase();
  return FORMATS.includes(v) ? (v as EventFormat) : null;
}
