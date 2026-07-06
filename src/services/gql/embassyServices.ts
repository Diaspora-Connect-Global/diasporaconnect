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
      ownerType
      ownerEntityId
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
  ownerType?: string | null;
  ownerEntityId?: string | null;
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

/* ----------------------------------------------------------------------------
   SUPPORT CASES — reporter-facing case submit + tracking (verified live).

   A user submits a case (`submitCase`), lists their own cases (`myCases`),
   opens one (`supportCase` + `caseStatusHistory` for the timeline + `caseEvidence`
   for attachments), can attach evidence (request URL → PUT → addCaseEvidence),
   and may withdraw (`cancelCase`).

   Enums (live):
     SupportCaseStatus = SUBMITTED | ASSIGNED | INVESTIGATING | RESOLVED |
                         CLOSED | REOPENED | REJECTED | CANCELLED
     SupportPriority   = LOW | MEDIUM | HIGH | URGENT
     SupportOwnerType  includes COMMUNITY

   NOTE: `supportCase.statusHistory` is empty for reporters — ALWAYS use
   `caseStatusHistory(caseId)` for the timeline.
   ---------------------------------------------------------------------------- */

/**
 * Creates a support case. `input` is `SubmitCaseInput!`:
 *   { ownerType: SupportOwnerType! (=COMMUNITY), ownerEntityId: String,
 *     caseTypeId: String!, title: String!, description: String,
 *     priority: SupportPriority }
 * Evidence (optional) is uploaded AFTER submit via the new case id.
 */
export const SUBMIT_CASE = gql`
  mutation SubmitCase($input: SubmitCaseInput!) {
    submitCase(input: $input) {
      id
      caseNumber
      status
      priority
      caseTypeId
      title
    }
  }
`;

/** The current user's own cases (newest-first by the backend). `category` is a
 *  machine code (e.g. "consular_assist") — humanize for display. */
export const MY_CASES = gql`
  query MyCases($status: SupportCaseStatus, $limit: Int, $offset: Int) {
    myCases(status: $status, limit: $limit, offset: $offset) {
      id
      caseNumber
      category
      title
      priority
      status
      submittedAt
      updatedAt
    }
  }
`;

/** Single case by id (reporter-readable). `statusHistory` is empty for reporters
 *  — use CASE_STATUS_HISTORY for the timeline. */
export const SUPPORT_CASE = gql`
  query SupportCase($id: ID!) {
    supportCase(id: $id) {
      id
      caseNumber
      title
      description
      status
      priority
      caseTypeId
      resolutionSummary
      submittedAt
      updatedAt
    }
  }
`;

/** Reporter-readable status timeline for a case (the canonical timeline source). */
export const CASE_STATUS_HISTORY = gql`
  query CaseStatusHistory($caseId: ID!) {
    caseStatusHistory(caseId: $caseId) {
      id
      fromStatus
      toStatus
      reason
      createdAt
    }
  }
`;

/** Evidence attached to a case. `readUrl` is a fresh signed download URL; the
 *  caller should prefer `confirmed === true` rows. `kind` ∈ PDF|IMAGE|OTHER. */
export const CASE_EVIDENCE = gql`
  query CaseEvidence($caseId: ID!) {
    caseEvidence(caseId: $caseId) {
      id
      fileName
      kind
      readUrl
      confirmed
      uploadedAt
    }
  }
`;

/**
 * Step 1 of the evidence upload: get a signed PUT url for one file. PUT the raw
 * bytes to `uploadUrl`, then call ADD_CASE_EVIDENCE with the returned
 * `evidenceId`.
 */
export const REQUEST_CASE_EVIDENCE_UPLOAD_URL = gql`
  mutation RequestCaseEvidenceUploadUrl(
    $caseId: ID!
    $contentType: String!
    $fileName: String!
  ) {
    requestCaseEvidenceUploadUrl(
      caseId: $caseId
      contentType: $contentType
      fileName: $fileName
    ) {
      evidenceId
      uploadUrl
      readUrl
      storageKey
      expiresAt
    }
  }
`;

/** Step 2 of the evidence upload: register the uploaded blob against the case. */
export const ADD_CASE_EVIDENCE = gql`
  mutation AddCaseEvidence($caseId: ID!, $evidenceId: ID!, $sizeBytes: Int) {
    addCaseEvidence(caseId: $caseId, evidenceId: $evidenceId, sizeBytes: $sizeBytes) {
      id
      fileName
      kind
      confirmed
    }
  }
`;

