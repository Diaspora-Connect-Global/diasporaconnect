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

        {/* Two column grid for Balance and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Balance Card (half width on desktop) */}
          <div className="w-full">
            <Suspense fallback={<LoadingScreen text="Loading balance..." />}>
              <BalanceCard />
            </Suspense>
          </div>

        {/* Full Width - Transaction History */}
        <Suspense fallback={<LoadingScreen text="Loading transactions..." />}>
          <TransactionHistory />
        </Suspense>
      </div>
    </div>
  );
}
