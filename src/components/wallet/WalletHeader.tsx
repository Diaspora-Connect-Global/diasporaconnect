'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpIcon, Info, RefreshCwIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { MY_PAYMENT_INTENTS } from '@/services/gql/payments';
import { GET_MY_VENDOR } from '@/services/gql/vendor';
import type { GetMyVendorResponse } from '@/services/gql/types/vendor';

const BTN =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand';

/**
 * Title, refresh and Withdraw. Payouts exist only for sellers (`requestPayout`
 * needs a vendor the caller owns), so Withdraw is a link into the payout flow
 * for vendors and a disabled button with the reason for everyone else. It never
 * routes a non-vendor into /becomeavendor and never calls a payout mutation.
 */
export default function WalletHeader() {
  const t = useTranslations('walletPage');
  const locale = useLocale();
  const client = useApolloClient();
  const [refreshing, setRefreshing] = useState(false);

  // Same query the vendors layout and the Home activity card use (shared cache).
  const { data, loading } = useQuery<GetMyVendorResponse>(GET_MY_VENDOR, {
    fetchPolicy: 'cache-first',
    errorPolicy: 'all',
  });
  const isVendor = Boolean(data?.getMyVendor);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await client.refetchQueries({ include: [MY_PAYMENT_INTENTS] });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label={t('refresh')}
            className="grid size-11 place-items-center rounded-full border border-border-subtle bg-surface-default text-text-secondary hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand disabled:opacity-60"
          >
            <RefreshCwIcon className={`size-5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
          </button>
          {isVendor ? (
            <Link
              href={`/${locale}/vendors/payouts`}
              data-testid="wallet-withdraw"
              className={`${BTN} bg-surface-brand text-white hover:opacity-90`}
            >
              <ArrowUpIcon className="size-4" aria-hidden />
              {t('withdraw')}
            </Link>
          ) : (
            <button
              type="button"
              disabled
              data-testid="wallet-withdraw"
              aria-describedby="wallet-withdraw-note"
              className={`${BTN} cursor-not-allowed bg-surface-subtle text-muted-foreground`}
            >
              <ArrowUpIcon className="size-4" aria-hidden />
              {t('withdraw')}
            </button>
          )}
        </div>
      </div>
      {!isVendor && (
        <p
          id="wallet-withdraw-note"
          className="flex items-start gap-2 rounded-xl bg-surface-info px-3 py-2 text-xs leading-relaxed text-text-info"
        >
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {loading ? t('withdrawChecking') : t('withdrawNote')}
        </p>
      )}
    </header>
  );
}
