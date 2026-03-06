"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  return (
    <div className="fixed inset-0 bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-default rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">{t("shoppingCart")}</h2>
          <ButtonType3
            onClick={onClose}
            className="p-0 min-w-0 border-0 bg-transparent text-gray-500 hover:text-gray-700 text-2xl"
            aria-label={t("close")}
          >
            <X className="w-5 h-5" />
          </ButtonType3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{t("itemsInCart")}</h3>
            <span className="text-sm text-gray-600">
              {t("numberOfItems", { count: cart.length })}
            </span>
          </div>
          {cart.map((item) => (
            <div key={item.id} className="flex gap-4 mb-4 pb-4 border-b">
              <div className="relative w-20 h-20 rounded overflow-hidden flex-shrink-0 bg-surface-subtle">
                {typeof item.image === "string" && item.image.startsWith("http") ? (
                  <Image src={item.image} alt={item.name} fill className="object-cover" sizes="80px" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-3xl text-text-tertiary">{item.image}</span>
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">{item.name}</h4>
                <p className="text-sm text-gray-600 mb-2">{item.seller}</p>
                <div className="flex items-center gap-3">
                  <ButtonType3
                    onClick={() =>
                      onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))
                    }
                    className="p-1 border rounded bg-transparent min-w-0"
                  >
                    <Minus className="w-4 h-4" />
                  </ButtonType3>
                  <span className="font-medium">{item.quantity}</span>
                  <ButtonType3
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    className="p-1 border rounded bg-transparent min-w-0"
                  >
                    <Plus className="w-4 h-4" />
                  </ButtonType3>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold mb-2">
                  GH₵{(item.price * item.quantity).toFixed(2)}
                </p>
                <ButtonType4Pill
                  onClick={() => onRemoveItem(item.id)}
                  className="p-0 min-w-0 bg-transparent hover:bg-transparent"
                >
                  <Trash2 className="w-4 h-4" />
                </ButtonType4Pill>
              </div>
            </div>
          ))}
          <div className="mt-6 text-right">
            <p className="text-sm text-gray-600 mb-1">
              {t("oneTimeFee")}: GH₵20.00
            </p>
            <p className="text-2xl font-bold mb-4">
              {t("total")}: GH₵{(total + 20).toFixed(2)}
            </p>
            <ButtonType2
              onClick={onCheckout}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
              disabled={cart.length === 0}
            >
              {t("proceedToCheckout")}
            </ButtonType2>
          </div>
        </div>
      </div>
    </div>
  );
}

