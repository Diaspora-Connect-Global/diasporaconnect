'use client';

import { useState } from 'react';
import { FilterIcon } from 'lucide-react';
import { ButtonType3 } from '@/components/custom/button';
import TransactionItem from './TransactionItem';

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'refund';
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

export default function TransactionHistory() {
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');

  // Mock data - replace with real data
  const transactions: Transaction[] = [
    { 
      id: '1', 
      type: 'deposit', 
      amount: 300.00, 
      date: 'Dec 1, 2025', 
      status: 'completed' 
    },
    { 
      id: '2', 
      type: 'refund', 
      amount: 100.00, 
      date: 'Dec 3, 2025', 
      status: 'pending' 
    },
    { 
      id: '3', 
      type: 'withdrawal', 
      amount: 150.00, 
      date: 'Nov 28, 2025', 
      status: 'completed' 
    },
    { 
      id: '4', 
      type: 'deposit', 
      amount: 500.00, 
      date: 'Nov 20, 2025', 
      status: 'completed' 
    },
    { 
      id: '5', 
      type: 'refund', 
      amount: 50.00, 
      date: 'Nov 20, 2025', 
      status: 'failed' 
    },
  ];

  const filteredTransactions = filter === 'all' 
    ? transactions 
    : transactions.filter(t => t.status === filter);

  const tabs = [
    { value: 'all', label: 'All Transactions' },
    { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed' },
  ] as const;

  return (
    <div className="bg-surface-default rounded-lg p-6 border border-border-subtle">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="heading-small text-text-primary">Transaction History</h3>
        
        <ButtonType3 className="flex items-center gap-2">
          <FilterIcon className="w-4 h-4" />
          <span className="label-medium">Filter</span>
        </ButtonType3>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`
              px-4 py-2 rounded-full whitespace-nowrap label-medium transition-colors
              ${filter === tab.value 
                ? 'bg-surface-brand text-text-white' 
                : 'bg-surface-subtle text-text-secondary hover:bg-surface-tertiary'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      <div className="space-y-2">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))
        ) : (
          <div className="text-center py-12">
            <p className="body-large text-text-secondary">
              No {filter !== 'all' ? filter : ''} transactions found
            </p>
          </div>
        )}
      </div>

      {/* Load More */}
      {filteredTransactions.length > 0 && (
        <div className="mt-6 text-center">
          <ButtonType3 className="px-6 py-2">
            Load More
          </ButtonType3>
        </div>
      )}
    </div>
  );
}
