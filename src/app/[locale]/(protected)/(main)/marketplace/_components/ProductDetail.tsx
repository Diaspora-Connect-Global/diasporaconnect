"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Heart, Minus, Plus, Share2, Star } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ButtonType1, ButtonType2, ButtonType3 } from "@/components/custom/button";
import type { CartItem, Product } from "./types";

const DEFAULT_THUMBNAIL_COUNT = 4;

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
  const tCommon = useTranslations("common");
  const galleryImages =
    product.images && product.images.length > 0
      ? product.images
      : Array(DEFAULT_THUMBNAIL_COUNT).fill(product.image);
  const thumbnailCount = galleryImages.length;
  const [selectedThumbIndex, setSelectedThumbIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState("M");
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || "");

  const sizes = ["SM", "M", "LG", "XL", "XXL"];
  const mainImageSrc = galleryImages[Math.min(selectedThumbIndex, thumbnailCount - 1)];
  const mainImageUrl =
    typeof mainImageSrc === "string" && mainImageSrc.startsWith("http")
      ? mainImageSrc
      : null;

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

  const handlePrevImage = () => {
    setSelectedThumbIndex((i) => (i - 1 + thumbnailCount) % thumbnailCount);
  };

  const handleNextImage = () => {
    setSelectedThumbIndex((i) => (i + 1) % thumbnailCount);
  };

  return (
    <div className="min-h-full flex flex-col bg-surface-brand-subtle dark:bg-background">
      {/* Back: chevron + product name */}
      <div className="flex-shrink-0 flex items-center px-4 py-4 md:px-6">
        <ButtonType3
          onClick={onBack}
          className="p-0 min-w-0 border-0 bg-transparent flex items-center gap-2 text-text-primary"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="font-medium truncate max-w-[200px] sm:max-w-none">{product.name}</span>
        </ButtonType3>
      </div>

      <div className="flex-1 overflow-y-auto max-w-7xl mx-auto w-full px-4 pb-8 scrollbar-hide">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-6 lg:gap-8">
          {/* Left column: 50% – thumbnails + main image, then about product (same width) */}
          <div className="flex flex-col gap-4 lg:min-w-0">
            <div className="flex flex-col sm:flex-row gap-4 lg:flex-row lg:gap-4">
            {/* Vertical thumbnails – each shows a different image from the gallery */}
            <div className="flex flex-row sm:flex-col gap-2 order-2 sm:order-1 lg:flex-col">
              {galleryImages.map((src, i) => {
                const isUrl = typeof src === "string" && src.startsWith("http");
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedThumbIndex(i)}
                    className={`relative w-full aspect-[136/97] max-w-[80px] sm:max-w-[136px] lg:w-[112px] rounded-2xl overflow-hidden border-2 flex items-center justify-center bg-surface-subtle transition-colors ${
                      selectedThumbIndex === i
                        ? "border-border-brand"
                        : "border-border-subtle dark:border-surface-brand-light/50"
                    }`}
                  >
                    {isUrl ? (
                      <Image src={src} alt="" fill className="object-cover" sizes="136px" />
                    ) : (
                      <span className="text-3xl text-text-tertiary">{src}</span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* Main image – shows the image for the selected thumbnail; arrows change selection */}
            <div className="relative w-full max-w-[420px] aspect-[723/516] max-h-[320px] sm:max-h-[380px] rounded-2xl overflow-hidden border border-border-subtle dark:border-surface-brand-light/50 bg-surface-subtle order-1 sm:order-2 lg:order-2">
              {mainImageUrl ? (
                <Image
                  key={selectedThumbIndex}
                  src={mainImageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="420px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-8xl text-text-tertiary">
                  {mainImageSrc}
                </div>
              )}
              <button
                type="button"
                onClick={handlePrevImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-surface-default/80 border border-border-subtle flex items-center justify-center text-text-secondary cursor-pointer hover:border-border-brand hover:text-text-brand hover:bg-surface-default"
                aria-label={tCommon("previousPage")}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNextImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-surface-default/80 border border-border-subtle flex items-center justify-center text-text-secondary cursor-pointer hover:border-border-brand hover:text-text-brand hover:bg-surface-default"
                aria-label={tCommon("nextPage")}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          {/* About this product – same width as thumbnails + main image above */}
          <div className="w-full p-4 rounded-2xl bg-surface-default border border-border-subtle">
            <h3 className="font-semibold text-text-primary mb-2">{t("aboutProduct")}</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{t("productDescription")}</p>
          </div>
          </div>

          {/* Right column: 50% – product info */}
          <div className="lg:min-w-0">
            {/* Seller: circle = poster's avatar image URL */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-8 h-8 rounded-full flex-shrink-0 overflow-hidden bg-surface-brand-subtle dark:bg-surface-subtle">
                {product.sellerAvatar?.startsWith("http") ? (
                  <Image src={product.sellerAvatar} alt="" fill className="object-cover" sizes="32px" />
                ) : null}
              </div>
              <p className="text-sm text-text-secondary">{t("bySeller", { seller: product.seller })}</p>
            </div>

            {/* Name + wishlist/share */}
            <div className="flex items-start justify-between gap-4 mb-2">
              <h2 className="text-xl md:text-2xl font-bold text-text-primary flex-1 min-w-0">
                {product.name}
              </h2>
              <div className="flex gap-1 flex-shrink-0">
                <ButtonType3
                  className="p-2 rounded-full border-0 bg-transparent min-w-0 text-text-secondary hover:text-text-primary"
                  aria-label={t("addToWishlist")}
                >
                  <Heart className="w-5 h-5 fill-text-secondary/30 stroke-current" style={{ strokeWidth: 1.5 }} />
                </ButtonType3>
                <ButtonType3
                  className="p-2 rounded-full border-0 bg-transparent min-w-0 text-text-secondary hover:text-text-primary"
                  aria-label="Share"
                >
                  <Share2 className="w-5 h-5" />
                </ButtonType3>
              </div>
            </div>

            {/* Star + rating + reviews */}
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400 dark:fill-amber-300 dark:text-amber-300" />
              <span className="font-medium text-text-primary">{product.rating}</span>
              <span className="text-sm text-text-secondary">({product.reviews})</span>
            </div>

            {/* Price */}
            <p className="text-2xl md:text-3xl font-bold text-text-primary mb-6">
              GH₵{product.price.toFixed(2)}
            </p>

            {/* Size */}
            <div className="mb-6">
              <h3 className="font-semibold text-text-primary mb-2">{t("size")}</h3>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <ButtonType3
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 rounded-xl border min-w-0 bg-surface-default ${
                      selectedSize === size
                        ? "border-border-brand text-text-brand"
                        : "border-border-subtle text-text-primary"
                    }`}
                  >
                    {size}
                  </ButtonType3>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="mb-6">
              <h3 className="font-semibold text-text-primary mb-2">{t("quantity")}</h3>
              <div className="inline-flex items-center gap-4 px-6 py-3 rounded-full border-2 border-border-brand bg-surface-default">
                <ButtonType3
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-2 rounded-full border-0 bg-transparent min-w-0 text-text-brand hover:opacity-80"
                  aria-label={t("decreaseQuantity")}
                >
                  <Minus className="w-4 h-4" strokeWidth={2} />
                </ButtonType3>
                <span className="text-lg font-medium text-text-primary min-w-[1.5rem] text-center">
                  {quantity}
                </span>
                <ButtonType3
                  onClick={() => setQuantity((q) => q + 1)}
                  className="p-2 rounded-full border-0 bg-transparent min-w-0 text-text-brand hover:opacity-80"
                  aria-label={t("increaseQuantity")}
                >
                  <Plus className="w-4 h-4" strokeWidth={2} />
                </ButtonType3>
              </div>
            </div>

            {/* Color */}
            {!!product.colors?.length && (
              <div className="mb-6">
                <h3 className="font-semibold text-text-primary mb-2">{t("color")}</h3>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((c) => (
                    <ButtonType3
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className={`px-4 py-2 rounded-full border min-w-0 bg-surface-default ${
                        selectedColor === c
                          ? "border-border-brand text-text-brand"
                          : "border-border-subtle text-text-primary"
                      }`}
                    >
                      {c}
                    </ButtonType3>
                  ))}
                </div>
              </div>
            )}

            {/* Add to Cart (outline) + Buy Now (filled) */}
            <div className="flex flex-col sm:flex-row gap-3">
              <ButtonType1
                onClick={handleAddToCart}
                className="flex-1 py-3 rounded-full"
                size="lg"
              >
                {t("addToCart")}
              </ButtonType1>
              <ButtonType2
                onClick={handleBuyNow}
                className="flex-1 py-3 rounded-full disabled:opacity-50"
                size="lg"
                disabled={!onBuyNow}
              >
                {t("buyNow")}
              </ButtonType2>
            </div>
          </div>
        </div>

      
      </div>
    </div>
  );
}
