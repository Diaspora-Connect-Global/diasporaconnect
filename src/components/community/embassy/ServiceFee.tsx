'use client';

import { useLocale, useTranslations } from 'next-intl';
import { formatMoney } from '@/types/money';
import { useConvertedDisplayPrice } from '@/hooks/useConvertedDisplayPrice';

/**
 * Presentational embassy service-fee label.
 *
 * Mirrors the marketplace Checkout "converted display price with the original
 * listing-currency amount as a muted caption" pattern. The platform still
 * SETTLES in the listing currency (`currency`) — this is DISPLAY-ONLY:
 *
 *  - `minor == 0` (or nullish) → "Free".
 *  - Otherwise the primary line shows the viewer's display-currency amount
 *    (via `useConvertedDisplayPrice`), falling back to the listing-currency
 *    `formatMoney` when no conversion is available (display === listing / no
 *    rate / network error).
 *  - When a conversion is shown, the original listing-currency amount is added
 *    below as a muted secondary caption.
 *
 * One fee per instance: the conversion hook is called unconditionally at the
 * top level, so render exactly one `<ServiceFee />` per fee.
 */
interface ServiceFeeProps {
  minor?: number | null;
  currency?: string | null;
  className?: string;
  /** `lg` emphasises the primary line (totals); `sm` is the inline default. */
  size?: 'sm' | 'lg';
}

export function ServiceFee({ minor, currency, className, size = 'sm' }: ServiceFeeProps) {
  const locale = useLocale();
  const t = useTranslations('community.embassy.services.fee');
  const code = currency || 'EUR';
  const major = (minor ?? 0) / 100;

  // Top-level hook call (one fee per component instance). Returns the
  // display-currency label, or null when conversion is unnecessary/unavailable.
  const converted = useConvertedDisplayPrice(major, code);

  if (minor === undefined || minor === null || minor === 0) {
    return <span className={className}>{t('free')}</span>;
  }

  const original = formatMoney(minor, code, locale);
  const primary = converted ?? original;
  const primaryClass = size === 'lg' ? 'label-medium' : '';

  return (
    <span className={className}>
      <span className={primaryClass}>{converted ? `≈ ${primary}` : primary}</span>
      {converted ? (
        <span className="caption-small block text-text-secondary">{original}</span>
      ) : null}
    </span>
  );
}

export default ServiceFee;