/** Withdraw a case (reporter). Allowed while not already terminal. */
export const CANCEL_CASE = gql`
  mutation CancelCase($caseId: ID!, $reason: String!) {
    cancelCase(caseId: $caseId, reason: $reason) {
      id
      status
    }
  }
`;

export type SupportCaseStatus =
  | 'SUBMITTED'
  | 'ASSIGNED'
  | 'INVESTIGATING'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED'
  | 'REJECTED'
  | 'CANCELLED';

export type SupportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

/** `SubmitCaseInput!` shape for SUBMIT_CASE. `ownerType` is COMMUNITY for embassy
 *  communities and ASSOCIATION for associations. */
export interface SubmitCaseInput {
  ownerType: 'COMMUNITY' | 'ASSOCIATION';
  ownerEntityId?: string | null;
  caseTypeId: string;
  title: string;
  description?: string | null;
  priority?: SupportPriority;
}

/** The new-case result returned by submitCase. */
export interface SubmitCaseResult {
  id: string;
  caseNumber: string;
  status: string;
  priority?: string | null;
  caseTypeId: string;
  title: string;
}

export interface SubmitCaseResponse {
  submitCase: SubmitCaseResult;
}

/** One row in the My Cases list. `category` is a machine code (humanize it). */
export interface SupportCaseSummary {
  id: string;
  caseNumber: string;
  category?: string | null;
  title: string;
  priority?: string | null;
  status: string;
  submittedAt?: string | null;
  updatedAt?: string | null;
}

export interface MyCasesResponse {
  myCases: SupportCaseSummary[];
}

/** Single-case shape selected by SUPPORT_CASE (reporter-readable). */
export interface SupportCaseDetail {
  id: string;
  caseNumber: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  caseTypeId?: string | null;
  resolutionSummary?: string | null;
  submittedAt?: string | null;
  updatedAt?: string | null;
}

export interface SupportCaseResponse {
  supportCase: SupportCaseDetail | null;
}

/** One entry of the reporter-visible case status timeline. */
export interface CaseStatusHistoryEntry {
  id: string;
  fromStatus?: string | null;
  toStatus: string;
  reason?: string | null;
  createdAt: string;
}

export interface CaseStatusHistoryResponse {
  caseStatusHistory: CaseStatusHistoryEntry[];
}

/** One evidence row attached to a case (with a fresh signed `readUrl`). */
export interface CaseEvidenceItem {
  id: string;
  fileName: string;
  kind?: string | null;
  readUrl?: string | null;
  confirmed?: boolean | null;
  uploadedAt?: string | null;
}

export interface CaseEvidenceResponse {
  caseEvidence: CaseEvidenceItem[];
}

export interface CaseEvidenceUploadUrl {
  evidenceId: string;
  uploadUrl: string;
  readUrl?: string | null;
  storageKey: string;
  expiresAt?: string | null;
}

export interface RequestCaseEvidenceUploadUrlResponse {
  requestCaseEvidenceUploadUrl: CaseEvidenceUploadUrl;
}

export interface AddCaseEvidenceResponse {
  addCaseEvidence: {
    id: string;
    fileName: string;
    kind?: string | null;
    confirmed?: boolean | null;
  };
}

export interface CancelCaseResponse {
  cancelCase: {
    id: string;
    status: string;
  };
}

/* ============================================================================
   TRACK-REQUESTS detail (via api-gateway GraphQL)

   The "Track Requests" detail view is fed by three queries: the request itself
   (`serviceRequest`), its confirmed documents (`serviceRequestDocuments`), and
   the owner-scoped type list (SERVICE_REQUEST_TYPES_DETAIL above, to resolve the
   type displayName + the formFields labels for the submitted-info section).

   All shapes below were verified live against api.diaspoplug.net AS THE
   REQUESTER. Notably `statusHistory` IS visible to the requester and is the
   primary timeline source; `formResponsesJson` is a JSON STRING (may be "{}").
   ============================================================================ */

/**
 * Single service request by id, scoped to the requester. `statusHistory` is the
 * canonical timeline (visible to the requester — verified) and we fall back to
 * the `*At` milestone timestamps only when it is empty. `formResponsesJson` is a
 * JSON-stringified `{ [formFieldKey]: value }` map ("{}" when none). Status enum:
 * SUBMITTED | UNDER_REVIEW | PENDING_INFO | APPROVED | REJECTED | COMPLETED |
 * CANCELLED.
 */
