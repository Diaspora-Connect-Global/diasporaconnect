'use client';

import { useState } from 'react';
import { EyeIcon, EyeOffIcon, LockIcon, WalletIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ButtonType2 } from '@/components/custom/button';

export default function BalanceCard() {
  const [showBalance, setShowBalance] = useState(true);
  
  // Mock data - replace with real data from your API
  const totalBalance = 1200.00;
  const inEscrow = 500.00;
  const available = 700.00;

  const formatCurrency = (amount: number) => {
    return showBalance 
      ? `$${amount.toFixed(2)}` 
      : '••••••';
  };

  const handleWithdraw = () => {
    console.log('Withdraw clicked');
    // Add withdraw logic
  };

  return (
    <Card className="bg-[#0D1B2A] border-none shadow-lg h-[200px]">
      <CardContent className="p-6 h-full flex flex-col justify-between relative">
        {/* Top Section with Balance and Withdraw Button */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <p className="body-small text-white/70">Total Balance</p>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                aria-label={showBalance ? 'Hide balance' : 'Show balance'}
              >
                {showBalance ? (
                  <EyeOffIcon className="w-4 h-4 text-white/70" />
                ) : (
                  <EyeIcon className="w-4 h-4 text-white/70" />
                )}
              </button>
            </div>
            <h2 className="text-[36px] font-bold text-white leading-tight">
              {formatCurrency(totalBalance)}
            </h2>
          </div>

          {/* Withdraw Button - Top Right */}
          <ButtonType2
            onClick={handleWithdraw}
            className="bg-[#3CCF4E] hover:bg-[#35b944] text-white px-6 py-2 rounded-full text-sm font-semibold"
          >
            Withdraw
          </ButtonType2>
        </div>

        {/* Bottom Section with Sub-balances */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <LockIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="caption-small text-white/60">In Escrow</p>
              <p className="body-medium font-semibold text-white">
                {formatCurrency(inEscrow)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <WalletIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="caption-small text-white/60">Available</p>
              <p className="body-medium font-semibold text-white">
                {formatCurrency(available)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
