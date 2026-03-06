"use client";

import React from "react";
import { Heart, Plus, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import type { CartItem, Product } from "./types";

export function ProductCard({
  product,
  onAddToCart,
}: {
  product: Product;
  onAddToCart: (product: Product | CartItem) => void;
}) {
  const t = useTranslations("marketplace");

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
  };

  return (
    <div>
      <div className="relative mb-3">
        <div className="rounded-4xl h-48 flex items-center justify-center text-6xl border-1">
          {product.image}
        </div>
        <ButtonType3
          className="absolute top-2 right-2 rounded-full p-2 border-0 bg-transparent min-w-0"
          aria-label={t("addToWishlist")}
        >
          <Heart className="w-5 h-5 text-gray-400" />
        </ButtonType3>
      </div>
      <div className="flex">
        <h3 className="font-semibold mb-1">{product.name}</h3>
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-medium text-primary">{product.rating}</span>
          <span className="text-sm text-secondary">({product.reviews})</span>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-2">{t("location")}</p>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold">GH₵{product.price.toFixed(2)}</span>
        <ButtonType2
          onClick={handleAddClick}
          className="bg-surface-brand text-text-white rounded-full p-2 min-w-0"
          aria-label={t("addToCart")}
        >
          <Plus className="w-4 h-4" />
        </ButtonType2>
      </div>
      <p className="text-sm text-text-secondary mb-2">{product.seller}</p>
    </div>
  );
}

