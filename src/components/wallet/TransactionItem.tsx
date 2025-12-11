'use client';

import { 
  ArrowDownIcon, 
  ArrowUpIcon, 
  RefreshCwIcon,
  ChevronRightIcon 
} from 'lucide-react';
import type { Transaction } from './TransactionHistory';

interface TransactionItemProps {
  transaction: Transaction;
}

export default function TransactionItem({ transaction }: TransactionItemProps) {
  const getIcon = () => {
    switch (transaction.type) {
      case 'deposit':
        return <ArrowDownIcon className="w-5 h-5" />;
      case 'withdrawal':
        return <ArrowUpIcon className="w-5 h-5" />;
      case 'refund':
        return <RefreshCwIcon className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getIconColor = () => {
    switch (transaction.type) {
      case 'deposit':
        return 'bg-surface-success/20 text-text-success';
      case 'withdrawal':
        return 'bg-surface-warning/20 text-text-warning';
      case 'refund':
        return 'bg-surface-info/20 text-text-info';
      default:
        return 'bg-surface-subtle text-text-secondary';
    }
  };

  const getStatusColor = () => {
    switch (transaction.status) {
      case 'completed':
        return 'text-text-success';
      case 'pending':
        return 'text-text-warning';
      case 'failed':
        return 'text-text-danger';
      default:
        return 'text-text-secondary';
    }
  };

  const getAmountPrefix = () => {
    return transaction.type === 'deposit' ? '+' : '-';
  };

  return (
    <button
      className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-surface-subtle transition-colors group"
      onClick={() => console.log('Transaction details:', transaction.id)}
    >
      {/* Icon */}
      <div className={`p-3 rounded-full ${getIconColor()}`}>
        {getIcon()}
      </div>

      {/* Details */}
      <div className="flex-1 text-left">
        <div className="flex items-center justify-between mb-1">
          <p className="label-large text-text-primary capitalize">
            {transaction.type}
          </p>
          <p className="heading-xsmall text-text-primary">
            {getAmountPrefix()}${transaction.amount.toFixed(2)}
          </p>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="caption-medium text-text-secondary">
            {transaction.date}
          </p>
          <p className={`caption-medium capitalize ${getStatusColor()}`}>
            {transaction.status}
          </p>
        </div>
      </div>

      {/* Arrow */}
      <ChevronRightIcon className="w-5 h-5 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
