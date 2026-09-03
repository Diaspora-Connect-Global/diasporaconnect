'use client';

import type { Transaction } from './TransactionHistory';
import { useTranslations } from 'next-intl';

interface TransactionItemProps {
  transaction: Transaction;
}

export default function TransactionItem({ transaction }: TransactionItemProps) {
  const t = useTranslations('wallet.transactions');

  const getStatusColor = () => {
    switch (transaction.status) {
      case 'completed':
        return 'bg-surface-success text-text-success';
      case 'pending':
        return 'bg-surface-warning text-text-warning';
      case 'failed':
        return 'bg-surface-danger text-text-danger';
      default:
        return 'bg-surface-subtle text-text-secondary';
    }
  };

  const getStatusLabel = () => {
    switch (transaction.status) {
      case 'completed':
        return t('completed');
      case 'pending':
        return t('pending');
      case 'failed':
        return t('failed');
      default:
        return transaction.status;
    }
  };

  const getTypeLabel = () => {
    switch (transaction.type) {
      case 'deposit':
        return t('types.deposit');
      case 'withdrawal':
        return t('types.withdrawal');
      case 'refund':
        return t('types.refund');
      default:
        return transaction.type;
    }
  };

  const getAmountPrefix = () => {
    return transaction.type === 'deposit' ? '+' : '-';
  };

  const getTypeIcon = () => {
    switch (transaction.type) {
      case 'deposit':
        return '↓';
      case 'withdrawal':
        return '↑';
      case 'refund':
        return '↻';
      default:
        return '';
    }
  };

  return (
    <div className="grid grid-cols-4 gap-4 px-6 py-4 hover:bg-surface-subtle/50 transition-colors">
      {/* Date */}
      <div className="flex items-center">
        <p className="body-small text-text-primary">
          {transaction.date}
        </p>
      </div>

      {/* Type */}
      <div className="flex items-center gap-2">
        <span className="body-small text-text-secondary">{getTypeIcon()}</span>
        <p className="body-small text-text-primary">
          {getTypeLabel()}
        </p>
      </div>

      {/* Amount */}
      <div className="flex items-center">
        <p className="body-medium text-text-primary font-semibold">
          {getAmountPrefix()}${transaction.amount.toFixed(2)}
        </p>
      </div>

      {/* Status */}
      <div className="flex items-center justify-end">
        <span className={`inline-flex items-center px-3 py-1 rounded-full caption-medium ${getStatusColor()}`}>
          {getStatusLabel()}
        </span>
      </div>
    </div>
  );
}
