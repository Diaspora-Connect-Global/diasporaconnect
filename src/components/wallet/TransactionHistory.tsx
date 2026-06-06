'use client';

import { useState } from 'react';
import { ChevronDownIcon, FilterIcon, ArrowDownIcon, ArrowUpIcon, RefreshCwIcon, Receipt } from 'lucide-react';
import { EmptyState } from '@/components/feedback';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import { useQuery } from '@apollo/client/react';
import { MY_PAYMENT_INTENTS } from '@/services/gql/payments';
import type { MyPaymentIntentsResponse, PaymentIntentRecord } from '@/services/gql/types/payments';

type StatusFilter = 'all' | 'completed' | 'pending' | 'failed';

function intentToTransactionType(intent: PaymentIntentRecord): 'deposit' | 'withdrawal' | 'refund' {
  if (intent.status === 'CONFIRMED') return 'deposit';
  if (intent.status === 'FAILED' || intent.status === 'CANCELLED') return 'refund';
  return 'withdrawal';
}

function intentToStatus(intent: PaymentIntentRecord): 'completed' | 'pending' | 'failed' {
  if (intent.status === 'CONFIRMED') return 'completed';
  if (intent.status === 'FAILED' || intent.status === 'CANCELLED') return 'failed';
  return 'pending';
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'refund';
  amount: number;
  currency: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  description?: string;
}

export default function TransactionHistory() {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;
  const t = useTranslations('wallet.transactions');
  const tFeedback = useTranslations('feedback');

  const { data, loading } = useQuery<MyPaymentIntentsResponse>(MY_PAYMENT_INTENTS, {
    variables: { page: currentPage, limit },
    fetchPolicy: 'cache-and-network',
  });

  const intents = data?.myPaymentIntents?.payment_intents ?? [];
  const total = data?.myPaymentIntents?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const transactions: Transaction[] = intents.map((intent) => ({
    id: intent.id,
    type: intentToTransactionType(intent),
    amount: (intent.gross_amount ?? 0) / 100,
    currency: intent.currency ?? 'GHS',
    date: intent.created_at
      ? new Date(intent.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—',
    status: intentToStatus(intent),
    description: intent.description ?? intent.purpose ?? undefined,
  }));

  const filteredTransactions =
    filter === 'all' ? transactions : transactions.filter((tx) => tx.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-[#3CCF4E]/10 text-[#3CCF4E]';
      case 'pending': return 'bg-[#F4C542]/10 text-[#F4C542]';
      case 'failed': return 'bg-[#E74C3C]/10 text-[#E74C3C]';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return t('completed');
      case 'pending': return t('pending');
      case 'failed': return t('failed');
      default: return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'deposit': return t('types.deposit');
      case 'withdrawal': return t('types.withdrawal');
      case 'refund': return t('types.refund');
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowDownIcon className="w-4 h-4 text-[#3CCF4E]" />;
      case 'withdrawal': return <ArrowUpIcon className="w-4 h-4 text-[#3CCF4E]" />;
      case 'refund': return <RefreshCwIcon className="w-4 h-4 text-[#F4C542]" />;
      default: return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between items-center p-6 border-b border-gray-200">
        <h3 className="text-xl font-semibold text-[#1A1A1A]">{t('title')}</h3>

        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={(value: StatusFilter) => { setFilter(value); setCurrentPage(1); }}>
            <SelectTrigger className="w-[180px] border-gray-300">
              <div className="flex items-center gap-2">
                <SelectValue placeholder={t('allTransactions')} />
                <ChevronDownIcon className="w-4 h-4" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allTransactions')}</SelectItem>
              <SelectItem value="completed">{t('completed')}</SelectItem>
              <SelectItem value="pending">{t('pending')}</SelectItem>
              <SelectItem value="failed">{t('failed')}</SelectItem>
            </SelectContent>
          </Select>

          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <FilterIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200">
        <p className="text-sm font-medium text-gray-600">{t('columns.date')}</p>
        <p className="text-sm font-medium text-gray-600">{t('columns.type')}</p>
        <p className="text-sm font-medium text-gray-600">{t('columns.amount')}</p>
        <p className="text-sm font-medium text-gray-600 text-right">{t('columns.status')}</p>
      </div>

      <div className="divide-y divide-gray-200">
        {loading && (
          <div className="text-center py-12 px-6">
            <p className="text-base text-gray-400">Loading transactions…</p>
          </div>
        )}
        {!loading && filteredTransactions.length > 0 ? (
          filteredTransactions.map((tx) => (
            <div key={tx.id} className="grid grid-cols-4 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center">
                <p className="text-sm text-[#1A1A1A]">{tx.date}</p>
              </div>
              <div className="flex items-center gap-2">
                {getTypeIcon(tx.type)}
                <p className="text-sm text-[#1A1A1A]">{getTypeLabel(tx.type)}</p>
              </div>
              <div className="flex items-center">
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  {tx.currency} {tx.amount.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center justify-end">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                  {getStatusLabel(tx.status)}
                </span>
              </div>
            </div>
          ))
        ) : !loading ? (
          <div className="px-6 py-12">
            <EmptyState
              icon={Receipt}
              title={
                filter !== 'all'
                  ? t('noFilteredTransactions', { filter: getStatusLabel(filter) })
                  : tFeedback('empty.transactions.title')
              }
              description={filter === 'all' ? tFeedback('empty.transactions.description') : undefined}
            />
          </div>
        ) : null}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-4 px-6 py-4 border-t border-gray-200">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 text-sm border rounded disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-sm text-gray-500">{currentPage} / {totalPages}</span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1 text-sm border rounded disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
