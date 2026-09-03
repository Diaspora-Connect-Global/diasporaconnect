'use client';

import { useLocale, useTranslations } from 'next-intl';

import { circlePlanPriceRows } from '@/services/gql/circles-billing';
import type { CirclePlan, CirclePriceInterval } from '@/services/gql/types/circles';
import { formatMoney } from '@/types/money';
import { cn } from '@/lib/utils';

/**
 * Prices, rendered.
 *
 * ── MONEY ───────────────────────────────────────────────────────────────────
 * `amountMinor` arrives as an INTEGER in the currency's minor units and stays
 * one until `formatMoney` here. This component is the ÷100; there is no other
 * one anywhere in this feature.
 *
 * ── EACH PRICE IN ITS OWN CURRENCY ──────────────────────────────────────────
 * A plan is priced deliberately per currency and the platform runs no FX
 * anywhere, so a plan priced in both GHS and USD shows BOTH rows and neither is
 * computed from the other. Picking one and converting would invent a number the
 * circle would never actually be charged.
 *
 * The same holds across intervals: a YEAR row is whatever was set, not twelve
 * times the MONTH row, and the two are never presented as a discount off each
 * other because nothing guarantees that they are.
 */

/** Which message key names this interval. */
const INTERVAL_KEY: Record<CirclePriceInterval, string> = {
  MONTH: 'perMonth',
  YEAR: 'perYear',
  ONE_TIME: 'oneTime',
  // NONE is the free plan's interval. It reads as a bare amount — "every month"
  // would be a claim about a billing cycle that does not exist.
  NONE: 'flat',
};

export interface CirclePriceLineProps {
  /** INTEGER minor units. Never a major-unit decimal. */
  amountMinor: number;
  currency?: string | null;
  interval?: CirclePriceInterval | null;
  className?: string;
}

/**
 * One price.
 *
 * Zero renders as "Free" rather than "GHS 0.00 / month": a zero price is the
 * platform's way of saying a plan costs nothing (free IS a plan, priced at
 * zero, not absent), and a billing cycle on a bill of nothing is noise.
 */
export function CirclePriceLine({
  amountMinor,
  currency,
  interval,
  className,
}: CirclePriceLineProps) {
  const t = useTranslations('circles.plan.price');
  const locale = useLocale();

  if (!amountMinor) {
    return <span className={cn('label-medium text-text-primary', className)}>{t('free')}</span>;
  }

  const price = formatMoney(amountMinor, currency ?? undefined, locale);
  const key = INTERVAL_KEY[interval ?? 'NONE'] ?? 'flat';

  return (
    <span className={cn('label-medium text-text-primary', className)}>
      {t(key, { price })}
    </span>
  );
}

export interface PlanPriceListProps {
  plan: CirclePlan;
  className?: string;
}

/**
 * Every price row a plan carries, ordered month → year → one-off, and within an
 * interval by currency code.
 *
 * A plan with no price rows at all is free, and says so — it does not render an
 * empty block. The yearly footnote appears only when a YEAR row exists, because
 * it is answering a question nobody asks otherwise.
 */
export function PlanPriceList({ plan, className }: PlanPriceListProps) {
  const t = useTranslations('circles.plan.price');
  const rows = circlePlanPriceRows(plan);

  if (rows.length === 0) {
    return (
      <p className={cn('label-medium text-text-primary', className)}>{t('free')}</p>
    );
  }

  const hasYearly = rows.some((row) => row.interval === 'YEAR');

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {rows.map((row) => (
        <CirclePriceLine
          key={row.id}
          amountMinor={row.amountMinor}
          currency={row.currency}
          interval={row.interval}
        />
      ))}

      {hasYearly && (
        <p className="caption-small text-text-secondary">{t('yearlyNote')}</p>
      )}
    </div>
  );
}
