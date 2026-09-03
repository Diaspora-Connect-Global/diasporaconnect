import { gql } from "@apollo/client";

/**
 * @fileoverview GDPR self-service account operations (api-gateway `AccountModule`
 * + `DataExportModule`).
 *
 * These are the REAL account-lifecycle operations. Do not confuse them with
 * `ERASE_MY_ACCOUNT_DATA` in `postsFeed.ts`, which only wipes the caller's
 * recommendation-engine footprint and leaves the account itself intact.
 *
 * @module services/gql/account
 */

/**
 * Move the account into the reversible 30-day grace window.
 *
 * Sessions are revoked server-side, so the client must sign the user out after
 * this succeeds. Reversible via {@link CANCEL_ACCOUNT_DELETION} — or simply by
 * logging back in, which auto-cancels.
 */
export const REQUEST_ACCOUNT_DELETION = gql`
  mutation RequestAccountDeletion($reason: String) {
    requestAccountDeletion(reason: $reason) {
      success
      message
      status
      scheduledAt
      purgeAfter
    }
  }
`;

/** Undo a pending deletion and restore the account to ACTIVE. */
export const CANCEL_ACCOUNT_DELETION = gql`
  mutation CancelAccountDeletion {
    cancelAccountDeletion {
      success
      message
      status
      scheduledAt
      purgeAfter
    }
  }
`;

/**
 * Current deletion state. `daysRemaining` is 0 unless status is
 * PENDING_DELETION, so it must not be rendered as a countdown on its own.
 */
export const MY_ACCOUNT_DELETION_STATUS = gql`
  query MyAccountDeletionStatus {
    myAccountDeletionStatus {
      status
      scheduledAt
      purgeAfter
      daysRemaining
    }
  }
`;

/**
 * Kick off an async GDPR Art. 15 export. Returns immediately with a `jobId`;
 * poll {@link GET_MY_DATA_EXPORT} until status is READY (or FAILED).
 */
export const REQUEST_MY_DATA_EXPORT = gql`
  mutation RequestMyDataExport {
    requestMyDataExport {
      success
      jobId
      status
      message
    }
  }
`;

/** Poll an export job. `signedUrl` is populated only when status is READY. */
export const GET_MY_DATA_EXPORT = gql`
  query GetMyDataExport($jobId: ID!) {
    getMyDataExport(jobId: $jobId) {
      id
      status
      signedUrl
      error
      sectionsIncludedJson
      createdAt
      completedAt
    }
  }
`;