export const SERVICE_REQUEST = gql`
  query ServiceRequest($id: ID!) {
    serviceRequest(id: $id) {
      id
      requestNumber
      status
      requestTypeId
      category
      formResponsesJson
      feeAmountMinor
      feeCurrency
      paymentStatus
      paymentIntentId
      decisionReason
      submittedAt
      reviewStartedAt
      decidedAt
      completedAt
      createdAt
      updatedAt
      statusHistory {
        id
        fromStatus
        toStatus
        actorUserId
        reason
        createdAt
      }
    }
  }
`;

/**
 * Confirmed documents attached to a request. The caller MUST filter to
 * `confirmed === true` (unconfirmed rows are abandoned uploads). `readUrl` is a
 * fresh signed download URL. `kind` ∈ PDF | IMAGE | CERTIFICATE | OTHER.
 */
export const SERVICE_REQUEST_DOCUMENTS = gql`
  query ServiceRequestDocuments($requestId: ID!) {
    serviceRequestDocuments(requestId: $requestId) {
      id
      fileName
      sizeBytes
      mimeType
      kind
      readUrl
      uploadedAt
      confirmed
      formFieldKey
    }
  }
`;

/** Cancel a request (allowed while SUBMITTED / UNDER_REVIEW / PENDING_INFO). */
export const CANCEL_SERVICE_REQUEST = gql`
  mutation CancelServiceRequest($requestId: ID!, $reason: String!) {
    cancelServiceRequest(requestId: $requestId, reason: $reason) {
      id
      status
      updatedAt
    }
  }
`;

/**
 * Supply additional information for a PENDING_INFO request. `formResponsesJson`
 * is the (optional) JSON-stringified `{ [formFieldKey]: value }` map of the
 * supplied answers. Any new documents are uploaded separately via the standard
 * requestDocUploadUrl → PUT → addServiceRequestDocument flow.
 */
export const SUPPLY_SERVICE_REQUEST_INFO = gql`
  mutation SupplyServiceRequestInfo($requestId: ID!, $formResponsesJson: String) {
    supplyServiceRequestInfo(requestId: $requestId, formResponsesJson: $formResponsesJson) {
      id
      status
      updatedAt
    }
  }
`;

/**
 * Re-create the payment intent for an unpaid/failed request. Returns the new
 * paymentIntentId + paymentStatus (seeded services are free, so this is kept
 * defensive — see the detail view's payment section).
 */
export const RETRY_SERVICE_REQUEST_PAYMENT = gql`
  mutation RetryServiceRequestPayment($requestId: ID!) {
    retryServiceRequestPayment(requestId: $requestId) {
      id
      status
      paymentStatus
      paymentIntentId
    }
  }
`;

/** One entry of the request status timeline (visible to the requester). */
export interface ServiceRequestStatusHistoryEntry {
  id: string;
  fromStatus?: string | null;
  toStatus: string;
  actorUserId?: string | null;
  reason?: string | null;
  createdAt: string;
}

/** Full single-request shape selected by SERVICE_REQUEST. */
export interface ServiceRequestDetail {
  id: string;
  requestNumber: string;
  status: string;
  requestTypeId: string;
  category?: string | null;
  formResponsesJson?: string | null;
  feeAmountMinor?: number | null;
  feeCurrency?: string | null;
  paymentStatus?: string | null;
  paymentIntentId?: string | null;
  decisionReason?: string | null;
  submittedAt?: string | null;
  reviewStartedAt?: string | null;
  decidedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  statusHistory?: ServiceRequestStatusHistoryEntry[] | null;
}

export interface ServiceRequestResponse {
  serviceRequest: ServiceRequestDetail | null;
}

/** A confirmed document row (live `ServiceRequestDocument` w/ readUrl). */
export interface ServiceRequestDocument {
  id: string;
  fileName: string;
  sizeBytes?: number | null;
  mimeType?: string | null;
  kind?: string | null;
  readUrl?: string | null;
  uploadedAt?: string | null;
  confirmed?: boolean | null;
  formFieldKey?: string | null;
}

export interface ServiceRequestDocumentsResponse {
  serviceRequestDocuments: ServiceRequestDocument[];
}

/** Common `{ id, status, updatedAt }` mutation result (cancel / supply info). */
export interface ServiceRequestStatusMutationResult {
  id: string;
  status: string;
  updatedAt?: string | null;
}

export interface CancelServiceRequestResponse {
  cancelServiceRequest: ServiceRequestStatusMutationResult;
}

export interface SupplyServiceRequestInfoResponse {
  supplyServiceRequestInfo: ServiceRequestStatusMutationResult;
}

export interface RetryServiceRequestPaymentResponse {
  retryServiceRequestPayment: {
    id: string;
    status: string;
    paymentStatus?: string | null;
    paymentIntentId?: string | null;
  };
}
