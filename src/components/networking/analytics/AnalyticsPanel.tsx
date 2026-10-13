'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarCheck, CheckCheck, Download, Handshake, Link2, Loader2, Percent, RotateCcw, Sparkles, Users, UsersRound } from 'lucide-react';
import {
  ANALYTICS_FORMATS,
  ANALYTICS_MEETING_STATUSES,
  ANALYTICS_NETWORKING_STATUSES,
  type AnalyticsFilters,
  type InsightGroup,
  type NetworkingAnalytics,
} from '@/services/gql/networkingAnalytics';
import { useAnalyticsData, useFilterOptions, type AnalyticsApi } from './useAnalytics';
import { cellOf, rateOf, type Cell, type RateCell } from './stats';
import { buildAnalyticsCsv, csvFilename } from './csv';
import { BigFigure, Card, CellText, KpiTile, StackedBar, ValueBar, useFormats, type BarRow } from './parts';

const FIELD = 'h-11 w-full rounded-lg border border-border-subtle bg-surface-default px-3 text-base text-text-primary md:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand';
const INSIGHT_ORDER = ['INDUSTRIES', 'NEEDS', 'OFFERS', 'MARKETS', 'CIRCLE_TOPICS'] as const;
const EMPTY: AnalyticsFilters = { from: '', to: '', networkingStatus: '', circleKey: '', meetingStatus: '', industry: '', attendanceFormat: '' };

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-text-secondary">{label}</label>
      {children}
    </div>
  );
}

