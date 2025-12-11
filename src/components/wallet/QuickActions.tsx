'use client';

import { ArrowUpIcon, RefreshCwIcon } from 'lucide-react';
import { ButtonType2 } from '@/components/custom/button';

export default function QuickActions() {
  const handleWithdraw = () => {
    console.log('Withdraw clicked');
  };

  const handleRefresh = () => {
    console.log('Refresh clicked');
  };

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Withdraw Button */}
      <ButtonType2
        onClick={handleWithdraw}
        className="flex items-center justify-center py-6 px-6 gap-3 w-full rounded-lg"
      >
        <ArrowUpIcon className="w-5 h-5" />
        <span className="label-large">Withdraw</span>
      </ButtonType2>

      {/* Refresh Button */}
      <ButtonType2
        onClick={handleRefresh}
        className="flex items-center justify-center py-6 px-6 gap-3 w-full rounded-lg"
      >
        <RefreshCwIcon className="w-5 h-5" />
        <span className="label-large">Refresh</span>
      </ButtonType2>
    </div>
  );
}
