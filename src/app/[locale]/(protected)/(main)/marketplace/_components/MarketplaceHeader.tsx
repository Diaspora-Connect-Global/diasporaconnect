"use client";

import React from "react";
import { ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { SearchInput } from "@/components/custom/input";
import { ButtonType3 } from "@/components/custom/button";
import type { MarketplaceTab } from "./types";

export function MarketplaceHeader({
  cartCount,
  onCartClick,
  setActiveTab,
  activeTab,
  searchValue,
  onSearchValueChange,
  onSearch,
}: {
  cartCount: number;
  onCartClick: () => void;
  setActiveTab: (item: MarketplaceTab) => void;
  activeTab: MarketplaceTab;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  onSearch: () => void;
}) {
  const t = useTranslations("marketplace");

  return (
    <div className="bg-background z-10 pb-4 shrink-0">
      <div className="flex justify-between items-center py-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <ButtonType3
          onClick={onCartClick}
          className="p-0 min-w-0 border-0 bg-transparent flex items-center gap-2"
        >
          <span className="relative inline-flex flex-shrink-0">
            <ShoppingCart className="w-5 h-5 shrink-0" />
            <span
              className={`absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full text-xs font-medium flex items-center justify-center translate-x-1/2 -translate-y-1/2 ${
                cartCount === 0
                  ? "bg-surface-brand-subtle text-text-danger"
                  : "bg-surface-brand text-text-white"
              }`}
            >
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          </span>
          <span>{t("cart")}</span>
        </ButtonType3>
      </div>

      <div className="flex justify-between items-center border-b">
        <div>
          <ButtonType3
            onClick={() => setActiveTab("products")}
            className={`p-2 font-medium rounded-none border-0 bg-transparent ${
              activeTab === "products"
                ? "border-b-2 border-border-brand"
                : "text-gray-600"
            }`}
          >
            {t("products")}
          </ButtonType3>
          <ButtonType3
            onClick={() => setActiveTab("services")}
            className={`p-2 font-medium rounded-none border-0 bg-transparent ${
              activeTab === "services"
                ? "border-b-2 border-border-brand"
                : "text-gray-600"
            }`}
          >
            {t("services")}
          </ButtonType3>
        </div>
        <div className="h-12 min-w-[220px] sm:min-w-[280px] w-full max-w-[320px] flex">
          <SearchInput
            placeholder={t("searchPlaceholder")}
            value={searchValue}
            onChange={onSearchValueChange}
            onSearch={onSearch}
            bg="bg-surface-default"
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}

