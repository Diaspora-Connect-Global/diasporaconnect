import { Suspense } from 'react';
import WalletHeader from '@/components/wallet/WalletHeader';
import BalanceCard from '@/components/wallet/BalanceCard';
import TransactionHistory from '@/components/wallet/TransactionHistory';
import LoadingScreen from '@/components/custom/LoadingScreen';

export default function WalletPage() {
  return (
    <div className="h-app-inner overflow-y-auto" style={{ backgroundColor: '#F5F7FA' }}>
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <WalletHeader />

        {/* Balance Card - Full Width */}
        <Suspense fallback={<LoadingScreen text="Loading balance..." />}>
          <BalanceCard />
        </Suspense>

        {/* Transaction History - Full Width */}
        <Suspense fallback={<LoadingScreen text="Loading transactions..." />}>
          <TransactionHistory />
        </Suspense>
      </div>
    </div>
  );
}
