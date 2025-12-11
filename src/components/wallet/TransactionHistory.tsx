'use client';

import { useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import TransactionItem from './TransactionItem';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  return (
    <div className="bg-surface-default rounded-lg border border-border-subtle">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-border-subtle">
        <h3 className="heading-small text-text-primary">Transaction History</h3>
        
        {/* Filter Dropdown */}
        <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Transactions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Transactions</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-4 gap-4 px-6 py-3 bg-surface-subtle border-b border-border-subtle">
        <p className="label-small text-text-secondary">Date</p>
        <p className="label-small text-text-secondary">Type</p>
        <p className="label-small text-text-secondary">Amount</p>
        <p className="label-small text-text-secondary text-right">Status</p>
      </div>

      {/* Transactions List */}
      <div className="divide-y divide-border-subtle">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))
        ) : (
          <div className="text-center py-12 px-6">
            <p className="body-large text-text-secondary">
              No {filter !== 'all' ? filter : ''} transactions found
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
