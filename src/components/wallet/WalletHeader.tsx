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
        <h1 className="heading-large text-text-primary">My Wallet</h1>
        <p className="body-small text-text-secondary">
          Manage your funds and transactions
        </p>
      </div>

      <div className="flex gap-2">
        <ButtonType3
          onClick={handleRefresh}
          className="p-2"
          aria-label="Refresh wallet"
        >
          <RefreshCwIcon className="w-5 h-5" />
        </ButtonType3>
        
        <ButtonType3
          onClick={handleSettings}
          className="p-2"
          aria-label="Wallet settings"
        >
          <SettingsIcon className="w-5 h-5" />
        </ButtonType3>
      </div>
    </div>
  );
}
