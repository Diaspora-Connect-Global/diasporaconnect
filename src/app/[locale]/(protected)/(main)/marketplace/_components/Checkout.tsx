"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import { CountrySelect } from "@/components/custom/input";
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
    () =>
      cart.reduce(
        (sum, item) =>
          sum + item.price * item.quantity + (item.extrasTotal ?? 0),
        0
      ),
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
        className="p-0 min-w-0 border-0 bg-transparent flex items-center gap-2 text-text-secondary mb-4 hover:text-text-primary"
      >
        <ChevronLeft className="w-5 h-5" />
        <span>{t("checkout")}</span>
      </ButtonType3>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div>
            <div className="bg-surface-default rounded-lg border border-border-subtle p-6 mb-6">
              <h3 className="font-semibold mb-4 text-text-primary">{t("orderDetails")}</h3>
              {cart.map((item) => {
                const lineTotal =
                  item.price * item.quantity + (item.extrasTotal ?? 0);
                return (
                  <div
                    key={item.lineId ?? item.id}
                    className="flex gap-3 mb-3 items-center"
                  >
                    <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-surface-subtle">
                      {typeof item.image === "string" && item.image.startsWith("http") ? (
                        <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-2xl text-text-tertiary">{item.image}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary">{item.name}</p>
                      <p className="text-sm text-text-secondary">{item.seller}</p>
                      {item.extras && item.extras.length > 0 && (
                        <ul className="text-xs text-text-tertiary space-y-0.5 mt-0.5">
                          {(item.serviceExtras
                            ? item.extras
                                .map((id) =>
                                  item.serviceExtras!.find((e) => e.id === id)
                                )
                                .filter(Boolean) as {
                                id: string;
                                name: string;
                                price: number;
                              }[]
                            : []
                          ).map((extra) => (
                            <li key={extra.id}>
                              {extra.name} — GH₵{extra.price.toFixed(2)}
                            </li>
                          ))}
                          {(!item.serviceExtras ||
                            item.serviceExtras.length === 0) &&
                            item.extrasTotal != null &&
                            item.extrasTotal > 0 && (
                              <li>Extras — GH₵{item.extrasTotal.toFixed(2)}</li>
                            )}
                        </ul>
                      )}
                    </div>
                    <p className="font-semibold text-text-primary whitespace-nowrap">
                      GH₵{lineTotal.toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="bg-surface-default rounded-lg border border-border-subtle p-6 mb-6">
              <h3 className="font-semibold mb-4 text-text-primary">{t("paymentMethod")}</h3>
              <label className="flex items-center gap-3 mb-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value="credit"
                  checked={paymentMethod === "credit"}
                  onChange={() => setPaymentMethod("credit")}
                  className="accent-surface-brand"
                />
                <span className="text-text-primary">{t("creditCard")}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value="mobile"
                  checked={paymentMethod === "mobile"}
                  onChange={() => setPaymentMethod("mobile")}
                  className="accent-surface-brand"
                />
                <span className="text-text-primary">{t("mobilePayment")}</span>
              </label>
            </div>

            <div className="bg-surface-default rounded-lg border border-border-subtle p-6 mb-6">
              <h3 className="font-semibold mb-4 text-text-primary">{t("shippingAddress")}</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder={t("namePlaceholder")}
                  value={shippingAddress.name}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-border-subtle rounded-lg bg-surface-default text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-brand"
                  required
                />
                <input
                  type="text"
                  placeholder={t("addressPlaceholder")}
                  value={shippingAddress.address}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, address: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-border-subtle rounded-lg bg-surface-default text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-brand"
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
                    className="px-4 py-2 border border-border-subtle rounded-lg bg-surface-default text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-brand"
                    required
                  />
                  <CountrySelect
                    value={shippingAddress.country}
                    onChange={(value) =>
                      setShippingAddress({ ...shippingAddress, country: value })
                    }
                    id="checkout-country"
                    required
                  />
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
                  className="w-full px-4 py-2 border border-border-subtle rounded-lg bg-surface-default text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-brand"
                  required
                />
              </div>
            </div>

            <div className="bg-surface-default rounded-lg border border-border-subtle p-6">
              <h3 className="font-semibold mb-4 text-text-primary">{t("billingAddress")}</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-surface-brand" />
                <span className="text-sm text-text-primary">{t("sameAsShipping")}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="bg-surface-default rounded-lg border border-border-subtle p-6 sticky top-24">
            <h3 className="font-semibold mb-4 text-text-primary">{t("priceSummary")}</h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">{t("subtotalAmount")}</span>
                <span className="text-text-primary">GH₵{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">{t("shippingFee")}</span>
                <span className="text-text-primary">GH₵{shippingFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">{t("discount")}</span>
                <span className="text-text-primary">GH₵0.00</span>
              </div>
            </div>
            <div className="border-t border-border-subtle pt-4 mb-6">
              <div className="flex justify-between font-bold text-lg text-text-primary">
                <span>{t("total")}</span>
                <span>GH₵{total.toFixed(2)}</span>
              </div>
            </div>
            <ButtonType2
              onClick={handleSubmit}
              disabled={isPaying || cart.length === 0}
              className="w-full bg-surface-brand text-text-white py-3 rounded-lg hover:opacity-90 disabled:opacity-50"
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

