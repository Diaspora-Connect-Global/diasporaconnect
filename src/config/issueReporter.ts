/**
 * Issue Reporter configuration.
 *
 * The report form is a NATIVE form styled to match the app, but it submits
 * directly to a Google Form's `formResponse` endpoint — Google stores every
 * submission in the linked Google Sheet. No GraphQL mutation is involved.
 *
 * To wire a real Google Form:
 *   1. Create the Form and add fields (description, category, plus hidden
 *      context fields for email / userId / url / meta).
 *   2. Open "Get pre-filled link", fill dummy values, copy the link. Each field
 *      appears as `entry.<number>=<value>` — those are the ids below.
 *   3. The form action is: https://docs.google.com/forms/d/e/<FORM_ID>/formResponse
 *
 * All values come from env so the form can be swapped without a code change.
 */

const FORM_ID = process.env.NEXT_PUBLIC_ISSUE_FORM_ID ?? "";

/** Google's response endpoint for the configured form. Empty when unconfigured. */
export const ISSUE_FORM_ACTION = FORM_ID
  ? `https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`
  : "";

/**
 * Map of our field keys -> the Google Form `entry.<id>` names.
 * Only keys with a configured entry id are sent.
 */
export const ISSUE_FORM_FIELDS = {
  description: process.env.NEXT_PUBLIC_ISSUE_FORM_ENTRY_DESCRIPTION ?? "",
  category: process.env.NEXT_PUBLIC_ISSUE_FORM_ENTRY_CATEGORY ?? "",
  email: process.env.NEXT_PUBLIC_ISSUE_FORM_ENTRY_EMAIL ?? "",
  userId: process.env.NEXT_PUBLIC_ISSUE_FORM_ENTRY_USERID ?? "",
  url: process.env.NEXT_PUBLIC_ISSUE_FORM_ENTRY_URL ?? "",
  meta: process.env.NEXT_PUBLIC_ISSUE_FORM_ENTRY_META ?? "",
} as const;

/**
 * Env fallback for the on/off flag. The backend feature flag
 * (see `useIssueReporterConfig`) takes precedence when available; this is what
 * we fall back to before the flag resolves or if the backend has no opinion.
 * Defaults to disabled so nothing renders until deliberately turned on.
 */
export const ISSUE_REPORTER_ENV_ENABLED =
  process.env.NEXT_PUBLIC_ISSUE_REPORTER_ENABLED === "true";

/** True only when a form id and the description entry id are both present. */
export const ISSUE_REPORTER_CONFIGURED =
  Boolean(ISSUE_FORM_ACTION) && Boolean(ISSUE_FORM_FIELDS.description);

export type IssueCategory =
  | "bug"
  | "content"
  | "account"
  | "payment"
  | "other";
