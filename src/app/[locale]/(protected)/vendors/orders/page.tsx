"use client";
import React, { useMemo, useState } from "react";
import { useTranslations } from 'next-intl';
import { ButtonType3 } from '@/components/custom/button';
import { useQuery } from "@apollo/client/react";
import { LIST_VENDOR_ORDERS } from "@/services/gql/vendor";
import type { ListVendorOrdersResponse, OrderStatus } from "@/services/gql/types/vendor";

interface Order {
  id: string;
  date: string;
  customer: string;
  amount: string;
  delivery: OrderStatus;
  action: string;
}

export default function OrdersPage() {
  const t = useTranslations('vendors.orders');
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [deliveryFilter, setDeliveryFilter] = useState<string>("all");
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const offset = (currentPage - 1) * rowsPerPage;
  const { data, loading } = useQuery<ListVendorOrdersResponse>(LIST_VENDOR_ORDERS, {
    variables: {
      status: deliveryFilter === "all" ? undefined : deliveryFilter,
      limit: rowsPerPage,
      offset,
    },
  });

  const getLocalizedStatus = (status: OrderStatus): string => {
    switch (status) {
      case "DELIVERED":
        return t('delivered');
      case "CREATED":
        return t('pending');
      case "SHIPPED":
        return t('inTransit');
      case "REFUNDED":
        return t('refunded');
      default:
        return status;
    }
  };

  const getLocalizedAction = (action: string): string => {
    switch (action) {
      case "View order":
        return t('viewOrder');
      case "Process order":
        return t('processOrder');
      case "Track order":
        return t('trackOrder');
      default:
        return action;
    }
  };

  const allOrders: Order[] = useMemo(
    () =>
      (data?.listVendorOrders.items ?? []).map((order) => ({
        id: order.id,
        date: new Date(order.createdAt).toLocaleDateString(),
        customer: order.buyerId,
        amount: `${order.currency} ${order.totalAmount}`,
        delivery: order.status,
        action: "View order",
      })),
    [data]
  );

  const getDeliveryStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case "DELIVERED":
        return "text-text-success";
      case "CREATED":
        return "text-text-warning";
      case "SHIPPED":
        return "text-text-brand";
      case "REFUNDED":
        return "text-text-tertiary";
      default:
        return "text-text-secondary";
    }
  };

  const filteredOrders = useMemo(() => {
    return allOrders.filter((order) => {
      const matchesSearch = order.id
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      const matchesDelivery =
        deliveryFilter === "all" ||
        order.delivery === deliveryFilter;

      return matchesSearch && matchesDelivery;
    });
  }, [allOrders, searchQuery, deliveryFilter]);

  const totalCount = data?.listVendorOrders.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">{t('title')}</h1>

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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          <input
            type="text"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchQuery(e.target.value)
            }
            placeholder={t('searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 border border-border-subtle rounded-lg text-sm bg-surface-default text-text-primary focus:outline-none focus:ring-2 focus:ring-border-brand focus:border-transparent"
          />
        </div>

        <select
          value={deliveryFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setDeliveryFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 border border-border-subtle rounded-lg text-sm bg-surface-default text-text-primary focus:outline-none focus:ring-2 focus:ring-border-brand"
          aria-label={t('deliveryStatus')}
        >
          <option value="all">{t('deliveryStatus')}</option>
          <option value="DELIVERED">{t('delivered')}</option>
          <option value="CREATED">{t('pending')}</option>
          <option value="SHIPPED">{t('inTransit')}</option>
          <option value="REFUNDED">{t('refunded')}</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface-default rounded-xl border border-border-subtle overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-subtle">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                {t('orderNumber')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                {t('date')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                {t('customer')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                {t('amount')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                {t('delivery')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                {t('actions')}
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <tr key={order.id} className="border-t border-border-subtle hover:bg-surface-subtle">
                  <td className="px-6 py-4">{order.id}</td>
                  <td className="px-6 py-4">{order.date}</td>
                  <td className="px-6 py-4">{order.customer}</td>
                  <td className="px-6 py-4">{order.amount}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-sm font-medium ${getDeliveryStatusColor(
                        order.delivery
                      )}`}
                    >
                      {getLocalizedStatus(order.delivery)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <ButtonType3 className="text-text-brand hover:underline border-0 bg-transparent p-0 min-w-0">
                      {getLocalizedAction(order.action)}
                    </ButtonType3>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-text-secondary">
                  {loading ? "Loading orders..." : t('noOrdersFound')}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex justify-between items-center px-6 py-4 border-t">
          <div className="flex gap-2 items-center">
            <span>{t('rowsPerPage')}</span>
            <select
              value={rowsPerPage}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-border-subtle bg-surface-default text-text-primary px-2 py-1 rounded"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <ButtonType3
              disabled={currentPage === 1}
              onClick={() =>
                setCurrentPage((p) => Math.max(1, p - 1))
              }
              className="px-2 py-1 border rounded disabled:opacity-50"
            >
              {t('prev')}
            </ButtonType3>

            <span>
              {t('page', { current: currentPage, total: totalPages })}
            </span>

            <ButtonType3
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              className="px-2 py-1 border rounded disabled:opacity-50"
            >
              {t('next')}
            </ButtonType3>
          </div>
        </div>
      </div>
    </div>
  );
}
