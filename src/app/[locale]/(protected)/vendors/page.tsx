"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import Pagination from "@/components/custom/pagination";
import React, { useState } from "react";

export default function OverviewPage() {

  const [newList, setNewList] = useState<any[]>([]);
  const [perPage, setPerPage] = useState<number>(4);

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
    { id: '0001', date: '25 Nov 2025', customer: 'John Doe', amount: 'GH₵390.00', payment: 'Paid' },
    { id: '0002', date: '30 Nov 2025', customer: 'Jane Smith', amount: 'GH₵450.00', payment: 'Paid' },
    { id: '0003', date: '10 Dec 2025', customer: 'Linda Brown', amount: 'GH₵550.00', payment: 'Paid' },
  ];


  const data = [
  { id: 1, name: "Apple" },
  { id: 2, name: "Banana" },
  { id: 3, name: "Cherry" },
  { id: 4, name: "Date" },
  { id: 5, name: "Elderberry" },
  { id: 6, name: "Fig" },
  { id: 7, name: "Grape" },
];
  return (
    <div className="">
      <h1 className="text-primary heading-xsmall mb-6">Overview</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {statsCards.map((card) => (
          <div key={card.id} className="bg-surface-default rounded-xl border border-border-default p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-primary label-large">{card.title}</h3>
              {card.hasDropdown && (
                <select className=" rounded-md py-1 bg-surface-subtle border-border-subtle text-primary caption-medium">
                  <option>All time</option>
                  <option>Last 30 days</option>
                  <option>Last 7 days</option>
                </select>
              )}
            </div>
            <p className={`heading-small mb-1 ${card.valueColor ? card.valueColor : 'text-primary'}`}>
              {card.value}
            </p>
            <p className={`label-large  text-secondary`}>
              {card.subtitle}
            </p>
          </div>
        ))}
      </div>

      {/* Pending Orders Table */}
      <div className="overflow-hidden">
        <div className="flex items-center  justify-between py-4 border-b border-gray-200">
          <h2 className="heading-xsmall text-primary">Pending orders</h2>
          <button className="text-brand label-medium flex cursor-pointer items-center gap-1">
            See all
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full bg-surface-default  rounded-t-2xl ">
            <thead className="label-medium text-primary">
              <tr className="">
                <th className="px-6 py-3 text-left uppercase tracking-wider">
                  Order number
                </th>
                <th className="px-6 py-3 text-left uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left uppercase tracking-wider">
                  Amount
                </th>

                <th className="px-6 py-3 text-left  uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="">
              {orders.map((order) => (
                <tr key={order.id} className=" transition-colors">
                  <td className="px-6 py-4 body-medium text-primary">{order.id}</td>
                  <td className="px-6 py-4 body-medium text-primary">{order.date}</td>
                  <td className="px-6 py-4 body-medium text-primary">{order.customer}</td>
                  <td className="px-6 py-4 body-medium text-primary">{order.amount}</td>
                  <td className="px-6 py-4">
                    <button className="label-medium text-brand hover:underline">
                      Process order
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

           <Pagination
        LIST={data}
        newList={newList}
        setNewList={setNewList}
        perPage={perPage}
        setPerPage={setPerPage}
      />
      </div>
    </div>
  );
}