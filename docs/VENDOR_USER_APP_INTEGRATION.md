# Marketplace Service — Frontend Integration Reference (User)

## 1) Scope for User role

This reference is scoped to end-user/buyer flows:

- Browse products/services
- View product/service details
- View related/recommended items
- Create/manage own orders
- View own order stats
- Convert currency for price display

Not included for this role UI:

- Seller management mutations (`createProduct`, `updateProduct`, `publishProduct`, `createMarketplaceService`, etc.)
- Vendor analytics/order management (`myVendorOrders`, `vendorOrderStats`)

## 2) Auth behavior

- Public or optional-auth queries can be called without token; token improves personalization.
- Protected queries/mutations require `Authorization: Bearer <token>`.

## 3) Queries (User-focused)

### `getProduct`

- **Purpose:** Fetch one product by ID.
- **Input variables:** `product_id: ID!` (required)
- **Expected response shape:** `ProductResponse { success, message?, product? }`
- **When/how to call:** product details page load, quick-view modal open
- **Error states:** product not found, network failures, invalid ID format

### `searchProducts`

- **Purpose:** Search/filter product catalog.
- **Input variables:** `input: SearchProductsInput!`
- **SearchProductsInput:** `query?`, `category?`, `vendor_id?`, `min_price?`, `max_price?`, `currency?`, `product_type?`, `tags?`, `page?`, `limit?`
- **Expected response shape:** `ProductListResponse { success, products[], total, page, limit }`
- **When/how to call:** listing page, filter/sort/search submit, debounced search
- **Error states:** invalid price range, empty set, backend timeout

### `getFeaturedProducts`

- **Purpose:** Get featured products for discovery.
- **Input variables:** `page?`, `limit?`
- **Expected response shape:** `ProductListResponse`
- **When/how to call:** home sections (`Featured`, `Trending`)
- **Error states:** empty list, out-of-range pagination

### `getVendorProducts`

- **Purpose:** List products from one vendor.
- **Input variables:** `vendor_id: ID!`, `page?`, `limit?`
- **Expected response shape:** `ProductListResponse`
- **When/how to call:** vendor storefront tab
- **Error states:** vendor not found, no products

### `getRelatedProducts`

- **Purpose:** Cross-sell related items.
- **Input variables:** `product_id: ID!`, `limit?` (default 8)
- **Expected response shape:** `ProductListResponse`
- **When/how to call:** product details (`You may also like`)
- **Error states:** source product missing, empty related set

### `getRecommendedProducts` (auth required)

- **Purpose:** Personalized recommendations.
- **Input variables:** `limit?` (default 20)
- **Expected response shape:** `ProductListResponse`
- **When/how to call:** personalized feed sections after login
- **Error states:** unauthorized, no recommendation data (fallback to featured)

### `getMarketplaceService`

- **Purpose:** Fetch one service by ID.
- **Input variables:** `service_id: ID!`
- **Expected response shape:** `ServiceResponse { success, message?, service? }`
- **When/how to call:** service details page
- **Error states:** service not found, invalid ID

### `searchMarketplaceServices`

- **Purpose:** Search/filter service listings.
- **Input variables:** `input: SearchServicesInput!`
- **SearchServicesInput:** `query?`, `category?`, `vendor_id?`, `min_price?`, `max_price?`, `page?`, `limit?`
- **Expected response shape:** `ServiceListResponse { success, services[], total, page, limit }`
- **When/how to call:** service marketplace filters/search
- **Error states:** invalid filters, empty list, backend timeout

### `getFeaturedMarketplaceServices`

- **Purpose:** Fetch featured services.
- **Input variables:** `page?`, `limit?`
- **Expected response shape:** `ServiceListResponse`
- **When/how to call:** home discovery sections
- **Error states:** empty list, pagination issues

### `getVendorMarketplaceServices`

- **Purpose:** List services from a specific vendor.
- **Input variables:** `vendor_id: ID!`, `page?`, `limit?`
- **Expected response shape:** `ServiceListResponse`
- **When/how to call:** vendor profile/services tab
- **Error states:** vendor not found, empty list

### `getMarketplaceOrder` (auth required)

- **Purpose:** Fetch one order by ID.
- **Input variables:** `order_id: ID!`
- **Expected response shape:** `OrderResponse { success, message?, order? }`
- **When/how to call:** order details route
- **Error states:** unauthorized, order not found, forbidden access

### `myOrders` (auth required)

- **Purpose:** Paginated current-user buyer orders.
- **Input variables:** `status?`, `page?`, `limit?`
- **Expected response shape:** `OrderListResponse { success, orders[], total, page, limit }`
- **When/how to call:** My Orders page, status tabs, pagination
- **Error states:** unauthorized, invalid status, empty state

### `myOrderStats` (auth required)

- **Purpose:** Aggregate buyer order stats.
- **Input variables:** none
- **Expected response shape:** `OrderStatsResponse { success, stats? }`
- **When/how to call:** account overview/orders dashboard header
- **Error states:** unauthorized, missing stats object (render zero fallback)

