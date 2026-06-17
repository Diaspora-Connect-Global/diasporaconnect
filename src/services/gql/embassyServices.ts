import { gql } from '@apollo/client';

/* ============================================================================
   SERVICE-REQUEST-SERVICE (via api-gateway GraphQL)

   Service/request types are scoped PER OWNER (ownerType + ownerEntityId), not
   global. For an embassy community we pass ownerType: COMMUNITY and the
   community id. Field names match the live schema (verified): the human label
   is `displayName` (there is no `name`/`category` field).
   ============================================================================ */

export const SERVICE_REQUEST_TYPES = gql`
  query ServiceRequestTypes($ownerType: ServiceRequestOwnerType!, $ownerEntityId: ID) {
    serviceRequestTypes(ownerType: $ownerType, ownerEntityId: $ownerEntityId) {
      id
      code
      displayName
      description
      isActive
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
  query SupportCaseTypes($ownerType: SupportOwnerType!, $ownerEntityId: ID) {
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
