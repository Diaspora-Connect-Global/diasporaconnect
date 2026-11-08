"use client";

import { useSearchParams } from "next/navigation";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useLazyQuery, useQuery } from "@apollo/client/react";
import { ConfirmationModal } from "@/components/custom/confirmationModal";
import {
  GET_MARKETPLACE_SERVICE,
  GET_PRODUCT,
  SEARCH_MARKETPLACE_SERVICES,
  SEARCH_PRODUCTS,
} from "@/services/gql/marketplace";
import type {
  GetMarketplaceServiceResponse,
  GetProductResponse,
  SearchMarketplaceServicesResponse,
  SearchProductsResponse,
} from "@/services/gql/types/marketplace";
import { toMajorUnits } from "@/types/money";
import type { CartItem, MarketplaceView, Product } from "./types";
import { MarketplaceBrowse, type BrowseItem } from "@/components/marketplace/MarketplaceBrowse";
import {
  PAGE_SIZE,
  parseMarketplaceQuery,
  productSearchInput,
  serviceSearchInput,
} from "@/components/marketplace/filters";
import { ProductDetail } from "./ProductDetail";
import { ServiceDetail } from "./ServiceDetail";
import { ShoppingCartModal } from "./ShoppingCartModal";
import { Checkout } from "./Checkout";
import { OrderSuccess } from "./OrderSuccess";
import { useMarketplacePayment } from "./payments/useMarketplacePayment";
import { StripeCardDialog } from "./payments/StripeCardDialog";
import { toCdnUrl } from "@/lib/cdn";
import {
  cartNeedsShipping,
  settlePaidLines,
} from "@/lib/marketplaceCheckout";

function toUiProductFromProductApi(item: {
  id: string;
  vendor_id: string;
  title: string;
  description?: string;
  price: number;
  currency?: string;
  inventory_count?: number;
  images?: string[];
  tags?: string[];
}): Product {
  return {
    id: item.id,
    name: item.title,
    // API sends integer minor units; convert minor→major once here so the rest
    // of the marketplace UI works in major units.
    price: toMajorUnits(item.price),
    // Per-listing settlement currency (the platform settles in this currency,
    // no FX). Default GHS when the API omits it.
    currency: item.currency ?? "GHS",
    // Render-time CDN rewrite: stored GCS media served via the CDN when
    // NEXT_PUBLIC_CDN_URL is set (no-op otherwise).
    image: toCdnUrl(item.images?.[0] ?? ""),
    images: (item.images ?? []).map(toCdnUrl),
    // The vendor id: the order mutations need it. It is never shown as text.
    seller: item.vendor_id,
    description: item.description || undefined,
    tags: item.tags ?? [],
    inventoryCount: item.inventory_count,
    category: item.tags?.[0] ?? "products",
    isService: false,
  };
}

function toUiProductFromServiceApi(item: {
  id: string;
  vendor_id: string;
  title: string;
  description?: string;
  base_price: number;
  currency?: string;
  tags?: string[];
}): Product {
  return {
    id: item.id,
    name: item.title,
    // API sends integer minor units; convert minor→major once here.
    price: toMajorUnits(item.base_price),
    currency: item.currency ?? "GHS",
    image: "",
    images: [],
    seller: item.vendor_id,
    description: item.description || undefined,
    tags: item.tags ?? [],
    category: item.tags?.[0] ?? "services",
    isService: true,
    priceType: "fixed",
  };
}

