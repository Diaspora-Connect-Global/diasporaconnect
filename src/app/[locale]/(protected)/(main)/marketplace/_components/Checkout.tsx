"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, CreditCard, ShoppingBag, Smartphone, CheckCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useApolloClient } from "@apollo/client/react";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import { CountrySelect } from "@/components/custom/input";
import { formatAmountWithCurrency } from "@/lib/displayCurrency";
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";
import { CONVERT_CURRENCY } from "@/services/gql/marketplace";
import { isMobileMoneySupported } from "@/types/money";
import type { CartItem, PaymentMethod, PaymentResult, ShippingAddress } from "./types";

type ConvertCurrencyData = {
  convertCurrency: {
    success: boolean;
    converted_amount: number;
    to_currency: string;
  };
};

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
  const locale = useLocale();
  const apolloClient = useApolloClient();
  const { currency: displayCurrency } = useDisplayCurrency();

  // The platform SETTLES in the listing currency (no FX). Derive it from the
  // cart (uniform; the backend rejects mixed-currency carts) and format every
  // canonical amount in it.
  const listingCurrency = useMemo(
    () => (cart[0]?.currency ?? "GHS").toUpperCase(),
    [cart]
  );
  const formatAmount = (value: number) =>
    formatAmountWithCurrency(value, listingCurrency, locale);

  const mobileMoneyAvailable = isMobileMoneySupported(listingCurrency);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("credit");

  // Non-GHS listings can't use mobile money; force card if it was selected.
  useEffect(() => {
    if (!mobileMoneyAvailable && paymentMethod === "mobile") {
      setPaymentMethod("credit");
    }
  }, [mobileMoneyAvailable, paymentMethod]);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: "",
    address: "",
    city: "",
    country: "",
    phoneNumber: "",
  });
  const [billingAddress, setBillingAddress] = useState<ShippingAddress>({
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

  // P2 display conversion: show the viewer's display currency alongside the
  // listing currency. Non-blocking — falls back to the listing-currency amount
  // when conversion is unavailable or the currencies already match.
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
            // convertCurrency speaks integer minor units in AND out.
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
                        <span className="absolute inset-0 flex items-center justify-center text-text-tertiary"><ShoppingBag className="w-6 h-6" /></span>
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
                              {extra.name} — {formatAmount(extra.price)}
                            </li>
                          ))}
                          {(!item.serviceExtras ||
                            item.serviceExtras.length === 0) &&
                            item.extrasTotal != null &&
                            item.extrasTotal > 0 && (
                              <li>Extras — {formatAmount(item.extrasTotal)}</li>
                            )}
                        </ul>
                      )}
                    </div>
                    <p className="font-semibold text-text-primary whitespace-nowrap">
                      {formatAmount(lineTotal)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="bg-surface-default rounded-lg border border-border-subtle p-6 mb-6">
              <h3 className="font-semibold mb-4 text-text-primary">{t("paymentMethod")}</h3>
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
                    Mobile money is available for GHS listings only. This listing
                    is priced in {listingCurrency}, so please pay by card.
                  </p>
                )}
              </div>
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
              <label className="flex items-center gap-2 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={sameAsShipping}
                  onChange={(e) => setSameAsShipping(e.target.checked)}
                  className="accent-surface-brand"
                />
                <span className="text-sm text-text-primary">{t("sameAsShipping")}</span>
              </label>
              {!sameAsShipping && (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder={t("namePlaceholder")}
                    value={billingAddress.name}
                    onChange={(e) =>
                      setBillingAddress({ ...billingAddress, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-border-subtle rounded-lg bg-surface-default text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-brand"
                  />
                  <input
                    type="text"
                    placeholder={t("addressPlaceholder")}
                    value={billingAddress.address}
                    onChange={(e) =>
                      setBillingAddress({ ...billingAddress, address: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-border-subtle rounded-lg bg-surface-default text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-brand"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder={t("cityPlaceholder")}
                      value={billingAddress.city}
                      onChange={(e) =>
                        setBillingAddress({ ...billingAddress, city: e.target.value })
                      }
                      className="px-4 py-2 border border-border-subtle rounded-lg bg-surface-default text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-brand"
                    />
                    <CountrySelect
                      value={billingAddress.country}
                      onChange={(value) =>
                        setBillingAddress({ ...billingAddress, country: value })
                      }
                      id="checkout-billing-country"
                    />
                  </div>
                  <input
                    type="tel"
                    placeholder={t("phoneNumberPlaceholder")}
                    value={billingAddress.phoneNumber}
                    onChange={(e) =>
                      setBillingAddress({
                        ...billingAddress,
                        phoneNumber: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-border-subtle rounded-lg bg-surface-default text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-brand"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="bg-surface-default rounded-lg border border-border-subtle p-6 sticky top-24">
            <h3 className="font-semibold mb-4 text-text-primary">{t("priceSummary")}</h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">{t("subtotalAmount")}</span>
                <span className="text-text-primary">{formatAmount(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">{t("shippingFee")}</span>
                <span className="text-text-primary">{formatAmount(shippingFee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">{t("discount")}</span>
                <span className="text-text-primary">{formatAmount(0)}</span>
              </div>
            </div>
            <div className="border-t border-border-subtle pt-4 mb-6">
              <div className="flex justify-between font-bold text-lg text-text-primary">
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
              onClick={handleSubmit}
              disabled={isPaying || cart.length === 0}
              className="w-full bg-surface-brand text-text-white py-3 rounded-lg hover:opacity-90 disabled:opacity-50"
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

