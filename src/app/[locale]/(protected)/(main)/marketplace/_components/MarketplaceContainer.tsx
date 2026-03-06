"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { ConfirmationModal } from "@/components/custom/confirmationModal";
import { ButtonType3 } from "@/components/custom/button";
import { products, services } from "./mockData";
import type { CartItem, MarketplaceTab, MarketplaceView, Product } from "./types";
import { MarketplaceHeader } from "./MarketplaceHeader";
import { ProductCard } from "./ProductCard";
import { ProductDetail } from "./ProductDetail";
import { ServiceDetail } from "./ServiceDetail";
import { ShoppingCartModal } from "./ShoppingCartModal";
import { Checkout } from "./Checkout";
import { ServiceCheckout } from "./ServiceCheckout";
import { OrderSuccess } from "./OrderSuccess";
import { useMarketplacePayment } from "./payments/useMarketplacePayment";

export default function MarketplaceContainer() {
  const t = useTranslations("marketplace");
  const tCommon = useTranslations("common");
  const { pay, isPaying } = useMarketplacePayment();

  const [currentView, setCurrentView] = useState<MarketplaceView>("home");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [activeTab, setActiveTab] = useState<MarketplaceTab>("products");
  const [selectedServiceItem, setSelectedServiceItem] = useState<CartItem | null>(null);
  const [removeCartItemModalOpen, setRemoveCartItemModalOpen] = useState(false);
  const [cartItemIdToRemove, setCartItemIdToRemove] = useState<string | null>(null);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    if (product.isService) {
      setCurrentView("service");
    } else {
      setCurrentView("product");
    }
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

  const handleServiceContinue = (item: CartItem) => {
    setSelectedServiceItem(item);
    setCurrentView("service-checkout");
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    setCart(cart.map((item) => (item.id === id ? { ...item, quantity } : item)));
  };

  const requestRemoveCartItem = (id: string) => {
    setCartItemIdToRemove(id);
    setRemoveCartItemModalOpen(true);
  };

  const handleRemoveCartItemConfirm = () => {
    if (cartItemIdToRemove) {
      setCart(cart.filter((item) => item.id !== cartItemIdToRemove));
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

  return (
    <div className="h-app-inner flex flex-col px-[10%]">
      {currentView === "home" && (
        <>
          <MarketplaceHeader
            cartCount={cart.length}
            onCartClick={() => setShowCart(true)}
            setActiveTab={setActiveTab}
            activeTab={activeTab}
          />

          <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-6">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                  {(activeTab === "products" ? products : services).map((item) => (
                    <div key={item.id} onClick={() => handleProductClick(item)} className="cursor-pointer">
                      <ProductCard product={item} onAddToCart={handleAddToCart} />
                    </div>
                  ))}
                </div>
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
          onPay={async ({ cart: c, method }) => pay({ kind: "cart", cart: c }, method)}
          onComplete={handleOrderComplete}
        />
      )}

      {currentView === "service-checkout" && selectedServiceItem && (
        <ServiceCheckout
          serviceItem={selectedServiceItem}
          onBack={() => setCurrentView("service")}
          isPaying={isPaying}
          onPay={async ({ item, method }) => pay({ kind: "service", item }, method)}
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

