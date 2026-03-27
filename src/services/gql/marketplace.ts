/**
 * Marketplace Service GraphQL operations for buyer/user role.
 */

import { gql } from "@apollo/client";

export type {
  MarketplaceProductType,
  MarketplaceServiceType,
  MarketplaceOrderType,
  OrderItemType,
  OrderStatsType,
  ProductResponse,
  ProductListResponse,
  ServiceResponse,
  ServiceListResponse,
  OrderResponse,
  OrderListResponse,
  OrderStatsResponse,
  ConvertMoneyResponse,
  SearchProductsInput,
  SearchServicesInput,
  CreateProductOrderInput,
  CreateServiceOrderInput,
  OrderItemInput,
} from "./types/marketplace";

// ============================================================================
// QUERIES
// ============================================================================

export const GET_PRODUCT = gql`
  query GetProduct($product_id: ID!) {
    getProduct(product_id: $product_id) {
      success
      message
      product {
        id
        vendor_id
        title
        description
        price
        currency
        inventory_count
        product_type
        shipping_profile_id
        download_url
        images
        tags
        status
        created_at
        updated_at
      }
    }
  }
`;

export const SEARCH_PRODUCTS = gql`
  query SearchProducts($input: SearchProductsInput!) {
    searchProducts(input: $input) {
      success
      products {
        id
        vendor_id
        title
        description
        price
        currency
        inventory_count
        product_type
        shipping_profile_id
        download_url
        images
        tags
        status
        created_at
        updated_at
      }
      total
      page
      limit
    }
  }
`;

export const GET_FEATURED_PRODUCTS = gql`
  query GetFeaturedProducts($page: Int, $limit: Int) {
    getFeaturedProducts(page: $page, limit: $limit) {
      success
      products {
        id
        vendor_id
        title
        description
        price
        currency
        inventory_count
        product_type
        shipping_profile_id
        download_url
        images
        tags
        status
        created_at
        updated_at
      }
      total
      page
      limit
    }
  }
`;

export const GET_VENDOR_PRODUCTS = gql`
  query GetVendorProducts($vendor_id: ID!, $page: Int, $limit: Int) {
    getVendorProducts(vendor_id: $vendor_id, page: $page, limit: $limit) {
      success
      products {
        id
        vendor_id
        title
        description
        price
        currency
        inventory_count
        product_type
        shipping_profile_id
        download_url
        images
        tags
        status
        created_at
        updated_at
      }
      total
      page
      limit
    }
  }
`;

export const GET_RELATED_PRODUCTS = gql`
  query GetRelatedProducts($product_id: ID!, $limit: Int) {
    getRelatedProducts(product_id: $product_id, limit: $limit) {
      success
      products {
        id
        vendor_id
        title
        description
        price
        currency
        inventory_count
        product_type
        shipping_profile_id
        download_url
        images
        tags
        status
        created_at
        updated_at
      }
      total
      page
      limit
    }
  }
`;

export const GET_RECOMMENDED_PRODUCTS = gql`
  query GetRecommendedProducts($limit: Int) {
    getRecommendedProducts(limit: $limit) {
      success
      products {
        id
        vendor_id
        title
        description
        price
        currency
        inventory_count
        product_type
        shipping_profile_id
        download_url
        images
        tags
        status
        created_at
        updated_at
      }
      total
      page
      limit
    }
  }
`;

export const GET_MARKETPLACE_SERVICE = gql`
  query GetMarketplaceService($service_id: ID!) {
    getMarketplaceService(service_id: $service_id) {
      success
      message
      service {
        id
        vendor_id
        title
        description
        base_price
        currency
        tags
        status
        created_at
        updated_at
      }
    }
  }
`;

export const SEARCH_MARKETPLACE_SERVICES = gql`
  query SearchMarketplaceServices($input: SearchServicesInput!) {
    searchMarketplaceServices(input: $input) {
      success
      services {
        id
        vendor_id
        title
        description
        base_price
        currency
        tags
        status
        created_at
        updated_at
      }
      total
      page
      limit
    }
  }
`;

export const GET_FEATURED_MARKETPLACE_SERVICES = gql`
  query GetFeaturedMarketplaceServices($page: Int, $limit: Int) {
    getFeaturedMarketplaceServices(page: $page, limit: $limit) {
      success
      services {
        id
        vendor_id
        title
        description
        base_price
        currency
        tags
        status
        created_at
        updated_at
      }
      total
      page
      limit
    }
  }
`;

