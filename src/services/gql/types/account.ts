/**
 * @fileoverview Types for the GDPR self-service account operations.
 * @module services/gql/types/account
 */

/** Lifecycle state held by auth-service (the identity source of truth). */
export type AccountDeletionStatusValue =
  | "ACTIVE"
  | "PENDING_DELETION"
  | "PURGING"
  | "ERASED";

/** Async export job state. `signedUrl` is only set once READY. */
export type DataExportStatus = "PENDING" | "RUNNING" | "READY" | "FAILED";

export interface AccountDeletionResult {
  success: boolean;
  message?: string | null;
  status?: AccountDeletionStatusValue | null;
  /** ISO-8601. */
  scheduledAt?: string | null;
  /** ISO-8601 — the point after which deletion becomes irreversible. */
  purgeAfter?: string | null;
}

export interface AccountDeletionStatus {
  status?: AccountDeletionStatusValue | null;
  scheduledAt?: string | null;
  purgeAfter?: string | null;
  /** Days left in the grace window; 0 when not PENDING_DELETION. */
  daysRemaining: number;
}

export interface DataExportJobResult {
  success: boolean;
  jobId?: string | null;
  status?: DataExportStatus | null;
  message?: string | null;
}

export interface DataExportJob {
  id: string;
  status: DataExportStatus;
  /** Time-limited v4 signed GCS URL; only present when status is READY. */
  signedUrl?: string | null;
  error?: string | null;
  /** JSON-encoded coverage map (which sections are in the bundle). */
  sectionsIncludedJson?: string | null;
  createdAt?: string | null;
  completedAt?: string | null;
}

export interface RequestAccountDeletionData {
  requestAccountDeletion: AccountDeletionResult;
}
export interface CancelAccountDeletionData {
  cancelAccountDeletion: AccountDeletionResult;
}
export interface MyAccountDeletionStatusData {
  myAccountDeletionStatus: AccountDeletionStatus;
}
export interface RequestMyDataExportData {
  requestMyDataExport: DataExportJobResult;
}
export interface GetMyDataExportData {
  getMyDataExport: DataExportJob | null;
}
