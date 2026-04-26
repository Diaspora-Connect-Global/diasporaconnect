/**
 * @fileoverview Marketplace (buyer/user) GraphQL type definitions.
 * @module services/gql/types/marketplace
 */

export type MarketplaceStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type MarketplaceOrderStatus =
  | "CREATED"
  | "PENDING_PAYMENT"
  | "PAYMENT_CONFIRMED"
  | "IN_PROGRESS"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED"
  | "REFUNDED";

export interface MarketplaceProductType {
  id: string;
  vendor_id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  inventory_count: number;
  product_type: string;
  shipping_profile_id: string | null;
  download_url: string | null;
  images: string[];
  tags: string[];
  status: MarketplaceStatus;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceServiceType {
  id: string;
  vendor_id: string;
  title: string;
  description: string;
  base_price: number;
  currency: string;
  tags: string[];
  status: MarketplaceStatus;
  created_at: string;
  updated_at: string;
}

export interface OrderItemType {
  product_id: string;
  quantity: number;
  price: number;
  currency: string;
}

export interface MarketplaceOrderType {
  id: string;
  buyer_id: string;
  vendor_id: string;
  status: MarketplaceOrderStatus;
  items: OrderItemType[];
  total_amount: number;
  currency: string;
  shipping_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderStatsType {
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_spent: number;
  currency: string;
}

export interface ProductResponse {
  success: boolean;
  message?: string | null;
  product?: MarketplaceProductType | null;
}

export interface ProductListResponse {
  success: boolean;
  products: MarketplaceProductType[];
  total: number;
  page: number;
  limit: number;
}

export interface ServiceResponse {
  success: boolean;
  message?: string | null;
  service?: MarketplaceServiceType | null;
}

export interface ServiceListResponse {
  success: boolean;
  services: MarketplaceServiceType[];
  total: number;
  page: number;
  limit: number;
}

export interface OrderResponse {
  success: boolean;
  message?: string | null;
  order?: MarketplaceOrderType | null;
}

export interface OrderListResponse {
  success: boolean;
  orders: MarketplaceOrderType[];
  total: number;
  page: number;
  limit: number;
}

export interface OrderStatsResponse {
  success: boolean;
  stats?: OrderStatsType | null;
}

export interface ConvertMoneyResponse {
  success: boolean;
  converted_amount: number;
  to_currency: string;
  exchange_rate: number;
}

export interface SearchProductsInput {
  query?: string;
  category?: string;
  vendor_id?: string;
  min_price?: number;
  max_price?: number;
  currency?: string;
  product_type?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

export interface SearchServicesInput {
  query?: string;
  category?: string;
  vendor_id?: string;
  min_price?: number;
  max_price?: number;
  page?: number;
  limit?: number;
}

export interface OrderItemInput {
  product_id: string;
  quantity: number;
  price: number;
  currency: string;
}

export interface CreateProductOrderInput {
  vendor_id: string;
  items: OrderItemInput[];
  shipping_address?: string;
  notes?: string;
}

export interface CreateServiceOrderInput {
  vendor_id: string;
  service_id: string;
  package_id?: string;
  notes?: string;
}

export interface GetProductResponse {
  getProduct: ProductResponse;
}

export interface SearchProductsResponse {
  searchProducts: ProductListResponse;
}

export interface GetFeaturedProductsResponse {
  getFeaturedProducts: ProductListResponse;
}

export interface GetVendorProductsResponse {
  getVendorProducts: ProductListResponse;
}

export interface GetRelatedProductsResponse {
  getRelatedProducts: ProductListResponse;
}

export interface GetRecommendedProductsResponse {
  getRecommendedProducts: ProductListResponse;
}

export interface GetMarketplaceServiceResponse {
  getMarketplaceService: ServiceResponse;
}

export interface SearchMarketplaceServicesResponse {
  searchMarketplaceServices: ServiceListResponse;
}

export interface GetFeaturedMarketplaceServicesResponse {
  getFeaturedMarketplaceServices: ServiceListResponse;
}

export interface GetVendorMarketplaceServicesResponse {
  getVendorMarketplaceServices: ServiceListResponse;
}

export interface GetMarketplaceOrderResponse {
  getMarketplaceOrder: OrderResponse;
}

export interface MyOrdersResponse {
  myOrders: OrderListResponse;
}

export interface MyOrderStatsResponse {
  myOrderStats: OrderStatsResponse;
}

export interface ConvertCurrencyResponse {
  convertCurrency: ConvertMoneyResponse;
}

export interface CreateProductOrderResponse {
  createProductOrder: OrderResponse;
}

export interface CreateServiceOrderResponse {
  createServiceOrder: OrderResponse;
}

export interface CancelMarketplaceOrderResponse {
  cancelMarketplaceOrder: OrderResponse;
}

export interface ConfirmOrderDeliveryResponse {
  confirmOrderDelivery: OrderResponse;
}

export interface CompleteMarketplaceOrderResponse {
  completeMarketplaceOrder: OrderResponse;
}
