/**
 * Vendor Service GraphQL operations.
 * All operations go through the API Gateway. Auth: Bearer JWT required for protected ops.
 * @see docs / Vendor Service Frontend Integration Guide
 */

import { gql } from '@apollo/client';

export type {
  VendorDTO,
  VendorDashboardDTO,
  VendorEligibilityDTO,
  VendorProduct,
  VendorServicePackage,
  VendorOrder,
  ProductListPaginatedDTO,
  ServicePackageListPaginatedDTO,
  VendorOrderListPaginatedDTO,
  UploadUrlDTO,
  VendorStatus,
  VendorType,
  ProductStatus,
  ProductType,
  OrderStatus,
  VendorUploadFileType,
} from './types/vendor';

// ============================================================================
// QUERIES
// ============================================================================

/** Public vendor profile. Auth: No. */
export const GET_VENDOR = gql`
  query GetVendor($vendorId: String!) {
    getVendor(vendorId: $vendorId) {
      id
      userId
      displayName
      description
      type
      status
      logoUrl
      rating
      completedOrders
      capabilities {
        type
        enabled
      }
      payoutAccounts {
        id
        provider
        currency
        isDefault
        isVerified
        createdAt
        verifiedAt
      }
      createdAt
      updatedAt
    }
  }
`;

/** Current user's vendor profile. Auth: Yes. Returns null if no vendor yet. */
export const GET_MY_VENDOR = gql`
  query GetMyVendor {
    getMyVendor {
      id
      userId
      displayName
      description
      type
      status
      logoUrl
      rating
      completedOrders
      capabilities { type enabled }
      payoutAccounts {
        id
        provider
        currency
        isDefault
        isVerified
        createdAt
        verifiedAt
      }
      createdAt
      updatedAt
    }
  }
`;

/** Vendor dashboard / sales analytics. Auth: Yes. vendorId optional (omit for own dashboard). */
export const GET_VENDOR_DASHBOARD = gql`
  query GetVendorDashboard($vendorId: String) {
    getVendorDashboard(vendorId: $vendorId) {
      id
      userId
      displayName
      totalSales
      totalEarnings
      averageRating
      totalRatings
      completedOrders
      status
    }
  }
`;

/** Compliance / eligibility (canSell, canReceivePayout). Auth: Yes. */
export const GET_VENDOR_ELIGIBILITY = gql`
  query GetVendorEligibility($vendorId: String) {
    getVendorEligibility(vendorId: $vendorId) {
      vendorId
      canSell
      canReceivePayout
      isCompliant
      status
      payoutAccountCount
      verifiedPayoutAccounts
      activeSuspensionCount
    }
  }
`;

/** Paginated vendor products. Auth: Yes. Omit vendorId for authenticated vendor. */
export const LIST_VENDOR_PRODUCTS = gql`
  query ListVendorProducts(
    $vendorId: String
    $status: String
    $limit: Int
    $offset: Int
  ) {
    listVendorProducts(
      vendorId: $vendorId
      status: $status
      limit: $limit
      offset: $offset
    ) {
      totalCount
      items {
        id
        vendorId
        title
        description
        price
        currency
        inventoryCount
        productType
        status
        shippingProfileId
        downloadUrl
        images
        tags
        createdAt
        updatedAt
      }
    }
  }
`;

/** Paginated vendor service packages. Auth: Yes. */
export const LIST_VENDOR_SERVICE_PACKAGES = gql`
  query ListVendorServicePackages(
    $vendorId: String
    $status: String
    $limit: Int
    $offset: Int
  ) {
    listVendorServicePackages(
      vendorId: $vendorId
      status: $status
      limit: $limit
      offset: $offset
    ) {
      totalCount
      items {
        id
        vendorId
        title
        description
        basePrice
        currency
        estimatedDuration
        status
        benefits
        milestones {
          id
          title
          description
          percentageOfTotal
          estimatedDays
          deliverables
          order
        }
        createdAt
        updatedAt
      }
    }
  }
`;

/** Paginated vendor orders. Auth: Yes. */
export const LIST_VENDOR_ORDERS = gql`
  query ListVendorOrders(
    $vendorId: String
    $status: String
    $limit: Int
    $offset: Int
  ) {
    listVendorOrders(
      vendorId: $vendorId
      status: $status
      limit: $limit
      offset: $offset
    ) {
      totalCount
      items {
        id
        vendorId
        buyerId
        status
        totalAmount
        currency
        createdAt
        updatedAt
      }
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/** Create vendor profile. Auth: Yes. vendorType: "INDIVIDUAL" | "BUSINESS". Returns vendorId. */
export const CREATE_VENDOR = gql`
  mutation CreateVendor(
    $userId: String!
    $vendorType: String!
    $displayName: String!
    $description: String!
  ) {
    createVendor(
      userId: $userId
      vendorType: $vendorType
      displayName: $displayName
      description: $description
    )
  }
