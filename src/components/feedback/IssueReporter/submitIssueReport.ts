/**
 * Submits a report to the configured Google Form endpoint.
 *
 * Google's `formResponse` endpoint sends no CORS headers, so we POST with
 * `mode: "no-cors"`. The response is opaque — we cannot read a status — so a
 * resolved promise means "the request left the browser", which we treat as
 * success. A rejected promise means the network itself failed.
 *
 * `entries` maps Google `entry.<id>` names to values; empty values are skipped.
 */
export async function submitIssueReport(
  action: string,
  entries: Record<string, string>
): Promise<void> {
  if (!action) {
    throw new Error("Issue reporter is not configured.");
  }

  const body = new FormData();
  for (const [entryId, value] of Object.entries(entries)) {
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