function downloadCsv(csv: string, filename: string) {
  // The BOM makes Excel read the file as UTF-8 (accents, umlauts).
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AnalyticsPanel({ api, eventTitle }: { api: AnalyticsApi; eventTitle: string }) {
  const t = useTranslations('networkingAnalytics');
  const te = useTranslations('networking.errors');
  const { dateTime } = useFormats();
  const [draft, setDraft] = useState<AnalyticsFilters>(EMPTY);
  const [applied, setApplied] = useState<AnalyticsFilters>(EMPTY);
  const options = useFilterOptions(api);
  const q = useAnalyticsData(api, applied);
  const rangeInvalid = Boolean(draft.from && draft.to && draft.from > draft.to);

  const set = (patch: Partial<AnalyticsFilters>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    // A backwards date range is explained, not sent.
    if (!(next.from && next.to && next.from > next.to)) setApplied(next);
  };
  const filtered = JSON.stringify(applied) !== JSON.stringify(EMPTY);

  const exportCsv = () => {
    if (!q.data) return;
    const appliedLabels: Array<[string, string]> = [];
    if (applied.from) appliedLabels.push([t('filters.from'), applied.from]);
    if (applied.to) appliedLabels.push([t('filters.to'), applied.to]);
    if (applied.networkingStatus) appliedLabels.push([t('filters.status'), t(`status.${applied.networkingStatus}`)]);
    if (applied.circleKey) appliedLabels.push([t('filters.circle'), options.circles.find((c) => c.key === applied.circleKey)?.name ?? '']);
    if (applied.meetingStatus) appliedLabels.push([t('filters.meetingStatus'), t(`meetingStatus.${applied.meetingStatus}`)]);
    if (applied.industry) appliedLabels.push([t('filters.industry'), options.industries.find((i) => i.code === applied.industry)?.label ?? '']);
    if (applied.attendanceFormat) appliedLabels.push([t('filters.format'), t(`format.${applied.attendanceFormat}`)]);
    const csv = buildAnalyticsCsv(q.data, {
      t: (k) => t(k as never),
      fewerThan5: t('fewerThan5'),
      none: t('none'),
      eventTitle,
      generatedAt: q.data.generatedAt,
      filters: appliedLabels,
    });
    downloadCsv(csv, csvFilename(eventTitle));
  };

  return (
    <div data-testid="analytics-panel" className="@container space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-lg font-semibold text-text-primary">{t('title')}</h2>
          <p className="text-sm text-text-secondary">{t('intro')}</p>
          <p className="text-xs text-muted-foreground">{t('aggregatesOnly')}</p>
        </div>
        <button
          type="button"
          data-testid="export-csv"
          onClick={exportCsv}
          disabled={!q.data || q.loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-subtle bg-surface-default px-4 text-sm font-medium text-text-primary hover:border-border-brand disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
        >
          <Download className="size-4" aria-hidden />
          {t('export')}
        </button>
      </header>

      <section aria-label={t('filters.title')} data-testid="filters" className="space-y-3 rounded-2xl border border-border-subtle bg-surface-default p-4">
        <div className="grid grid-cols-1 gap-3 @[24rem]:grid-cols-2 @[38rem]:grid-cols-3">
          <Field id="an-from" label={t('filters.from')}>
            <input id="an-from" data-testid="filter-from" type="date" className={FIELD} value={draft.from ?? ''} max={draft.to || undefined} aria-invalid={rangeInvalid} onChange={(e) => set({ from: e.target.value })} />
          </Field>
          <Field id="an-to" label={t('filters.to')}>
            <input id="an-to" data-testid="filter-to" type="date" className={FIELD} value={draft.to ?? ''} min={draft.from || undefined} aria-invalid={rangeInvalid} onChange={(e) => set({ to: e.target.value })} />
          </Field>
          <Field id="an-status" label={t('filters.status')}>
            <select id="an-status" data-testid="filter-status" className={FIELD} value={draft.networkingStatus ?? ''} onChange={(e) => set({ networkingStatus: e.target.value as AnalyticsFilters['networkingStatus'] })}>
              <option value="">{t('filters.any')}</option>
              {ANALYTICS_NETWORKING_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
            </select>
          </Field>
          <Field id="an-circle" label={t('filters.circle')}>
            <select id="an-circle" data-testid="filter-circle" className={FIELD} value={draft.circleKey ?? ''} onChange={(e) => set({ circleKey: e.target.value })}>
              <option value="">{t('filters.any')}</option>
              {options.circles.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
            </select>
          </Field>
          <Field id="an-meeting" label={t('filters.meetingStatus')}>
            <select id="an-meeting" data-testid="filter-meeting" className={FIELD} value={draft.meetingStatus ?? ''} onChange={(e) => set({ meetingStatus: e.target.value as AnalyticsFilters['meetingStatus'] })}>
              <option value="">{t('filters.any')}</option>
              {ANALYTICS_MEETING_STATUSES.map((s) => <option key={s} value={s}>{t(`meetingStatus.${s}`)}</option>)}
            </select>
          </Field>
          <Field id="an-industry" label={t('filters.industry')}>
            <select id="an-industry" data-testid="filter-industry" className={FIELD} value={draft.industry ?? ''} onChange={(e) => set({ industry: e.target.value })}>
              <option value="">{t('filters.any')}</option>
              {options.industries.map((i) => <option key={i.code} value={i.code}>{i.label}</option>)}
            </select>
          </Field>
          <Field id="an-format" label={t('filters.format')}>
            <select id="an-format" data-testid="filter-format" className={FIELD} value={draft.attendanceFormat ?? ''} onChange={(e) => set({ attendanceFormat: e.target.value as AnalyticsFilters['attendanceFormat'] })}>
              <option value="">{t('filters.any')}</option>
              {ANALYTICS_FORMATS.map((s) => <option key={s} value={s}>{t(`format.${s}`)}</option>)}
            </select>
          </Field>
        </div>
        {rangeInvalid ? <p role="alert" data-testid="range-invalid" className="text-xs text-text-danger">{t('filters.rangeInvalid')}</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">{t('filters.note')}</p>
          <button
            type="button"
            data-testid="filters-reset"
            onClick={() => { setDraft(EMPTY); setApplied(EMPTY); }}
            disabled={!filtered && !draft.from && !draft.to}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-text-brand hover:underline disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
          >
            <RotateCcw className="size-4" aria-hidden />
            {t('filters.reset')}
          </button>
        </div>
      </section>

      {q.failureKey && !q.data ? (
        <div role="alert" data-testid="analytics-error" data-error={q.failureKey} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-subtle p-4 text-sm text-text-secondary">
          <span className="min-w-0 flex-1">{te(q.failureKey as never)}</span>
          <button type="button" onClick={q.reload} className="min-h-11 rounded-full border border-border-subtle px-4 font-medium text-text-primary">{t('retry')}</button>
        </div>
      ) : null}

      {!q.data && !q.failureKey ? (
        <p role="status" data-testid="analytics-loading" className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="size-4 animate-spin text-text-brand" aria-hidden />
          {t('loading')}
        </p>
      ) : null}

      {q.data ? (
        <div aria-busy={q.loading} className={q.loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          {q.failureKey ? <p role="alert" className="mb-3 text-sm text-text-danger">{te(q.failureKey as never)}</p> : null}
          <Results data={q.data} lastUpdated={dateTime(q.data.generatedAt)} />
        </div>
      ) : null}
    </div>
  );
}

function sub(text: string | null) {
  return text ? <p className="text-xs text-text-secondary">{text}</p> : null;
}

function Results({ data, lastUpdated }: { data: NetworkingAnalytics; lastUpdated: string }) {
  const t = useTranslations('networkingAnalytics');
  const { num } = useFormats();
  const participants = cellOf(data.participants);
  const registered = cellOf(data.registeredAttendees);
  const active = cellOf(data.currentlyActive);
  const rate = rateOf(data.connectionRate);
  const useful = rateOf(data.usefulContacts);
  const sessions = cellOf(data.scheduledCircleSessions);
  const memberships = cellOf(data.circleMemberships);
  const population = cellOf(data.meetings.population);
  const growth = data.growth;
  const join = rateOf(growth.joinRate);

  const ofRate = (r: RateCell, key: 'sub.ofParticipants' | 'sub.respondents' | 'sub.notMembers') =>
    r.kind === 'rate' ? t(key, { num: num(r.numerator), den: num(r.denominator) }) : r.kind === 'none' ? t('noOne') : null;
  const loose = t as unknown as (key: string, values?: Record<string, string>) => string;
  const whenValue = (c: Cell, key: string) => (c.kind === 'value' ? loose(key, { n: num(c.n) }) : null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p data-testid="last-updated" className="text-xs text-muted-foreground">{t('lastUpdated', { time: lastUpdated })}</p>
        {participants.kind !== 'value' ? <p data-testid="too-few" className="text-xs text-text-secondary">{t('tooFew')}</p> : null}
      </div>

      <div data-testid="kpis" className="grid grid-cols-1 gap-3 @[24rem]:grid-cols-2 @[38rem]:grid-cols-3">
        <KpiTile id="participants" icon={Users} tone="brand" title={t('kpi.participants')} help={t('help.participants')}>
          <BigFigure cell={participants} testId="kpi-participants-value" />
          {sub(whenValue(registered, 'sub.ofRegistered'))}
          {sub(whenValue(active, 'sub.activeNow'))}
        </KpiTile>
        <KpiTile id="connected" icon={Link2} tone="info" title={t('kpi.connected')} help={t('help.connected')}>
          <BigFigure cell={cellOf(data.peopleConnected)} testId="kpi-connected-value" />
        </KpiTile>
        <KpiTile id="rate" icon={Percent} tone="info" title={t('kpi.rate')} help={t('help.rate')}>
          <BigFigure rate={rate} testId="kpi-rate-value" />
          {sub(ofRate(rate, 'sub.ofParticipants'))}
        </KpiTile>
        <KpiTile id="meetings" icon={CalendarCheck} tone="success" title={t('kpi.meetings')} help={t('help.meetings')}>
          <BigFigure cell={cellOf(data.confirmedMeetings)} testId="kpi-meetings-value" />
          <p className="text-xs text-text-secondary" data-testid="kpi-sessions">
            {sessions.kind === 'value' ? t('sub.sessions', { n: num(sessions.n) }) : sessions.kind === 'suppressed' ? t('sub.sessionsSmall') : t('sub.sessionsNone')}
          </p>
        </KpiTile>
        <KpiTile id="held" icon={Handshake} tone="success" title={t('kpi.held')} help={t('help.held')}>
          <BigFigure cell={cellOf(data.meetings.reportedHeld)} testId="kpi-held-value" />
          {sub(whenValue(population, 'sub.ofMeetings'))}
        </KpiTile>
        <KpiTile id="useful" icon={Sparkles} tone="warning" title={t('kpi.useful')} help={t('help.useful')}>
          <BigFigure rate={useful} testId="kpi-useful-value" />
          {sub(ofRate(useful, 'sub.respondents'))}
        </KpiTile>
        <KpiTile id="circles" icon={UsersRound} tone="brand" title={t('kpi.circles')} help={t('help.circles')}>
          <BigFigure cell={cellOf(data.circleParticipants)} testId="kpi-circles-value" />
          {sub(whenValue(memberships, 'sub.memberships'))}
        </KpiTile>
        {growth.applicable ? (
          <KpiTile id="growth" icon={CheckCheck} tone="danger" title={t('kpi.growth')} help={t('help.growth')}>
            <BigFigure rate={join} testId="kpi-growth-value" />
            {sub(ofRate(join, 'sub.notMembers'))}
          </KpiTile>
        ) : null}
      </div>

      <MeetingBuckets data={data} />
      <CirclesCard data={data} />
      <InsightsCard data={data} />
      {growth.applicable ? <GrowthCard data={data} /> : null}
    </div>
  );
}

function MeetingBuckets({ data }: { data: NetworkingAnalytics }) {
  const t = useTranslations('networkingAnalytics');
  const { num } = useFormats();
  const b = data.meetings;
  const population = cellOf(b.population);
  const rows: BarRow[] = [
    { id: 'both', label: t('buckets.both'), cell: cellOf(b.both), swatch: 'success' },
    { id: 'one', label: t('buckets.one'), cell: cellOf(b.one), swatch: 'info' },
    { id: 'nonAttendance', label: t('buckets.nonAttendance'), cell: cellOf(b.nonAttendance), swatch: 'danger' },
    { id: 'noResponse', label: t('buckets.noResponse'), cell: cellOf(b.noResponse), swatch: 'neutral' },
    { id: 'rescheduledOrCancelled', label: t('buckets.rescheduledOrCancelled'), cell: cellOf(b.rescheduledOrCancelled), swatch: 'warning' },
  ];
  // "Other answer" appears only when it has a printable (non-zero, 5 or more) value.
  const other = cellOf(b.other);
  if (other.kind === 'value') rows.push({ id: 'other', label: t('buckets.other'), cell: other, swatch: 'brand' });
  return (
    <Card id="buckets" title={t('buckets.title')} intro={t('buckets.intro')}>
      <p data-testid="buckets-population" data-state={population.kind} className="text-sm text-text-primary">
        {population.kind === 'value' ? t('buckets.population', { n: num(population.n) }) : population.kind === 'suppressed' ? t('buckets.populationSmall') : t('noOne')}
      </p>
      {population.kind === 'value' ? <StackedBar rows={rows} testId="bucket" /> : null}
      {population.kind === 'value' ? <p className="text-xs text-muted-foreground">{t('buckets.heldNote')}</p> : null}
    </Card>
  );
}

function CirclesCard({ data }: { data: NetworkingAnalytics }) {
  const t = useTranslations('networkingAnalytics');
  return (
    <Card id="circles" title={t('circles.title')} intro={t('circles.intro')}>
      {data.circles.length === 0 ? (
        <p className="text-sm text-text-secondary">{t('circles.empty')}</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-subtle">
          <table className="w-full table-fixed text-sm">
            <caption className="sr-only">{t('circles.title')}</caption>
            <thead className="bg-surface-subtle text-left text-xs text-text-secondary">
              <tr>
                <th scope="col" className="p-2.5 font-medium">{t('circles.name')}</th>
                <th scope="col" className="w-[26%] p-2.5 text-right font-medium">{t('circles.participants')}</th>
                <th scope="col" className="w-[28%] p-2.5 text-right font-medium">{t('circles.memberships')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {data.circles.map((c) => (
                <tr key={c.key} data-testid="circle-row">
                  <th scope="row" className="break-words p-2.5 text-left font-medium text-text-primary">{c.name}</th>
                  <td className="p-2.5 text-right tabular-nums"><CellText cell={cellOf(c.participants)} /></td>
                  <td className="p-2.5 text-right tabular-nums"><CellText cell={cellOf(c.memberships)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function InsightsCard({ data }: { data: NetworkingAnalytics }) {
  const t = useTranslations('networkingAnalytics');
  const { num, pct } = useFormats();
  const den = cellOf(data.insightsDenominator);
  const memberships = cellOf(data.circleMemberships);
  const groups = INSIGHT_ORDER.map((kind) => data.insights.find((g) => g.kind === kind)).filter((g): g is InsightGroup => Boolean(g));
  return (
    <Card id="insights" title={t('insights.title')} intro={t('insights.intro')}>
      <p data-testid="insights-denominator" data-state={den.kind} className="text-sm text-text-primary">
        {den.kind === 'value' ? t('insights.denominator', { n: num(den.n) }) : den.kind === 'suppressed' ? t('insights.denominatorSmall') : t('noOne')}
      </p>
      {den.kind === 'value' ? (
        <>
          <p data-testid="insights-multi" className="text-xs text-muted-foreground">{t('insights.multi')}</p>
          <div className="grid grid-cols-1 gap-5 @[38rem]:grid-cols-2">
            {groups.map((g) => {
              const base = g.kind === 'CIRCLE_TOPICS' ? memberships : den;
              const items = g.items.flatMap((i) => {
                const c = cellOf(i.count);
                return c.kind === 'value' ? [{ code: i.code, label: i.label, n: c.n }] : [];
              });
              return (
                <section key={g.kind} data-testid={`insight-${g.kind}`} aria-label={t(`insights.kind.${g.kind}`)} className="space-y-2">
                  <h3 className="text-sm font-semibold text-text-primary">{t(`insights.kind.${g.kind}`)}</h3>
                  {items.length === 0 ? (
                    <p className="text-xs text-text-secondary">{t('insights.empty')}</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {items.map((i) => (
                        <ValueBar
                          key={i.code}
                          label={i.label}
                          count={num(i.n)}
                          percentText={base.kind === 'value' ? pct(i.n / base.n) : null}
                          ratio={base.kind === 'value' ? i.n / base.n : 0.02}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </>
      ) : null}
    </Card>
  );
}

function GrowthCard({ data }: { data: NetworkingAnalytics }) {
  const t = useTranslations('networkingAnalytics');
  const g = data.growth;
  const rows: Array<[string, Cell]> = [
    [t('growth.existing'), cellOf(g.existingMembers)],
    [t('growth.newApproved'), cellOf(g.newApproved)],
    [t('growth.pending'), cellOf(g.pending)],
    [t('growth.notJoined'), cellOf(g.notJoined)],
  ];
  return (
    <Card id="growth" title={t('growth.title')} intro={t('growth.intro')}>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm @[24rem]:grid-cols-2">
        {rows.map(([label, cell]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="text-text-secondary">{label}</dt>
            <dd className="font-medium tabular-nums text-text-primary"><CellText cell={cell} /></dd>
          </div>
        ))}
      </dl>
      {g.bySource.length > 0 ? (
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-text-primary">{t('growth.bySource')}</h3>
          <dl className="grid gap-1.5 text-sm">
            {g.bySource.map((s) => (
              <div key={s.source} className="flex items-baseline justify-between gap-3">
                <dt className="text-text-secondary">{t(`growth.source.${s.source}`)}</dt>
                <dd className="font-medium tabular-nums text-text-primary"><CellText cell={cellOf(s.count)} /></dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </Card>
  );
}