`;

/** Get signed upload URL. Auth: Yes. fileType: "product" | "logo" | "download". */
export const REQUEST_UPLOAD_URL = gql`
  mutation RequestUploadUrl(
    $vendorId: String!
    $fileName: String!
    $contentType: String!
    $fileType: String!
  ) {
    requestUploadUrl(
      vendorId: $vendorId
      fileName: $fileName
      contentType: $contentType
      fileType: $fileType
    ) {
      uploadUrl
      readUrl
      objectKey
    }
  }
`;

// Backward-compatible alias for older callers.
export const REQUEST_VENDOR_UPLOAD_URL = REQUEST_UPLOAD_URL;

/** Create product (status DRAFT). Auth: Yes. productType: "PHYSICAL" | "DIGITAL". Returns productId. */
export const CREATE_PRODUCT = gql`
  mutation CreateProduct(
    $vendorId: String!
    $title: String!
    $description: String!
    $price: Float!
    $currency: String!
    $inventoryCount: Int!
    $productType: String!
    $shippingProfileId: String
    $downloadUrl: String
    $images: [String!]
    $tags: [String!]
  ) {
    createProduct(
      vendorId: $vendorId
      title: $title
      description: $description
      price: $price
      currency: $currency
      inventoryCount: $inventoryCount
      productType: $productType
      shippingProfileId: $shippingProfileId
      downloadUrl: $downloadUrl
      images: $images
      tags: $tags
    )
  }
`;

/** Update product. Auth: Yes. images/tags replace existing arrays. */
export const UPDATE_PRODUCT = gql`
  mutation UpdateProduct(
    $productId: String!
    $title: String!
    $description: String!
    $price: Float!
    $inventoryCount: Int!
    $images: [String!]
    $tags: [String!]
  ) {
    updateProduct(
      productId: $productId
      title: $title
      description: $description
      price: $price
      inventoryCount: $inventoryCount
      images: $images
      tags: $tags
    )
  }
`;

/** Publish product (DRAFT → PUBLISHED). Auth: Yes. */
export const PUBLISH_PRODUCT = gql`
  mutation PublishProduct($productId: String!) {
    publishProduct(productId: $productId)
  }
`;

/** Hard delete product. Auth: Yes. */
export const DELETE_PRODUCT = gql`
  mutation DeleteProduct($productId: String!) {
    deleteProduct(productId: $productId)
  }
`;

/** Create service package (status DRAFT). Auth: Yes. estimatedDuration in days. Returns packageId. */
export const CREATE_SERVICE_PACKAGE = gql`
  mutation CreateServicePackage(
    $vendorId: String!
    $title: String!
    $description: String!
    $basePrice: Float!
    $currency: String!
    $estimatedDuration: Int!
    $benefits: [String!]
  ) {
    createServicePackage(
      vendorId: $vendorId
      title: $title
      description: $description
      basePrice: $basePrice
      currency: $currency
      estimatedDuration: $estimatedDuration
      benefits: $benefits
    )
  }
`;

/** Add milestone to service package. Auth: Yes. percentageOfTotal e.g. 50.0, order 1-based. Returns milestoneId. */
export const ADD_MILESTONE = gql`
  mutation AddMilestone(
    $packageId: String!
    $title: String!
    $description: String!
    $percentageOfTotal: Float!
    $estimatedDays: Int!
    $deliverables: [String!]!
    $order: Int!
  ) {
    addMilestone(
      packageId: $packageId
      title: $title
      description: $description
      percentageOfTotal: $percentageOfTotal
      estimatedDays: $estimatedDays
      deliverables: $deliverables
      order: $order
    )
  }
`;

/** Publish service package. Auth: Yes. */
export const PUBLISH_SERVICE_PACKAGE = gql`
  mutation PublishServicePackage($packageId: String!) {
    publishServicePackage(packageId: $packageId)
  }
`;

/** Request payout. Auth: Yes. Requires canReceivePayout from getVendorEligibility. Returns payoutId. */
export const REQUEST_PAYOUT = gql`
  mutation RequestPayout(
    $vendorId: String!
    $amount: Float!
    $currency: String!
  ) {
    requestPayout(vendorId: $vendorId, amount: $amount, currency: $currency)
  }
`;

/** Suspend vendor. Auth: Yes (admin). */
export const SUSPEND_VENDOR = gql`
  mutation SuspendVendor($vendorId: String!, $reason: String!) {
    suspendVendor(vendorId: $vendorId, reason: $reason)
  }
`;

/** Reinstate vendor. Auth: Yes (admin). */
export const REINSTATE_VENDOR = gql`
  mutation ReinstateVendor($vendorId: String!) {
    reinstateVendor(vendorId: $vendorId)
  }
`;