### `convertCurrency`

- **Purpose:** Convert amount for display and checkout hints.
- **Input variables:** `amount: Float!`, `from_currency: String!`, `to_currency: String!`
- **Expected response shape:** `ConvertMoneyResponse { success, converted_amount, to_currency, exchange_rate }`
- **When/how to call:** price display toggles, checkout estimate panel
- **Error states:** unsupported pair, provider unavailable, timeout fallback to base currency

## 4) Mutations (User-focused)

### `createProductOrder` (auth required)

- **Purpose:** Place an order for products.
- **Input variables:** `input: CreateProductOrderInput!`
- **CreateProductOrderInput:** `vendor_id`, `items[]`, `shipping_address?`, `notes?`
- **OrderItemInput:** `product_id`, `quantity`, `price`, `currency`
- **Expected response shape:** `OrderResponse { success, message?, order? }`
- **When/how to call:** checkout submit; disable while in-flight
- **Error states:** unauthorized, inventory issues, price mismatch/validation, vendor/product not found

### `createServiceOrder` (auth required)

- **Purpose:** Place an order for service/package.
- **Input variables:** `input: CreateServiceOrderInput!`
- **CreateServiceOrderInput:** `vendor_id`, `service_id`, `package_id?`, `notes?`
- **Expected response shape:** `OrderResponse`
- **When/how to call:** service checkout/hire flow
- **Error states:** unauthorized, service/package missing, invalid package for service/vendor

### `cancelMarketplaceOrder` (auth required)

- **Purpose:** Cancel an existing buyer order.
- **Input variables:** `order_id: ID!`, `reason?`
- **Expected response shape:** `OrderResponse`
- **When/how to call:** order details cancel CTA with confirmation modal
- **Error states:** unauthorized, cancellation not allowed for status/time window, order missing/forbidden

### `confirmOrderDelivery` (auth required)

- **Purpose:** Mark order as delivered.
- **Input variables:** `order_id: ID!`
- **Expected response shape:** `OrderResponse`
- **When/how to call:** buyer confirms receipt in order timeline
- **Error states:** unauthorized, invalid status transition, order not found

### `completeMarketplaceOrder` (auth required)

- **Purpose:** Complete/close order lifecycle.
- **Input variables:** `order_id: ID!`
- **Expected response shape:** `OrderResponse`
- **When/how to call:** final complete action after delivery confirmation
- **Error states:** unauthorized, invalid status transition, order not found/forbidden

## 5) Types reference (display vs internal use)

- **MarketplaceProductType:** display `title`, `description`, `price`, `currency`, `inventory_count`, `images`, `tags`, `status`; internal `id`, `vendor_id`, `product_type`, `download_url`, `shipping_profile_id`, timestamps
- **ProductResponse:** display `message` + `product`; internal `success`
- **ProductListResponse:** display `products`; internal `success`, `total`, `page`, `limit`
- **MarketplaceServiceType:** display `title`, `description`, `base_price`, `currency`, `tags`, `status`; internal `id`, `vendor_id`, timestamps
- **ServiceResponse/ServiceListResponse:** display nested `service/services`; internal `success`, `message`, pagination metadata
- **OrderItemType:** display `quantity`, `price`, `currency`; internal `product_id`
- **MarketplaceOrderType:** display `status`, `items`, `total_amount`, `currency`, `shipping_address`, `notes`, `created_at`; internal `id`, `buyer_id`, `vendor_id`, `updated_at`
- **OrderResponse/OrderListResponse:** display nested order data and `message`; internal `success`, pagination metadata
- **OrderStatsType/OrderStatsResponse:** display `total_orders`, `completed_orders`, `cancelled_orders`, `total_spent`, `currency`; internal `success`
- **ConvertMoneyResponse:** display `converted_amount`, `to_currency`; internal `success`, `exchange_rate` (optional tooltip)

Input types used directly by frontend forms:

- `SearchProductsInput`, `SearchServicesInput`
- `CreateProductOrderInput`, `CreateServiceOrderInput`
- `OrderItemInput`

Use these as source-of-truth for form models and validation schemas.

## 6) Implementation checklist (ready to execute)

1. Build catalog pages with `searchProducts` / `searchMarketplaceServices`.
2. Build detail pages with `getProduct` / `getMarketplaceService`.
3. Add recommendation and related-product sections (`getRecommendedProducts`, `getRelatedProducts`).
4. Implement checkout flows with `createProductOrder` and `createServiceOrder`.
5. Implement order center with `myOrders`, `getMarketplaceOrder`, `myOrderStats`.
6. Add order actions: `cancelMarketplaceOrder`, `confirmOrderDelivery`, `completeMarketplaceOrder`.
7. Add centralized GraphQL error mapper:
   - auth errors -> login redirect
   - not found -> empty/error state
   - validation/business rule errors -> inline form/order action messaging.
