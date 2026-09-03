/**
 * Issue Reporter configuration.
 *
 * The report form is NATIVE (matches the app theme + language) but submits
 * directly to the "DiaspoPlug – Report an Issue" Google Form's `formResponse`
 * endpoint — Google stores every submission in the linked Sheet. No GraphQL
 * mutation is involved.
 *
 * The defaults below are pulled from that live form. NOTE: Google accepts
 * submissions at the PUBLISHED id (`/forms/d/e/<PUBLISHED_ID>/formResponse`),
 * which is different from the edit/doc id in the form's `/edit` URL. If the form
 * is ever rebuilt, refresh the published id, the three `entry.<id>` names, and
 * the option list below (all overridable via env for a quick swap).
 */

// Published response id (from the form's action, NOT the /edit doc id).
const FORM_ID =
  process.env.NEXT_PUBLIC_ISSUE_FORM_ID ??
  "1FAIpQLSdu6PrcmI8kn_wni1Up4qclB-Nu0Xn-CKMU7uAE8ezr62LtQg";

/** Google's response endpoint for the configured form. */
export const ISSUE_FORM_ACTION = `https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`;

/** Our field keys -> the Google Form `entry.<id>` names (from the live form). */
export const ISSUE_FORM_FIELDS = {
  email: process.env.NEXT_PUBLIC_ISSUE_FORM_ENTRY_EMAIL ?? "entry.1451048236",
  issue: process.env.NEXT_PUBLIC_ISSUE_FORM_ENTRY_ISSUE ?? "entry.1640192907",
  description:
    process.env.NEXT_PUBLIC_ISSUE_FORM_ENTRY_DESCRIPTION ?? "entry.1843089194",
} as const;

/**
 * The exact dropdown options from the form's "What issue are you experiencing?"
 * question. Google rejects any value that is not an exact match, so these
 * strings must stay verbatim in sync with the form.
 */
export const ISSUE_OPTIONS = [
  "Login",
  "Registration / Sign Up",
  "Forgot Password",
  "Email Verification",
  "OTP Verification",
  "User Profile",
  "Edit Profile",
  "Upload Profile Photo",
  "Search Users",
  "Friend Request",
  "Accept Friend Request",
  "Messaging / Chat",
  "Notifications",
  "Feed / Home Timeline",
  "Create a Post",
  "Edit a Post",
  "Delete a Post",
  "Like a Post",
  "Comment on a Post",
  "Share a Post",
  "Join a Community",
  "Leave a Community",
  "Community Feed",
  "Community Customer Support",
  "Apply for a Service",
  "Events",
  "Marketplace",
  "Payments",
  "Document Upload",
  "Account Verification (KYC)",
  "App Performance (Slow)",
  "App Crash",
  "Other",
] as const;

/**
 * Env fallback for the on/off flag. The admin platform setting
 * (`issue_reporter_enabled`, read in `useIssueReporterConfig`) takes precedence;
 * this is only used before that resolves or if it is unset. Defaults to off.
 */
export const ISSUE_REPORTER_ENV_ENABLED =
  process.env.NEXT_PUBLIC_ISSUE_REPORTER_ENABLED === "true";
