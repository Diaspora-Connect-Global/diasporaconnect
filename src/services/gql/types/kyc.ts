/**
 * @fileoverview KYC service type definitions for GraphQL operations.
 * Aligns with the API Gateway KYC module (services/api-gateway/src/kyc).
 *
 * IMPORTANT — gateway shape notes (verified against kyc.resolver.ts / kyc.types.ts):
 *  - `getMyKYCStatus` AND `getMyKYCProfile` both resolve to the SAME thin
 *    `KYCStatusResult` object type: { status, kycLevel?, profileId? }. The gateway
 *    does NOT currently expose the rich profile (documents[]/sessions[]/riskScore/...)
 *    over GraphQL — those live only on the gRPC layer. So the "profile" query here is
 *    effectively a status query that also returns the profileId.
 *  - `initiateKYCVerification` takes ONLY `provider: String!` on the gateway — there is
 *    no `data` argument exposed. Returns { sessionId, redirectUrl?, sdkToken?, provider }
 *    (no profileId in the GraphQL selection set).
 *  - `submitKYC(input: SubmitKYCInput!)` and `submitBusinessKYB(input: SubmitKYBInput!)`.
 *
 * @module services/gql/types/kyc
 */

// ============================================================================
// ENUMS / LITERALS
// ============================================================================

/**
 * KYC status as surfaced by the gateway. The gateway maps the gRPC
 * `IndividualKYCStatus` enum to its string name; itsme/Onfido approvals surface
 * as `APPROVED`. The vendor module historically uses `VERIFIED` for the same
 * idea, so callers should treat both `APPROVED` and `VERIFIED` as "done".
 */
export type KycStatus =
  | 'NOT_STARTED'
  | 'SUBMITTED'
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED';

/** Provider identifiers accepted by `initiateKYCVerification`. */
export type KycProvider = 'ONFIDO' | 'ITSME' | 'SUMSUB';

/** Terminal states for status polling — stop polling once one of these is reached. */
export const KYC_TERMINAL_STATUSES: KycStatus[] = [
  'APPROVED',
  'VERIFIED',
  'REJECTED',
  'EXPIRED',
];

// ============================================================================
// CORE DTOs
// ============================================================================

/**
 * Result of `getMyKYCStatus`. Thin status snapshot.
 */
export interface KycStatusDTO {
  status: KycStatus;
  kycLevel?: number | null;
  profileId?: string | null;
}

/**
 * Result of `getMyKYCProfile`. Same shape as the status result on the gateway
 * today (status + level + profileId). Modelled as its own type so a future
 * gateway widening (documents/sessions/rejectionReason) is a non-breaking add.
 *
 * `rejectionReason` is optional/forward-looking: the gateway resolver does not
 * select it today, so it will be `undefined` until the gateway exposes it.
 */
export interface KycProfileDTO {
  profileId?: string | null;
  status: KycStatus;
  kycLevel?: number | null;
  /** Forward-looking — not selected by the gateway resolver yet. */
  rejectionReason?: string | null;
}

/**
 * Result of `initiateKYCVerification`.
 *  - `sdkToken` present → launch the Onfido Web SDK.
 *  - `redirectUrl` present → redirect the browser (itsme OIDC flow).
 *  - neither present → provider disabled; fall back to manual `submitKYC`.
 */
export interface InitiateKycResponse {
  sessionId: string;
  provider: KycProvider | string;
  sdkToken?: string | null;
  redirectUrl?: string | null;
}

// ============================================================================
// MUTATION INPUTS
// ============================================================================

export interface SubmitKycInput {
  /** 'onfido' | 'itsme' | 'sumsub' | 'manual' */
  providerStrategy?: string;
}

export interface SubmitBusinessKybInput {
  businessName: string;
  registrationNumber: string;
  countryOfIncorporation: string;
  beneficialOwners?: string[];
  providerStrategy?: string;
}

// ============================================================================
// QUERY / MUTATION RESPONSE WRAPPERS
// ============================================================================

export interface GetMyKycStatusResponse {
  getMyKYCStatus: KycStatusDTO;
}

export interface GetMyKycProfileResponse {
  getMyKYCProfile: KycProfileDTO;
}

export interface InitiateKycVerificationResponse {
  initiateKYCVerification: InitiateKycResponse;
}

export interface SubmitKycResponse {
  submitKYC: KycStatusDTO;
}

export interface SubmitBusinessKybResponse {
  submitBusinessKYB: KycStatusDTO;
}
