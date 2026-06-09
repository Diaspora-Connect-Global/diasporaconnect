"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, CreditCard, Smartphone, CheckCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useApolloClient } from "@apollo/client/react";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import { formatAmountWithCurrency } from "@/lib/displayCurrency";
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";
import { CONVERT_CURRENCY } from "@/services/gql/marketplace";
import { isMobileMoneySupported } from "@/types/money";
import type { CartItem, PaymentMethod, PaymentResult } from "./types";

type ConvertCurrencyData = {
  convertCurrency: {
    success: boolean;
    converted_amount: number;
    to_currency: string;
  };
};

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
  const locale = useLocale();
  const apolloClient = useApolloClient();
  const { currency: displayCurrency } = useDisplayCurrency();

  // The platform SETTLES in the listing currency (no FX).
  const listingCurrency = (serviceItem.currency ?? "GHS").toUpperCase();
  const formatAmount = (value: number) =>
    formatAmountWithCurrency(value, listingCurrency, locale);

  const mobileMoneyAvailable = isMobileMoneySupported(listingCurrency);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("credit");

  useEffect(() => {
    if (!mobileMoneyAvailable && paymentMethod === "mobile") {
      setPaymentMethod("credit");
    }
  }, [mobileMoneyAvailable, paymentMethod]);

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
  const extrasPrice = serviceItem.extrasTotal ?? (serviceItem.extras?.length || 0) * 125;
  const serviceFee = 50;
  const total = packagePrice + extrasPrice + serviceFee;

  // P2 display conversion (non-blocking).
  const [displayTotalLabel, setDisplayTotalLabel] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const convert = async () => {
      if (displayCurrency === listingCurrency || total <= 0) {
        if (!cancelled) setDisplayTotalLabel(null);
        return;
      }
      try {
        const { data } = await apolloClient.query<ConvertCurrencyData>({
          query: CONVERT_CURRENCY,
          variables: {
            amount: Math.round(total * 100),
            from_currency: listingCurrency,
            to_currency: displayCurrency,
          },
          fetchPolicy: "no-cache",
        });
        const result = data?.convertCurrency;
        if (!result?.success || typeof result.converted_amount !== "number") {
          if (!cancelled) setDisplayTotalLabel(null);
          return;
        }
        if (!cancelled) {
          setDisplayTotalLabel(
            formatAmountWithCurrency(
              result.converted_amount / 100,
              displayCurrency,
              locale
            )
          );
        }
      } catch {
        if (!cancelled) setDisplayTotalLabel(null);
      }
    };
    void convert();
    return () => {
      cancelled = true;
    };
  }, [apolloClient, displayCurrency, listingCurrency, total, locale]);

  const handlePay = async () => {
    const res = await onPay({ item: serviceItem, method: paymentMethod });
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
          <div className="bg-surface-default rounded-lg border border-border-subtle p-6 mb-6">
            <h3 className="font-semibold mb-4 text-text-primary">{t("orderDetails")}</h3>
            <div className="flex gap-4 mb-4">
              <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-surface-subtle">
                {typeof serviceItem.image === "string" && serviceItem.image.startsWith("http") ? (
                  <Image src={serviceItem.image} alt={serviceItem.name} fill className="object-cover" sizes="64px" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-2xl text-text-tertiary">{serviceItem.image}</span>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium mb-1 text-text-primary">{t("revenueStrategyService")}</p>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <div className="w-6 h-6 bg-surface-subtle rounded-full" />
                  <span>{serviceItem.seller}</span>
                </div>
              </div>
            </div>
            <div className="text-sm text-text-secondary">
              <p>{t("premiumPackage")} ({formatAmount(packagePrice)})</p>
            </div>
            {serviceItem.extras && serviceItem.extras.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border-subtle">
                <p className="text-sm font-medium mb-1 text-text-primary">{t("extras")}</p>
                <p className="text-sm text-text-secondary">{t("includeSourceFile")}</p>
              </div>
            )}
          </div>

          <div className="bg-surface-default rounded-lg border border-border-subtle p-6 mb-6">
            <h3 className="font-semibold mb-4 text-text-primary">{t("paymentDetails")}</h3>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("credit")}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                  paymentMethod === "credit"
                    ? "border-border-brand bg-surface-brand/5"
                    : "border-border-subtle bg-surface-subtle hover:bg-surface-hover"
                }`}
              >
                <div className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ${
                  paymentMethod === "credit" ? "bg-surface-brand text-text-white" : "bg-surface-default text-text-primary"
                }`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary text-sm">{t("creditCard")}</p>
                  <p className="text-xs text-text-secondary mt-0.5">Powered by Stripe · Your saved card will be charged</p>
                </div>
                {paymentMethod === "credit" && <CheckCircle2 className="w-5 h-5 text-text-brand flex-shrink-0" />}
              </button>

              {mobileMoneyAvailable && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod("mobile")}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    paymentMethod === "mobile"
                      ? "border-border-brand bg-surface-brand/5"
                      : "border-border-subtle bg-surface-subtle hover:bg-surface-hover"
                  }`}
                >
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ${
                    paymentMethod === "mobile" ? "bg-surface-brand text-text-white" : "bg-surface-default text-text-primary"
                  }`}>
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary text-sm">{t("mobilePayment")}</p>
                    <p className="text-xs text-text-secondary mt-0.5">Powered by Paystack · Complete in Paystack's secure popup</p>
                  </div>
                  {paymentMethod === "mobile" && <CheckCircle2 className="w-5 h-5 text-text-brand flex-shrink-0" />}
                </button>
              )}
              {!mobileMoneyAvailable && (
                <p className="text-xs text-text-secondary px-1">
                  Mobile money is available for GHS listings only. This service is
                  priced in {listingCurrency}, so please pay by card.
                </p>
              )}
            </div>
          </div>

          <div className="bg-surface-default rounded-lg border border-border-subtle p-6">
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
          <div className="bg-surface-default rounded-lg border border-border-subtle p-6 sticky top-24">
            <h3 className="font-semibold mb-4">{t("priceSummary")}</h3>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-text-secondary">{serviceItem.name}</span>
                <span className="font-medium">{formatAmount(packagePrice)}</span>
              </div>
              {serviceItem.extras && serviceItem.extras.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">{t("includeSourceFile")}</span>
                  <span className="font-medium">{formatAmount(extrasPrice)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-secondary">{t("serviceFee")}</span>
                <span className="font-medium">{formatAmount(serviceFee)}</span>
              </div>
            </div>
            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between font-bold text-lg">
                <span>{t("total")}</span>
                <span>{formatAmount(total)}</span>
              </div>
              <p className="text-xs text-text-secondary mt-2">
                You will be charged {formatAmount(total)} {listingCurrency}.
                {displayTotalLabel
                  ? ` (≈ ${displayTotalLabel} in your currency)`
                  : ""}
              </p>
            </div>
            <ButtonType2
              onClick={handlePay}
              disabled={isPaying}
              className="w-full bg-surface-brand text-text-white py-3 rounded-lg hover:opacity-90"
            >
              {isPaying
                ? t("processing") ?? "Processing…"
                : t("payAmount", { amount: formatAmount(total) })}
            </ButtonType2>
          </div>
        </div>
      </div>
    </div>
  );
}

