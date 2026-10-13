import type { NetworkingAnalytics, NetworkingRate, NetworkingStat } from '../../../services/gql/networkingAnalytics';
import { cellOf, rateOf } from './stats';

/**
 * CSV of the aggregates the organiser is looking at, built client-side from the loaded
 * response. Same suppression as the screen (via `stats.ts`); no ids, names of people,
 * decisions or messages exist in the data, so none can be exported.
 */

const FORMULA_START = /^[=+\-@\t\r]/;

/** RFC 4180 quoting AFTER formula-injection escaping (a leading ' defuses = + - @ TAB CR in spreadsheets). */
export function escapeCsvCell(value: string | number): string {
  let s = String(value ?? '');
  if (FORMULA_START.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: Array<Array<string | number>>): string {
  return `${rows.map((r) => r.map(escapeCsvCell).join(',')).join('\r\n')}\r\n`;
}

/** `title-slug-networking-analytics-2030-11-24.csv`: a readable slug of the title and the date, never an id. */
export function csvFilename(title: string, now: Date = new Date()): string {
  const slug = (title || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `${slug || 'event'}-networking-analytics-${date}.csv`;
}

export interface CsvText {
  /** Translated words; keys are the ones used below. */
  t: (key: string) => string;
  fewerThan5: string;
  none: string;
  eventTitle: string;
  generatedAt: string;
  /** Human-readable applied filters, e.g. [['Circle', 'Founders']]. */
  filters: Array<[string, string]>;
}

export function buildAnalyticsCsv(data: NetworkingAnalytics, text: CsvText): string {
  const { t } = text;
  const count = (s: NetworkingStat | null | undefined): string | number => {
    const c = cellOf(s);
    return c.kind === 'value' ? c.n : c.kind === 'suppressed' ? text.fewerThan5 : text.none;
  };
  const rate = (r: NetworkingRate | null | undefined): Array<string | number> => {
    const c = rateOf(r);
    if (c.kind === 'rate') return [`${(c.ratio * 100).toFixed(1)}%`, c.numerator, c.denominator];
    const word = c.kind === 'suppressed' ? text.fewerThan5 : text.none;
    return [word, word, word];
  };

  const rows: Array<Array<string | number>> = [
    [t('csv.section'), t('csv.metric'), t('csv.value'), t('csv.numerator'), t('csv.denominator')],
    [t('csv.event'), t('csv.event'), text.eventTitle, '', ''],
    [t('csv.event'), t('csv.generatedAt'), text.generatedAt, '', ''],
    ...text.filters.map(([k, v]): Array<string | number> => [t('csv.filters'), k, v, '', '']),
  ];
  const one = (section: string, key: string, s: NetworkingStat | null | undefined) => rows.push([t(section), t(key), count(s), '', '']);
  const ratio = (section: string, key: string, r: NetworkingRate | null | undefined) => rows.push([t(section), t(key), ...rate(r)]);

  one('csv.people', 'kpi.registered', data.registeredAttendees);
  one('csv.people', 'kpi.participants', data.participants);
  one('csv.people', 'kpi.currentlyActive', data.currentlyActive);
  one('csv.connections', 'kpi.connected', data.peopleConnected);
  ratio('csv.connections', 'kpi.rate', data.connectionRate);
  one('csv.meetings', 'kpi.meetings', data.confirmedMeetings);
  one('csv.meetings', 'kpi.sessions', data.scheduledCircleSessions);
  one('csv.meetings', 'buckets.populationLabel', data.meetings.population);
  one('csv.meetings', 'kpi.held', data.meetings.reportedHeld);
  one('csv.meetings', 'buckets.both', data.meetings.both);
  one('csv.meetings', 'buckets.one', data.meetings.one);
  one('csv.meetings', 'buckets.nonAttendance', data.meetings.nonAttendance);
  one('csv.meetings', 'buckets.noResponse', data.meetings.noResponse);
  one('csv.meetings', 'buckets.rescheduledOrCancelled', data.meetings.rescheduledOrCancelled);
  // "Other answer" is listed only when it has a displayable (non-zero, >= 5) value.
  if (cellOf(data.meetings.other).kind === 'value') one('csv.meetings', 'buckets.other', data.meetings.other);
  ratio('csv.contacts', 'kpi.useful', data.usefulContacts);
  one('csv.circles', 'circles.participants', data.circleParticipants);
  one('csv.circles', 'circles.memberships', data.circleMemberships);
  data.circles.forEach((c) => {
    rows.push([t('csv.circles'), c.name, count(c.participants), '', '']);
    rows.push([t('csv.circles'), `${c.name} (${t('circles.memberships')})`, count(c.memberships), '', '']);
  });
  one('csv.insights', 'insights.denominatorLabel', data.insightsDenominator);
  data.insights.forEach((g) =>
    g.items.forEach((i) => {
      // A code below 5 is left out, never turned into a "fewer than 5" row or an "other" cell.
      if (cellOf(i.count).kind === 'value') rows.push([t('csv.insights'), `${t(`insights.kind.${g.kind}`)}: ${i.label}`, count(i.count), '', '']);
    }),
  );
  if (data.growth.applicable) {
    one('csv.growth', 'growth.existing', data.growth.existingMembers);
    one('csv.growth', 'growth.newApproved', data.growth.newApproved);
    one('csv.growth', 'growth.pending', data.growth.pending);
    one('csv.growth', 'growth.notJoined', data.growth.notJoined);
    ratio('csv.growth', 'kpi.growth', data.growth.joinRate);
    data.growth.bySource.forEach((s) => rows.push([t('csv.growth'), t(`growth.source.${s.source}`), count(s.count), '', '']));
  }
  return toCsv(rows);
}
