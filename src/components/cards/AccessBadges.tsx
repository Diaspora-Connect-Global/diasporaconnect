'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  AccessProfile,
  Money,
  SubscriptionPeriod,
} from '@/types/membership';

export interface AccessBadgesProps {
  access: AccessProfile;
  /** Visual density. 'card' = inline small pill, 'detail' = larger header chip. */
  size?: 'card' | 'detail';
  /** Override locale for currency formatting; defaults to next-intl locale. */
  locale?: string;
  /** Allow consumer to add tracking / spacing classes. */
  className?: string;
}

function formatMoney(money: Money, locale: string): string {
  const value = money.amountInCents / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: money.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${money.currency} ${new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)}`;
  }
}

function lowestPriceOf(
  periods: SubscriptionPeriod[],
  price: Money,
): Money {
  // v1: single price stored on the entity. Periods are display-only; lowest
  // resolves to the same price. Future revisions may carry per-period prices.
  void periods;
  return price;
}

export function AccessBadges({
  access,
  size = 'card',
  locale: localeOverride,
  className,
}: AccessBadgesProps): React.ReactElement {
  const intlLocale = useLocale();
  const locale = localeOverride ?? intlLocale;
  const t = useTranslations('accessBadges');

  const isPrivate = access.visibility === 'PRIVATE';
  const isPaid = access.paymentType !== 'NONE';
  const detail = size === 'detail';

  const visibilityLabel = isPrivate
    ? t('visibility.private')
    : t('visibility.public');

  let paymentLabel: string;
  let paymentAriaLabel: string;

  if (!isPaid) {
    paymentLabel = t('payment.free');
    paymentAriaLabel = t('payment.free');
  } else if (!access.price) {
    paymentLabel = t('payment.paid');
    paymentAriaLabel = t('payment.paid');
  } else if (access.paymentType === 'SUBSCRIPTION') {
    const periods = access.subscriptionPeriods ?? [];
    if (periods.length > 1) {
      const lowest = formatMoney(
        lowestPriceOf(periods, access.price),
        locale,
      );
      paymentLabel = t('payment.from', { price: lowest });
      paymentAriaLabel = t('payment.fromAria', { price: lowest });
    } else {
      const price = formatMoney(access.price, locale);
      const period = periods[0] ?? 'monthly';
      const periodLabel = t(`period.${period}`);
      paymentLabel = t('payment.paidSubscription', {
        price,
        period: periodLabel,
      });
      paymentAriaLabel = t('payment.paidSubscriptionAria', {
        price,
        period: periodLabel,
      });
    }
  } else {
    const price = formatMoney(access.price, locale);
    paymentLabel = t('payment.paidOneTime', { price });
    paymentAriaLabel = t('payment.paidOneTimeAria', { price });
  }

  const gapClass = detail ? 'gap-2' : 'gap-1';
  const sizeClass = detail ? 'text-xs px-2.5 py-1' : 'text-[0.6875rem] px-2 py-0.5';

  const visibilityClass = cn(
    sizeClass,
    isPrivate
      ? 'bg-surface-info text-text-on-info border-transparent'
      : 'bg-surface-default text-text-secondary border-border-subtle',
  );

  const paymentClass = cn(
    sizeClass,
    isPaid
      ? 'bg-surface-warning text-text-on-warning border-transparent'
      : 'bg-surface-success text-text-on-success border-transparent',
  );

  return (
    <span
      role="group"
      aria-label={t('groupLabel')}
      className={cn('inline-flex flex-wrap items-center', gapClass, className)}
    >
      <Badge
        variant="outline"
        className={visibilityClass}
        aria-label={
          isPrivate ? t('visibility.privateAria') : t('visibility.publicAria')
        }
      >
        {visibilityLabel}
      </Badge>
      <Badge
        variant="outline"
        className={paymentClass}
        aria-label={paymentAriaLabel}
      >
        {paymentLabel}
      </Badge>
    </span>
  );
}

export default AccessBadges;
