"use client";
import React, { useState, useMemo } from "react";

type DeliveryStatus = "Delivered" | "Pending" | "Processing" | "In transit";

interface Order {
  id: string;
  date: string;
  customer: string;
  amount: string;
  delivery: DeliveryStatus;
  action: string;
}

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [timeFilter] = useState<string>("all");
  const [deliveryFilter, setDeliveryFilter] = useState<string>("all");
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const allOrders: Order[] = [
    {
      id: "0001",
      date: "25 Nov 2025",
      customer: "John Doe",
      amount: "GH₵390.00",
      delivery: "Delivered",
      action: "View order",
    },
    {
      id: "0002",
      date: "26 Nov 2025",
      customer: "Jane Smith",
      amount: "GH₵220.00",
      delivery: "Pending",
      action: "Process order",
    },
    {
      id: "0003",
      date: "27 Nov 2025",
      customer: "Mike Brown",
      amount: "GH₵150.00",
      delivery: "Processing",
      action: "Track order",
    },
    {
      id: "0004",
      date: "28 Nov 2025",
      customer: "Sarah White",
      amount: "GH₵510.00",
      delivery: "In transit",
      action: "Track order",
    },
    {
      id: "0005",
      date: "29 Nov 2025",
      customer: "David King",
      amount: "GH₵99.00",
      delivery: "Delivered",
      action: "View order",
    },
  ];

  const getDeliveryStatusColor = (status: DeliveryStatus): string => {
    switch (status) {
      case "Delivered":
        return "text-green-600";
      case "Pending":
        return "text-orange-500";
      case "Processing":
        return "text-gray-400";
      case "In transit":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  const filteredOrders = useMemo(() => {
    return allOrders.filter((order) => {
      const matchesSearch = order.id
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      const matchesDelivery =
        deliveryFilter === "all" ||
        order.delivery.toLowerCase() === deliveryFilter.toLowerCase();

      return matchesSearch && matchesDelivery;
    });
  }, [allOrders, searchQuery, deliveryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;

  const paginatedOrders = filteredOrders.slice(
    startIndex,
    startIndex + rowsPerPage
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Orders</h1>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
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
            placeholder="Search order by order number"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <select
          value={deliveryFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setDeliveryFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Delivery status</option>
          <option value="delivered">Delivered</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="in transit">In transit</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Order number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Delivery
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {paginatedOrders.length > 0 ? (
              paginatedOrders.map((order) => (
                <tr key={order.id} className="border-t hover:bg-gray-50">
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
                      {order.delivery}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-blue-600 hover:underline">
                      {order.action}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No orders found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex justify-between items-center px-6 py-4 border-t">
          <div className="flex gap-2 items-center">
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border px-2 py-1 rounded"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={currentPage === 1}
              onClick={() =>
                setCurrentPage((p) => Math.max(1, p - 1))
              }
              className="px-2 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>

            <span>
              Page {currentPage} of {totalPages}
            </span>

            <button
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              className="px-2 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
