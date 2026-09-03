'use client';

import { useMemo } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useLocale } from 'next-intl';

import { useUserStore } from '@/store/useUserStore';

/**
 * The circle's score for each day of the current week.
 *
 * ## Why this reads the ledger and not a summary field
 *
 * There is no stored total and no per-day rollup anywhere — `circleLeaderboard`
 * is a `SUM ... GROUP BY user_id`, so it can say who has what but never when any
 * of it was earned. The only thing that carries a date is the append-only score
 * ledger itself, so a day series has to be folded out of `circleScoreEntries`
 * client-side. Entries are SIGNED: a correction is a negative row, so a day's
 * value is a NET and can legitimately come out negative.
 *
 * ## The document lives here, not in `services/gql/circles.ts`
 *
 * Every other circle operation is declared in that module and this one is the
 * exception. It is colocated with its only consumer — the leaderboard chart —
 * and should be folded back in next time that file is edited.
 *
 * ## There is no server-side day aggregate — this is a client-side fold
 *
 * `Leaderboard` (circle.proto:594-609) carries circle_id, season_key,
 * ranking_enabled, collective_total and rows, and NOTHING with a date on it, so
 * the design's day chart cannot be read from the leaderboard payload at all. The
 * only dated thing in the whole score surface is `ScoreEntry.awarded_at`
 * (circle.proto:577-592, field 11), reachable through `circleScoreEntries`.
 * A real per-day rollup rpc is backend work that does not exist yet; until it
 * does, the series is folded here out of raw ledger rows, and it is drawn ONLY
 * when the rows provably cover the whole week.
 *
 * ## Completeness is not assumed
 *
 * `circleScoreEntries` is an offset-paged list with no date filter, and both the
 * gateway handler and the repository clamp `limit` to 200. A busy circle can
 * therefore have more entries in one week than a single page holds, and the
 * series would silently understate the earlier days. Rather than quietly
 * under-report, the hook detects that case (a full page whose OLDEST row is
 * still inside the week, so rows beyond it are unread) and reports `truncated`
 * so the chart can decline to draw.
 *
 * A footnote under an understated chart is not a fix — the heights ARE the
 * claim, and a reader takes them before they take the caption. So `truncated`
 * suppresses the plot rather than annotating it.
 *
 * ## The season is a precondition, not a default
 *
 * `seasonKey` is `undefined` until the leaderboard resolves, and the query is
 * held until then. Substituting `null` in the meantime would read the all-time
 * ledger and then immediately re-read it under the real season — two requests,
 * and a first paint of a chart that does not match the total above it.
 */

/** The server-side ceiling. Asking for more returns 200 anyway. */
const LEDGER_PAGE_LIMIT = 200;

const MS_PER_DAY = 86_400_000;
const DAYS_IN_WEEK = 7;

const CIRCLE_SCORE_ENTRIES = gql`
  query CircleScoreEntriesForWeek(
    $circleId: ID!
    $seasonKey: String
    $limit: Int
  ) {
    circleScoreEntries(
      circleId: $circleId
      seasonKey: $seasonKey
      limit: $limit
    ) {
      id
      points
      awardedAt
    }
  }
`;

interface LedgerEntry {
  id: string;
  points: number;
  awardedAt?: string | null;
}

interface ScoreEntriesData {
  circleScoreEntries: LedgerEntry[] | null;
}

export interface WeeklyScoreDay {
  /** `YYYY-MM-DD` in the viewer's zone. Sorts lexically, which the week relies on. */
  key: string;
  /** Single-letter weekday for the axis ("M"), localised. */
  label: string;
  /** Full weekday name, for the screen-reader description. */
  fullLabel: string;
  /** NET points for the day. Signed — reversals subtract. */
  points: number;
  isToday: boolean;
  /** Later this week. Not "zero points", but "has not happened yet". */
  isFuture: boolean;
}

export interface WeeklyScoreSeries {
  /** Always seven entries, Monday first, even before any data arrives. */
  days: WeeklyScoreDay[];
  loading: boolean;
  /**
   * The ledger could not be read. Render nothing rather than a flat chart —
   * seven empty bars are indistinguishable from a genuinely quiet week.
   */
  unavailable: boolean;
  /** A full page came back without reaching past Monday; earlier days may be low. */
  truncated: boolean;
  /** How many rows were actually read, for the disclosure copy. */
  entriesRead: number;
}

/**
 * A stored timezone can be stale or malformed, and `Intl` THROWS on an unknown
 * zone rather than falling back — which would take the whole screen down over a
 * profile field. Validate once, then use the browser zone if it does not hold.
 */