export default function MarketplaceContainer() {
  const t = useTranslations("marketplace");
  const tCommon = useTranslations("common");
  const { pay, isPaying, cardRequest, closeCardDialog } = useMarketplacePayment();

  const [currentView, setCurrentView] = useState<MarketplaceView>("home");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  // Lines paid in the current checkout. They leave the cart the moment they are
  // paid, so that pressing Pay again after a failure cannot charge them again.
  const [paidLines, setPaidLines] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [removeCartItemModalOpen, setRemoveCartItemModalOpen] = useState(false);
  const [cartItemIdToRemove, setCartItemIdToRemove] = useState<string | null>(null);

  // The URL is the source of truth for the listing filters
  // (`?tab=services&q=…&tag=…&cur=USD&min=10&max=200`).
  const searchParams = useSearchParams();
  const query = useMemo(() => parseMarketplaceQuery(searchParams), [searchParams]);
  const activeTab = query.tab;
  const filterKey = JSON.stringify(query);
  // "Show more" widens the page; any change of tab / filter starts again at one page.
  const [more, setMore] = useState({ key: filterKey, limit: PAGE_SIZE });
  const limit = more.key === filterKey ? more.limit : PAGE_SIZE;

  const {
    data: productsData,
    loading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery<SearchProductsResponse>(SEARCH_PRODUCTS, {
    variables: { input: productSearchInput(query, limit) },
    skip: activeTab !== "products",
    fetchPolicy: "cache-and-network",
  });

  const {
    data: servicesData,
    loading: servicesLoading,
    error: servicesError,
    refetch: refetchServices,
  } = useQuery<SearchMarketplaceServicesResponse>(SEARCH_MARKETPLACE_SERVICES, {
    variables: { input: serviceSearchInput(query, limit) },
    skip: activeTab !== "services",
    fetchPolicy: "cache-and-network",
  });

  const [fetchProduct] = useLazyQuery<GetProductResponse>(GET_PRODUCT);
  const [fetchService] = useLazyQuery<GetMarketplaceServiceResponse>(GET_MARKETPLACE_SERVICE);

  const listingItems = useMemo(() => {
    if (activeTab === "products") {
      return (productsData?.searchProducts.products ?? []).map(toUiProductFromProductApi);
    }
    return (servicesData?.searchMarketplaceServices.services ?? []).map(
      toUiProductFromServiceApi
    );
  }, [activeTab, productsData, servicesData]);

  const total =
    activeTab === "products"
      ? (productsData?.searchProducts.total ?? 0)
      : (servicesData?.searchMarketplaceServices.total ?? 0);
  const isLoading =
    (activeTab === "products" && productsLoading) ||
    (activeTab === "services" && servicesLoading);
  // "Nothing to show yet" gets skeletons. A background cache-and-network
  // refresh over existing items keeps rendering the items (dimmed).
  const activeHasData = activeTab === "products" ? !!productsData : !!servicesData;
  const listingPending = isLoading && !activeHasData;
  const listingError = activeTab === "products" ? productsError : servicesError;
  const refetch = activeTab === "products" ? refetchProducts : refetchServices;

  // Tag chips come from what the seller set on real listings; once seen they stay
  // offered while a tag filter narrows the results (adjusting state while rendering).
  const [knownTags, setKnownTags] = useState<string[]>([]);
  const seenTags = listingItems.flatMap((i) => (i.isService ? [] : (i.tags ?? [])));
  const wanted = [...knownTags];
  for (const tag of [...seenTags, ...(query.tag ? [query.tag] : [])]) {
    if (tag && !wanted.includes(tag) && wanted.length < 12) wanted.push(tag);
  }
  if (wanted.length !== knownTags.length) setKnownTags(wanted);

  const handleProductClick = (product: Product) => {
    const openWith = (item: Product) => {
      setSelectedProduct(item);
      if (item.isService) {
        setCurrentView("service");
      } else {
        setCurrentView("product");
      }
    };

    if (product.isService) {
      fetchService({ variables: { service_id: product.id } })
        .then((res) => {
          const service = res.data?.getMarketplaceService.service;
          if (!service) {
            openWith(product);
            return;
          }
          openWith(toUiProductFromServiceApi(service));
        })
        .catch(() => openWith(product));
      return;
    }

    fetchProduct({ variables: { product_id: product.id } })
      .then((res) => {
        const fullProduct = res.data?.getProduct.product;
        if (!fullProduct) {
          openWith(product);
          return;
        }
        openWith(toUiProductFromProductApi(fullProduct));
      })
      .catch(() => openWith(product));
  };

  const handleAddToCart = (item: Product | CartItem) => {
    const cartItem: CartItem = "quantity" in item ? item : { ...item, quantity: 1 };
    const existingItem = cart.find((i) => i.id === cartItem.id);
    if (existingItem) {
      setCart(
        cart.map((i) =>
          i.id === cartItem.id ? { ...i, quantity: i.quantity + cartItem.quantity } : i
        )
      );
    } else {
      setCart([...cart, cartItem]);
    }
    setShowCart(true);
  };

  const handleBuyNow = (item: CartItem) => {
    setCart([item]);
    setShowCart(false);
    setCurrentView("checkout");
  };

  const getServiceVariationKey = (it: CartItem) =>
    `${it.id}-${it.selectedPackage ?? "basic"}-${(it.extras ?? []).slice().sort().join(",")}`;

  const handleServiceContinue = (item: CartItem) => {
    const variationKey = getServiceVariationKey(item);
    const existing = cart.find((c) => getServiceVariationKey(c) === variationKey);
    if (existing) {
      const lineKey = existing.lineId ?? existing.id;
      setCart(
        cart.map((c) =>
          (c.lineId ?? c.id) === lineKey
            ? { ...c, quantity: c.quantity + item.quantity }
            : c
        )
      );
    } else {
      const lineId = `line-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setCart([...cart, { ...item, lineId }]);
    }
    setShowCart(true);
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    setCart(
      cart.map((item) =>
        (item.lineId ?? item.id) === id ? { ...item, quantity } : item
      )
    );
  };

  const requestRemoveCartItem = (id: string) => {
    setCartItemIdToRemove(id);
    setRemoveCartItemModalOpen(true);
  };

  const handleRemoveCartItemConfirm = () => {
    if (cartItemIdToRemove) {
      setCart(
        cart.filter(
          (item) => (item.lineId ?? item.id) !== cartItemIdToRemove
        )
      );
      setCartItemIdToRemove(null);
      setRemoveCartItemModalOpen(false);
    }
  };

  const handleCheckout = () => {
    setShowCart(false);
    setCurrentView("checkout");
  };

  const handleOrderComplete = () => {
    setCart([]);
    setCurrentView("success");
  };

  const handleBackToHome = () => {
    setCart([]);
    setPaidLines([]);
    setCurrentView("home");
    setSelectedProduct(null);
  };

  const browseItems: BrowseItem[] = listingItems.map((i) => ({
    id: i.id,
    name: i.name,
    price: i.price,
    currency: i.currency,
    image: i.image,
    tags: i.tags,
    isService: i.isService,
  }));
  const byId = (id: string) => listingItems.find((i) => i.id === id);

  return (
    <>
      <StripeCardDialog request={cardRequest} onClose={closeCardDialog} />
      {currentView === "home" && (
        <MarketplaceBrowse
          query={query}
          items={browseItems}
          total={total}
          pending={listingPending}
          refreshing={isLoading && activeHasData}
          error={!!listingError}
          onRetry={() => {
            void refetch();
          }}
          onShowMore={() => setMore({ key: filterKey, limit: limit + PAGE_SIZE })}
          knownTags={knownTags}
          cartCount={cart.length}
          onCart={() => setShowCart(true)}
          onOpen={(item) => {
            const full = byId(item.id);
            if (full) handleProductClick(full);
          }}
          onAdd={(item) => {
            const full = byId(item.id);
            if (full) handleAddToCart(full);
          }}
        />
      )}

      {currentView === "product" && selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          onBack={() => setCurrentView("home")}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
        />
      )}

      {currentView === "service" && selectedProduct && (
        <ServiceDetail
          service={selectedProduct}
          onBack={() => setCurrentView("home")}
          onContinue={handleServiceContinue}
        />
      )}

      {currentView === "checkout" && (
        <div className="h-app-inner flex flex-col px-[10%]">
        <Checkout
          cart={cart}
          paidLines={paidLines}
          onBack={() => {
            setPaidLines([]);
            setCurrentView("home");
          }}
          isPaying={isPaying}
          onPay={async ({ cart: c, method, shippingAddress }) => {
            const result = await pay(
              { kind: "cart", cart: c },
              method,
              cartNeedsShipping(c) ? shippingAddress : undefined
            );
            const paid = result.paid ?? [];
            setPaidLines((prev) => settlePaidLines(c, paid, prev).paidLines);
            if (!result.success) setCart(settlePaidLines(c, paid).remaining);
            return result;
          }}
          onComplete={handleOrderComplete}
        />
        </div>
      )}

      {currentView === "success" && (
        <div className="h-app-inner flex flex-col px-[10%]">
          <OrderSuccess cart={paidLines} onBackToHome={handleBackToHome} />
        </div>
      )}

      {showCart && (
        <ShoppingCartModal
          cart={cart}
          onClose={() => setShowCart(false)}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={requestRemoveCartItem}
          onCheckout={handleCheckout}
        />
      )}

      <ConfirmationModal
        open={removeCartItemModalOpen}
        onCancel={() => {
          setRemoveCartItemModalOpen(false);
          setCartItemIdToRemove(null);
        }}
        onConfirm={handleRemoveCartItemConfirm}
        title={t("removeCartItemTitle") || "Remove item from cart?"}
        description={t("removeCartItemConfirm") || "This item will be removed from your cart."}
        confirmText={tCommon("remove") || "Remove"}
        confirmVariant="destructive"
      />
    </>
  );
}
