"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { CheckCircle, ShoppingBag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ButtonType2 } from "@/components/custom/button";
import { formatAmountWithCurrency } from "@/lib/displayCurrency";
import { cartTotalMinor, lineAmountMinor } from "@/lib/marketplaceCheckout";
import { toMajorUnits } from "@/types/money";
import { readableSeller } from "@/components/marketplace/DetailParts";
import type { CartItem } from "./types";

export function OrderSuccess({
  cart,
  onBackToHome,
}: {
  cart: CartItem[];
  onBackToHome: () => void;
}) {
  const t = useTranslations("marketplace");
  const locale = useLocale();
  // Orders are single-currency; the cart's own listing currency is the one to show.
  const currency = (cart[0]?.currency ?? "GHS").toUpperCase();
  const formatAmount = (value: number) =>
    formatAmountWithCurrency(value, currency, locale);
  // The same sum Checkout showed and the orders sent: unit price x quantity.
  const total = useMemo(() => toMajorUnits(cartTotalMinor(cart)), [cart]);

  return (
    <div className="h-app-inner overflow-y-auto scrollbar-hide bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 pb-24 text-center lg:px-0">
        <div className="rounded-2xl border border-border-subtle bg-surface-default p-5 shadow-sm sm:p-8">
          <div className="mb-6 inline-flex size-20 items-center justify-center rounded-full bg-surface-success">
            <CheckCircle className="size-12 text-text-success" aria-hidden />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-text-primary">{t("orderSuccess")}</h1>
          <p className="mb-8 text-text-secondary">{t("orderDetails")}</p>

          <ul className="mb-8 space-y-4 text-left">
            {cart.map((item) => {
              const lineTotal = toMajorUnits(lineAmountMinor(item));
              const seller = readableSeller(item.seller);
              return (
                <li key={item.lineId ?? item.id} className="flex gap-3">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-subtle">
                    {typeof item.image === "string" && item.image.startsWith("http") ? (
                      <Image src={item.image} alt="" fill className="object-cover" sizes="64px" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-text-tertiary"><ShoppingBag className="size-6" aria-hidden /></span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-text-primary">{item.name}</p>
                    {seller && <p className="text-sm text-text-secondary">{seller}</p>}
                    {item.quantity > 1 && <p className="text-xs text-muted-foreground">× {item.quantity}</p>}
                  </div>
                  <p className="font-bold text-text-primary">{formatAmount(lineTotal)}</p>
                </li>
              );
            })}
          </ul>

          <dl className="mb-8 space-y-2 border-t border-border-subtle pt-6 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-secondary">{t("subtotal")}</dt>
              <dd className="text-text-primary">{formatAmount(total)}</dd>
            </div>
            <div className="flex justify-between text-lg font-bold text-text-primary">
              <dt>{t("total")}</dt>
              <dd>{formatAmount(total)}</dd>
            </div>
          </dl>

          <ButtonType2
            onClick={onBackToHome}
            className="min-h-11 rounded-full bg-surface-brand px-8 py-3 text-white hover:bg-surface-brand/90"
          >
            {t("doneOrder")}
          </ButtonType2>
        </div>
      </div>
    </div>
  );
}
