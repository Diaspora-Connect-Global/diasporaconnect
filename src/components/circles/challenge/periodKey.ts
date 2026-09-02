import type { CircleChallengeCadence } from '@/services/gql/types/circles';

/**
 * @fileoverview Derive a challenge entry's `periodKey` from the challenge cadence.
 * @module components/circles/challenge/periodKey
 *
 * A recurring challenge has no scheduler minting a row per period in advance —
 * the period is a STRING the client derives at submit time, and the server uses
 * it to enforce `maxEntriesPerPeriod`. Getting the shape wrong therefore does
 * not error: it quietly puts this week's entry in its own private bucket where
 * the per-period cap can never see it.
 *
 * Shapes, matching the wire contract documented on `SubmitCircleChallengeEntryInput`:
 *   DAILY    "2026-03-14"   calendar date
 *   WEEKLY   "2026-W09"     ISO-8601 week, zero-padded
 *   MONTHLY  "2026-03"      calendar month (the ISO-consistent extension of the
 *                           three shapes the contract spells out)
 *   ONE_OFF  "ONE_OFF"      also the fallback for an absent or unknown cadence,
 *                           so a challenge created before a new cadence existed
 *                           still submits rather than sending an empty key.
 *
 * Dates are read in the viewer's LOCAL calendar, matching what the countdown
 * beside the button says. ISO week arithmetic is done in UTC purely so the
 * day-shifting below cannot land on a DST boundary.
 */

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * ISO-8601 week number and its week-year.
 *
 * The week-year is not always the calendar year: 2027-01-01 belongs to week 53
 * of 2026, which is why the year is taken from the shifted Thursday rather than
 * from the input date.
 */
function isoWeek(date: Date): { year: number; week: number } {
  const shifted = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );

  // Monday = 1 … Sunday = 7, then move to the Thursday of the same ISO week —
  // the day that decides which year the week belongs to.
  const dayOfWeek = shifted.getUTCDay() || 7;
  shifted.setUTCDate(shifted.getUTCDate() + 4 - dayOfWeek);

  const yearStart = Date.UTC(shifted.getUTCFullYear(), 0, 1);
  const week = Math.ceil(
    ((shifted.getTime() - yearStart) / 86_400_000 + 1) / 7,
  );

  return { year: shifted.getUTCFullYear(), week };
}

export function periodKeyFor(
  cadence: CircleChallengeCadence | null | undefined,
  now: Date = new Date(),
): string {
  const date = Number.isNaN(now.getTime()) ? new Date() : now;

  switch (cadence) {
    case 'DAILY':
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

    case 'WEEKLY': {
      const { year, week } = isoWeek(date);
      return `${year}-W${pad(week)}`;
    }

    case 'MONTHLY':
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

    default:
      return 'ONE_OFF';
  }
}
