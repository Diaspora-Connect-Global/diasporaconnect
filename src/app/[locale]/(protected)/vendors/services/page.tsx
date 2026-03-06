"use client";
import React from "react";
import { useTranslations } from 'next-intl';

export default function ServicesPage() {
  const t = useTranslations('vendors.services');
  const tCommon = useTranslations('common');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const products = [
    {
      id: 1,
      name: "Men's leather shoe",
      image: "👞",
      inventory: 25,
      category: "Men fashion",
      price: "GH₵25.00",
      status: "Draft"
    },
    {
      id: 2,
      name: "Men's leather shoe",
      image: "👞",
      inventory: 1,
      category: "Men fashion",
      price: "GH₵28.00",
      status: "Live"
    }
  ];

  const getLocalizedStatus = (status: string): string => {
    return status === 'Live' ? t('live') : t('draft');
  };

  const getLocalizedCategory = (category: string): string => {
    return category === 'Men fashion' ? t('menFashion') : t('womenFashion');
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">{t('title')}</h1>
        <button className="bg-surface-brand text-text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
          <span className="text-lg">+</span>
          {t('addService')}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <svg 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-border-brand focus:border-transparent"
          />
        </div>

        <button
          onClick={() => setStatusFilter('live')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'live' ? 'bg-surface-disabled text-text-primary' : 'bg-surface-subtle text-text-secondary hover:bg-surface-disabled'
          }`}
        >
          {t('live')}
        </button>

        <button
          onClick={() => setStatusFilter('draft')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'draft' ? 'bg-surface-disabled text-text-primary' : 'bg-surface-subtle text-text-secondary hover:bg-surface-disabled'
          }`}
        >
          {t('draft')}
        </button>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-border-subtle rounded-lg text-sm bg-surface-default focus:outline-none focus:ring-2 focus:ring-border-brand"
          aria-label={t('allCategories')}
        >
          <option value="all">{t('allCategories')}</option>
          <option value="men-fashion">{t('menFashion')}</option>
          <option value="women-fashion">{t('womenFashion')}</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-surface-default rounded-xl border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-subtle border-b border-border-subtle">
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t('serviceName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t('inventory')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t('category')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t('price')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t('status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t('action')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface-default divide-y divide-border-subtle">
              {products.map((Service) => (
                <tr key={Service.id} className="hover:bg-surface-subtle transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-surface-subtle rounded-lg flex items-center justify-center text-xl">
                        {Service.image}
                      </div>
                      <span className="text-sm text-text-primary">{Service.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{Service.inventory}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{getLocalizedCategory(Service.category)}</td>
                  <td className="px-6 py-4 text-sm text-text-primary">{Service.price}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      Service.status === 'Live' 
                        ? 'bg-surface-success text-text-success' 
                        : 'bg-surface-subtle text-text-secondary'
                    }`}>
                      {getLocalizedStatus(Service.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button className="text-sm text-text-brand font-medium hover:opacity-80 hover:underline">
                        {t('preview')}
                      </button>
                      <button className="text-sm text-text-brand font-medium hover:opacity-80 hover:underline">
                        {t('edit')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">{t('rowsPerPage')}</span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="px-2 py-1 border border-border-subtle rounded text-sm bg-surface-default focus:outline-none focus:ring-2 focus:ring-border-brand"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-text-secondary">{t('page', { current: 1, total: 10 })}</span>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-surface-subtle rounded transition-colors disabled:opacity-50" disabled aria-label={tCommon('previousPage')}>
                <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button className="p-1 hover:bg-surface-subtle rounded transition-colors" aria-label={tCommon('nextPage')}>
                <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}