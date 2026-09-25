"use client";

/**
 * @fileoverview Settings → Privacy → "AI chat summaries".
 *
 * Notice + the two per-user switches for the AI group-chat daily summaries:
 *  - "Include my messages in AI summaries": when off, the backend drops this
 *    user's messages (and name) before anything is sent to the AI provider.
 *  - "Show AI summaries in my group chats": when off, no digest notification
 *    is sent and group chats hide the digest cards for this user.
 *
 * Both persist server-side (user-service) — unlike the older local-only
 * toggles on this page. Anchor: `/settings#ai-summaries` (linked from the
 * digest card in group chats).
 *
 * @module components/settings/AiSummarySettings
 */

import { useId, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Switch } from "@/components/ui/switch";
import { useAiSummaryPreferences } from "@/hooks/useAiSummaryPreferences";
import type { AiSummaryPreferences } from "@/services/gql/aiSummaryPreferences";

/** DOM id of this block — the deep-link target (`/settings#ai-summaries`). */
export const AI_SUMMARY_SETTINGS_ANCHOR = "ai-summaries";

type Key = keyof AiSummaryPreferences;

export default function AiSummarySettings() {
  const t = useTranslations("settings.privacy.aiSummaries");
  const { prefs, loading, error, update } = useAiSummaryPreferences();
  // Optimistic value per switch while its save is in flight.
  const [pending, setPending] = useState<Partial<AiSummaryPreferences>>({});
  const baseId = useId();

  const unavailable = !prefs && !loading && !!error;

  const valueOf = (key: Key): boolean => pending[key] ?? prefs?.[key] ?? true;

  const toggle = async (key: Key, next: boolean) => {
    setPending((p) => ({ ...p, [key]: next }));
    try {
      await update({ [key]: next });
      toast.success(t("saved"));
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setPending((p) => {
        const rest = { ...p };
        delete rest[key];
        return rest;
      });
    }
  };

  const rows: Array<{ key: Key; title: string; description: string }> = [
    { key: "includeMyMessages", title: t("includeMyMessages.title"), description: t("includeMyMessages.description") },
    { key: "showSummaries", title: t("showSummaries.title"), description: t("showSummaries.description") },
  ];

  return (
    <section
      id={AI_SUMMARY_SETTINGS_ANCHOR}
      aria-labelledby={`${baseId}-heading`}
      className="scroll-mt-24 space-y-4 border-t border-border-subtle pt-4"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-text-primary" aria-hidden="true" />
        <h3 id={`${baseId}-heading`} className="font-semibold text-foreground">
          {t("title")}
        </h3>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground">
        <p>{t("notice.what")}</p>
        <p>{t("notice.provider")}</p>
        <p>{t("notice.control")}</p>
      </div>

      {unavailable && (
        <p role="alert" className="text-sm text-destructive">
          {t("loadFailed")}
        </p>
      )}

      {rows.map(({ key, title, description }) => {
        const switchId = `${baseId}-${key}`;
        const descId = `${switchId}-desc`;
        return (
          <div key={key} className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <label htmlFor={switchId} className="font-medium text-foreground cursor-pointer">
                {title}
              </label>
              <p id={descId} className="text-sm text-muted-foreground">
                {description}
              </p>
            </div>
            <Switch
              id={switchId}
              aria-describedby={descId}
              checked={valueOf(key)}
              disabled={loading || unavailable || pending[key] !== undefined}
              onCheckedChange={(checked) => void toggle(key, checked)}
              className="mt-1"
            />
          </div>
        );
      })}
    </section>
  );
}
