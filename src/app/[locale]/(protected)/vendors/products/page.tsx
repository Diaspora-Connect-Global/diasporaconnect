"use client";
import React from "react";
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import { DELETE_PRODUCT, LIST_VENDOR_PRODUCTS, PUBLISH_PRODUCT } from "@/services/gql/vendor";
import type { ListVendorProductsResponse } from "@/services/gql/types/vendor";
import { handleVendorError } from "@/lib/vendor-error-mapper";
import VendorKycRequiredModal from "@/components/vendors/VendorKycRequiredModal";

export default function ProductsPage() {
  const t = useTranslations('vendors.products');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const locale = useLocale();
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'PUBLISHED' | 'DRAFT'>('all');
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isKycModalOpen, setIsKycModalOpen] = React.useState(false);
  const offset = (currentPage - 1) * rowsPerPage;

  const { data, loading } = useQuery<ListVendorProductsResponse>(LIST_VENDOR_PRODUCTS, {
    variables: {
      status: statusFilter === 'all' ? undefined : statusFilter,
      limit: rowsPerPage,
      offset,
    },
  });
  const [publishProduct, { loading: publishing }] = useMutation<{ publishProduct: boolean }>(PUBLISH_PRODUCT);
  const [deleteProduct, { loading: deleting }] = useMutation<{ deleteProduct: boolean }>(DELETE_PRODUCT);
  const handlePublish = async (productId: string) => {
    try {
      await publishProduct({
        variables: { productId },
        refetchQueries: [
          {
            query: LIST_VENDOR_PRODUCTS,
            variables: {
              status: statusFilter === 'all' ? undefined : statusFilter,
              limit: rowsPerPage,
              offset,
            },
          },
        ],
      });
      toast.success("Product published");
    } catch (error) {
      handleVendorError({
        error,
        locale,
        router,
        openKycModal: () => setIsKycModalOpen(true),
      });
    }
  };

  const handleDelete = async (productId: string) => {
    try {
      await deleteProduct({
        variables: { productId },
        refetchQueries: [
          {
            query: LIST_VENDOR_PRODUCTS,
            variables: {
              status: statusFilter === 'all' ? undefined : statusFilter,
              limit: rowsPerPage,
              offset,
            },
          },
        ],
      });
      toast.success("Product deleted");
    } catch (error) {
      handleVendorError({
        error,
        locale,
        router,
      });
    }
  };

  const products = data?.listVendorProducts.items ?? [];
  const totalCount = data?.listVendorProducts.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));

  const getLocalizedStatus = (status: string): string => {
    return status === 'PUBLISHED' ? t('live') : t('draft');
  };

  const getLocalizedCategory = (category: string): string => {
    return category === 'Men fashion' ? t('menFashion') : t('womenFashion');
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">{t('title')}</h1>
        <button
          onClick={() => router.push(`/${locale}/vendors/products/add-product`)}
          className="bg-surface-brand text-text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          {t('addProduct')}
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
          onClick={() => setStatusFilter('PUBLISHED')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'PUBLISHED' ? 'bg-surface-disabled text-text-primary' : 'bg-surface-subtle text-text-secondary hover:bg-surface-disabled'
          }`}
        >
          {t('live')}
        </button>

        <button
          onClick={() => setStatusFilter('DRAFT')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'DRAFT' ? 'bg-surface-disabled text-text-primary' : 'bg-surface-subtle text-text-secondary hover:bg-surface-disabled'
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
                  {t('productName')}
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
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-surface-subtle transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-surface-subtle rounded-lg flex items-center justify-center text-xl">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.title} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          "📦"
                        )}
                      </div>
                      <span className="text-sm text-text-primary">{product.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{product.inventoryCount}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {getLocalizedCategory('Men fashion')}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-primary">{product.currency} {product.price}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      product.status === 'PUBLISHED' 
                        ? 'bg-surface-success text-text-success' 
                        : 'bg-surface-subtle text-text-secondary'
                    }`}>
                      {getLocalizedStatus(product.status)}
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
                      {product.status !== 'PUBLISHED' && (
                        <button
                          onClick={() => handlePublish(product.id)}
                          disabled={publishing}
                          className="text-sm text-text-brand font-medium hover:opacity-80 hover:underline disabled:opacity-50"
                        >
                          Publish
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={deleting}
                        className="text-sm text-text-danger font-medium hover:opacity-80 hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-secondary">
                    {t('noProductsFound')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">{t('rowsPerPage')}</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-border-subtle rounded text-sm bg-surface-default focus:outline-none focus:ring-2 focus:ring-border-brand"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-text-secondary">{t('page', { current: currentPage, total: totalPages })}</span>
            <div className="flex items-center gap-1">
              <button
                className="p-1 hover:bg-surface-subtle rounded transition-colors disabled:opacity-50"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label={tCommon('previousPage')}
              >
                <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                className="p-1 hover:bg-surface-subtle rounded transition-colors disabled:opacity-50"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label={tCommon('nextPage')}
              >
                <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      <VendorKycRequiredModal
        open={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
      />
    </div>
  );
}