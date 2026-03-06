"use client";
import { ButtonType3 } from "@/components/custom/button";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";

export default function OverviewPage() {
  const t = useTranslations("vendors.orders");
  const router = useRouter();
  const locale = useLocale();
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const statsCards = [
    {
      id: 'sales',
      title: 'Sales',
      value: 'GH₵5000.00',
      subtitle: 'sales made',
      hasDropdown: true
    },
    {
      id: 'orders',
      title: 'Orders',
      value: '25',
      subtitle: 'pending orders',
      hasDropdown: false
    },
    {
      id: 'escrow',
      title: 'Amount in Escrow',
      value: 'GH₵1500.00',
      subtitle: 'in escrow',
      hasDropdown: false,
      valueColor: 'text-tertiary'
    }
  ];

  const orders = [
    { id: "0001", date: "25 Nov 2025", customer: "John Doe", amount: "GH₵390.00", payment: "Paid" },
    { id: "0002", date: "30 Nov 2025", customer: "Jane Smith", amount: "GH₵450.00", payment: "Paid" },
    { id: "0003", date: "10 Dec 2025", customer: "Linda Brown", amount: "GH₵550.00", payment: "Paid" },
  ];

  const totalPages = Math.max(1, Math.ceil(orders.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedOrders = orders.slice(startIndex, startIndex + rowsPerPage);

  const handleSeeAll = () => {
    router.push(`/${locale}/vendors/orders`);
  };

  return (
    <div className="">
      <h1 className="text-text-primary heading-xsmall mb-6">Overview</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {statsCards.map((card) => (
          <div key={card.id} className="bg-surface-default rounded-xl border border-border-default p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-text-primary label-large">{card.title}</h3>
              {card.hasDropdown && (
                <select className="rounded-md py-1 bg-surface-subtle border border-border-subtle text-text-primary caption-medium">
                  <option>All time</option>
                  <option>Last 30 days</option>
                  <option>Last 7 days</option>
                </select>
              )}
            </div>
            <p className={`heading-small mb-1 ${card.valueColor ? "text-text-tertiary" : "text-text-primary"}`}>
              {card.value}
            </p>
            <p className="label-large text-text-secondary">
              {card.subtitle}
            </p>
          </div>
        ))}
      </div>

      {/* Pending Orders Table */}
      <div className="flex items-center justify-between py-4 border-b border-border-subtle mb-4">
        <h2 className="heading-xsmall text-text-primary">Pending orders</h2>
        <ButtonType3
          onClick={handleSeeAll}
          className="label-medium flex items-center gap-1 border-0 bg-transparent p-0 min-w-0 text-text-brand hover:underline"
        >
          See all
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </ButtonType3>
      </div>

      <div className="bg-surface-default rounded-xl border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-subtle">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t("orderNumber")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t("date")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t("customer")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t("amount")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.length > 0 ? (
                paginatedOrders.map((order) => (
                  <tr key={order.id} className="border-t border-border-subtle hover:bg-surface-subtle transition-colors">
                    <td className="px-6 py-4 text-sm text-text-primary">{order.id}</td>
                    <td className="px-6 py-4 text-sm text-text-primary">{order.date}</td>
                    <td className="px-6 py-4 text-sm text-text-primary">{order.customer}</td>
                    <td className="px-6 py-4 text-sm text-text-primary">{order.amount}</td>
                    <td className="px-6 py-4">
                      <ButtonType3
                        onClick={() => router.push(`/${locale}/vendors/orders/${order.id}`)}
                        className="text-text-brand hover:underline border-0 bg-transparent p-0 min-w-0 label-medium"
                      >
                        {t("processOrder")}
                      </ButtonType3>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-text-secondary">
                    {t("noOrdersFound")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-border-subtle">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-text-secondary">{t("rowsPerPage")}</span>
            <select
              value={rowsPerPage}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-border-subtle bg-surface-default text-text-primary px-2 py-1 rounded text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <ButtonType3
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 border border-border-subtle rounded disabled:opacity-50"
            >
              {t("prev")}
            </ButtonType3>
            <span className="text-sm text-text-secondary">
              {t("page", { current: currentPage, total: totalPages })}
            </span>
            <ButtonType3
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2 py-1 border border-border-subtle rounded disabled:opacity-50"
            >
              {t("next")}
            </ButtonType3>
          </div>
        </div>
      </div>
    </div>
  );
}