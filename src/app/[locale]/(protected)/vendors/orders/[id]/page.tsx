"use client";
import React, { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ConfirmationModal } from "@/components/custom/confirmationModal";

export default function OrderDetailsPage() {
  const t = useTranslations("vendors.orders");
  const tCommon = useTranslations("common");
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const orderData = {
    orderNumber: "0001",
    orderDate: "23 Nov 2025",
    status: "Pending",
    paymentStatus: "Payment secured in escrow",
    timeRemaining: "You have 24 hours to accept and process the order",
    customer: {
      name: "John Doe",
      avatar: "https://picsum.photos/seed/customer1/80/80"
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
        image: "https://picsum.photos/seed/shoe1/128/128",
        quantity: 2,
        size: "M",
        price: "GH₵699.00",
        sellerAvatar: "https://picsum.photos/seed/seller1/64/64"
      },
      {
        id: 2,
        name: "Men's leather shoe",
        image: "https://picsum.photos/seed/shoe2/128/128",
        quantity: 2,
        size: "M",
        price: "GH₵699.00",
        sellerAvatar: "https://picsum.photos/seed/seller1/64/64"
      },
      {
        id: 3,
        name: "Men's leather shoe",
        image: "https://picsum.photos/seed/shoe3/128/128",
        quantity: 2,
        size: "M",
        price: "GH₵699.00",
        sellerAvatar: "https://picsum.photos/seed/seller2/64/64"
      }
    ],
    itemsTotal: "GH₵2699.00",
    shippingFee: "GH₵69.00",
    total: "GH₵2769.00"
  };

  const handleDeclineOrderClick = () => {
    setDeclineModalOpen(true);
  };

  const handleDeclineOrderConfirm = async () => {
    setIsDeclining(true);
    try {
      // TODO: wire to decline order mutation when API is available
      console.log("Order declined");
      alert("Order has been declined");
      setDeclineModalOpen(false);
    } finally {
      setIsDeclining(false);
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
      <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
        <button className="hover:text-text-primary">Orders</button>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-text-primary">Order 0001</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Orders details</h1>
        <div className="flex gap-3">
          <button
            onClick={handleDeclineOrderClick}
            className="px-6 py-2.5 border-2 border-border-danger text-text-danger rounded-lg font-medium hover:bg-surface-danger transition-colors"
          >
            Decline order
          </button>
          <button
            onClick={handleProcessOrder}
            className="px-6 py-2.5 bg-surface-brand text-text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Process order
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Order Info */}
        <div className="col-span-2 space-y-6">
          {/* Order Details Card */}
          <div className="bg-surface-default rounded-xl border border-border-subtle p-6">
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div>
                <p className="text-sm text-text-secondary mb-1">Order number</p>
                <p className="text-base font-medium text-text-primary">{orderData.orderNumber}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary mb-1">Order date</p>
                <p className="text-base font-medium text-text-primary">{orderData.orderDate}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary mb-1">Status</p>
                <p className="text-base font-medium text-text-warning">{orderData.status}</p>
              </div>
            </div>

            <div className="bg-surface-brand-subtle border border-border-brand rounded-lg p-4">
              <p className="text-sm font-medium text-text-brand mb-1">{orderData.paymentStatus}</p>
              <p className="text-sm text-text-secondary">{orderData.timeRemaining}</p>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-surface-default rounded-xl border border-border-subtle overflow-hidden">
            <div className="divide-y divide-border-subtle">
              {orderData.items.map((item) => (
                <div key={item.id} className="p-6 flex gap-4">
                  {/* Circle = avatar of person who posted the product (seller) */}
                  <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-surface-subtle">
                    {"sellerAvatar" in item && typeof item.sellerAvatar === "string" && item.sellerAvatar.startsWith("http") ? (
                      <Image src={item.sellerAvatar} alt="" fill className="object-cover" sizes="64px" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-2xl text-text-tertiary">👤</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-medium text-text-primary mb-2">{item.name}</p>
                    <p className="text-sm text-text-secondary">Quantity {item.quantity}</p>
                    <p className="text-sm text-text-secondary">Size {item.size}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-medium text-text-primary">{item.price}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-border-subtle p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Items total</span>
                <span className="text-text-primary">{orderData.itemsTotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Shipping fee</span>
                <span className="text-text-primary">{orderData.shippingFee}</span>
              </div>
              <div className="flex justify-between text-base font-semibold pt-3 border-t border-border-subtle">
                <span className="text-text-primary">Total</span>
                <span className="text-text-primary">{orderData.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Customer Info */}
        <div className="space-y-6">
          {/* Customer Card */}
          <div className="bg-surface-default rounded-xl border border-border-subtle p-6">
            <h3 className="text-sm font-medium text-text-secondary mb-4">Customer</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-surface-subtle">
                {orderData.customer.avatar?.startsWith("http") ? (
                  <Image src={orderData.customer.avatar} alt={orderData.customer.name} fill className="object-cover" sizes="40px" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-xl text-text-tertiary">{orderData.customer.avatar || "👤"}</span>
                )}
              </div>
              <span className="text-base font-medium text-text-primary">{orderData.customer.name}</span>
              <button
                onClick={handleSendMessage}
                className="ml-auto text-sm text-text-brand font-medium hover:opacity-80"
              >
                Message
              </button>
            </div>

            {/* Shipping Address */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-text-primary mb-2">Shipping address</h4>
              <div className="text-sm text-text-secondary space-y-1">
                <p className="font-medium text-text-primary">{orderData.shippingAddress.name}</p>
                <p>{orderData.shippingAddress.street}</p>
                <p>{orderData.shippingAddress.city}</p>
                <p>{orderData.shippingAddress.country}</p>
                <p className="pt-2">{orderData.shippingAddress.phone}</p>
              </div>
            </div>

            {/* Billing Address */}
            <div>
              <h4 className="text-sm font-medium text-text-primary mb-2">Billing address</h4>
              <p className="text-sm text-text-secondary">{orderData.billingAddress}</p>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        open={declineModalOpen}
        onCancel={() => setDeclineModalOpen(false)}
        onConfirm={handleDeclineOrderConfirm}
        title={t("declineOrderTitle") || "Decline order"}
        description={t("declineOrderConfirm") || "Are you sure you want to decline this order?"}
        confirmText={t("declineOrder") || tCommon("confirm") || "Decline"}
        confirmVariant="destructive"
        isLoading={isDeclining}
      />
    </div>
  );
}