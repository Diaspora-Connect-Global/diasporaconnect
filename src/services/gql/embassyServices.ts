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

/* ----------------------------------------------------------------------------
   APPLY-FOR-SERVICE mutations (verified live against api.diaspoplug.net with a
   real test submit as stephenbedz1 — see field shapes below).

   Submit ordering: `submitServiceRequest` CREATES the request (and, when fee>0,
   the backend creates the payment intent internally, returned as
   `paymentIntentId`). For a €0 service the request returns status SUBMITTED with
   a null paymentIntentId immediately. Documents are uploaded AFTER submit
   because the upload/add mutations require the new `requestId`.
   ---------------------------------------------------------------------------- */

/**
 * Creates a service request. `input` is `SubmitServiceRequestInput!` (NOTE: the
 * live GraphQL type is `SubmitServiceRequestInput`, NOT `SubmitRequestInput`).
 * `formResponsesJson` is a JSON-stringified `{ [formFieldKey]: value }` map.
 * `ownerType` is the enum `ServiceRequestOwnerType` (COMMUNITY for embassies).
 */
export const SUBMIT_SERVICE_REQUEST = gql`
  mutation SubmitServiceRequest($input: SubmitServiceRequestInput!) {
    submitServiceRequest(input: $input) {
      id
      requestNumber
      status
      feeAmountMinor
      feeCurrency
      paymentIntentId
      paymentStatus
      escrowId
    }
  }
`;

/**
 * Step 1 of the document upload: get a signed PUT url for one file. `requestId`
 * is `ID!`, `contentType`/`fileName` are `String!`, `formFieldKey` is optional
 * `String` (ties the doc to a specific FILE_UPLOAD form field). Returns
 * `{ documentId, uploadUrl, storageKey, expiresAt }`. PUT the raw file bytes to
 * `uploadUrl`, then call ADD_SERVICE_REQUEST_DOCUMENT with the `documentId`.
 */
export const REQUEST_SERVICE_REQUEST_DOC_UPLOAD_URL = gql`
  mutation RequestServiceRequestDocumentUploadUrl(
    $requestId: ID!
    $contentType: String!
    $fileName: String!
    $formFieldKey: String
  ) {
    requestServiceRequestDocumentUploadUrl(
      requestId: $requestId
      contentType: $contentType
      fileName: $fileName
      formFieldKey: $formFieldKey
    ) {
      documentId
      uploadUrl
      storageKey
      expiresAt
    }
  }
`;

/**
 * Step 2 of the document upload: register the uploaded blob against the request.
 * `requestId`/`documentId` are `ID!`. The live `ServiceRequestDocument` type
 * exposes ONLY `{ id, fileName, sizeBytes, storageKey, formFieldKey }` — it has
 * NO `status`, `contentType`, or `createdAt` field (verified).
 */
export const ADD_SERVICE_REQUEST_DOCUMENT = gql`
  mutation AddServiceRequestDocument($requestId: ID!, $documentId: ID!) {
    addServiceRequestDocument(requestId: $requestId, documentId: $documentId) {
      id
      fileName
      sizeBytes
      storageKey
      formFieldKey
    }
  }
`;

export interface SubmitServiceRequestResult {
  id: string;
  requestNumber: string;
  status: string;
  feeAmountMinor?: number | null;
  feeCurrency?: string | null;
  paymentIntentId?: string | null;
  paymentStatus?: string | null;
  escrowId?: string | null;
}

export interface SubmitServiceRequestResponse {
  submitServiceRequest: SubmitServiceRequestResult;
}

export interface ServiceRequestDocUploadUrl {
  documentId: string;
  uploadUrl: string;
  storageKey: string;
  expiresAt?: string | null;
}

export interface RequestDocUploadUrlResponse {
  requestServiceRequestDocumentUploadUrl: ServiceRequestDocUploadUrl;
}

export interface AddServiceRequestDocumentResponse {
  addServiceRequestDocument: {
    id: string;
    fileName: string;
    sizeBytes?: number | null;
    storageKey: string;
    formFieldKey?: string | null;
  };
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
