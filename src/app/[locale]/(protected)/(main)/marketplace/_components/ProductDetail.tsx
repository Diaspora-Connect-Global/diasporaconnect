"use client";

import React, { useState } from "react";
import { ChevronLeft, Heart, Minus, Search, Plus, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import type { CartItem, Product } from "./types";

export function ProductDetail({
  product,
  onBack,
  onAddToCart,
  onBuyNow,
}: {
  product: Product;
  onBack: () => void;
  onAddToCart: (item: Product | CartItem) => void;
  onBuyNow?: (item: CartItem) => void;
}) {
  const t = useTranslations("marketplace");
  const [selectedSize, setSelectedSize] = useState("M");
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || "");

  const sizes = ["SM", "M", "LG", "XL", "XXL"];

  const handleAddToCart = () => {
    onAddToCart({
      ...product,
      quantity,
      size: selectedSize,
      color: selectedColor,
    });
  };

  const handleBuyNow = () => {
    onBuyNow?.({
      ...product,
      quantity,
      size: selectedSize,
      color: selectedColor,
    });
  };

  return (
    <>
      <div className="h-[10%] flex items-center text-center">
        <ButtonType3
          onClick={onBack}
          className="p-0 min-w-0 border-0 bg-transparent flex items-center gap-2 text-primary"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>{product.name}</span>
        </ButtonType3>
      </div>

      <div className="h-[90%] overflow-y-auto max-w-7xl mx-auto px-4 py-6 scrollbar-hide">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* left side */}
          <div>
            <div className="flex space-x-2">
              <div className="flex flex-col gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="border-1 rounded-lg w-20 h-20 flex items-center justify-center text-3xl cursor-pointer hover:ring-2 ring-text-brand"
                  >
                    {product.image}
                  </div>
                ))}
              </div>
              <div className="border-1 w-full rounded-lg h-96 flex items-center justify-center text-9xl mb-4">
                {product.image}
              </div>
            </div>

            <div className="p-2 rounded-lg">
              <h3 className="font-semibold mb-2">{t("aboutProduct")}</h3>
              <p className="text-sm text-gray-600">{t("productDescription")}</p>
            </div>
          </div>

          {/* right side */}
          <div>
            <p className="text-sm text-gray-600 mb-4">
              {t("bySeller", { seller: product.seller })}
            </p>

            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{product.rating}</span>
                  <span className="text-gray-500">({product.reviews})</span>
                </div>
              </div>
              <div className="flex gap-2">
                <ButtonType3 className="p-2 rounded-full border-0 bg-transparent min-w-0">
                  <Heart className="w-5 h-5" />
                </ButtonType3>
                <ButtonType3 className="p-2 rounded-full border-0 bg-transparent min-w-0">
                  <Search className="w-5 h-5" />
                </ButtonType3>
              </div>
            </div>

            <p className="text-3xl font-bold mb-6">GH₵{product.price.toFixed(2)}</p>

            <div className="mb-6">
              <h3 className="font-semibold mb-2">{t("size")}</h3>
              <div className="flex gap-2">
                {sizes.map((size) => (
                  <ButtonType3
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-2 py-1 border rounded-xl bg-transparent min-w-0 ${
                      selectedSize === size ? "border-brand text-brand" : "border-gray-300"
                    }`}
                  >
                    {size}
                  </ButtonType3>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-2">{t("quantity")}</h3>
              <div className="flex items-center gap-4 border-1 w-fit px-8 py-5 rounded-full text-text-brand border-brand">
                <ButtonType3
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 rounded border-0 bg-transparent min-w-0"
                  aria-label={t("decreaseQuantity")}
                >
                  <Minus className="w-4 h-4" />
                </ButtonType3>
                <span className="text-lg font-medium text-primary">{quantity}</span>
                <ButtonType3
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 rounded border-0 bg-transparent min-w-0"
                  aria-label={t("increaseQuantity")}
                >
                  <Plus className="w-4 h-4" />
                </ButtonType3>
              </div>
            </div>

            {!!product.colors?.length && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">{t("color")}</h3>
                <div className="flex gap-2">
                  {product.colors.map((c) => (
                    <ButtonType3
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className={`px-3 py-1 border rounded-full bg-transparent min-w-0 ${
                        selectedColor === c ? "border-brand text-brand" : "border-gray-300"
                      }`}
                    >
                      {c}
                    </ButtonType3>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 mb-6">
              <ButtonType2
                onClick={handleAddToCart}
                className="flex-1 bg-text-primary text-text-white py-3 rounded-full"
              >
                {t("addToCart")}
              </ButtonType2>
              <ButtonType2
                onClick={handleBuyNow}
                className="flex-1 bg-surface-brand text-text-white py-3 rounded-full"
                disabled={!onBuyNow}
              >
                {t("buyNow")}
              </ButtonType2>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

