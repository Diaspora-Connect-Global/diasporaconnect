"use client";

import React, { useState } from "react";
import { Briefcase, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import { formatAmountWithCurrency } from "@/lib/displayCurrency";
import { UserBadge } from "@/components/custom/userBadge";
import { resolveUserTier } from "@/lib/userTier";
import type { CartItem, Product } from "./types";
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
  const tp = useTranslations("marketplacePage");
  const locale = useLocale();
  // The platform SETTLES in the listing currency (no FX).
  const listingCurrency = (service.currency ?? "GHS").toUpperCase();
  // service.price is already in major units (the one ÷100 happens when the API row is mapped).
  const formatAmount = (value: number) =>
    formatAmountWithCurrency(value, listingCurrency, locale);
  const [projectDuration, setProjectDuration] = useState<number>(0);
  const [quantity, setQuantity] = useState(1);
  const [showExtras, setShowExtras] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [showConfirmAddToCart, setShowConfirmAddToCart] = useState(false);
  const [pendingCartItem, setPendingCartItem] = useState<CartItem | null>(null);

  const extras = service.serviceExtras ?? [];
  const hasExtras = extras.length > 0;
  const images = service.images && service.images.length > 0 ? service.images : service.image ? [service.image] : [];
  const seller = readableSeller(service.seller);
  const sellerTier = resolveUserTier({ tier: service.sellerTrustTier, trustScore: service.sellerTrustScore });
  const description = service.description?.trim();
  const tags = Array.from(new Set((service.tags ?? []).map((v) => v.trim()).filter(Boolean)));

  const toggleExtra = (extraId: string) => {
    setSelectedExtras((prev) =>
      prev.includes(extraId) ? prev.filter((id) => id !== extraId) : [...prev, extraId]
    );
  };

  const buildCartItem = (withExtras: boolean): CartItem => {
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
      // The listing has ONE price (its base price); there are no tiers to pick.
      // "basic" only tells cart lines apart: it is not a real package id and is
      // never sent, so the order is priced from base_price.
      selectedPackage: "basic",
      extras: extrasToInclude.length > 0 ? extrasToInclude : undefined,
      extrasTotal: extrasTotalAmount > 0 ? extrasTotalAmount : undefined,
      price: service.price,
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

  const rail = (
    <>
      <section aria-labelledby="mp-buy-title" className={CARD} data-testid="mp-rail">
        <h2 id="mp-buy-title" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tp("serviceFrom")}</h2>
        <p data-testid="mp-price" className="mt-1 text-3xl font-bold text-text-primary">{formatAmount(service.price)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{tp("chargedIn", { currency: listingCurrency })}</p>

        <div className="mt-4">
          <label htmlFor="mp-duration" className="mb-2 block text-sm font-semibold text-text-primary">{tp("durationOptional")}</label>
          <input
            id="mp-duration"
            type="number"
            inputMode="numeric"
            min={0}
            value={projectDuration}
            onChange={(e) => setProjectDuration(Number(e.target.value))}
            placeholder={t("projectDurationPlaceholder")}
            className="w-full rounded-lg border border-border-subtle bg-surface-default px-3 py-2 text-base text-text-primary placeholder:text-text-tertiary focus-visible:border-border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand md:text-sm"
          />
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-text-primary">{t("quantity")}</p>
          <QuantityStepper value={quantity} onChange={setQuantity} />
        </div>

        <button
          type="button"
          onClick={handleContinue}
          className="mt-5 min-h-11 w-full rounded-full bg-surface-brand px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2"
        >
          {t("continue")}
        </button>
      </section>
      <EscrowNote />
    </>
  );

  return (
    <DetailShell backLabel={tp("back")} onBack={onBack}>
      <header className="space-y-1">
        <span className="inline-block rounded-md bg-surface-success px-2 py-0.5 text-[11px] font-medium text-text-success">{tp("serviceTag")}</span>
        <h1 className="break-words text-2xl font-bold leading-tight text-text-primary sm:text-3xl">{service.name}</h1>
        {seller && (
          <p className="inline-flex flex-wrap items-center gap-1.5 text-sm text-text-secondary">
            {tp("soldBy", { seller })}
            {sellerTier && <UserBadge tier={sellerTier} size="xs" />}
          </p>
        )}
      </header>

      <DetailColumns
        railLabel={tp("serviceFrom")}
        rail={rail}
        main={
          <>
            <Gallery images={images} name={service.name} Icon={Briefcase} />
            <SectionCard id="mp-about" title={tp("aboutService")}>
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
          </>
        }
      />

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
    </DetailShell>
  );
}
