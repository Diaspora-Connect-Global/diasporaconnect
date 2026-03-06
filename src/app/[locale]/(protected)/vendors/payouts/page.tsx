"use client";
import React, { useState } from 'react';
import { Search, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Transaction {
  id: string;
  transactionId: string;
  date: string;
  type: string;
  amount: string;
}

const PayoutsDashboard = () => {
  const t = useTranslations('vendors.payouts');
  const tCommon = useTranslations('common');
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const transactions: Transaction[] = [
    { id: '1', transactionId: '0001', date: '25 Nov 2025', type: 'Withdrawal', amount: 'GH₵390.00' },
    { id: '2', transactionId: '0001', date: '25 Nov 2025', type: 'Withdrawal', amount: 'GH₵390.00' },
    { id: '3', transactionId: '0001', date: '25 Nov 2025', type: 'Escrow to wallet', amount: 'GH₵390.00' },
  ];

  const getLocalizedType = (type: string): string => {
    return type === 'Withdrawal' ? t('withdrawal') : t('escrowToWallet');
  };

  const totalPages = 10;

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <h1 className="text-3xl font-bold text-text-primary mb-6">{t('title')}</h1>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Wallet Balance Card */}
          <div className="bg-surface-default rounded-2xl p-6 shadow-sm border border-border-subtle">
            <p className="text-sm text-text-secondary mb-2">{t('walletBalance')}</p>
            <p className="text-4xl font-bold text-text-primary mb-4">GH₵0.00</p>
            <button className="bg-surface-brand text-text-white hover:opacity-90 px-6 py-2.5 rounded-full font-medium transition-colors">
              {t('withdraw')}
            </button>
          </div>

          {/* Escrow Account Card */}
          <div className="bg-surface-default rounded-2xl p-6 shadow-sm border border-border-subtle">
            <p className="text-sm text-text-secondary mb-2">{t('escrowAccount')}</p>
            <p className="text-4xl font-bold text-text-tertiary mb-2">GH₵5000.00</p>
            <p className="text-xs text-text-brand">
              {t('escrowDescription')}
            </p>
          </div>
        </div>

        {/* Payout Method Card */}
        <div className="bg-surface-default rounded-2xl p-6 shadow-sm border border-border-subtle mb-8">
          <p className="text-base font-semibold text-text-primary mb-2">{t('payoutMethod')}</p>
          <p className="text-sm text-text-secondary mb-4">{t('payoutMethodDescription')}</p>
          <button className="bg-surface-brand text-text-white hover:opacity-90 px-6 py-2.5 rounded-full font-medium transition-colors">
            {t('addPayoutMethod')}
          </button>
        </div>

        {/* History Section */}
        <div className="bg-surface-default rounded-2xl shadow-sm border border-border-subtle overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold text-text-primary mb-4">{t('history')}</h2>

            {/* Search and Filter */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-5 h-5" aria-hidden="true" />
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default"
                />
              </div>

              <button className="flex items-center gap-2 px-4 py-2.5 border border-border-subtle rounded-lg hover:bg-surface-subtle transition-colors bg-surface-default" aria-label={t('allTime')}>
                <Calendar className="w-5 h-5 text-text-secondary" aria-hidden="true" />
                <span className="text-sm text-text-primary">{t('allTime')}</span>
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-subtle border-b border-border-subtle">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-text-primary">{t('transactionId')}</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-text-primary">{t('date')}</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-text-primary">{t('transactionType')}</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-text-primary">{t('amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-border-subtle hover:bg-surface-subtle transition-colors">
                      <td className="px-6 py-4 text-sm text-text-primary">{transaction.transactionId}</td>
                      <td className="px-6 py-4 text-sm text-text-secondary">{transaction.date}</td>
                      <td className="px-6 py-4 text-sm text-text-primary">{getLocalizedType(transaction.type)}</td>
                      <td className="px-6 py-4 text-sm text-text-primary font-medium text-right">{transaction.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">{t('rowsPerPage')}</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  className="px-3 py-1.5 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default cursor-pointer text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-text-secondary">
                  {t('page', { current: currentPage, total: totalPages })}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-surface-subtle disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label={tCommon('previousPage')}
                  >
                    <ChevronLeft className="w-5 h-5 text-text-secondary" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-surface-subtle disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label={tCommon('nextPage')}
                  >
                    <ChevronRight className="w-5 h-5 text-text-secondary" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayoutsDashboard;