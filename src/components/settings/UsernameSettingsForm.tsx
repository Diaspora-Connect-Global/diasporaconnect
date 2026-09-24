"use client";

/**
 * @fileoverview The username editor, free of Apollo so it can be mounted in the
 * dev harness with fake transport functions. `UsernameSection` wires it to the
 * gateway (`usernameAvailability` / `updateUsername`).
 *
 * Behaviour contract:
 *  - Input is normalized (trim, strip one leading '@', lowercase) and validated
 *    client-side for instant feedback; the server stays authoritative.
 *  - A debounced availability check runs for every valid, changed input. Save is
 *    enabled ONLY when that check answered `available: true` for the exact
 *    current input — a stale answer for a previous keystroke never counts.
 *  - Save still handles every refusal code: two people can race for one name
 *    (TAKEN), and the 30-day window is enforced server-side (TOO_SOON).
 *  - RESERVED is shown as a neutral "isn't available" — never which rule hit.
 *
 * @module components/settings/UsernameSettingsForm
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AtSign, Check, Copy, Loader2, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { absoluteProfileUrl } from "@/lib/profileUrl";
import {
  USERNAME_CHANGE_INTERVAL_DAYS,
  USERNAME_MAX_LENGTH,
  validateUsername,
  type UsernameValidationError,
} from "@/lib/username";
import type {
  UsernameAvailability,
  UpdateUsernameResult,
} from "@/services/gql/types/profile";

export const USERNAME_CHECK_DEBOUNCE_MS = 400;

export interface UsernameSettingsFormProps {
  userId: string;
  currentUsername: string | null | undefined;
  /** ISO; when in the future the field is read-only. */
  nextChangeAt: string | null | undefined;
  checkAvailability: (username: string) => Promise<UsernameAvailability | null>;
  /** Resolves with the mutation payload, or null when the transport refused. */
  saveUsername: (username: string) => Promise<UpdateUsernameResult | null>;
  /** Called after a confirmed successful save. */
  onSaved?: (result: UpdateUsernameResult & { username: string }) => void | Promise<void>;
  /** Toast hooks (injected so the harness needs no Toaster). */
  notify?: {
    success: (message: string) => void;
    error: (message: string) => void;
  };
}

type CheckState =
  | { kind: "idle" }
  | { kind: "checking"; username: string }
  | { kind: "available"; username: string }
  | { kind: "unavailable"; username: string; reason: string }
  | { kind: "error"; username: string };

const VALIDATION_KEY: Record<Exclude<UsernameValidationError, "EMPTY">, string> = {
  TOO_SHORT: "errors.tooShort",
  TOO_LONG: "errors.tooLong",
  INVALID_CHARS: "errors.invalidChars",
  MUST_START_WITH_LETTER: "errors.mustStartWithLetter",
  PERIOD_PLACEMENT: "errors.periodPlacement",
  TRAILING_UNDERSCORE: "errors.trailingUnderscore",
};

/** Server reason → message key. RESERVED deliberately reads like a generic refusal. */
function reasonKey(reason: string | null | undefined): string {
  switch (reason) {
    case "TAKEN":
      return "taken";
    case "INVALID":
      return "invalid";
    case "RESERVED":
    default:
      return "unavailable";
  }
}

function isFuture(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getTime() > Date.now() ? d : null;
}

