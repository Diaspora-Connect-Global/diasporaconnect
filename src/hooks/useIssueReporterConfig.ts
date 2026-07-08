"use client";

import { useEffect, useState } from "react";
import { GRAPHQL_URL } from "@/lib/seoFetch";
import {
  ISSUE_FORM_ACTION,
  ISSUE_FORM_FIELDS,
  ISSUE_REPORTER_CONFIGURED,
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

/**
 * Platform-setting keys written by the admin hub (System Settings) and read here
 * through the public gateway — the same admin-writes / public-reads mechanism
 * proven by the SEO verification tokens (`getPublicSeoSettings`).
 */
const KEY_ENABLED = "issue_reporter_enabled";
const KEY_FORM_ID = "issue_reporter_form_id";

/**
 * Reuses the gateway's existing public settings query `getPublicSeoSettings`,
 * whose hard-coded whitelist now includes the issue-reporter keys alongside the
 * SEO tokens. If the gateway hasn't been redeployed yet, the keys simply won't
 * be present and we fall back to the env flag — graceful, no errors.
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
 * Resolves whether the issue reporter is on, and where it submits.
 *
 * Precedence for on/off:
 *   1. Admin platform setting (live toggle) — when the public query resolves.
 *   2. Env fallback (NEXT_PUBLIC_ISSUE_REPORTER_ENABLED) — before/if it fails.
 *
 * The button never renders unless a Google Form is actually configured
 * (form id + description entry id), so a misconfigured deploy fails closed.
 */
export function useIssueReporterConfig(): IssueReporterConfig {
  const [remote, setRemote] = useState<{
    enabled?: boolean;
    formId?: string;
  } | null>(null);

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

        const map = Object.fromEntries(list.map((s) => [s.key, s.value]));
        setRemote({
          enabled: KEY_ENABLED in map ? map[KEY_ENABLED] === "true" : undefined,
          formId: map[KEY_FORM_ID] || undefined,
        });
      } catch {
        // Public query not available yet — silently fall back to env.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Admin wins when it has an opinion; otherwise fall back to the env default.
  const flagEnabled =
    remote?.enabled != null ? remote.enabled : ISSUE_REPORTER_ENV_ENABLED;

  // Admin may override the form id; rebuild the action if it does.
  const action = remote?.formId
    ? `https://docs.google.com/forms/d/e/${remote.formId}/formResponse`
    : ISSUE_FORM_ACTION;

  const configured = remote?.formId
    ? Boolean(ISSUE_FORM_FIELDS.description)
    : ISSUE_REPORTER_CONFIGURED;

  return {
    enabled: flagEnabled && configured,
    action,
    fields: ISSUE_FORM_FIELDS,
  };
}
