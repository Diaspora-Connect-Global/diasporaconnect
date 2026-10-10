'use client';

import { useEffect, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useLocale, useTranslations } from 'next-intl';
import { CONVERT_CURRENCY } from '@/services/gql/marketplace';
import { formatAmountWithCurrency } from '@/lib/displayCurrency';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import type { Event } from '@/services/gql/events';

/**
 * The price line (Free / Paid / "GH₵ 50.00 per ticket"), converted to the
 * viewer's display currency like the page always did. Amounts are integer minor
 * units on the wire; ÷100 happens here, once, at display. Only the conversion
 * result is state, so the label can never loop the effect that fetches it.
 */
export function useEventPriceLabel(event: Event | null): string {
  const t = useTranslations('eventPage.overview');
  const apollo = useApolloClient();
  const locale = useLocale();
  const { currency: display } = useDisplayCurrency();
  const [converted, setConverted] = useState<{ key: string; cents: number } | null>(null);

  const ticket = event?.tickets?.find((x) => (x?.priceInCents ?? 0) > 0) ?? event?.tickets?.[0];
  const cents = ticket?.priceInCents ?? 0;
  const from = (ticket?.currency ?? event?.currency ?? 'USD').toUpperCase();
  const needsConversion = Boolean(event?.isPaid) && cents > 0 && from !== display;
  const key = `${event?.id}:${cents}:${from}:${display}`;

  useEffect(() => {
    if (!needsConversion) return;
    let cancelled = false;
    apollo
      .query<{ convertCurrency?: { success: boolean; converted_amount: number } }>({
        query: CONVERT_CURRENCY,
        variables: { amount: cents, from_currency: from, to_currency: display },
        fetchPolicy: 'no-cache',
      })
      .then(({ data }) => {
        const r = data?.convertCurrency;
        if (!cancelled && r?.success && typeof r.converted_amount === 'number') setConverted({ key, cents: r.converted_amount });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [needsConversion, apollo, cents, from, display, key]);

  if (!event) return '';
  if (!event.isPaid) return t('free');
  if (cents <= 0) return t('paid');
  if (from === display) return t('perTicket', { price: formatAmountWithCurrency(cents / 100, display, locale) });
  if (converted?.key === key) return t('perTicket', { price: formatAmountWithCurrency(converted.cents / 100, display, locale) });
  return t('perTicket', { price: `${from} ${(cents / 100).toFixed(2)}` });
}
