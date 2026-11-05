"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AlertCircle, ChevronLeft, CreditCard, ShoppingBag, Smartphone, CheckCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useApolloClient } from "@apollo/client/react";
import { Link } from "@/i18n/navigation";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import { CountrySelect } from "@/components/custom/input";
import { formatAmountWithCurrency } from "@/lib/displayCurrency";
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";
import { CONVERT_CURRENCY } from "@/services/gql/marketplace";
import {
  cartNeedsShipping,
  cartTotalMinor,
  isShippingComplete,
  lineAmountMinor,
  type CheckoutFailure,
} from "@/lib/marketplaceCheckout";
import { isMobileMoneySupported, toMajorUnits } from "@/types/money";
import { readableSeller } from "@/components/marketplace/DetailParts";
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
  paidLines = [],
}: {
  cart: CartItem[];
  /** Lines already paid in this checkout, after part of it failed. No longer in `cart`. */
  paidLines?: CartItem[];
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
  const tp = useTranslations("marketplacePage");
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
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: "",
    address: "",
    city: "",
    country: "",
    phoneNumber: "",
  });
  // Service orders take no shipping address: a cart of only services asks for none.
  const needsShipping = cartNeedsShipping(cart);
  const missingAddress = needsShipping && !isShippingComplete(shippingAddress);

  // Exactly what the order mutations send: unit price x quantity. Neither order
  // input takes a shipping fee or extras, so the screen shows neither.
  const totalMinor = useMemo(() => cartTotalMinor(cart), [cart]);
  const total = toMajorUnits(totalMinor);

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
            amount: totalMinor,
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
  }, [apolloClient, displayCurrency, listingCurrency, total, totalMinor, locale]);

  const [failure, setFailure] = useState<CheckoutFailure | null>(null);

  const handleSubmit = async () => {
    if (missingAddress) return;
    setFailure(null);
    const res = await onPay({ cart, method: paymentMethod, shippingAddress });
    if (res.success) {
      onComplete();
      return;
    }
    setFailure(res.failure ?? null);
  };

  const failureMessages: Record<CheckoutFailure, string> = {
    mixed_currency: tp("checkoutFailure.mixedCurrency"),
    order_refused: tp("checkoutFailure.orderRefused"),
    price_changed: tp("checkoutFailure.priceChanged"),
    payment_cancelled: tp("checkoutFailure.paymentCancelled"),
    payment_refused: tp("checkoutFailure.paymentRefused"),
    payment_unavailable: tp("checkoutFailure.paymentUnavailable"),
    payment_unconfirmed: tp("checkoutFailure.paymentUnconfirmed"),
  };

  return (
    <div className="h-app-inner overflow-y-auto scrollbar-hide bg-background">
     <div className="mx-auto w-full space-y-4 px-4 pb-24 pt-4 lg:w-[80vw] lg:px-0 lg:pb-10">
      <ButtonType3
        onClick={onBack}
        className="min-h-11 p-0 min-w-0 border-0 bg-transparent flex items-center gap-2 text-text-secondary hover:text-text-primary"
      >
        <ChevronLeft className="w-5 h-5" />
        <span>{t("checkout")}</span>
      </ButtonType3>
      <h1 className="text-2xl font-bold text-text-primary">{tp("checkoutHeading")}</h1>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <div>
            <div className="bg-surface-default rounded-2xl border border-border-subtle p-4 shadow-sm sm:p-5 mb-6">
              <h3 className="font-semibold mb-4 text-text-primary">{t("orderDetails")}</h3>
              {cart.map((item) => {
                const lineTotal = toMajorUnits(lineAmountMinor(item));
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
                      {readableSeller(item.seller) && (
                        <p className="text-sm text-text-secondary">{readableSeller(item.seller)}</p>
                      )}
                    </div>
                    <p className="font-semibold text-text-primary whitespace-nowrap">
                      {formatAmount(lineTotal)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="bg-surface-default rounded-2xl border border-border-subtle p-4 shadow-sm sm:p-5 mb-6">
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
                      <p className="text-xs text-text-secondary mt-0.5">Powered by Paystack · Complete in Paystack&apos;s secure popup</p>
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

            {needsShipping && (
            <div className="bg-surface-default rounded-2xl border border-border-subtle p-4 shadow-sm sm:p-5 mb-6">
              <h3 className="font-semibold mb-4 text-text-primary">{t("shippingAddress")}</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder={t("namePlaceholder")}
                  value={shippingAddress.name}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, name: e.target.value })
                  }
                  className="w-full px-4 py-2 text-base md:text-sm border border-border-subtle rounded-lg bg-surface-default text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-brand"
                  required
                />
                <input
                  type="text"
                  placeholder={t("addressPlaceholder")}
                  value={shippingAddress.address}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, address: e.target.value })
                  }
                  className="w-full px-4 py-2 text-base md:text-sm border border-border-subtle rounded-lg bg-surface-default text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-brand"
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
                    className="px-4 py-2 text-base md:text-sm border border-border-subtle rounded-lg bg-surface-default text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-brand"
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
                  className="w-full px-4 py-2 text-base md:text-sm border border-border-subtle rounded-lg bg-surface-default text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-brand"
                  required
                />
              </div>
            </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <div className="bg-surface-default rounded-2xl border border-border-subtle p-4 shadow-sm sm:p-5 lg:sticky lg:top-4">
            <h3 className="font-semibold mb-4 text-text-primary">{t("priceSummary")}</h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">{t("subtotalAmount")}</span>
                <span className="text-text-primary">{formatAmount(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">{t("discount")}</span>
                <span className="text-text-primary">{formatAmount(0)}</span>
              </div>
            </div>
            <div className="border-t border-border-subtle pt-4 mb-6">
              <div className="flex justify-between font-bold text-lg text-text-primary">
                <span>{t("total")}</span>
                <span data-testid="mp-checkout-total">{formatAmount(total)}</span>
              </div>
              <p className="text-xs text-text-secondary mt-2">
                You will be charged {formatAmount(total)} {listingCurrency}.
                {displayTotalLabel
                  ? ` (≈ ${displayTotalLabel} in your currency)`
                  : ""}
              </p>
            </div>
            {paidLines.length > 0 && (
              <section
                aria-labelledby="mp-checkout-paid-heading"
                className="mb-4 rounded-xl bg-surface-success p-3 text-sm text-text-primary"
                data-testid="mp-checkout-paid"
              >
                <h4 id="mp-checkout-paid-heading" className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="size-4 shrink-0 text-text-success" aria-hidden />
                  {tp("checkoutPaidHeading")}
                </h4>
                <ul className="mt-2 space-y-1">
                  {paidLines.map((item) => (
                    <li key={item.lineId ?? item.id} className="flex justify-between gap-3">
                      <span className="min-w-0 break-words">
                        {item.name}
                        {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                      </span>
                      <span className="whitespace-nowrap">
                        {formatAmount(toMajorUnits(lineAmountMinor(item)))}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link href="/wallet" className="mt-2 inline-block underline">
                  {tp("checkoutPaidWalletLink")}
                </Link>
              </section>
            )}
            {failure && (
              <p
                role="alert"
                className="mb-4 flex gap-2 rounded-xl bg-surface-subtle p-3 text-sm text-text-primary"
                data-testid="mp-checkout-failure"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-text-danger" aria-hidden />
                <span className="min-w-0 break-words">{failureMessages[failure]}</span>
              </p>
            )}
            <ButtonType2
              onClick={handleSubmit}
              disabled={isPaying || cart.length === 0 || missingAddress}
              aria-describedby={missingAddress ? "mp-checkout-address-hint" : undefined}
              className="w-full bg-surface-brand text-text-white py-3 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {isPaying
                ? t("processing") ?? "Processing…"
                : t("payAmount", { amount: formatAmount(total) })}
            </ButtonType2>
            {missingAddress && (
              <p id="mp-checkout-address-hint" className="mt-2 text-xs text-text-secondary" data-testid="mp-checkout-address-hint">
                {tp("checkoutAddressHint")}
              </p>
            )}
          </div>
        </div>
      </div>
     </div>
    </div>
  );
}

