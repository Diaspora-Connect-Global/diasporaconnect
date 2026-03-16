/**
 * @fileoverview Vendor service type definitions for GraphQL operations.
 * Aligns with Vendor Service Frontend Integration Guide (API Gateway / Vendor microservice).
 * @module services/gql/types/vendor
 */

// ============================================================================
// ENUMS / LITERALS
// ============================================================================

export type VendorStatus = 'DRAFT' | 'ACTIVE' | 'KYC_PENDING' | 'SUSPENDED';
export type VendorType = 'INDIVIDUAL' | 'BUSINESS';
export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ProductType = 'PHYSICAL' | 'DIGITAL';
export type OrderStatus = 'CREATED' | 'SHIPPED' | 'DELIVERED' | 'REFUNDED';

export type VendorUploadFileType = 'product' | 'logo' | 'download';

// ============================================================================
// CAPABILITIES & PAYOUT
// ============================================================================

export interface VendorCapability {
  type: string;
  enabled: boolean;
}

export interface PayoutAccount {
  id: string;
  provider: string;
  currency: string;
  isDefault: boolean;
  isVerified: boolean;
  createdAt: string;
  verifiedAt: string | null;
}

// ============================================================================
// VENDOR DTO
// ============================================================================

export interface VendorDTO {
  id: string;
  userId: string;
  displayName: string;
  description: string;
  type: VendorType;
  status: VendorStatus;
  logoUrl: string | null;
  rating: number | null;
  completedOrders: number;
  capabilities: VendorCapability[];
  payoutAccounts: PayoutAccount[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// DASHBOARD & ELIGIBILITY
// ============================================================================

export interface VendorDashboardDTO {
  id: string;
  userId: string;
  displayName: string;
  totalSales: number;
  totalEarnings: number;
  averageRating: number | null;
  totalRatings: number;
  completedOrders: number;
  status: VendorStatus;
}

export interface VendorEligibilityDTO {
  vendorId: string;
  canSell: boolean;
  canReceivePayout: boolean;
  isCompliant: boolean;
  status: VendorStatus;
  payoutAccountCount: number;
  verifiedPayoutAccounts: number;
  activeSuspensionCount: number;
}

// ============================================================================
// PRODUCT
// ============================================================================

export interface VendorProduct {
  id: string;
  vendorId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  inventoryCount: number;
  productType: ProductType;
  status: ProductStatus;
  shippingProfileId: string | null;
  downloadUrl: string | null;
  images: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductListPaginatedDTO {
  totalCount: number;
  items: VendorProduct[];
}

// ============================================================================
// SERVICE PACKAGE & MILESTONES
// ============================================================================

export interface ServicePackageMilestone {
  id: string;
  title: string;
  description: string;
  percentageOfTotal: number;
  estimatedDays: number;
  deliverables: string[];
  order: number;
}

export interface VendorServicePackage {
  id: string;
  vendorId: string;
  title: string;
  description: string;
  basePrice: number;
  currency: string;
  estimatedDuration: number;
  status: ProductStatus;
  benefits: string[];
  milestones: ServicePackageMilestone[];
  createdAt: string;
  updatedAt: string;
}

export interface ServicePackageListPaginatedDTO {
  totalCount: number;
  items: VendorServicePackage[];
}

// ============================================================================
// ORDERS
// ============================================================================

export interface VendorOrder {
  id: string;
  vendorId: string;
  buyerId: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorOrderListPaginatedDTO {
  totalCount: number;
  items: VendorOrder[];
}

// ============================================================================
// UPLOAD (SIGNED URL)
// ============================================================================

export interface UploadUrlDTO {
  uploadUrl: string;
  readUrl: string;
  objectKey: string;
}

// ============================================================================
// QUERY RESPONSE TYPES
// ============================================================================

export interface GetVendorResponse {
  getVendor: VendorDTO | null;
}

export interface GetMyVendorResponse {
  getMyVendor: VendorDTO | null;
}

export interface GetVendorDashboardResponse {
  getVendorDashboard: VendorDashboardDTO | null;
}

export interface GetVendorEligibilityResponse {
  getVendorEligibility: VendorEligibilityDTO | null;
}

export interface ListVendorProductsResponse {
  listVendorProducts: ProductListPaginatedDTO;
}

export interface ListVendorServicePackagesResponse {
  listVendorServicePackages: ServicePackageListPaginatedDTO;
}

export interface ListVendorOrdersResponse {
  listVendorOrders: VendorOrderListPaginatedDTO;
}

// ============================================================================
// MUTATION RESPONSE TYPES
// ============================================================================

export interface RequestVendorUploadUrlResponse {
  requestVendorUploadUrl: UploadUrlDTO;
}
