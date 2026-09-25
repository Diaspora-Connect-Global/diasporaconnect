'use client';

import { useQuery } from '@apollo/client/react';
import WalletHeader from '@/components/wallet/WalletHeader';
import BalanceCard from '@/components/wallet/BalanceCard';
import TransactionHistory from '@/components/wallet/TransactionHistory';
import PageLoader from '@/components/custom/PageLoader';
import { MY_PAYMENT_INTENTS } from '@/services/gql/payments';
import type { MyPaymentIntentsResponse } from '@/services/gql/types/payments';

export default function WalletPage() {
  // The balance card and the first page of the history each run their own
  // query. These are the SAME queries with the SAME variables and policy, so
  // Apollo shares them; the page only watches them so it can show one loader
  // and then the whole wallet, instead of "GHS 0.00" before the real balance.
  const { data: balanceData, loading: balanceLoading } = useQuery<MyPaymentIntentsResponse>(
    MY_PAYMENT_INTENTS,
    { variables: { page: 1, limit: 100 }, fetchPolicy: 'cache-and-network' },
  );
  const { data: historyData, loading: historyLoading } = useQuery<MyPaymentIntentsResponse>(
    MY_PAYMENT_INTENTS,
    { variables: { page: 1, limit: 20 }, fetchPolicy: 'cache-and-network' },
  );
  const ready = !(balanceLoading && !balanceData) && !(historyLoading && !historyData);

  return (
    <>
      {/* Children stay mounted (hidden) so their queries start in parallel. */}
      {!ready && <PageLoader />}
      <div
        className={`h-app-inner overflow-y-auto ${ready ? '' : 'hidden'}`}
        style={{ backgroundColor: '#F5F7FA' }}
        aria-hidden={!ready}
      >
        <div className="max-w-7xl mx-auto p-4 space-y-6">
          {/* Header */}
          <WalletHeader />

          {/* Balance Card - Half width on desktop, full on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="w-full">
              <BalanceCard />
            </div>
            {/* Empty div for spacing on desktop */}
            <div className="hidden lg:block"></div>
          </div>

          {/* Transaction History - Full Width */}
          <TransactionHistory />
        </div>
      </div>
    </>
  );
}
