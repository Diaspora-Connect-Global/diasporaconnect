"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Heart, Minus, Plus, Search, Star, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import { formatAmountWithCurrency } from "@/lib/displayCurrency";
import type { CartItem, Product } from "./types";

export function ServiceDetail({
  service,
  onBack,
  onContinue,
}: {
  service: Product;
  onBack: () => void;
  onContinue: (item: CartItem) => void;
}) {
  const t = useTranslations("marketplace");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  // The platform SETTLES in the listing currency (no FX).
  const listingCurrency = (service.currency ?? "GHS").toUpperCase();
  const formatAmount = (value: number) =>
    formatAmountWithCurrency(value, listingCurrency, locale);
  const DEFAULT_THUMBNAIL_COUNT = 4;
  const galleryImages =
    service.images && service.images.length > 0
      ? service.images
      : Array(DEFAULT_THUMBNAIL_COUNT).fill(service.image);
  const thumbnailCount = galleryImages.length;
  const [selectedThumbIndex, setSelectedThumbIndex] = useState(0);
  const [projectDuration, setProjectDuration] = useState<number>(0);
  const [selectedPackage, setSelectedPackage] = useState<
    "basic" | "standard" | "premium"
  >("basic");
  const [quantity, setQuantity] = useState(1);
  const [showExtras, setShowExtras] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [showConfirmAddToCart, setShowConfirmAddToCart] = useState(false);
  const [pendingCartItem, setPendingCartItem] = useState<CartItem | null>(null);

  const packages = useMemo(
    () => ({
      basic: {
        price: 150,
        features: ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
      },
      standard: {
        price: 300,
        features: ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
      },
      premium: {
        price: 450,
        features: [
          "Feature 1",
          "Feature 2",
          "Feature 3",
          "Feature 4",
          "Feature 5",
          "Feature 6",
        ],
      },
    }),
    []
  );

  const extras = service.serviceExtras ?? [];
  const hasExtras = extras.length > 0;

  const mainImageSrc = galleryImages[Math.min(selectedThumbIndex, thumbnailCount - 1)];
  const mainImageUrl =
    typeof mainImageSrc === "string" && mainImageSrc.startsWith("http")
      ? mainImageSrc
      : null;

  const handlePrevImage = () => {
    setSelectedThumbIndex((i) => (i - 1 + thumbnailCount) % thumbnailCount);
  };
  const handleNextImage = () => {
    setSelectedThumbIndex((i) => (i + 1) % thumbnailCount);
  };

  const toggleExtra = (extraId: string) => {
    setSelectedExtras((prev) =>
      prev.includes(extraId) ? prev.filter((id) => id !== extraId) : [...prev, extraId]
    );
  };

  const buildCartItem = (withExtras: boolean): CartItem => {
    const packagePrice = packages[selectedPackage].price;
    const extrasToInclude = withExtras ? selectedExtras : [];
    const extrasTotalAmount =
      withExtras && extrasToInclude.length > 0
        ? extrasToInclude.reduce(
            (sum, id) => sum + (extras.find((e) => e.id === id)?.price ?? 0),
            0
          )
        : 0;
    return {
      ...service,
      quantity,
      projectDuration,
      selectedPackage,
      extras: extrasToInclude.length > 0 ? extrasToInclude : undefined,
      extrasTotal: extrasTotalAmount > 0 ? extrasTotalAmount : undefined,
      price: packagePrice,
    };
  };

  const handleContinue = () => {
    setShowExtras(true);
  };

  const handleNoExtras = () => {
    setShowExtras(false);
    if (hasExtras) {
      setPendingCartItem(buildCartItem(false));
      setShowConfirmAddToCart(true);
    } else {
      onContinue(buildCartItem(false));
    }
  };

  const handleConfirmWithExtras = () => {
    if (selectedExtras.length === 0) return;
    setShowExtras(false);
    setPendingCartItem(buildCartItem(true));
    setShowConfirmAddToCart(true);
  };

  const handleConfirmAddToCart = () => {
    if (pendingCartItem) {
      onContinue(pendingCartItem);
      setShowConfirmAddToCart(false);
      setPendingCartItem(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <ButtonType3
        onClick={onBack}
        className="p-0 min-w-0 border-0 bg-transparent flex items-center gap-2 text-text-secondary mb-4 hover:text-text-primary"
      >
        <ChevronLeft className="w-5 h-5" />
        <span>{service.name}</span>
      </ButtonType3>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-6 lg:gap-8">
        {/* Left column: thumbnails + main image + about service (same as product detail) */}
        <div className="flex flex-col gap-4 lg:min-w-0">
          <div className="flex flex-col sm:flex-row gap-4 lg:flex-row lg:gap-4">
            {/* Vertical thumbnails – clickable, selected state with brand border */}
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
            {/* Main image – shows selected thumbnail; arrows change selection */}
            <div className="relative w-full max-w-[420px] aspect-[723/516] max-h-[320px] sm:max-h-[380px] rounded-2xl overflow-hidden border border-border-subtle dark:border-surface-brand-light/50 bg-surface-subtle order-1 sm:order-2 lg:order-2">
              {mainImageUrl ? (
                <Image
                  key={selectedThumbIndex}
                  src={mainImageUrl}
                  alt={service.name}
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
          {/* About this service – same width as thumbnails + main image above */}
          <div className="w-full p-4 rounded-2xl bg-surface-default border border-border-subtle">
            <h3 className="font-semibold text-text-primary mb-2">{t("aboutService")}</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{t("serviceDescription")}</p>
          </div>
        </div>

        {/* Right column: service info */}
        <div className="lg:min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="relative w-8 h-8 rounded-full flex-shrink-0 overflow-hidden bg-surface-subtle">
                  {service.sellerAvatar?.startsWith("http") ? (
                    <Image src={service.sellerAvatar} alt="" fill className="object-cover" sizes="32px" />
                  ) : null}
                </div>
                <span className="text-sm text-text-secondary">{service.seller}</span>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-text-primary">{service.name}</h2>
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400 dark:fill-amber-300 dark:text-amber-300" />
                <span className="font-medium text-text-primary">{service.rating}</span>
                <span className="text-text-tertiary">({service.reviews})</span>
              </div>
            </div>
            <div className="flex gap-2">
              <ButtonType3 className="p-2 rounded-full hover:bg-surface-subtle border-0 bg-transparent min-w-0 text-text-secondary hover:text-text-primary">
                <Heart className="w-5 h-5" />
              </ButtonType3>
              <ButtonType3 className="p-2 rounded-full hover:bg-surface-subtle border-0 bg-transparent min-w-0 text-text-secondary hover:text-text-primary">
                <Search className="w-5 h-5" />
              </ButtonType3>
            </div>
          </div>

          <div className="mb-6">
            <label className="block font-semibold mb-2 text-text-primary">{t("projectDuration")}</label>
            <input
              type="number"
              value={projectDuration}
              onChange={(e) => setProjectDuration(Number(e.target.value))}
              placeholder={t("projectDurationPlaceholder")}
              className="w-full px-4 py-2 border border-border-subtle rounded-lg bg-surface-default text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-brand"
            />
          </div>

          <div className="mb-6">
            <label className="block font-semibold mb-2 text-text-primary">{t("packages")}</label>
            <div className="space-y-3">
              {Object.entries(packages).map(([key, pkg]) => (
                <div
                  key={key}
                  onClick={() =>
                    setSelectedPackage(key as "basic" | "standard" | "premium")
                  }
                  className={`rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedPackage === key
                      ? "border-2 border-border-brand bg-surface-default"
                      : "border border-border-subtle bg-surface-default hover:border-border-subtle"
                  }`}
                >
                  <div className="mb-2">
                    <p className="font-semibold capitalize text-text-primary">{key}</p>
                    <p className="font-bold text-text-primary mt-0.5">{formatAmount(pkg.price)}</p>
                  </div>
                  <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-text-secondary">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-1">✓ {feature}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-2 text-text-primary">{t("quantity")}</h3>
            <div className="inline-flex items-center rounded-full border-2 border-border-brand overflow-hidden">
              <ButtonType3
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2.5 border-0 bg-transparent min-w-0 hover:bg-surface-brand-subtle text-text-brand text-lg font-medium"
                aria-label={t("decreaseQuantity")}
              >
                <Minus className="w-5 h-5" />
              </ButtonType3>
              <span className="min-w-[2.5rem] text-center text-lg font-medium text-text-primary py-1">
                {quantity}
              </span>
              <ButtonType3
                onClick={() => setQuantity(quantity + 1)}
                className="p-2.5 border-0 bg-transparent min-w-0 hover:bg-surface-brand-subtle text-text-brand text-lg font-medium"
                aria-label={t("increaseQuantity")}
              >
                <Plus className="w-5 h-5" />
              </ButtonType3>
            </div>
          </div>

          <ButtonType2
            onClick={handleContinue}
            className="w-full bg-surface-brand text-text-white py-3 rounded-lg hover:opacity-90"
          >
            {t("continue")}
          </ButtonType2>
        </div>
      </div>

      {showExtras && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-default rounded-lg max-w-lg w-full p-6 border border-border-subtle my-auto min-w-0">
            <div className="flex items-center justify-between gap-2 mb-4 min-w-0">
              <h3 className="text-xl font-bold text-text-primary truncate">
                {hasExtras ? t("addExtras") : t("addToCart")}
              </h3>
              <ButtonType3
                onClick={() => setShowExtras(false)}
                className="p-0 min-w-0 border-0 bg-transparent text-text-secondary hover:text-text-primary flex-shrink-0"
                aria-label={t("close")}
              >
                <X className="w-5 h-5" />
              </ButtonType3>
            </div>
            {hasExtras ? (
              <>
                <div className="space-y-4 mb-6 min-w-0">
                  {extras.map((extra) => (
                    <label key={extra.id} className="flex items-start gap-3 cursor-pointer min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedExtras.includes(extra.id)}
                        onChange={() => toggleExtra(extra.id)}
                        className="mt-1 rounded border-border-subtle accent-surface-brand focus:ring-2 focus:ring-border-brand flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1">
                          <span className="font-semibold text-text-primary break-words">{extra.name}</span>
                          <span className="font-bold text-text-primary flex-shrink-0">{formatAmount(extra.price)}</span>
                        </div>
                        <p className="text-sm text-text-secondary break-words">{extra.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3">
                  <ButtonType3
                    onClick={handleNoExtras}
                    className="flex-1 border border-border-subtle py-2 rounded-lg hover:bg-surface-subtle bg-transparent text-text-primary"
                  >
                    {t("noExtraServices")}
                  </ButtonType3>
                  <ButtonType2
                    onClick={handleConfirmWithExtras}
                    disabled={selectedExtras.length === 0}
                    className="flex-1 bg-surface-brand text-text-white py-2 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("addExtrasAmount", {
                      amount: selectedExtras.reduce(
                        (sum, id) => sum + (extras.find((e) => e.id === id)?.price ?? 0),
                        0
                      ).toLocaleString(locale, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }),
                    })}
                  </ButtonType2>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-text-secondary text-sm">
                  {t("addServiceToCartConfirm")}
                </p>
                <ButtonType2
                  onClick={handleNoExtras}
                  className="w-full bg-surface-brand text-text-white py-3 rounded-lg hover:opacity-90"
                >
                  {t("addToCart")}
                </ButtonType2>
              </div>
            )}
          </div>
        </div>
      )}

      {showConfirmAddToCart && pendingCartItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-default rounded-lg max-w-md w-full p-6 border border-border-subtle">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-text-primary">{t("addToCart")}</h3>
              <ButtonType3
                onClick={() => {
                  setShowConfirmAddToCart(false);
                  setPendingCartItem(null);
                }}
                className="p-0 min-w-0 border-0 bg-transparent text-text-secondary hover:text-text-primary"
                aria-label={t("close")}
              >
                <X className="w-5 h-5" />
              </ButtonType3>
            </div>
            <p className="text-text-secondary text-sm mb-6">
              {t("addServiceToCartConfirm")}
            </p>
            <ButtonType2
              onClick={handleConfirmAddToCart}
              className="w-full bg-surface-brand text-text-white py-3 rounded-lg hover:opacity-90"
            >
              {t("addToCart")}
            </ButtonType2>
          </div>
        </div>
      )}
    </div>
  );
}

