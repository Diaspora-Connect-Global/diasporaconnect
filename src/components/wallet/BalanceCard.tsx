'use client';

import { useState } from 'react';
import { EyeIcon, EyeOffIcon, LockIcon, WalletIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { ButtonType3 } from '@/components/custom/button';
import { useQuery } from '@apollo/client/react';
import { MY_PAYMENT_INTENTS } from '@/services/gql/payments';
import type { MyPaymentIntentsResponse } from '@/services/gql/types/payments';

export default function BalanceCard() {
  const [showBalance, setShowBalance] = useState(true);
  const t = useTranslations('wallet.balance');

  const { data } = useQuery<MyPaymentIntentsResponse>(MY_PAYMENT_INTENTS, {
    variables: { page: 1, limit: 100 },
    fetchPolicy: 'cache-and-network',
  });

  const intents = data?.myPaymentIntents?.payment_intents ?? [];

  const totalSpent = intents
    .filter((i) => i.status === 'CONFIRMED')
    .reduce((sum, i) => sum + (i.gross_amount ?? 0), 0) / 100;

  const inEscrow = intents
    .filter((i) => i.status === 'PENDING')
    .reduce((sum, i) => sum + (i.gross_amount ?? 0), 0) / 100;

  const currency = intents[0]?.currency ?? 'GHS';

  const formatCurrency = (amount: number) => {
    if (!showBalance) return '••••••';
    return `${currency} ${amount.toFixed(2)}`;
  };

  return (
    <Card className="bg-[#0D1B2A] border-none shadow-lg h-[200px]">
      <CardContent className="p-6 h-full flex flex-col justify-between relative">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <p className="body-small text-white/70">{t('totalBalance')}</p>
              <ButtonType3
                onClick={() => setShowBalance(!showBalance)}
                className="p-1 hover:bg-white/10 rounded transition-colors border-0 bg-transparent min-w-0 text-white/70"
                aria-label={showBalance ? t('hideBalance') : t('showBalance')}
              >
                {showBalance ? (
                  <EyeOffIcon className="w-4 h-4 text-white/70" />
                ) : (
                  <EyeIcon className="w-4 h-4 text-white/70" />
                )}
              </ButtonType3>
            </div>
            <h2 className="text-[36px] font-bold text-white leading-tight">
              {formatCurrency(totalSpent)}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <LockIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="caption-small text-white/60">{t('inEscrow')}</p>
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
              <p className="caption-small text-white/60">{t('available')}</p>
              <p className="body-medium font-semibold text-white">
                {formatCurrency(Math.max(0, totalSpent - inEscrow))}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
