"use client";
import { ButtonType3 } from "@/components/custom/button";
import { GET_VENDOR_DASHBOARD, LIST_VENDOR_ORDERS } from "@/services/gql/vendor";
import type {
  GetVendorDashboardResponse,
  ListVendorOrdersResponse,
} from "@/services/gql/types/vendor";
import { useQuery } from "@apollo/client/react";
import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";

export default function OverviewPage() {
  const t = useTranslations("vendors.orders");
  const router = useRouter();
  const locale = useLocale();
  const { data: dashboardData, loading: dashboardLoading } =
    useQuery<GetVendorDashboardResponse>(GET_VENDOR_DASHBOARD);
  const { data: ordersData, loading: ordersLoading } = useQuery<ListVendorOrdersResponse>(
    LIST_VENDOR_ORDERS,
    { variables: { limit: 5, offset: 0 } }
  );

  const dashboard = dashboardData?.getVendorDashboard;
  const orders = ordersData?.listVendorOrders.items ?? [];
  const formatMinor = (amount: number) => (amount / 100).toFixed(2);

  const statsCards = dashboard
    ? [
        {
          id: "sales",
          title: "Sales",
          value: `${dashboard.totalSales}`,
          subtitle: "sales made",
        },
        {
          id: "orders",
          title: "Orders",
          value: `${dashboard.completedOrders}`,
          subtitle: "completed orders",
        },
        {
          id: "earnings",
          title: "Earnings",
          value: `${formatMinor(dashboard.totalEarnings)}`,
          subtitle: "total earnings",
        },
      ]
    : [
    {
      id: 'sales',
      title: 'Sales',
      value: '0',
      subtitle: 'sales made',
    },
    {
      id: 'orders',
      title: 'Orders',
      value: '0',
      subtitle: 'completed orders',
    },
    {
      id: 'earnings',
      title: 'Earnings',
      value: '0',
      subtitle: 'total earnings',
    }
  ];

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
            </div>
            <p className="heading-small mb-1 text-text-primary">
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
              {orders.length > 0 ? (
                orders.map((order) => (
                  <tr key={order.id} className="border-t border-border-subtle hover:bg-surface-subtle transition-colors">
                    <td className="px-6 py-4 text-sm text-text-primary">{order.id}</td>
                    <td className="px-6 py-4 text-sm text-text-primary">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-primary">{order.buyerId}</td>
                    <td className="px-6 py-4 text-sm text-text-primary">
                      {order.currency} {formatMinor(order.totalAmount)}
                    </td>
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
                    {ordersLoading ? "Loading orders..." : t("noOrdersFound")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {dashboardLoading && (
        <p className="text-sm text-text-secondary mt-4">Loading dashboard...</p>
      )}
    </div>
  );
}