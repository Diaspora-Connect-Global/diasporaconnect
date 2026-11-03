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
        className={`h-app-inner overflow-y-auto scrollbar-hide bg-background ${ready ? '' : 'hidden'}`}
        aria-hidden={!ready}
      >
        <div className="mx-auto w-full space-y-5 px-4 py-4 pb-10 lg:w-[80vw] lg:px-0 lg:py-6">
          <WalletHeader />
          <BalanceCard />
          <TransactionHistory />
        </div>
      </div>
    </>
  );
}
