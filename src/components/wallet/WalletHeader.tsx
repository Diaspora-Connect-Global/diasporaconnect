'use client';

import { ArrowUpIcon, RefreshCwIcon } from 'lucide-react';
import { ButtonType2, ButtonType3 } from '@/components/custom/button';

export default function WalletHeader() {
  const handleRefresh = () => {
    console.log('Refreshing wallet data...');
    // Add refresh logic
  };

  const handleSettings = () => {
    console.log('Opening wallet settings...');
    // Navigate to settings
  };

    const handleWithdraw = () => {
    console.log('Withdraw clicked');
  };

  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="heading-large text-text-primary">Overview</h1>
      </div>

      <div className="flex gap-2">
              {/* Withdraw Button - Top Right */}
        <ButtonType2
          onClick={handleWithdraw}
          className="bg-[#3CCF4E] hover:bg-[#35b944] text-white px-6 py-2 rounded-full text-sm font-semibold"
        >
          <ArrowUpIcon className="w-5 h-5" />
          Withdraw
        </ButtonType2>
        
        <ButtonType3
          onClick={handleRefresh}
          className="p-2 hover:bg-surface-subtle rounded-full transition-colors"
          aria-label="Refresh wallet"
        >
          <RefreshCwIcon className="w-5 h-5" />
        </ButtonType3>
        
      </div>
    </div>
  );
}
