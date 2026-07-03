"use client";

import React, { useMemo, useState } from "react";
import { Briefcase, ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLazyQuery, useQuery } from "@apollo/client/react";
import { EmptyState, ErrorState, NoResults } from "@/components/feedback";
import { ConfirmationModal } from "@/components/custom/confirmationModal";
import { ButtonType3 } from "@/components/custom/button";
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
import type { CartItem, MarketplaceTab, MarketplaceView, Product } from "./types";
import { MarketplaceHeader } from "./MarketplaceHeader";
import { ProductCard } from "./ProductCard";
import { ProductDetail } from "./ProductDetail";
import { ServiceDetail } from "./ServiceDetail";
import { ShoppingCartModal } from "./ShoppingCartModal";
import { Checkout } from "./Checkout";
import { OrderSuccess } from "./OrderSuccess";
import { useMarketplacePayment } from "./payments/useMarketplacePayment";
import { toCdnUrl } from "@/lib/cdn";

function toUiProductFromProductApi(item: {
  id: string;
  vendor_id: string;
  title: string;
  price: number;
  currency?: string;
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
    rating: 5,
    reviews: 0,
    // Render-time CDN rewrite: stored GCS media served via the CDN when
    // NEXT_PUBLIC_CDN_URL is set (no-op otherwise).
    image: toCdnUrl(item.images?.[0] ?? ""),
    images: (item.images ?? []).map(toCdnUrl),
    seller: item.vendor_id,
    category: item.tags?.[0] ?? "products",
    isService: false,
  };
}

function toUiProductFromServiceApi(item: {
  id: string;
  vendor_id: string;
  title: string;
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
    rating: 5,
    reviews: 0,
    image: "",
    images: [],
    seller: item.vendor_id,
    category: item.tags?.[0] ?? "services",
    isService: true,
    priceType: "fixed",
  };
}

export default function MarketplaceContainer() {
  const t = useTranslations("marketplace");
  const tCommon = useTranslations("common");
  const tFeedback = useTranslations("feedback");
  const { pay, isPaying } = useMarketplacePayment();

  const [currentView, setCurrentView] = useState<MarketplaceView>("home");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [activeTab, setActiveTab] = useState<MarketplaceTab>("products");
  const [searchValue, setSearchValue] = useState("");
  const [removeCartItemModalOpen, setRemoveCartItemModalOpen] = useState(false);
  const [cartItemIdToRemove, setCartItemIdToRemove] = useState<string | null>(null);

  const {
    data: productsData,
    loading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery<SearchProductsResponse>(SEARCH_PRODUCTS, {
    variables: { input: { query: searchValue || undefined, page: 1, limit: 20 } },
    skip: activeTab !== "products",
    fetchPolicy: "cache-and-network",
  });

  const {
    data: servicesData,
    loading: servicesLoading,
    error: servicesError,
    refetch: refetchServices,
  } = useQuery<SearchMarketplaceServicesResponse>(SEARCH_MARKETPLACE_SERVICES, {
    variables: { input: { query: searchValue || undefined, page: 1, limit: 20 } },
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

  const isLoading =
    (activeTab === "products" && productsLoading) ||
    (activeTab === "services" && servicesLoading);
  const listingError = activeTab === "products" ? productsError : servicesError;
  const refetch = activeTab === "products" ? refetchProducts : refetchServices;
  const hasActiveQuery = searchValue.trim().length > 0;

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
    setCurrentView("success");
  };

  const handleBackToHome = () => {
    setCart([]);
    setCurrentView("home");
    setSelectedProduct(null);
  };

  const handleSearch = () => {
    if (activeTab === "products") {
      void refetchProducts({ input: { query: searchValue || undefined, page: 1, limit: 20 } });
      return;
    }
    void refetchServices({ input: { query: searchValue || undefined, page: 1, limit: 20 } });
  };

  return (
    <div className="h-app-inner flex flex-col px-[10%]">
      {currentView === "home" && (
        <>
          <MarketplaceHeader
            cartCount={cart.length}
            onCartClick={() => setShowCart(true)}
            setActiveTab={setActiveTab}
            activeTab={activeTab}
            searchValue={searchValue}
            onSearchValueChange={setSearchValue}
            onSearch={handleSearch}
          />

          <div className="flex-1 overflow-y-auto scrollbar-hide py-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">
                    {activeTab === "products" ? t("trending") : t("servicesYouMayLike")}
                  </h2>
                  <div className="flex gap-2">
                    <ButtonType3
                      className="p-2 border rounded-full hover:bg-gray-100 bg-transparent min-w-0"
                      aria-label={t("scrollLeft")}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </ButtonType3>
                    <ButtonType3
                      className="p-2 border rounded-full hover:bg-gray-100 bg-transparent min-w-0"
                      aria-label={t("scrollRight")}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </ButtonType3>
                  </div>
                </div>
                {listingItems.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                    {listingItems.map((item) => (
                      <div key={item.id} onClick={() => handleProductClick(item)} className="cursor-pointer">
                        <ProductCard product={item} onAddToCart={handleAddToCart} />
                      </div>
                    ))}
                  </div>
                )}
                {isLoading && (
                  <p className="mt-3 text-sm text-text-secondary">
                    {t("loading")}
                  </p>
                )}
                {!isLoading && listingItems.length === 0 && (
                  <>
                    {listingError ? (
                      <ErrorState
                        title={tFeedback("error.title")}
                        description={tFeedback("error.description")}
                        retryLabel={tFeedback("error.retry")}
                        onRetry={() => {
                          void refetch();
                        }}
                      />
                    ) : hasActiveQuery ? (
                      <NoResults
                        query={searchValue}
                        title={tFeedback("noResults.title", { query: searchValue })}
                        description={tFeedback("noResults.description")}
                      />
                    ) : (
                      <EmptyState
                        icon={activeTab === "products" ? ShoppingBag : Briefcase}
                        title={tFeedback(
                          activeTab === "products"
                            ? "empty.marketplaceProducts.title"
                            : "empty.marketplaceServices.title"
                        )}
                        description={tFeedback(
                          activeTab === "products"
                            ? "empty.marketplaceProducts.description"
                            : "empty.marketplaceServices.description"
                        )}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {currentView === "product" && selectedProduct && (
        <div className="h-full flex flex-col">
          <ProductDetail
            product={selectedProduct}
            onBack={() => setCurrentView("home")}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
          />
        </div>
      )}

      {currentView === "service" && selectedProduct && (
        <ServiceDetail
          service={selectedProduct}
          onBack={() => setCurrentView("home")}
          onContinue={handleServiceContinue}
        />
      )}

      {currentView === "checkout" && (
        <Checkout
          cart={cart}
          onBack={() => setCurrentView("home")}
          isPaying={isPaying}
          onPay={async ({ cart: c, method, shippingAddress }) =>
            pay(
              { kind: "cart", cart: c },
              method,
              `${shippingAddress.name}, ${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.country}, ${shippingAddress.phoneNumber}`
            )
          }
          onComplete={handleOrderComplete}
        />
      )}

      {currentView === "success" && <OrderSuccess cart={cart} onBackToHome={handleBackToHome} />}

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
    </div>
  );
}

