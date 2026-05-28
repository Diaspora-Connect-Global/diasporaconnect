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
  currency?: string;
  rating: number;
  reviews: number;
  image: string;
  /** Optional gallery images for product detail (first used as main image if present) */
  images?: string[];
  seller: string;
  /** Avatar image URL of the person who posted the product */
  sellerAvatar?: string;
  /** Numeric trust score of the seller (vendor owner). Mapped to a tier for
   *  rendering. Sourced from the GQL Vendor's `ownerTrustScore`. */
  sellerTrustScore?: number;
  /** Pre-resolved trust tier of the seller. Wins over `sellerTrustScore`
   *  when both are supplied. Sourced from GQL Vendor's `ownerTrustTier`. */
  sellerTrustTier?: string;
  colors?: string[];
  category: string;
  isService?: boolean;
  priceType?: "fixed" | "hourly";
  /** Optional extras for services (e.g. add-ons); when set, Continue shows extras modal */
  serviceExtras?: { id: string; name: string; description: string; price: number }[];
}

export interface CartItem extends Product {
  quantity: number;
  size?: string;
  color?: string;
  projectDuration?: number;
  selectedPackage?: "basic" | "standard" | "premium";
  /** Extra option ids (for services) */
  extras?: string[];
  /** Sum of selected extra prices (for services); used when extra prices vary */
  extrasTotal?: number;
  /** Unique id for this cart line (services with/without extras are different variations) */
  lineId?: string;
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

