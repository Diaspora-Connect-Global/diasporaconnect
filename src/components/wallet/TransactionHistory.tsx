'use client';

import { useState } from 'react';
import { ChevronDownIcon, FilterIcon, ArrowDownIcon, ArrowUpIcon, RefreshCwIcon } from 'lucide-react';
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

  // Mock data matching the JSON spec
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
      date: 'Nov 25, 2025', 
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-[#3CCF4E]/10 text-[#3CCF4E]';
      case 'pending':
        return 'bg-[#F4C542]/10 text-[#F4C542]';
      case 'failed':
        return 'bg-[#E74C3C]/10 text-[#E74C3C]';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownIcon className="w-4 h-4 text-[#3CCF4E]" />;
      case 'withdrawal':
        return <ArrowUpIcon className="w-4 h-4 text-[#3CCF4E]" />;
      case 'refund':
        return <RefreshCwIcon className="w-4 h-4 text-[#F4C542]" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-gray-200">
        <h3 className="text-xl font-semibold text-[#1A1A1A]">Transaction History</h3>
        
        <div className="flex items-center gap-3">
          {/* Filter Dropdown */}
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-[180px] border-gray-300">
              <div className="flex items-center gap-2">
                <SelectValue placeholder="All Transactions" />
                <ChevronDownIcon className="w-4 h-4" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transactions</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          {/* Filter Icon Button */}
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <FilterIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-4 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200">
        <p className="text-sm font-medium text-gray-600">Date</p>
        <p className="text-sm font-medium text-gray-600">Type</p>
        <p className="text-sm font-medium text-gray-600">Amount</p>
        <p className="text-sm font-medium text-gray-600 text-right">Status</p>
      </div>

      {/* Transactions List */}
      <div className="divide-y divide-gray-200">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction) => (
            <div key={transaction.id} className="grid grid-cols-4 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
              {/* Date */}
              <div className="flex items-center">
                <p className="text-sm text-[#1A1A1A]">
                  {transaction.date}
                </p>
              </div>

              {/* Type */}
              <div className="flex items-center gap-2">
                {getTypeIcon(transaction.type)}
                <p className="text-sm text-[#1A1A1A] capitalize">
                  {transaction.type}
                </p>
              </div>

              {/* Amount */}
              <div className="flex items-center">
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  ${transaction.amount.toFixed(2)}
                </p>
              </div>

              {/* Status */}
              <div className="flex items-center justify-end">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(transaction.status)}`}>
                  {transaction.status}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 px-6">
            <p className="text-base text-gray-500">
              No {filter !== 'all' ? filter : ''} transactions found
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
