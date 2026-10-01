"use client";

/**
 * @fileoverview Settings → Privacy → "Show me in search results".
 *
 * The switch shows the SERVER's value and nothing else (same rules as the
 * two-factor switch):
 *  - while the setting loads it is disabled and unchecked, with "Checking…";
 *  - if it cannot be loaded it stays disabled and unchecked, with a translated
 *    error and Retry — never a guess in either direction;
 *  - toggling never flips it optimistically: the switch is disabled while the
 *    change is saved, and only moves once the server's answer is re-read.
 *
 * When off, the person is left out of people search, people pickers and
 * "people you may know"; a direct link to their profile still opens.
 * Refusals RESOLVE under errorPolicy 'all' (`result.error`, `data: null`), so
 * the outcome is read from the payload, never from the absence of a throw.
 *
 * @module components/settings/SearchVisibilitySection
 */

import { useId, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useTranslations } from "next-intl";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import {
  MY_SEARCH_VISIBILITY,
  UPDATE_SEARCH_VISIBILITY,
  type MySearchVisibilityData,
  type UpdateSearchVisibilityData,
  type UpdateSearchVisibilityVariables,
} from "@/services/gql/searchVisibility";

/** This section shows its own translated messages; skip the global toast. */
const SILENT = { context: { silentErrors: true } } as const;

export default function SearchVisibilitySection() {
  const t = useTranslations("settings.privacy.searchVisibility");
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descId = `${baseId}-desc`;

  const { data, loading, error, refetch } = useQuery<MySearchVisibilityData>(MY_SEARCH_VISIBILITY, {
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
    ...SILENT,
  });
  const [updateMutation] = useMutation<UpdateSearchVisibilityData, UpdateSearchVisibilityVariables>(
    UPDATE_SEARCH_VISIBILITY,
    SILENT,
  );
  const [saving, setSaving] = useState(false);

  // Under errorPolicy 'all' a failed read can still carry stale data — an
  // error means "unknown", full stop.
  const value = error ? undefined : data?.mySearchVisibility?.searchable;
  const known = !loading && typeof value === "boolean";
  const searchable = known && value === true;

  const change = async (next: boolean) => {
    if (!known || saving) return;
    setSaving(true);
    try {
      const result = await updateMutation({ variables: { searchable: next } });
      if (result.error || typeof result.data?.updateSearchVisibility?.searchable !== "boolean") {
        toast.error(t("saveFailed"));
      } else {
        toast.success(next ? t("savedOn") : t("savedOff"));
      }
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      // Show only what the server now says, whatever happened.
      try {
        await refetch();
      } catch {
        // The row shows its own error + Retry.
      }
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4" data-testid="search-visibility-row">
      <div className="min-w-0">
        <p id={titleId} className="font-medium text-foreground">
          {t("title")}
        </p>
        <p id={descId} className="text-sm text-muted-foreground">
          {t("description")}
        </p>
        {loading && !saving ? (
          <p
            className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"
            data-testid="search-visibility-status"
            aria-live="polite"
          >
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            {t("checking")}
          </p>
        ) : !known && !saving ? (
          <p
            className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-danger"
            role="alert"
            data-testid="search-visibility-error"
          >
            {t("loadError")}
            <button
              type="button"
              className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
              onClick={() => {
                refetch().catch(() => undefined);
              }}
              data-testid="search-visibility-retry"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              {t("retry")}
            </button>
          </p>
        ) : null}
      </div>

      <Switch
        aria-labelledby={titleId}
        aria-describedby={descId}
        aria-busy={loading || saving}
        checked={searchable}
        disabled={!known || saving}
        onCheckedChange={(checked) => void change(checked)}
        data-testid="search-visibility-switch"
      />
    </div>
  );
}