function safeTimeZone(preferred?: string | null): string {
  const browser = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const candidate = (preferred ?? '').trim();
  if (!candidate) return browser;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate });
    return candidate;
  } catch {
    return browser;
  }
}

/** The calendar day an instant falls on, as seen from `timeZone`. */
function calendarDayKey(instant: Date, timeZone: string): string | null {
  if (Number.isNaN(instant.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const at = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const [y, m, d] = [at('year'), at('month'), at('day')];
  return y && m && d ? `${y}-${m}-${d}` : null;
}

/**
 * UTC midnight for a `YYYY-MM-DD` calendar day.
 *
 * The anchor is a *label* for a day, not a moment in the viewer's zone: walking
 * the week in UTC keeps the arithmetic exact, because UTC days are all 86400s
 * and a DST transition in the viewer's own zone would otherwise make one of
 * these steps 23 or 25 hours and skip or repeat a day.
 */
function anchorFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function keyFromAnchor(anchor: Date): string {
  const y = String(anchor.getUTCFullYear()).padStart(4, '0');
  const m = String(anchor.getUTCMonth() + 1).padStart(2, '0');
  const d = String(anchor.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useWeeklyScoreSeries(
  circleId: string,
  /** `undefined` = the leaderboard has not resolved yet; the query waits. */
  seasonKey: string | null | undefined,
): WeeklyScoreSeries {
  const locale = useLocale();
  const user = useUserStore((state) => state.user);
  const timeZone = safeTimeZone(user?.timezone || user?.timeZone);

  const { data, loading, error } = useQuery<ScoreEntriesData>(
    CIRCLE_SCORE_ENTRIES,
    {
      variables: { circleId, seasonKey: seasonKey ?? null, limit: LEDGER_PAGE_LIMIT },
      skip: !circleId || seasonKey === undefined,
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
  );

  const entries = data?.circleScoreEntries ?? null;

  return useMemo<WeeklyScoreSeries>(() => {
    const todayKey =
      calendarDayKey(new Date(), timeZone) ?? keyFromAnchor(new Date());
    const todayAnchor = anchorFromKey(todayKey);

    // Monday-first: `getUTCDay()` is 0=Sunday, so shift by 6 before the modulo.
    const backToMonday = (todayAnchor.getUTCDay() + 6) % 7;
    const mondayAnchor = new Date(todayAnchor.getTime() - backToMonday * MS_PER_DAY);

    const narrow = new Intl.DateTimeFormat(locale, {
      weekday: 'narrow',
      timeZone: 'UTC',
    });
    const long = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      timeZone: 'UTC',
    });

    const anchors = Array.from({ length: DAYS_IN_WEEK }, (_, i) =>
      new Date(mondayAnchor.getTime() + i * MS_PER_DAY),
    );
    const keys = anchors.map(keyFromAnchor);
    const mondayKey = keys[0];

    const totals = new Map<string, number>(keys.map((key) => [key, 0]));

    // Rows arrive `ORDER BY awarded_at DESC`, so the last one we can place is
    // the oldest row we were given — the boundary of what we actually read.
    let oldestReadKey: string | null = null;
    let datedCount = 0;
    for (const entry of entries ?? []) {
      if (!entry.awardedAt) continue;
      const key = calendarDayKey(new Date(entry.awardedAt), timeZone);
      if (!key) continue;
      datedCount += 1;
      oldestReadKey = key;
      const running = totals.get(key);
      if (running !== undefined) totals.set(key, running + (entry.points || 0));
    }

    const entriesRead = entries?.length ?? 0;
    const truncated =
      entriesRead >= LEDGER_PAGE_LIMIT &&
      oldestReadKey !== null &&
      oldestReadKey >= mondayKey;

    // Rows came back but not one of them could be placed on a day. Seven empty
    // bars would then say "a quiet week" about a circle that plainly scored —
    // the series is unknown, not zero, so nothing is drawn.
    const undatable = entriesRead > 0 && datedCount === 0;

    const days = anchors.map<WeeklyScoreDay>((anchor, i) => ({
      key: keys[i],
      label: narrow.format(anchor),
      fullLabel: long.format(anchor),
      points: totals.get(keys[i]) ?? 0,
      isToday: keys[i] === todayKey,
      isFuture: keys[i] > todayKey,
    }));

    return {
      days,
      loading: (loading || seasonKey === undefined) && entries === null,
      unavailable: (Boolean(error) && entries === null) || undatable,
      truncated,
      entriesRead,
    };
  }, [entries, loading, error, locale, timeZone, seasonKey]);
}
