'use client';

import { useState } from 'react';
import { Receipt } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@apollo/client/react';
import { EmptyState, ErrorState } from '@/components/feedback';
import { MY_PAYMENT_INTENTS } from '@/services/gql/payments';
import type { MyPaymentIntentsResponse, PaymentIntentRecord } from '@/services/gql/types/payments';
import { formatMoney } from '@/types/money';

type StatusFilter = 'all' | 'paid' | 'pending' | 'failed';
type BadgeKey = 'paid' | 'pending' | 'failed' | 'cancelled';

const LIMIT = 20;
const FILTERS: StatusFilter[] = ['all', 'paid', 'pending', 'failed'];
const BADGE_CLASS: Record<BadgeKey, string> = {
  paid: 'bg-surface-success text-text-success',
  pending: 'bg-surface-warning text-text-warning',
  failed: 'bg-surface-danger text-text-danger',
  cancelled: 'bg-surface-subtle text-text-secondary',
};

function badgeOf(i: PaymentIntentRecord): BadgeKey {
  if (i.status === 'CONFIRMED') return 'paid';
  if (i.status === 'FAILED') return 'failed';
  if (i.status === 'CANCELLED') return 'cancelled';
  return 'pending';
}

const PURPOSES = ['PRODUCT_ORDER', 'SERVICE_ORDER', 'EVENT_TICKET'] as const;

export default function TransactionHistory() {
  const t = useTranslations('walletPage.history');
  const locale = useLocale();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  const { data, loading, error, refetch } = useQuery<MyPaymentIntentsResponse>(MY_PAYMENT_INTENTS, {
    variables: { page, limit: LIMIT },
    fetchPolicy: 'cache-and-network',
  });

  const initialLoading = loading && !data;
  const rows = data?.myPaymentIntents?.payment_intents ?? [];
  const total = data?.myPaymentIntents?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const visible = filter === 'all' ? rows : rows.filter((r) => {
    const b = badgeOf(r);
    return filter === 'failed' ? b === 'failed' || b === 'cancelled' : b === filter;
  });

  const purposeLabel = (p?: string | null) =>
    PURPOSES.includes(p as (typeof PURPOSES)[number]) ? t(`purposes.${p as (typeof PURPOSES)[number]}`) : t('purposes.OTHER');
  const dateLabel = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <section aria-labelledby="wallet-history-title" className="rounded-2xl border border-border-subtle bg-surface-default p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="wallet-history-title" className="text-lg font-semibold text-text-primary">{t('title')}</h2>
        <div role="group" aria-label={t('filterLabel')} className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`min-h-11 rounded-full border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand ${
                filter === f
                  ? 'border-transparent bg-surface-brand text-white'
                  : 'border-border-subtle bg-surface-default text-text-secondary hover:bg-surface-subtle'
              }`}
            >
              {t(`filters.${f}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4" aria-busy={initialLoading}>
        {initialLoading && (
          <ul className="space-y-2" aria-label={t('loading')}>
            {[0, 1, 2].map((n) => (
              <li key={n} className="h-16 animate-pulse rounded-xl bg-surface-subtle" />
            ))}
          </ul>
        )}

        {!initialLoading && error && !data && (
          <ErrorState
            size="sm"
            title={t('errorTitle')}
            description={t('errorDescription')}
            retryLabel={t('retry')}
            onRetry={() => { void refetch(); }}
          />
        )}

        {!initialLoading && !(error && !data) && visible.length === 0 && (
          <EmptyState
            icon={Receipt}
            size="sm"
            title={filter === 'all' ? t('emptyTitle') : t('emptyFilteredTitle')}
            description={filter === 'all' ? t('emptyDescription') : undefined}
          />
        )}

        {visible.length > 0 && (
          <ul className="space-y-2" data-testid="wallet-transactions">
            {visible.map((r) => {
              const b = badgeOf(r);
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-default p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-primary">{purposeLabel(r.purpose)}</p>
                    <p className="text-xs text-muted-foreground">{dateLabel(r.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <p className="text-sm font-semibold text-text-primary">
                      {formatMoney(r.gross_amount ?? 0, r.currency, locale)}
                    </p>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_CLASS[b]}`}>
                      {t(`status.${b}`)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <nav aria-label={t('pagination')} className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="min-h-11 rounded-full border border-border-subtle px-4 text-sm font-medium text-text-secondary hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand disabled:opacity-40"
          >
            {t('prev')}
          </button>
          <span className="text-sm text-muted-foreground">{t('pageOf', { page, total: totalPages })}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="min-h-11 rounded-full border border-border-subtle px-4 text-sm font-medium text-text-secondary hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand disabled:opacity-40"
          >
            {t('next')}
          </button>
        </nav>
      )}
    </section>
  );
}
