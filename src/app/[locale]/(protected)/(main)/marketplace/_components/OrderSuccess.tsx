"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { ButtonType2 } from "@/components/custom/button";
import type { CartItem } from "./types";

export function OrderSuccess({
  cart,
  onBackToHome,
}: {
  cart: CartItem[];
  onBackToHome: () => void;
}) {
  const t = useTranslations("marketplace");
  const total = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum + item.price * item.quantity + (item.extrasTotal ?? 0),
        0
      ) + 20,
    [cart]
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <div className="bg-white rounded-lg shadow p-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">{t("orderSuccess")}</h2>
        <p className="text-gray-600 mb-8">{t("orderDetails")}</p>

        <div className="text-left mb-8">
          {cart.map((item) => {
            const lineTotal =
              item.price * item.quantity + (item.extrasTotal ?? 0);
            return (
              <div
                key={item.lineId ?? item.id}
                className="flex gap-3 mb-4"
              >
                <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-surface-subtle">
                  {typeof item.image === "string" && item.image.startsWith("http") ? (
                    <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-2xl text-text-tertiary">{item.image}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-text-secondary">{item.seller}</p>
                  {item.extras && item.extras.length > 0 && (
                    <ul className="text-xs text-text-tertiary space-y-0.5 mt-1">
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
                <p className="font-bold">GH₵{lineTotal.toFixed(2)}</p>
              </div>
            );
          })}
        </div>

        <div className="border-t pt-6 mb-8">
          <div className="grid grid-cols-2 gap-4 text-sm mb-2">
            <div className="text-left">
              <p className="text-gray-600 mb-4">{t("shippingAddress")}</p>
              <p>Jane Doe</p>
              <p>Kumasi, Ghana - Danyame-Nhyianso</p>
              <p>PO 233-543-8392</p>
            </div>
            <div className="text-left">
              <p className="text-gray-600 mb-4">{t("billingAddress")}</p>
              <p>Jane Doe</p>
              <p>Kumasi, Ghana - Danyame-Nhyianso</p>
              <p>PO 233-543-8392</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mt-6">
            <div className="text-left">
              <p className="text-gray-600">{t("paymentMethod")}</p>
              <p>{t("visaEnding", { digits: "1234" })}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-600">{t("subtotal")}:</p>
              <p className="text-gray-600">{t("shippingFee")}:</p>
              <p className="font-bold text-lg">{t("total")}:</p>
            </div>
            <div />
            <div className="text-right">
              <p>GH₵{(total - 20).toFixed(2)}</p>
              <p>GH₵20.00</p>
              <p className="font-bold text-lg">GH₵{total.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <ButtonType2
          onClick={onBackToHome}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700"
        >
          {t("doneOrder")}
        </ButtonType2>
      </div>
    </div>
  );
}

