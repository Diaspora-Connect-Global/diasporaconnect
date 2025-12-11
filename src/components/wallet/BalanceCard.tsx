'use client';

import { useState } from 'react';
import { EyeIcon, EyeOffIcon, TrendingUpIcon, TrendingDownIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function BalanceCard() {
  const [showBalance, setShowBalance] = useState(true);
  
  // Mock data - replace with real data from your API
  const totalBalance = 1200.00;
  const inEscrow = 500.00;
  const available = 700.00;
  const monthlyChange = 12.5; // percentage

  const formatCurrency = (amount: number) => {
    return showBalance 
      ? `$${amount.toFixed(2)}` 
      : '••••••';
  };

  return (
    <Card className="bg-gradient-to-br from-surface-brand to-surface-brand-light border-none shadow-lg">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="body-small text-text-white/80 mb-1">Total Balance</p>
            <h2 className="display-small text-text-white">
              {formatCurrency(totalBalance)}
            </h2>
          </div>

          <button
            onClick={() => setShowBalance(!showBalance)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label={showBalance ? 'Hide balance' : 'Show balance'}
          >
            {showBalance ? (
              <EyeOffIcon className="w-5 h-5 text-text-white" />
            ) : (
              <EyeIcon className="w-5 h-5 text-text-white" />
            )}
          </button>
        </div>

        {/* Balance Breakdown */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <p className="caption-medium text-text-white/70 mb-1">In Escrow</p>
            <p className="heading-small text-text-white">
              {formatCurrency(inEscrow)}
            </p>
          </div>

          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <p className="caption-medium text-text-white/70 mb-1">Available</p>
            <p className="heading-small text-text-white">
              {formatCurrency(available)}
            </p>
          </div>
        </div>

        {/* Monthly Change */}
        <div className="flex items-center gap-2 text-text-white/90">
          {monthlyChange >= 0 ? (
            <TrendingUpIcon className="w-4 h-4 text-text-success" />
          ) : (
            <TrendingDownIcon className="w-4 h-4 text-text-danger" />
          )}
          <p className="caption-large">
            <span className={monthlyChange >= 0 ? 'text-text-success' : 'text-text-danger'}>
              {monthlyChange >= 0 ? '+' : ''}{monthlyChange}%
            </span>
            {' '}from last month
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
