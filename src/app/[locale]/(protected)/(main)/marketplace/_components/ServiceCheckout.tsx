"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import type { CartItem, PaymentMethod, PaymentResult } from "./types";

export function ServiceCheckout({
  serviceItem,
  onBack,
  onPay,
  isPaying = false,
  onComplete,
}: {
  serviceItem: CartItem;
  onBack: () => void;
  onPay: (args: { item: CartItem; method: PaymentMethod }) => Promise<PaymentResult>;
  isPaying?: boolean;
  onComplete: () => void;
}) {
  const t = useTranslations("marketplace");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("credit");
  const [billingAddress, setBillingAddress] = useState({
    name: "",
    address: "",
    city: "",
    country: "",
    phoneNumber: "",
  });

  const packagePrice = useMemo(
    () => serviceItem.price * serviceItem.quantity,
    [serviceItem.price, serviceItem.quantity]
  );
  const extrasPrice = (serviceItem.extras?.length || 0) * 125;
  const serviceFee = 50;
  const total = packagePrice + extrasPrice + serviceFee;

  const handlePay = async () => {
    const res = await onPay({ item: serviceItem, method: paymentMethod });
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
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-semibold mb-4">{t("orderDetails")}</h3>
            <div className="flex gap-4 mb-4">
              <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-surface-subtle">
                {typeof serviceItem.image === "string" && serviceItem.image.startsWith("http") ? (
                  <Image src={serviceItem.image} alt={serviceItem.name} fill className="object-cover" sizes="64px" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-2xl text-text-tertiary">{serviceItem.image}</span>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium mb-1">{t("revenueStrategyService")}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-6 h-6 bg-gray-200 rounded-full" />
                  <span>{serviceItem.seller}</span>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>
                {t("premiumPackage")} (GH₵{packagePrice.toFixed(2)})
              </p>
            </div>
            {serviceItem.extras && serviceItem.extras.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-medium mb-1">{t("extras")}</p>
                <p className="text-sm text-gray-600">{t("includeSourceFile")}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-semibold mb-4">{t("paymentDetails")}</h3>

            <ButtonType3
              onClick={() => setPaymentMethod("credit")}
              className={`flex items-center justify-between w-full p-4 border rounded-lg mb-3 hover:bg-gray-50 ${
                paymentMethod === "credit" ? "border-border-brand" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border rounded flex items-center justify-center">
                  💳
                </div>
                <span>{t("creditCard")}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </ButtonType3>

            <ButtonType3
              onClick={() => setPaymentMethod("mobile")}
              className={`flex items-center justify-between w-full p-4 border rounded-lg hover:bg-gray-50 ${
                paymentMethod === "mobile" ? "border-border-brand" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border rounded flex items-center justify-center">
                  📱
                </div>
                <span>{t("mobilePayment")}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </ButtonType3>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">{t("billingAddress")}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t("name")}</label>
                <input
                  type="text"
                  placeholder={t("namePlaceholder")}
                  value={billingAddress.name}
                  onChange={(e) =>
                    setBillingAddress({ ...billingAddress, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("address")}</label>
                <input
                  type="text"
                  placeholder={t("addressPlaceholder")}
                  value={billingAddress.address}
                  onChange={(e) =>
                    setBillingAddress({ ...billingAddress, address: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t("city")}</label>
                  <input
                    type="text"
                    placeholder={t("cityPlaceholder")}
                    value={billingAddress.city}
                    onChange={(e) =>
                      setBillingAddress({ ...billingAddress, city: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t("country")}</label>
                  <select
                    value={billingAddress.country}
                    onChange={(e) =>
                      setBillingAddress({ ...billingAddress, country: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="">{t("selectCountry")}</option>
                    <option value="GH">{t("countries.ghana")}</option>
                    <option value="NG">{t("countries.nigeria")}</option>
                    <option value="KE">{t("countries.kenya")}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("phoneNumber")}</label>
                <div className="flex gap-2">
                  <select className="px-3 py-2 border rounded-lg">
                    <option>🇬🇭 +233</option>
                  </select>
                  <input
                    type="tel"
                    placeholder={t("phonePlaceholder")}
                    value={billingAddress.phoneNumber}
                    onChange={(e) =>
                      setBillingAddress({
                        ...billingAddress,
                        phoneNumber: e.target.value,
                      })
                    }
                    className="flex-1 px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-24">
            <h3 className="font-semibold mb-4">{t("priceSummary")}</h3>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">{serviceItem.name}</span>
                <span className="font-medium">GH₵{packagePrice.toFixed(2)}</span>
              </div>
              {serviceItem.extras && serviceItem.extras.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t("includeSourceFile")}</span>
                  <span className="font-medium">GH₵{extrasPrice.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">{t("serviceFee")}</span>
                <span className="font-medium">GH₵{serviceFee.toFixed(2)}</span>
              </div>
            </div>
            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between font-bold text-lg">
                <span>{t("total")}</span>
                <span>GH₵{total.toFixed(2)}</span>
              </div>
            </div>
            <ButtonType2
              onClick={handlePay}
              disabled={isPaying}
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

