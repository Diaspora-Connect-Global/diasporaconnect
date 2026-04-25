"use client";
import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { LIST_VENDOR_ORDERS } from '@/services/gql/vendor';
import type { ListVendorOrdersResponse, VendorOrder, OrderStatus } from '@/services/gql/types/vendor';

const ESCROW_STATUSES: OrderStatus[] = ['PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'IN_PROGRESS', 'DELIVERED'];
const PAID_STATUSES: OrderStatus[] = ['COMPLETED'];

function getPayoutStatus(status: OrderStatus): 'paid' | 'in-escrow' | 'other' {
  if (PAID_STATUSES.includes(status)) return 'paid';
  if (ESCROW_STATUSES.includes(status)) return 'in-escrow';
  return 'other';
}

const SalesDashboard = () => {
  const t = useTranslations('vendors.sales');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all-status');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const offset = (currentPage - 1) * rowsPerPage;

  const apiStatus =
    statusFilter === 'paid'
      ? 'COMPLETED'
      : statusFilter === 'in-escrow'
      ? 'IN_PROGRESS'
      : undefined;

  const { data, loading } = useQuery<ListVendorOrdersResponse>(LIST_VENDOR_ORDERS, {
    variables: { status: apiStatus, limit: rowsPerPage, offset },
    fetchPolicy: 'cache-and-network',
  });

  const allOrders: VendorOrder[] = data?.listVendorOrders.items ?? [];
  const totalCount = data?.listVendorOrders.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));

  const filteredOrders = searchTerm
    ? allOrders.filter(
        (o) =>
          o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.buyerId.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allOrders;

  const formatAmount = (amount: number, currency: string) =>
    `${currency} ${(amount / 100).toFixed(2)}`;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-text-primary">{t('title')}</h1>
          <button className="bg-surface-brand text-text-white hover:opacity-90 px-6 py-2.5 rounded-full font-medium transition-colors">
            {t('exportSales')}
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-5 h-5" aria-hidden="true" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2.5 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default cursor-pointer"
            aria-label={t('payoutStatus')}
          >
            <option value="all-status">{t('payoutStatus')}</option>
            <option value="paid">{t('paid')}</option>
            <option value="in-escrow">{t('inEscrow')}</option>
          </select>
        </div>

        <div className="bg-surface-default rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-subtle border-b border-border-subtle">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-text-primary">{t('orderNumber')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-text-primary">{t('date')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-text-primary">{t('customer')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-text-primary">{t('amount')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-text-primary">{t('payoutStatus')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-text-primary">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-secondary">
                    Loading…
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-secondary">
                    No sales found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const payoutStatus = getPayoutStatus(order.status);
                  return (
                    <tr key={order.id} className="border-b border-border-subtle hover:bg-surface-subtle transition-colors">
                      <td className="px-6 py-4 text-sm text-text-primary font-mono">{order.id.slice(0, 8)}</td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-primary font-mono">{order.buyerId.slice(0, 8)}…</td>
                      <td className="px-6 py-4 text-sm text-text-primary font-medium">
                        {formatAmount(order.totalAmount, order.currency)}
                      </td>
                      <td className="px-6 py-4">
                        {payoutStatus === 'other' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-surface-subtle text-text-secondary">
                            {order.status}
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              payoutStatus === 'paid'
                                ? 'bg-surface-success text-text-success'
                                : 'bg-surface-warning text-text-warning'
                            }`}
                          >
                            {payoutStatus === 'paid' ? t('paid') : t('inEscrow')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => router.push(`/${locale}/vendors/orders/${order.id}`)}
                          className="text-text-brand hover:opacity-80 text-sm font-medium transition-colors"
                        >
                          {t('viewOrder')}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">{t('rowsPerPage')}</span>
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
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
  );
};

export default SalesDashboard;
