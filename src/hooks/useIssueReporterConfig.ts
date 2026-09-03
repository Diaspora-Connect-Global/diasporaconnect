"use client";

import { useEffect, useState } from "react";
import { GRAPHQL_URL } from "@/lib/seoFetch";
import {
  ISSUE_FORM_ACTION,
  ISSUE_FORM_FIELDS,
  ISSUE_REPORTER_ENV_ENABLED,
} from "@/config/issueReporter";

export interface IssueReporterConfig {
  /** Whether the floating button should render. */
  enabled: boolean;
  /** Google Form response endpoint to POST to. */
  action: string;
  /** field-key -> Google `entry.<id>` map. */
  fields: typeof ISSUE_FORM_FIELDS;
}

/** Admin platform-setting key that toggles the button live. */
const KEY_ENABLED = "issue_reporter_enabled";

/**
 * Reuses the gateway's existing public settings query `getPublicSeoSettings`,
 * whose whitelist includes `issue_reporter_enabled` alongside the SEO tokens.
 * If the gateway is unreachable we fall back to the env flag — graceful, no errors.
 */
const PUBLIC_FLAG_QUERY = `
  query IssueReporterFlag {
    getPublicSeoSettings {
      key
      value
    }
  }
`;

interface PublicSetting {
  key: string;
  value: string;
}

/**
 * Resolves whether the issue reporter button should show.
 *
 * Precedence:
 *   1. Admin platform setting `issue_reporter_enabled` (live toggle).
 *   2. Env fallback (NEXT_PUBLIC_ISSUE_REPORTER_ENABLED) — before/if it fails.
 *
 * The form endpoint + fields are static config (baked from the live Google Form),
 * so the button is ready to submit the moment the admin flips it on.
 */
export function useIssueReporterConfig(): IssueReporterConfig {
  const [remoteEnabled, setRemoteEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(GRAPHQL_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: PUBLIC_FLAG_QUERY }),
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          data?: { getPublicSeoSettings?: PublicSetting[] };
        };
        const list = json?.data?.getPublicSeoSettings;
        if (!list || cancelled) return;

        const hit = list.find((s) => s.key === KEY_ENABLED);
        if (hit) setRemoteEnabled(hit.value === "true");
      } catch {
        // Public query unavailable — silently fall back to env.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const flagEnabled =
    remoteEnabled != null ? remoteEnabled : ISSUE_REPORTER_ENV_ENABLED;

  return {
    enabled: flagEnabled && Boolean(ISSUE_FORM_ACTION),
    action: ISSUE_FORM_ACTION,
    fields: ISSUE_FORM_FIELDS,
  };
}