export default function UsernameSettingsForm({
  userId,
  currentUsername,
  nextChangeAt,
  checkAvailability,
  saveUsername,
  onSaved,
  notify,
}: UsernameSettingsFormProps) {
  const t = useTranslations("settings.username");
  const format = useFormatter();

  const [draft, setDraft] = useState("");
  const [check, setCheck] = useState<CheckState>({ kind: "idle" });
  const [saving, setSaving] = useState(false);
  // Server-reported lock (TOO_SOON or a just-completed change) overrides the prop
  // until the parent refetches.
  const [lockOverride, setLockOverride] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const current = currentUsername ?? "";
  const lockedUntil = isFuture(lockOverride ?? nextChangeAt);
  const formatDate = (d: Date) => format.dateTime(d, { dateStyle: "long" });

  const validation = validateUsername(draft);
  const normalized = validation.username;
  const unchanged = normalized.length > 0 && normalized === current;

  // --- debounced availability check -------------------------------------
  const seqRef = useRef(0);
  useEffect(() => {
    const seq = ++seqRef.current;
    if (lockedUntil || !validation.valid || unchanged) {
      setCheck({ kind: "idle" });
      return;
    }
    setCheck({ kind: "checking", username: normalized });
    const timer = setTimeout(async () => {
      try {
        const res = await checkAvailability(normalized);
        if (seq !== seqRef.current) return; // a newer keystroke owns the UI
        if (!res) {
          setCheck({ kind: "error", username: normalized });
        } else if (res.available) {
          setCheck({ kind: "available", username: normalized });
        } else {
          setCheck({ kind: "unavailable", username: normalized, reason: res.reason ?? "" });
        }
      } catch {
        if (seq !== seqRef.current) return;
        setCheck({ kind: "error", username: normalized });
      }
    }, USERNAME_CHECK_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // `lockedUntil` is derived from strings; depend on its time value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalized, validation.valid, unchanged, lockedUntil?.getTime(), checkAvailability]);

  const canSave =
    !saving &&
    !lockedUntil &&
    validation.valid &&
    check.kind === "available" &&
    check.username === normalized;

  const toastError = useCallback((m: string) => notify?.error(m), [notify]);

  const handleSave = async () => {
    if (!canSave) return;
    const target = normalized;
    setSaving(true);
    try {
      const res = await saveUsername(target);
      if (!res) {
        toastError(t("saveFailed"));
        return;
      }
      if (!res.success) {
        switch (res.code) {
          case "TOO_SOON": {
            const until = isFuture(res.nextChangeAt);
            if (res.nextChangeAt) setLockOverride(res.nextChangeAt);
            toastError(until ? t("lockedUntil", { date: formatDate(until) }) : t("tooSoon"));
            break;
          }
          case "TAKEN":
            // Lost a race since the availability check.
            setCheck({ kind: "unavailable", username: target, reason: "TAKEN" });
            toastError(t("taken"));
            break;
          case "RESERVED":
            setCheck({ kind: "unavailable", username: target, reason: "RESERVED" });
            toastError(t("unavailable"));
            break;
          case "INVALID":
            setCheck({ kind: "unavailable", username: target, reason: "INVALID" });
            toastError(t("invalid"));
            break;
          default:
            toastError(t("saveFailed"));
        }
        return;
      }

      const saved = res.username || target;
      if (res.nextChangeAt) setLockOverride(res.nextChangeAt);
      setDraft("");
      setCheck({ kind: "idle" });
      notify?.success(t("saved", { username: saved }));
      await onSaved?.({ ...res, username: saved });
    } catch {
      toastError(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const shareUrl = current ? absoluteProfileUrl({ username: current, userId }) : null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      notify?.success(t("copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toastError(t("copyFailed"));
    }
  };

  // --- status line under the field ---------------------------------------
  let status: { tone: "muted" | "ok" | "bad"; text: string; icon?: "spin" | "ok" | "bad" } | null =
    null;
  if (!lockedUntil && draft.trim().length > 0) {
    if (!validation.valid) {
      if (validation.error !== "EMPTY") {
        status = { tone: "bad", text: t(VALIDATION_KEY[validation.error]), icon: "bad" };
      }
    } else if (unchanged) {
      status = { tone: "muted", text: t("unchanged") };
    } else if (check.kind === "checking") {
      status = { tone: "muted", text: t("checking"), icon: "spin" };
    } else if (check.kind === "available" && check.username === normalized) {
      status = { tone: "ok", text: t("available", { username: normalized }), icon: "ok" };
    } else if (check.kind === "unavailable" && check.username === normalized) {
      status = { tone: "bad", text: t(reasonKey(check.reason)), icon: "bad" };
    } else if (check.kind === "error") {
      status = { tone: "bad", text: t("checkFailed"), icon: "bad" };
    }
  }

  const statusId = "username-status";
  const helperId = "username-helper";

  return (
    <div
      className="bg-surface-default border border-border-subtle rounded-lg p-6 space-y-4 shadow-sm"
      data-testid="username-section"
    >
      <div className="flex items-center gap-2">
        <AtSign className="h-5 w-5 text-text-primary" />
        <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
      </div>

      <p className="text-sm text-muted-foreground">{t("description")}</p>

      {/* Current handle + public link */}
      <div className="space-y-2">
        {current ? (
          <>
            <p className="font-medium text-foreground" data-testid="username-current">
              @{current}
            </p>
            <div className="flex items-center justify-between gap-3 rounded-md border border-border-subtle px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t("profileLink")}</p>
                <p className="truncate text-sm text-foreground" data-testid="username-profile-url">
                  {shareUrl}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                aria-label={t("copy")}
                data-testid="username-copy"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="hidden sm:inline">{copied ? t("copiedShort") : t("copy")}</span>
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground" data-testid="username-none">
            {t("none")}
          </p>
        )}
      </div>

      {/* Editor */}
      <div className="space-y-2">
        <label htmlFor="username-input" className="text-sm font-medium text-foreground">
          {t("label")}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              @
            </span>
            <Input
              id="username-input"
              data-testid="username-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSave();
              }}
              placeholder={current || t("placeholder")}
              readOnly={!!lockedUntil}
              disabled={!!lockedUntil || saving}
              // Leading '@' + surrounding whitespace are tolerated and stripped.
              maxLength={USERNAME_MAX_LENGTH + 8}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={status?.tone === "bad" || undefined}
              aria-describedby={`${statusId} ${helperId}`}
              className="pl-7"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="sm:h-9"
            onClick={handleSave}
            disabled={!canSave}
            data-testid="username-save"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("saving")}
              </>
            ) : (
              t("save")
            )}
          </Button>
        </div>

        <p
          id={statusId}
          role="status"
          aria-live="polite"
          data-testid="username-status"
          className={
            "flex min-h-5 items-center gap-1 text-sm " +
            (status?.tone === "ok"
              ? "text-green-600 dark:text-green-500"
              : status?.tone === "bad"
                ? "text-destructive"
                : "text-muted-foreground")
          }
        >
          {status?.icon === "spin" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {status?.icon === "ok" && <Check className="h-3.5 w-3.5" />}
          {status?.icon === "bad" && <X className="h-3.5 w-3.5" />}
          {status?.text}
        </p>

        <div id={helperId} className="space-y-1 text-xs text-muted-foreground">
          {lockedUntil ? (
            <p className="font-medium text-foreground" data-testid="username-locked">
              {t("lockedUntil", { date: formatDate(lockedUntil) })}
            </p>
          ) : (
            <p>{t("rules")}</p>
          )}
          <p>{t("changeLimit", { days: USERNAME_CHANGE_INTERVAL_DAYS })}</p>
        </div>
      </div>
    </div>
  );
}
