"use client";

/**
 * @fileoverview Settings → Notifications (email / SMS / push).
 *
 * The switches show the SERVER's values and nothing else (same rules as the
 * search-visibility and two-factor switches):
 *  - while the settings load they are disabled and unchecked, with "Checking…";
 *  - if they cannot be loaded they stay disabled and unchecked, with a
 *    translated error and Retry — never a guess in either direction;
 *  - toggling never flips a switch optimistically: the switches are disabled
 *    while the change is saved, and only move once the server's answer is
 *    re-read.
 *
 * These switches govern OPTIONAL notifications (activity, messages, reminders,
 * digests); security, account, payment and legal messages are always sent, and
 * the section says so. Every email's "Notification preferences" footer link
 * opens /settings, where this section sits near the top (anchor:
 * /settings#notifications).
 *
 * Refusals RESOLVE under errorPolicy 'all' (`result.error`, `data: null`), so
 * the outcome is read from the payload, never from the absence of a throw.
 *
 * @module components/settings/NotificationPreferencesSection
 */

import { useId, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useTranslations } from "next-intl";
import { Bell, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import {
  MY_NOTIFICATION_PREFERENCES,
  UPDATE_MY_NOTIFICATION_PREFERENCES,
  type MyNotificationPreferencesData,
  type NotificationChannel,
  type UpdateMyNotificationPreferencesData,
  type UpdateMyNotificationPreferencesVariables,
} from "@/services/gql/notificationPreferences";

/** This section shows its own translated messages; skip the global toast. */
const SILENT = { context: { silentErrors: true } } as const;

const CHANNELS: readonly NotificationChannel[] = ["email", "sms", "push"];

export default function NotificationPreferencesSection() {
  const t = useTranslations("settings.notifications");
  const baseId = useId();

  const { data, loading, error, refetch } = useQuery<MyNotificationPreferencesData>(
    MY_NOTIFICATION_PREFERENCES,
    { fetchPolicy: "network-only", notifyOnNetworkStatusChange: true, ...SILENT },
  );
  const [updateMutation] = useMutation<
    UpdateMyNotificationPreferencesData,
    UpdateMyNotificationPreferencesVariables
  >(UPDATE_MY_NOTIFICATION_PREFERENCES, SILENT);
  const [saving, setSaving] = useState<NotificationChannel | null>(null);

  // Under errorPolicy 'all' a failed read can still carry stale data — an
  // error means "unknown", full stop.
  const prefs = error ? undefined : data?.myNotificationPreferences;
  const known =
    !loading &&
    !!prefs &&
    CHANNELS.every((channel) => typeof prefs[channel] === "boolean");

  const change = async (channel: NotificationChannel, next: boolean) => {
    if (!known || saving) return;
    setSaving(channel);
    try {
      const result = await updateMutation({ variables: { input: { [channel]: next } } });
      const saved = result.data?.updateMyNotificationPreferences;
      if (result.error || !saved || saved[channel] !== next) {
        toast.error(t("saveFailed"));
      } else {
        toast.success(t("saved"));
      }
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      // Show only what the server now says, whatever happened.
      try {
        await refetch();
      } catch {
        // The section shows its own error + Retry.
      }
      setSaving(null);
    }
  };

  return (
    <section
      id="notifications"
      aria-labelledby={`${baseId}-heading`}
      className="scroll-mt-24 bg-surface-default border border-border-subtle rounded-lg p-6 space-y-4 shadow-sm"
      data-testid="notification-preferences-section"
    >
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-text-primary" aria-hidden="true" />
        <h2 id={`${baseId}-heading`} className="text-lg font-semibold text-foreground">
          {t("title")}
        </h2>
      </div>

      <p className="text-sm text-muted-foreground" data-testid="notification-preferences-note">
        {t("essentialNote")}
      </p>

      {loading && !saving ? (
        <p
          className="flex items-center gap-1 text-sm text-muted-foreground"
          data-testid="notification-preferences-status"
          aria-live="polite"
        >
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          {t("checking")}
        </p>
      ) : !known && !saving ? (
        <p
          className="flex flex-wrap items-center gap-2 text-sm text-text-danger"
          role="alert"
          data-testid="notification-preferences-error"
        >
          {t("loadError")}
          <button
            type="button"
            className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
            onClick={() => {
              refetch().catch(() => undefined);
            }}
            data-testid="notification-preferences-retry"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            {t("retry")}
          </button>
        </p>
      ) : null}

      <div className="space-y-4">
        {CHANNELS.map((channel) => {
          const titleId = `${baseId}-${channel}-title`;
          const descId = `${baseId}-${channel}-desc`;
          return (
            <div key={channel} className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p id={titleId} className="font-medium text-foreground">
                  {t(`${channel}.title`)}
                </p>
                <p id={descId} className="text-sm text-muted-foreground">
                  {t(`${channel}.description`)}
                </p>
              </div>
              <Switch
                aria-labelledby={titleId}
                aria-describedby={descId}
                aria-busy={loading || saving === channel}
                checked={known && prefs?.[channel] === true}
                disabled={!known || saving !== null}
                onCheckedChange={(checked) => void change(channel, checked)}
                data-testid={`notification-${channel}-switch`}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
