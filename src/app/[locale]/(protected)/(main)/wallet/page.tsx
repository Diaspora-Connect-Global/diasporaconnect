import { Suspense } from 'react';
import WalletHeader from '@/components/wallet/WalletHeader';
import BalanceCard from '@/components/wallet/BalanceCard';
import QuickActions from '@/components/wallet/QuickActions';
import TransactionHistory from '@/components/wallet/TransactionHistory';
import LoadingScreen from '@/components/custom/LoadingScreen';

export default function WalletPage() {
  return (
    <div className="h-app-inner overflow-y-auto bg-surface-subtle">
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <WalletHeader />

        {/* Balance Overview */}
        <Suspense fallback={<LoadingScreen text="Loading balance..." />}>
          <BalanceCard />
        </Suspense>

        {/* Quick Actions */}
        <QuickActions />

        {/* Transaction History */}
        <Suspense fallback={<LoadingScreen text="Loading transactions..." />}>
          <TransactionHistory />
        </Suspense>
      </div>
    </div>
  );
}
