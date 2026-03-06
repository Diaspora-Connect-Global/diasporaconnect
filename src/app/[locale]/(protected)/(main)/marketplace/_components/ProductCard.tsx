"use client";

import React from "react";
import { Heart, Plus, Star } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ButtonType3 } from "@/components/custom/button";
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

  const imageUrl =
    typeof product.image === "string" && product.image.startsWith("http")
      ? product.image
      : null;

  return (
    <div className="w-full max-w-[295px] flex flex-col">
      {/* Image block: 295×170, rounded-[24px], theme-aware border & bg */}
      <div className="relative w-full aspect-[295/170] rounded-[24px] border border-border-subtle overflow-hidden bg-surface-subtle">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="295px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl text-text-tertiary">
            {product.image}
          </div>
        )}
        <ButtonType3
          className="absolute top-2 right-2 rounded-full p-2 border-0 bg-surface-default/80 min-w-0 hover:bg-surface-default"
          aria-label={t("addToWishlist")}
        >
          <Heart
            className="w-5 h-5 fill-text-secondary/30 stroke-text-secondary"
            style={{ strokeWidth: 1.5 }}
          />
        </ButtonType3>
      </div>

      {/* Product name (left) + star & rating (right) */}
      <div className="flex items-start justify-between gap-2 mt-3">
        <h3 className="font-semibold text-text-primary text-sm sm:text-base line-clamp-2 flex-1 min-w-0">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400 dark:fill-amber-300 dark:text-amber-300" />
          <span className="text-sm font-medium text-text-primary">{product.rating}</span>
          <span className="text-sm text-text-secondary">({product.reviews})</span>
        </div>
      </div>

      <p className="text-sm text-text-secondary mt-1">{t("location")}</p>

      {/* Price (left) + add button (right) */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-base font-bold text-text-primary">
          GH₵{product.price.toFixed(2)}
        </span>
        <button
          type="button"
          onClick={handleAddClick}
          className="w-10 h-10 rounded-full bg-surface-brand text-text-white flex items-center justify-center hover:opacity-90 transition-opacity min-w-[40px]"
          aria-label={t("addToCart")}
        >
          <Plus className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>

      {/* Seller row with avatar placeholder */}
      <div className="flex items-center gap-2 mt-3">
        <div className="w-5 h-5 rounded-full bg-surface-brand-subtle dark:bg-surface-subtle flex-shrink-0 overflow-hidden" />
        <p className="text-sm text-text-secondary truncate">{product.seller}</p>
      </div>
    </div>
  );
}