export const GET_VENDOR_MARKETPLACE_SERVICES = gql`
  query GetVendorMarketplaceServices($vendor_id: ID!, $page: Int, $limit: Int) {
    getVendorMarketplaceServices(vendor_id: $vendor_id, page: $page, limit: $limit) {
      success
      services {
        id
        vendor_id
        title
        description
        base_price
        currency
        tags
        status
        created_at
        updated_at
      }
      total
      page
      limit
    }
  }
`;

export const GET_MARKETPLACE_ORDER = gql`
  query GetMarketplaceOrder($order_id: ID!) {
    getMarketplaceOrder(order_id: $order_id) {
      success
      message
      order {
        id
        buyer_id
        vendor_id
        status
        items {
          product_id
          quantity
          price
          currency
        }
        total_amount
        currency
        shipping_address
        notes
        created_at
        updated_at
      }
    }
  }
`;

export const MY_ORDERS = gql`
  query MyOrders($status: String, $page: Int, $limit: Int) {
    myOrders(status: $status, page: $page, limit: $limit) {
      success
      orders {
        id
        buyer_id
        vendor_id
        status
        items {
          product_id
          quantity
          price
          currency
        }
        total_amount
        currency
        shipping_address
        notes
        created_at
        updated_at
      }
      total
      page
      limit
    }
  }
`;

export const MY_ORDER_STATS = gql`
  query MyOrderStats {
    myOrderStats {
      success
      stats {
        total_orders
        completed_orders
        cancelled_orders
        total_spent
        currency
      }
    }
  }
`;

export const CONVERT_CURRENCY = gql`
  query ConvertCurrency($amount: Float!, $from_currency: String!, $to_currency: String!) {
    convertCurrency(
      amount: $amount
      from_currency: $from_currency
      to_currency: $to_currency
    ) {
      success
      converted_amount
      to_currency
      exchange_rate
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

export const CREATE_PRODUCT_ORDER = gql`
  mutation CreateProductOrder($input: CreateProductOrderInput!) {
    createProductOrder(input: $input) {
      success
      message
      order {
        id
        buyer_id
        vendor_id
        status
        items {
          product_id
          quantity
          price
          currency
        }
        total_amount
        currency
        shipping_address
        notes
        created_at
        updated_at
      }
    }
  }
`;

export const CREATE_SERVICE_ORDER = gql`
  mutation CreateServiceOrder($input: CreateServiceOrderInput!) {
    createServiceOrder(input: $input) {
      success
      message
      order {
        id
        buyer_id
        vendor_id
        status
        items {
          product_id
          quantity
          price
          currency
        }
        total_amount
        currency
        shipping_address
        notes
        created_at
        updated_at
      }
    }
  }
`;

export const CANCEL_MARKETPLACE_ORDER = gql`
  mutation CancelMarketplaceOrder($order_id: ID!, $reason: String) {
    cancelMarketplaceOrder(order_id: $order_id, reason: $reason) {
      success
      message
      order {
        id
        buyer_id
        vendor_id
        status
        items {
          product_id
          quantity
          price
          currency
        }
        total_amount
        currency
        shipping_address
        notes
        created_at
        updated_at
      }
    }
  }
`;

export const CONFIRM_ORDER_DELIVERY = gql`
  mutation ConfirmOrderDelivery($order_id: ID!) {
    confirmOrderDelivery(order_id: $order_id) {
      success
      message
      order {
        id
        buyer_id
        vendor_id
        status
        items {
          product_id
          quantity
          price
          currency
        }
        total_amount
        currency
        shipping_address
        notes
        created_at
        updated_at
      }
    }
  }
`;

export const COMPLETE_MARKETPLACE_ORDER = gql`
  mutation CompleteMarketplaceOrder($order_id: ID!) {
    completeMarketplaceOrder(order_id: $order_id) {
      success
      message
      order {
        id
        buyer_id
        vendor_id
        status
        items {
          product_id
          quantity
          price
          currency
        }
        total_amount
        currency
        shipping_address
        notes
        created_at
        updated_at
      }
    }
  }
`;
