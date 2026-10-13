'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { LucideIcon } from 'lucide-react';
import { TONE_CLASS } from '@/components/more/MoreLinkCard';
import type { Cell, RateCell } from './stats';

type Tone = keyof typeof TONE_CLASS;

/** Numbers, percentages and dates in the viewer's locale. */
export function useFormats() {
  const locale = useLocale();
  const nf = new Intl.NumberFormat(locale);
  const pf = new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const df = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
  return {
    num: (n: number) => nf.format(n),
    pct: (ratio: number) => pf.format(ratio),
    dateTime: (iso: string) => {
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? '' : df.format(d);
    },
  };
}

/** A count as text: the number, "fewer than 5", or "—". Used wherever a figure is printed inline. */
export function CellText({ cell, testId }: { cell: Cell; testId?: string }) {
  const t = useTranslations('networkingAnalytics');
  const { num } = useFormats();
  if (cell.kind === 'value') return <span data-testid={testId} data-state="value">{num(cell.n)}</span>;
  if (cell.kind === 'suppressed') return <span data-testid={testId} data-state="suppressed">{t('fewerThan5')}</span>;
  return <span data-testid={testId} data-state="none">{t('none')}</span>;
}

/** Big figure for a KPI tile. */
export function BigFigure({ cell, rate, testId }: { cell?: Cell; rate?: RateCell; testId: string }) {
  const t = useTranslations('networkingAnalytics');
  const { num, pct } = useFormats();
  const base = 'block font-semibold text-text-primary';
  if (rate) {
    if (rate.kind === 'rate') return <span data-testid={testId} data-state="value" className={`${base} text-3xl`}>{pct(rate.ratio)}</span>;
    if (rate.kind === 'suppressed') return <span data-testid={testId} data-state="suppressed" className={`${base} text-xl`}>{t('fewerThan5')}</span>;
    return <span data-testid={testId} data-state="none" aria-label={t('noneLabel')} className={`${base} text-3xl`}>{t('none')}</span>;
  }
  if (cell?.kind === 'value') return <span data-testid={testId} data-state="value" className={`${base} text-3xl`}>{num(cell.n)}</span>;
  if (cell?.kind === 'suppressed') return <span data-testid={testId} data-state="suppressed" className={`${base} text-xl`}>{t('fewerThan5')}</span>;
  return <span data-testid={testId} data-state="none" aria-label={t('noneLabel')} className={`${base} text-3xl`}>{t('none')}</span>;
}

export function KpiTile({
  id,
  icon: Icon,
  tone,
  title,
  help,
  children,
}: {
  id: string;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  help: string;
  children: React.ReactNode;
}) {
  return (
    <article data-testid={`kpi-${id}`} className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface-default p-4">
      <div className="flex items-center gap-2.5">
        <span className={`grid size-9 shrink-0 place-items-center rounded-full ${TONE_CLASS[tone]}`}>
          <Icon className="size-4" strokeWidth={1.75} aria-hidden />
        </span>
        <h3 className="min-w-0 text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      {children}
      <p className="text-xs leading-relaxed text-muted-foreground">{help}</p>
    </article>
  );
}

export function Card({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section data-testid={id} aria-labelledby={`${id}-h`} className="space-y-3 rounded-2xl border border-border-subtle bg-surface-default p-4 sm:p-5">
      <div className="space-y-1">
        <h2 id={`${id}-h`} className="text-base font-semibold text-text-primary">{title}</h2>
        {intro ? <p className="text-xs leading-relaxed text-muted-foreground">{intro}</p> : null}
      </div>
      {children}
    </section>
  );
}

const SWATCH: Record<string, string> = {
  brand: 'bg-text-brand',
  info: 'bg-text-info',
  success: 'bg-text-success',
  warning: 'bg-text-warning',
  danger: 'bg-text-danger',
  neutral: 'bg-text-secondary',
};

export interface BarRow {
  id: string;
  label: string;
  cell: Cell;
  swatch: keyof typeof SWATCH;
}

/**
 * A stacked bar of the groups that have a printable number, plus a text row per group
 * (label + value) so colour is never the only signal. Suppressed groups are listed but
 * NOT drawn, so the drawing can't reveal them.
 */
export function StackedBar({ rows, testId }: { rows: BarRow[]; testId: string }) {
  const t = useTranslations('networkingAnalytics');
  const drawn = rows.flatMap((r) => (r.cell.kind === 'value' ? [{ ...r, n: r.cell.n }] : []));
  const total = drawn.reduce((s, r) => s + r.n, 0);
  const hidden = rows.some((r) => r.cell.kind === 'suppressed');
  return (
    <div data-testid={testId} className="space-y-3">
      {total > 0 ? (
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-subtle" aria-hidden>
          {drawn.map((r) => (
            <span key={r.id} className={`${SWATCH[r.swatch]} h-full border-r border-surface-default last:border-r-0`} style={{ width: `${(r.n / total) * 100}%` }} />
          ))}
        </div>
      ) : null}
      <ul className="grid gap-1.5">
        {rows.map((r) => (
          <li key={r.id} data-testid={`${testId}-${r.id}`} data-state={r.cell.kind} className="flex min-h-6 items-center gap-2 text-sm">
            <span aria-hidden className={`size-3 shrink-0 rounded-sm ${SWATCH[r.swatch]}`} />
            <span className="min-w-0 flex-1 text-text-primary">{r.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-text-primary"><CellText cell={r.cell} /></span>
          </li>
        ))}
      </ul>
      {hidden ? <p className="text-xs text-muted-foreground">{t('buckets.notDrawn')}</p> : null}
    </div>
  );
}

/** One horizontal bar with its value written next to it. */
export function ValueBar({ label, count, percentText, ratio }: { label: string; count: string; percentText: string | null; ratio: number }) {
  return (
    <li className="space-y-1" data-testid="insight-item">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 break-words text-text-primary">{label}</span>
        <span className="shrink-0 tabular-nums text-text-secondary">
          <span className="font-medium text-text-primary">{count}</span>
          {percentText ? <span> · {percentText}</span> : null}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-subtle" aria-hidden>
        <div className="h-full rounded-full bg-text-brand" style={{ width: `${Math.max(2, Math.min(100, ratio * 100))}%` }} />
      </div>
    </li>
  );
}
