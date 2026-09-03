/**
 * KYC Service GraphQL operations.
 * All operations go through the API Gateway KYC module. Auth: Bearer session token required.
 *
 * Op/arg/field names verified against the gateway resolver at
 * services/api-gateway/src/kyc/kyc.resolver.ts + kyc.types.ts:
 *  - Query  getMyKYCStatus      -> KYCStatusResult { status, kycLevel, profileId }
 *  - Query  getMyKYCProfile     -> KYCStatusResult (same thin shape on the gateway today)
 *  - Mut    initiateKYCVerification(provider: String!) -> { sessionId, redirectUrl, sdkToken, provider }
 *  - Mut    submitKYC(input: SubmitKYCInput!)          -> KYCStatusResult
 *  - Mut    submitBusinessKYB(input: SubmitKYBInput!)  -> KYCStatusResult
 *
 * @see services/gql/types/kyc.ts for the matching TS types + shape caveats.
 */

import { gql } from '@apollo/client';

export type {
  KycStatus,
  KycProvider,
  KycStatusDTO,
  KycProfileDTO,
  InitiateKycResponse,
  SubmitKycInput,
  SubmitBusinessKybInput,
  GetMyKycStatusResponse,
  GetMyKycProfileResponse,
  InitiateKycVerificationResponse,
  SubmitKycResponse,
  SubmitBusinessKybResponse,
} from './types/kyc';
export { KYC_TERMINAL_STATUSES } from './types/kyc';

// ============================================================================
// QUERIES
// ============================================================================

/** Current user's KYC status. Auth: Yes. Graceful — returns NOT_STARTED/0 if service down. */
export const GET_MY_KYC_STATUS = gql`
  query GetMyKYCStatus {
    getMyKYCStatus {
      status
      kycLevel
      profileId
    }
  }
`;

/**
 * Current user's KYC profile. Auth: Yes.
 * NOTE: the gateway resolver currently returns the same thin status object
 * (status/kycLevel/profileId) — selecting those three fields only.
 */
export const GET_MY_KYC_PROFILE = gql`
  query GetMyKYCProfile {
    getMyKYCProfile {
      status
      kycLevel
      profileId
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Start a provider-backed verification session. Auth: Yes.
 * provider: "ONFIDO" | "ITSME" | "SUMSUB" (gateway upper-cases it anyway).
 *  - Onfido -> response.sdkToken (launch Web SDK)
 *  - itsme  -> response.redirectUrl (window.location.assign)
 */
export const INITIATE_KYC_VERIFICATION = gql`
  mutation InitiateKYCVerification($provider: String!) {
    initiateKYCVerification(provider: $provider) {
      sessionId
      provider
      sdkToken
      redirectUrl
    }
  }
`;

/**
 * Manual individual KYC submission (fallback when no provider SDK token is issued). Auth: Yes.
 * input.providerStrategy: 'onfido' | 'itsme' | 'sumsub' | 'manual'
 */
export const SUBMIT_KYC = gql`
  mutation SubmitKYC($input: SubmitKYCInput!) {
    submitKYC(input: $input) {
      status
      kycLevel
      profileId
    }
  }
`;

/** Business KYB submission. Auth: Yes. */
export const SUBMIT_BUSINESS_KYB = gql`
  mutation SubmitBusinessKYB($input: SubmitKYBInput!) {
    submitBusinessKYB(input: $input) {
      status
      kycLevel
      profileId
    }
  }
`;
