import { gql } from '@apollo/client';

/* ============================================================================
   SERVICE-REQUEST-SERVICE (via api-gateway GraphQL)

   Service/request types are scoped PER OWNER (ownerType + ownerEntityId), not
   global. For an embassy community we pass ownerType: COMMUNITY and the
   community id. Field names match the live schema (verified): the human label
   is `displayName` (there is no `name`/`category` field).
   ============================================================================ */

export const SERVICE_REQUEST_TYPES = gql`
  query ServiceRequestTypes($ownerType: ServiceRequestOwnerType!, $ownerEntityId: String) {
    serviceRequestTypes(ownerType: $ownerType, ownerEntityId: $ownerEntityId) {
      id
      code
      displayName
      description
      isActive
    }
  }
`;

/**
 * Detailed catalog query used by the Service Detail view.
 *
 * The live gateway has NO single-type query (no `serviceRequestType(id)`): the
 * only user-readable entry point is the owner-scoped list `serviceRequestTypes`.
 * So the detail screen fetches the same list and picks the matching id
 * client-side. This variant selects the richer fields that DO exist on the live
 * `ServiceRequestType` GraphQL type (verified against the gateway DTO):
 * `feeAmountMinor` (Float minor units), `feeCurrency`, and the `formFields`
 * template. `ownerType` is the enum `ServiceRequestOwnerType!` and
 * `ownerEntityId` is a plain `String` (NOT `ID`) — passing an `ID` typed
 * variable here would be rejected by the live schema.
 */
export const SERVICE_REQUEST_TYPES_DETAIL = gql`
  query ServiceRequestTypesDetail(
    $ownerType: ServiceRequestOwnerType!
    $ownerEntityId: String
  ) {
    serviceRequestTypes(ownerType: $ownerType, ownerEntityId: $ownerEntityId) {
      id
      code
      displayName
      description
      isActive
      feeAmountMinor
      feeCurrency
      formFields {
        key
        label
        type
        required
        options
      }
    }
  }
`;

export const MY_SERVICE_REQUESTS = gql`
  query MyServiceRequests {
    myServiceRequests {
      id
      requestNumber
      requestTypeId
      category
      status
      submittedAt
      updatedAt
    }
  }
`;

export interface ServiceRequestType {
  id: string;
  code?: string;
  displayName: string;
  description?: string | null;
  isActive?: boolean;
}

/** One field of a request-type form template (live `ServiceRequestFormField`). */
export interface ServiceRequestFormField {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: string[];
}

/** Richer request-type shape selected by SERVICE_REQUEST_TYPES_DETAIL. */
export interface ServiceRequestTypeDetail extends ServiceRequestType {
  feeAmountMinor?: number | null;
  feeCurrency?: string | null;
  formFields?: ServiceRequestFormField[] | null;
}

export interface ServiceRequestTypesDetailResponse {
  serviceRequestTypes: ServiceRequestTypeDetail[];
}

export interface ServiceRequestSummary {
  id: string;
  requestNumber: string;
  requestTypeId: string;
  category?: string | null;
  status: string;
  submittedAt?: string | null;
  updatedAt?: string | null;
}

export interface ServiceRequestTypesResponse {
  serviceRequestTypes: ServiceRequestType[];
}

export interface MyServiceRequestsResponse {
  myServiceRequests: ServiceRequestSummary[];
}

/* ============================================================================
   SUPPORT-SERVICE (via api-gateway GraphQL)
   Case types are likewise scoped per owner. Live schema fields: id, code,
   displayName, description, isActive.
   ============================================================================ */

export const SUPPORT_CASE_TYPES = gql`
  query SupportCaseTypes($ownerType: SupportOwnerType!, $ownerEntityId: String) {
    caseTypes(ownerType: $ownerType, ownerEntityId: $ownerEntityId) {
      id
      code
      displayName
      description
      isActive
    }
  }
`;

export interface SupportCaseType {
  id: string;
  code?: string;
  displayName: string;
  description?: string | null;
  isActive?: boolean;
}

export interface SupportCaseTypesResponse {
  caseTypes: SupportCaseType[];
}
