export type MarketplaceTab = "products" | "services";

export type MarketplaceView =
  | "home"
  | "product"
  | "service"
  | "cart"
  | "checkout"
  | "service-checkout"
  | "success";

export interface Product {
  id: string;
  name: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  /** Optional gallery images for product detail (first used as main image if present) */
  images?: string[];
  seller: string;
  /** Avatar image URL of the person who posted the product */
  sellerAvatar?: string;
  colors?: string[];
  category: string;
  isService?: boolean;
  priceType?: "fixed" | "hourly";
}

export interface CartItem extends Product {
  quantity: number;
  size?: string;
  color?: string;
  projectDuration?: number;
  selectedPackage?: "basic" | "standard" | "premium";
  extras?: string[];
}

export interface ShippingAddress {
  name: string;
  address: string;
  city: string;
  country: string;
  phoneNumber: string;
}

export type PaymentMethod = "credit" | "mobile";

export type PaymentContext =
  | { kind: "cart"; cart: CartItem[] }
  | { kind: "service"; item: CartItem };

export interface PaymentResult {
  success: boolean;
  /**
   * Reference returned by payment provider / backend.
   * For now this is optional until payment system is wired.
   */
  reference?: string;
}

