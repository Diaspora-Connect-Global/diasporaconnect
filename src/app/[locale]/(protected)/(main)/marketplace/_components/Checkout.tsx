"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import type { CartItem, PaymentMethod, PaymentResult, ShippingAddress } from "./types";

export function Checkout({
  cart,
  onBack,
  onPay,
  isPaying = false,
  onComplete,
}: {
  cart: CartItem[];
  onBack: () => void;
  onPay: (args: {
    cart: CartItem[];
    method: PaymentMethod;
    shippingAddress: ShippingAddress;
  }) => Promise<PaymentResult>;
  isPaying?: boolean;
  onComplete: () => void;
}) {
  const t = useTranslations("marketplace");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("credit");
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: "",
    address: "",
    city: "",
    country: "",
    phoneNumber: "",
  });

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );
  const shippingFee = 20;
  const total = subtotal + shippingFee;

  const handleSubmit = async () => {
    const res = await onPay({ cart, method: paymentMethod, shippingAddress });
    if (res.success) onComplete();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <ButtonType3
        onClick={onBack}
        className="p-0 min-w-0 border-0 bg-transparent flex items-center gap-2 text-gray-600 mb-4 hover:text-gray-800"
      >
        <ChevronLeft className="w-5 h-5" />
        <span>{t("checkout")}</span>
      </ButtonType3>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="font-semibold mb-4">{t("orderDetails")}</h3>
              {cart.map((item) => (
                <div key={item.id} className="flex gap-3 mb-3">
                  <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-surface-subtle">
                    {typeof item.image === "string" && item.image.startsWith("http") ? (
                      <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-2xl text-text-tertiary">{item.image}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">{item.seller}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="font-semibold mb-4">{t("paymentMethod")}</h3>
              <label className="flex items-center gap-3 mb-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value="credit"
                  checked={paymentMethod === "credit"}
                  onChange={() => setPaymentMethod("credit")}
                />
                <span>{t("creditCard")}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value="mobile"
                  checked={paymentMethod === "mobile"}
                  onChange={() => setPaymentMethod("mobile")}
                />
                <span>{t("mobilePayment")}</span>
              </label>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="font-semibold mb-4">{t("shippingAddress")}</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder={t("namePlaceholder")}
                  value={shippingAddress.name}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
                <input
                  type="text"
                  placeholder={t("addressPlaceholder")}
                  value={shippingAddress.address}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, address: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder={t("cityPlaceholder")}
                    value={shippingAddress.city}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, city: e.target.value })
                    }
                    className="px-4 py-2 border rounded-lg"
                    required
                  />
                  <select
                    value={shippingAddress.country}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, country: e.target.value })
                    }
                    className="px-4 py-2 border rounded-lg"
                    required
                  >
                    <option value="">{t("country")}</option>
                    <option value="GH">{t("countries.ghana")}</option>
                    <option value="NG">{t("countries.nigeria")}</option>
                    <option value="KE">{t("countries.kenya")}</option>
                  </select>
                </div>
                <input
                  type="tel"
                  placeholder={t("phoneNumberPlaceholder")}
                  value={shippingAddress.phoneNumber}
                  onChange={(e) =>
                    setShippingAddress({
                      ...shippingAddress,
                      phoneNumber: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">{t("billingAddress")}</h3>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                <span className="text-sm">{t("sameAsShipping")}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-24">
            <h3 className="font-semibold mb-4">{t("priceSummary")}</h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t("subtotalAmount")}</span>
                <span>GH₵{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t("shippingFee")}</span>
                <span>GH₵{shippingFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t("discount")}</span>
                <span>GH₵0.00</span>
              </div>
            </div>
            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between font-bold text-lg">
                <span>{t("total")}</span>
                <span>GH₵{total.toFixed(2)}</span>
              </div>
            </div>
            <ButtonType2
              onClick={handleSubmit}
              disabled={isPaying || cart.length === 0}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
            >
              {isPaying
                ? t("processing") ?? "Processing…"
                : t("payAmount", { amount: total.toFixed(2) })}
            </ButtonType2>
          </div>
        </div>
      </div>
    </div>
  );
}

