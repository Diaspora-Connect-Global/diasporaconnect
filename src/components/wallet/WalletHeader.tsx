'use client';

import { SettingsIcon, RefreshCwIcon } from 'lucide-react';
import { ButtonType3 } from '@/components/custom/button';

export default function WalletHeader() {
  const handleRefresh = () => {
    console.log('Refreshing wallet data...');
    // Add refresh logic
  };

  const handleSettings = () => {
    console.log('Opening wallet settings...');
    // Navigate to settings
  };

  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="heading-large text-text-primary">Overview</h1>
      </div>

      <div className="flex gap-2">
       <ButtonType2
          onClick={handleWithdraw}
          className="flex items-center justify-center py-6 px-6 gap-3 w-full max-w-xs rounded-md"
        >
          <ArrowUpIcon className="w-5 h-5" />
          <span className="label-large">Withdraw</span>
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
