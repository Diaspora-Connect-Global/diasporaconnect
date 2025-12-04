"use client";
import React from "react";

export default function OrderDetailsPage() {
  const orderData = {
    orderNumber: "0001",
    orderDate: "23 Nov 2025",
    status: "Pending",
    paymentStatus: "Payment secured in escrow",
    timeRemaining: "You have 24 hours to accept and process the order",
    customer: {
      name: "John Doe",
      avatar: "👤"
    },
    shippingAddress: {
      name: "John Doe",
      street: "Block factory, Agya herbal Pokuase,",
      city: "Greater Accra",
      country: "Ghana",
      phone: "+233 24 000 0000"
    },
    billingAddress: "Same as shipping address",
    items: [
      {
        id: 1,
        name: "Men's leather shoe",
        image: "👞",
        quantity: 2,
        size: "M",
        price: "GH₵699.00"
      },
      {
        id: 2,
        name: "Men's leather shoe",
        image: "👞",
        quantity: 2,
        size: "M",
        price: "GH₵699.00"
      },
      {
        id: 3,
        name: "Men's leather shoe",
        image: "👞",
        quantity: 2,
        size: "M",
        price: "GH₵699.00"
      }
    ],
    itemsTotal: "GH₵2699.00",
    shippingFee: "GH₵69.00",
    total: "GH₵2769.00"
  };

  const handleDeclineOrder = () => {
    if (confirm("Are you sure you want to decline this order?")) {
      console.log("Order declined");
      alert("Order has been declined");
    }
  };

  const handleProcessOrder = () => {
    console.log("Processing order");
    alert("Order is being processed");
  };

  const handleSendMessage = () => {
    console.log("Opening message to customer");
    alert("Opening message interface");
  };

  return (
    <div className="p-8 max-w-7xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
        <button className="hover:text-gray-900">Orders</button>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900">Order 0001</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Orders details</h1>
        <div className="flex gap-3">
          <button
            onClick={handleDeclineOrder}
            className="px-6 py-2.5 border-2 border-red-500 text-red-500 rounded-lg font-medium hover:bg-red-50 transition-colors"
          >
            Decline order
          </button>
          <button
            onClick={handleProcessOrder}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Process order
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Order Info */}
        <div className="col-span-2 space-y-6">
          {/* Order Details Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Order number</p>
                <p className="text-base font-medium text-gray-900">{orderData.orderNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Order date</p>
                <p className="text-base font-medium text-gray-900">{orderData.orderDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <p className="text-base font-medium text-orange-500">{orderData.status}</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-1">{orderData.paymentStatus}</p>
              <p className="text-sm text-blue-700">{orderData.timeRemaining}</p>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {orderData.items.map((item) => (
                <div key={item.id} className="p-6 flex gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
                    {item.image}
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-medium text-gray-900 mb-2">{item.name}</p>
                    <p className="text-sm text-gray-600">Quantity {item.quantity}</p>
                    <p className="text-sm text-gray-600">Size {item.size}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-medium text-gray-900">{item.price}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Items total</span>
                <span className="text-gray-900">{orderData.itemsTotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping fee</span>
                <span className="text-gray-900">{orderData.shippingFee}</span>
              </div>
              <div className="flex justify-between text-base font-semibold pt-3 border-t border-gray-200">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">{orderData.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Customer Info */}
        <div className="space-y-6">
          {/* Customer Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-4">Customer</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-xl">
                {orderData.customer.avatar}
              </div>
              <span className="text-base font-medium text-gray-900">{orderData.customer.name}</span>
              <button
                onClick={handleSendMessage}
                className="ml-auto text-sm text-blue-600 font-medium hover:text-blue-700"
              >
                Message
              </button>
            </div>

            {/* Shipping Address */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Shipping address</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-medium text-gray-900">{orderData.shippingAddress.name}</p>
                <p>{orderData.shippingAddress.street}</p>
                <p>{orderData.shippingAddress.city}</p>
                <p>{orderData.shippingAddress.country}</p>
                <p className="pt-2">{orderData.shippingAddress.phone}</p>
              </div>
            </div>

            {/* Billing Address */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Billing address</h4>
              <p className="text-sm text-gray-600">{orderData.billingAddress}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}