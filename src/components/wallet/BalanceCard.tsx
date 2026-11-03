'use client';

import { useMemo, useState } from 'react';
import { Clock, Eye, EyeOff, ReceiptText } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@apollo/client/react';
import { MY_PAYMENT_INTENTS } from '@/services/gql/payments';
import type { MyPaymentIntentsResponse } from '@/services/gql/types/payments';
import { formatMoney } from '@/types/money';
import { ICON_CHIP_CLASS, TONE_CLASS } from '@/components/more/MoreLinkCard';

const WINDOW = 100;

/** Sum gross_amount (integer minor units) per currency; a payment is single-currency. */
function sumByCurrency(rows: { currency?: string | null; gross_amount?: number | null }[]) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const c = (r.currency || 'GHS').toUpperCase();
    m.set(c, (m.get(c) ?? 0) + (r.gross_amount ?? 0));
  }
  return [...m.entries()];
}

/**
 * What this page can honestly total: the viewer's own payment intents. There is
 * no wallet balance in the API, so these are "total paid" (CONFIRMED) and
 * "awaiting payment" (PENDING) - never a balance. Minor units are formatted by
 * formatMoney (the single division by 100).
 */
export default function BalanceCard() {
  const t = useTranslations('walletPage.summary');
  const locale = useLocale();
  const [hidden, setHidden] = useState(false);

  const { data } = useQuery<MyPaymentIntentsResponse>(MY_PAYMENT_INTENTS, {
    variables: { page: 1, limit: WINDOW },
    fetchPolicy: 'cache-and-network',
  });

  const intents = useMemo(() => data?.myPaymentIntents?.payment_intents ?? [], [data]);
  const total = data?.myPaymentIntents?.total ?? 0;
  const paid = useMemo(() => sumByCurrency(intents.filter((i) => i.status === 'CONFIRMED')), [intents]);
  const pending = useMemo(() => sumByCurrency(intents.filter((i) => i.status === 'PENDING')), [intents]);

  const render = (rows: [string, number][]) =>
    rows.length === 0 ? (
      <p className="text-2xl font-bold text-text-primary">{hidden ? '••••' : formatMoney(0, 'GHS', locale)}</p>
    ) : (
      rows.map(([cur, amt]) => (
        <p key={cur} className="text-2xl font-bold text-text-primary">
          {hidden ? '••••' : formatMoney(amt, cur, locale)}
        </p>
      ))
    );

  const cards = [
    { key: 'paid', icon: ReceiptText, tone: ICON_CHIP_CLASS, label: t('totalPaid'), hint: t('totalPaidHint'), rows: paid },
    { key: 'pending', icon: Clock, tone: TONE_CLASS.warning, label: t('pending'), hint: t('pendingHint'), rows: pending },
  ];

  return (
    <section aria-label={t('label')} className="space-y-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="wallet-summary">
        {cards.map(({ key, icon: Icon, tone, label, hint, rows }) => (
          <div key={key} className="rounded-2xl border border-border-subtle bg-surface-default p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className={`grid size-11 shrink-0 place-items-center rounded-full ${tone}`}>
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-secondary">{label}</p>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </div>
              {key === 'paid' && (
                <button
                  type="button"
                  onClick={() => setHidden((h) => !h)}
                  aria-pressed={hidden}
                  aria-label={hidden ? t('showAmounts') : t('hideAmounts')}
                  className="grid size-11 shrink-0 place-items-center rounded-full text-text-secondary hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
                >
                  {hidden ? <Eye className="size-5" aria-hidden /> : <EyeOff className="size-5" aria-hidden />}
                </button>
              )}
            </div>
            <div className="mt-3 break-words">{render(rows)}</div>
          </div>
        ))}
      </div>
      {total > WINDOW && (
        <p className="text-xs text-muted-foreground">{t('capped', { count: WINDOW })}</p>
      )}
    </section>
  );
}
