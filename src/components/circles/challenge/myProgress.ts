import type {
  CircleChallenge,
  CircleChallengeEntry,
} from '@/services/gql/types/circles';

import { periodKeyFor } from './periodKey';

/**
 * @fileoverview What "your progress" can honestly say about a challenge.
 * @module components/circles/challenge/myProgress
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THERE IS NO TARGET ON A CHALLENGE
 * ═══════════════════════════════════════════════════════════════════════════
 * The design shows "Your progress: 12 / 20 books". The 12 is real — it is the
 * viewer's own logged claims. The **20 is not a field**: `CircleChallenge`
 * carries `title`, `description`, `cadence`, `pointsPerEntry`,
 * `maxEntriesPerPeriod` and its dates, and nothing else. "20 books" lives in
 * the TITLE, as prose, in whatever language the circle wrote it.
 *
 * A goal has `targetValue` and `metricKind`; a challenge deliberately does not,
 * because a challenge is a cadence ("log something every week"), not a
 * quantity. So the denominator on this screen is `maxEntriesPerPeriod` — the
 * one real cap the challenge carries — and the bar is drawn ONLY when that cap
 * exists. Inventing a target to fill the bar would put a number on screen that
 * no part of the system is enforcing, and the member would plan against it.
 *
 * Everything below is derived from entries the screen has already loaded; this
 * adds no query.
 *
 * ⚠ `loggedThisPeriod` is counted against a period key derived in the VIEWER's
 * local calendar, which is the same known defect `SubmitEntryForm` documents:
 * the server validates the submitted key against its own calendar and hard-
 * refuses a mismatch. Near local midnight, far from UTC, this count can name a
 * different period than the server would. It is a display of a client-side
 * derivation, not an authority — and it is deliberately NOT papered over here,
 * because the same derivation is what the submit actually sends.
 */

export interface MyChallengeProgress {
  /** Entries the viewer has logged for the period they are currently in. */
  loggedThisPeriod: number;
  /** Entries per period the challenge allows, or `null` when it caps nothing. */
  cap: number | null;
  /** 0–100 against `cap`, or `null` when there is no cap to measure against. */
  percent: number | null;
  /** Viewer entries already counted. */
  accepted: number;
  /** Viewer entries still waiting on whoever the challenge said decides. */
  pending: number;
  /** `accepted × pointsPerEntry`, or `null` when the challenge scores nothing. */
  points: number | null;
  /**
   * Sum of the viewer's numeric `claimValue`s, REJECTED entries excluded, or
   * `null` when nothing they logged carried a number.
   *
   * Unitless on purpose: a challenge has no `metricKind`, so "12" is all the
   * data supports — appending "books" would be reading the title as a schema.
   */
  claimed: number | null;
  /** Total viewer entries, all periods, all states. */
  total: number;
}

/** Positive, finite entry cap — or `null`, which means "no cap", never zero. */
function readCap(challenge: CircleChallenge): number | null {
  const cap = Number(challenge.maxEntriesPerPeriod);
  return Number.isFinite(cap) && cap > 0 ? cap : null;
}

export function deriveMyProgress(
  challenge: CircleChallenge,
  entries: readonly CircleChallengeEntry[],
  currentUserId: string | null | undefined,
  now: Date = new Date(),
): MyChallengeProgress | null {
  // No session yet: the panel waits rather than reporting a stranger's zero as
  // the viewer's own.
  if (!currentUserId) return null;

  const mine = entries.filter((entry) => entry.userId === currentUserId);
  const cap = readCap(challenge);
  const period = periodKeyFor(challenge.cadence, now);

  let loggedThisPeriod = 0;
  let accepted = 0;
  let pending = 0;
  let claimed: number | null = null;

  for (const entry of mine) {
    // A legacy entry with no stored period belongs to the ONE_OFF bucket, which
    // is also what `periodKeyFor` returns for an absent cadence.
    if ((entry.periodKey ?? 'ONE_OFF') === period) loggedThisPeriod += 1;
    if (entry.verificationState === 'ACCEPTED') accepted += 1;
    if (entry.verificationState === 'PENDING') pending += 1;

    if (entry.verificationState === 'REJECTED') continue;
    const value = Number(entry.claimValue);
    if (entry.claimValue != null && entry.claimValue !== '' && Number.isFinite(value)) {
      claimed = (claimed ?? 0) + value;
    }
  }

  const pointsPerEntry = Number(challenge.pointsPerEntry);
  const points =
    Number.isFinite(pointsPerEntry) && pointsPerEntry > 0
      ? accepted * pointsPerEntry
      : null;

  return {
    loggedThisPeriod,
    cap,
    // Clamped: `maxEntriesPerPeriod` is enforced server-side, but an entry
    // logged before the cap was lowered can legitimately overshoot it, and a
    // bar past 100% reads as a rendering fault rather than as history.
    percent:
      cap === null ? null : Math.min(100, Math.round((loggedThisPeriod / cap) * 100)),
    accepted,
    pending,
    points,
    claimed,
    total: mine.length,
  };
}
