"use client";

import React, { useState } from "react";
import { Package } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatAmountWithCurrency } from "@/lib/displayCurrency";
import { useConvertedDisplayPrice } from "@/hooks/useConvertedDisplayPrice";
import type { CartItem, Product } from "./types";
import { UserBadge } from "@/components/custom/userBadge";
import { resolveUserTier } from "@/lib/userTier";
import { ProductReviews } from "./ProductReviews";
import {
  CARD,
  Chips,
  DetailColumns,
  DetailShell,
  EscrowNote,
  Gallery,
  QuantityStepper,
  SectionCard,
  readableSeller,
} from "@/components/marketplace/DetailParts";

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
  const tp = useTranslations("marketplacePage");
  const locale = useLocale();
  // The platform SETTLES in the listing currency (no FX).
  const listingCurrency = (product.currency ?? "GHS").toUpperCase();
  // product.price is already in major units (the one ÷100 happens when the API row is mapped).
  const formatAmount = (value: number) =>
    formatAmountWithCurrency(value, listingCurrency, locale);
  // Non-blocking display conversion; the charge stays in the listing currency.
  const convertedPrice = useConvertedDisplayPrice(product.price, listingCurrency);
  const [quantity, setQuantity] = useState(1);

  const images = product.images && product.images.length > 0 ? product.images : product.image ? [product.image] : [];
  const seller = readableSeller(product.seller);
  const sellerTier = resolveUserTier({
    tier: product.sellerTrustTier,
    trustScore: product.sellerTrustScore,
  });
  const description = product.description?.trim();
  const tags = Array.from(new Set((product.tags ?? []).map((v) => v.trim()).filter(Boolean)));

  const handleAddToCart = () => {
    onAddToCart({ ...product, quantity });
  };

  const handleBuyNow = () => {
    onBuyNow?.({ ...product, quantity });
  };

  const rail = (
    <>
      <section aria-labelledby="mp-buy-title" className={CARD} data-testid="mp-rail">
        <h2 id="mp-buy-title" className="sr-only">{tp("price_label")}</h2>
        <p data-testid="mp-price" className="text-3xl font-bold text-text-primary">{formatAmount(product.price)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{tp("chargedIn", { currency: listingCurrency })}</p>
        {convertedPrice && <p className="text-sm text-text-secondary">{tp("approx", { price: convertedPrice })}</p>}

        {product.inventoryCount != null && (
          <p className={`mt-3 inline-block rounded-md px-2 py-0.5 text-xs font-medium ${product.inventoryCount > 0 ? "bg-surface-success text-text-success" : "bg-surface-danger text-text-danger"}`}>
            {product.inventoryCount > 0 ? tp("inStock", { count: product.inventoryCount }) : tp("outOfStock")}
          </p>
        )}

        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-text-primary">{t("quantity")}</p>
          <QuantityStepper value={quantity} onChange={setQuantity} />
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={!onBuyNow}
            className="min-h-11 rounded-full bg-surface-brand px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {t("buyNow")}
          </button>
          <button
            type="button"
            onClick={handleAddToCart}
            className="min-h-11 rounded-full border border-border-brand bg-surface-default px-5 py-3 text-sm font-semibold text-text-brand hover:bg-surface-brand-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2"
          >
            {t("addToCart")}
          </button>
        </div>
      </section>
      <EscrowNote />
    </>
  );

  return (
    <DetailShell backLabel={tp("back")} onBack={onBack}>
      <header className="space-y-1">
        <span className="inline-block rounded-md bg-surface-info px-2 py-0.5 text-[11px] font-medium text-text-info">{tp("productTag")}</span>
        <h1 className="break-words text-2xl font-bold leading-tight text-text-primary sm:text-3xl">{product.name}</h1>
        {seller && (
          <p className="inline-flex flex-wrap items-center gap-1.5 text-sm text-text-secondary">
            {tp("soldBy", { seller })}
            {sellerTier && <UserBadge tier={sellerTier} size="xs" />}
          </p>
        )}
      </header>

      <DetailColumns
        railLabel={tp("price_label")}
        rail={rail}
        main={
          <>
            <Gallery images={images} name={product.name} Icon={Package} />
            <SectionCard id="mp-about" title={tp("aboutProduct")}>
              {description ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text-primary sm:text-base">{description}</p>
              ) : (
                <p className="text-sm text-text-secondary">{tp("noDescription")}</p>
              )}
            </SectionCard>
            {tags.length > 0 && (
              <SectionCard id="mp-tags" title={tp("tagsLabel")}>
                <Chips items={tags} />
              </SectionCard>
            )}
            {/* Ratings from verified buyers. Public — no sign-in required to read. */}
            {product.id && <ProductReviews productId={String(product.id)} />}
          </>
        }
      />
    </DetailShell>
  );
}
