import React from "react";

export default function OverviewPage() {
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
      valueColor: 'text-gray-300'
    }
  ];

  const orders = [
    { id: '0001', date: '25 Nov 2025', customer: 'John Doe', amount: 'GH₵390.00', payment: 'Paid' },
    { id: '0002', date: '30 Nov 2025', customer: 'Jane Smith', amount: 'GH₵450.00', payment: 'Paid' },
    { id: '0003', date: '10 Dec 2025', customer: 'Linda Brown', amount: 'GH₵550.00', payment: 'Paid' },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Overview</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {statsCards.map((card) => (
          <div key={card.id} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-medium text-gray-600">{card.title}</h3>
              {card.hasDropdown && (
                <select className="text-xs text-gray-500 border border-gray-200 rounded-md px-2 py-1 bg-white">
                  <option>All time</option>
                  <option>Last 30 days</option>
                  <option>Last 7 days</option>
                </select>
              )}
            </div>
            <p className={`text-3xl font-semibold mb-1 ${card.valueColor || 'text-gray-900'}`}>
              {card.value}
            </p>
            <p className={`text-sm ${card.valueColor || 'text-gray-500'}`}>
              {card.subtitle}
            </p>
          </div>
        ))}
      </div>

      {/* Pending Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Pending orders</h2>
          <button className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1">
            See all
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900">{order.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.customer}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{order.amount}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {order.payment}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-sm text-blue-600 font-medium hover:text-blue-700 hover:underline">
                      Process order
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}