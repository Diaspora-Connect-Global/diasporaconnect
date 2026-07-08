import { ISSUE_FORM_FIELDS } from "@/config/issueReporter";

export interface IssueReportPayload {
  description: string;
  category: string;
  /** Context captured automatically to make the report actionable. */
  email?: string;
  userId?: string;
  url?: string;
  meta?: string;
}

/**
 * Submits a report to the configured Google Form endpoint.
 *
 * Google's `formResponse` endpoint does not send CORS headers, so we POST with
 * `mode: "no-cors"`. The response is opaque — we cannot read a status — so a
 * resolved promise means "the request left the browser", which we treat as
 * success. A rejected promise means the network itself failed (offline, etc.).
 *
 * Only fields with a configured `entry.<id>` are included.
 */
export async function submitIssueReport(
  action: string,
  fields: typeof ISSUE_FORM_FIELDS,
  payload: IssueReportPayload
): Promise<void> {
  if (!action) {
    throw new Error("Issue reporter is not configured.");
  }

  const body = new FormData();
  const map: Array<[string, string | undefined]> = [
    [fields.description, payload.description],
    [fields.category, payload.category],
    [fields.email, payload.email],
    [fields.userId, payload.userId],
    [fields.url, payload.url],
    [fields.meta, payload.meta],
  ];

  for (const [entryId, value] of map) {
    if (entryId && value != null && value !== "") {
      body.append(entryId, value);
    }
  }

  await fetch(action, {
    method: "POST",
    mode: "no-cors",
    body,
  });
}
