"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ButtonType2, ButtonType3, ButtonType4Pill } from "@/components/custom/button";
import type { CartItem } from "./types";

export function ShoppingCartModal({
  cart,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: {
  cart: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
}) {
  const t = useTranslations("marketplace");
  const locale = useLocale();
  const formatAmount = (value: number) =>
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  const total = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum + item.price * item.quantity + (item.extrasTotal ?? 0),
        0
      ),
    [cart]
  );

  return (
    <div className="fixed inset-0 bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-default rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">{t("shoppingCart")}</h2>
          <ButtonType3
            onClick={onClose}
            className="p-0 min-w-0 border-0 bg-transparent text-text-secondary hover:text-text-primary text-2xl"
            aria-label={t("close")}
          >
            <X className="w-5 h-5" />
          </ButtonType3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{t("itemsInCart")}</h3>
            <span className="text-sm text-text-secondary">
              {t("numberOfItems", { count: cart.length })}
            </span>
          </div>
          {cart.length === 0 ? (
            <div className="py-10 px-4 flex flex-col items-center justify-center text-center">
              <ShoppingCart className="w-14 h-14 text-text-tertiary mb-4" strokeWidth={1.5} />
              <p className="text-text-primary font-medium mb-1">{t("cartEmpty")}</p>
              <p className="text-text-secondary text-sm">{t("cartEmptySubtitle")}</p>
            </div>
          ) : (
          <>
          {cart.map((item) => {
            const lineKey = item.lineId ?? item.id;
            const lineTotal =
              item.price * item.quantity + (item.extrasTotal ?? 0);
            return (
              <div key={lineKey} className="flex gap-4 mb-4 pb-4 border-b">
                <div className="relative w-20 h-20 rounded overflow-hidden flex-shrink-0 bg-surface-subtle">
                  {typeof item.image === "string" && item.image.startsWith("http") ? (
                    <Image src={item.image} alt={item.name} fill className="object-cover" sizes="80px" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-3xl text-text-tertiary">{item.image}</span>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">{item.name}</h4>
                  <p className="text-sm text-text-secondary mb-2">{item.seller}</p>
                  {item.extras && item.extras.length > 0 && (
                    <ul className="text-xs text-text-tertiary space-y-0.5 mb-1">
                      {(item.serviceExtras
                        ? item.extras
                            .map((id) =>
                              item.serviceExtras!.find((e) => e.id === id)
                            )
                            .filter(Boolean) as { id: string; name: string; price: number }[]
                        : []
                      ).map((extra) => (
                        <li key={extra.id}>
                          {extra.name} — GH₵{formatAmount(extra.price)}
                        </li>
                      ))}
                      {(!item.serviceExtras || item.serviceExtras.length === 0) &&
                        item.extrasTotal != null &&
                        item.extrasTotal > 0 && (
                          <li>Extras — GH₵{formatAmount(item.extrasTotal)}</li>
                        )}
                    </ul>
                  )}
                  <div className="flex items-center gap-3">
                    <ButtonType3
                      onClick={() =>
                        onUpdateQuantity(lineKey, Math.max(1, item.quantity - 1))
                      }
                      className="p-1 border rounded bg-transparent min-w-0"
                    >
                      <Minus className="w-4 h-4" />
                    </ButtonType3>
                    <span className="font-medium">{item.quantity}</span>
                    <ButtonType3
                      onClick={() => onUpdateQuantity(lineKey, item.quantity + 1)}
                      className="p-1 border rounded bg-transparent min-w-0"
                    >
                      <Plus className="w-4 h-4" />
                    </ButtonType3>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold mb-2">
                    GH₵{formatAmount(lineTotal)}
                  </p>
                  <ButtonType4Pill
                    onClick={() => onRemoveItem(lineKey)}
                    className="p-0 min-w-0 bg-transparent hover:bg-transparent"
                  >
                    <Trash2 className="w-4 h-4" />
                  </ButtonType4Pill>
                </div>
              </div>
            );
          })}
          <div className="mt-6 text-right">
            <p className="text-sm text-text-secondary mb-1">
              {t("oneTimeFee")}: GH₵{formatAmount(20)}
            </p>
            <p className="text-2xl font-bold mb-4 text-text-primary">
              {t("total")}: GH₵{formatAmount(total + 20)}
            </p>
            <ButtonType2
              onClick={onCheckout}
              className="w-full bg-surface-brand text-text-white py-3 rounded-lg hover:opacity-90"
            >
              {t("proceedToCheckout")}
            </ButtonType2>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}

