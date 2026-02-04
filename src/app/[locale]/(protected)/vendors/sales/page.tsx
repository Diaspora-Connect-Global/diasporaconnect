"use client";
import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface SalesOrder {
  id: string;
  orderNumber: string;
  date: string;
  customer: string;
  amount: string;
  payoutStatus: 'paid' | 'in-escrow';
}

const SalesDashboard = () => {
  const t = useTranslations('vendors.sales');
  const tCommon = useTranslations('common');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('all-time');
  const [statusFilter, setStatusFilter] = useState('all-status');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const salesData: SalesOrder[] = [
    { id: '1', orderNumber: '0001', date: '25 Nov 2025', customer: 'John Doe', amount: 'GH₵390.00', payoutStatus: 'paid' },
    { id: '2', orderNumber: '0001', date: '25 Nov 2025', customer: 'John Doe', amount: 'GH₵390.00', payoutStatus: 'in-escrow' },
    { id: '3', orderNumber: '0001', date: '25 Nov 2025', customer: 'John Doe', amount: 'GH₵390.00', payoutStatus: 'in-escrow' },
    { id: '4', orderNumber: '0001', date: '25 Nov 2025', customer: 'John Doe', amount: 'GH₵390.00', payoutStatus: 'paid' },
  ];

  const totalPages = 10;

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">{t('title')}</h1>
          <button className="bg-blue-900 hover:bg-blue-800 text-white px-6 py-2.5 rounded-full font-medium transition-colors">
            {t('exportSales')}
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" aria-hidden="true" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Time Filter */}
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
            aria-label={t('allTime')}
          >
            <option value="all-time">{t('allTime')}</option>
            <option value="today">{t('today')}</option>
            <option value="this-week">{t('thisWeek')}</option>
            <option value="this-month">{t('thisMonth')}</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
            aria-label={t('payoutStatus')}
          >
            <option value="all-status">{t('payoutStatus')}</option>
            <option value="paid">{t('paid')}</option>
            <option value="in-escrow">{t('inEscrow')}</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">{t('orderNumber')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">{t('date')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">{t('customer')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">{t('amount')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">{t('payoutStatus')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {salesData.map((order) => (
                <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900">{order.orderNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{order.customer}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{order.amount}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        order.payoutStatus === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {order.payoutStatus === 'paid' ? t('paid') : t('inEscrow')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
                      {t('viewOrder')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{t('rowsPerPage')}</span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {t('page', { current: currentPage, total: totalPages })}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label={tCommon('previousPage')}
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label={tCommon('nextPage')}
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;