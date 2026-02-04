"use client";
import React from "react";
import { useTranslations } from 'next-intl';

export default function ProductsPage() {
  const t = useTranslations('vendors.products');
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
        <h1 className="text-2xl font-semibold text-gray-900">{t('title')}</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
          <span className="text-lg">+</span>
          {t('addProduct')}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <svg 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
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
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={() => setStatusFilter('live')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'live' ? 'bg-gray-200 text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {t('live')}
        </button>

        <button
          onClick={() => setStatusFilter('draft')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'draft' ? 'bg-gray-200 text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {t('draft')}
        </button>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={t('allCategories')}
        >
          <option value="all">{t('allCategories')}</option>
          <option value="men-fashion">{t('menFashion')}</option>
          <option value="women-fashion">{t('womenFashion')}</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('productName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('inventory')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('category')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('price')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('action')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl">
                        {product.image}
                      </div>
                      <span className="text-sm text-gray-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.inventory}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{getLocalizedCategory(product.category)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{product.price}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      product.status === 'Live' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {getLocalizedStatus(product.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button className="text-sm text-blue-600 font-medium hover:text-blue-700 hover:underline">
                        {t('preview')}
                      </button>
                      <button className="text-sm text-blue-600 font-medium hover:text-blue-700 hover:underline">
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
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{t('rowsPerPage')}</span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{t('page', { current: 1, total: 10 })}</span>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50" disabled aria-label="Previous page">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button className="p-1 hover:bg-gray-100 rounded transition-colors" aria-label="Next page">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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