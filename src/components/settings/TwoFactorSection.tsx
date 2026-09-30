"use client";

/**
 * @fileoverview Settings → Security → "Two-factor authentication".
 *
 * The switch shows the SERVER's state and nothing else:
 *  - while the status is loading it is disabled and unchecked, with "Checking…";
 *  - if the status cannot be loaded it stays disabled and unchecked, with a
 *    translated error and Retry — never a guess in either direction;
 *  - toggling never flips it optimistically. It opens a dialog, and the switch
 *    only changes after the server confirms and the status is re-read.
 *
 * Turning ON: password (only for accounts that have one — Google/Facebook
 * sign-ups never chose one) → we email a code → the code turns 2FA on. The
 * code step also proves the email arrives, so nobody is locked out by an
 * address that doesn't receive our mail.
 * Turning OFF: the password, or an emailed code instead.
 *
 * Refusals RESOLVE (`{ success:false, error }` or, under errorPolicy 'all', a
 * resolved `error`), so outcomes are read from the payload, never from the
 * absence of a throw. Errors are translated from the stable code.
 *
 * @module components/settings/TwoFactorSection
 */

import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useTranslations } from "next-intl";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TwoFactorCodeField from "@/components/signin/TwoFactorCodeField";
import {
  CONFIRM_TWO_FACTOR,
  DISABLE_TWO_FACTOR,
  ENABLE_TWO_FACTOR,
  SEND_TWO_FACTOR_DISABLE_CODE,
  TWO_FACTOR_STATUS,
} from "@/services/gql/twoFactor";
import type {
  ConfirmTwoFactorData,
  DisableTwoFactorData,
  EnableTwoFactorData,
  SendTwoFactorDisableCodeData,
  TwoFactorMutationResult,
  TwoFactorStatusData,
} from "@/services/gql/types/twoFactor";
import { twoFactorErrorKey } from "@/lib/twoFactorErrors";

type Mode = "enable" | "disable";
type Step = "password" | "send" | "code";

/** This section shows its own translated messages; skip the global toast. */
const SILENT = { context: { silentErrors: true } } as const;

export default function TwoFactorSection() {
  const t = useTranslations("settings.security.twoFactor");
  const te = useTranslations("authentication.twoFactor.errors");

  const { data, loading, error, refetch } = useQuery<TwoFactorStatusData>(TWO_FACTOR_STATUS, {
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
    ...SILENT,
  });
  // Under errorPolicy 'all' a failed read can still carry stale data — an
  // error means "unknown", full stop.
  const status = error ? undefined : data?.twoFactorStatus;
  const known = !loading && status !== undefined;
  const enabled = known && status?.enabled === true;

  const [enableMutation, { loading: enabling }] = useMutation<EnableTwoFactorData>(ENABLE_TWO_FACTOR, SILENT);
  const [confirmMutation, { loading: confirming }] = useMutation<ConfirmTwoFactorData>(CONFIRM_TWO_FACTOR, SILENT);
  const [sendDisableCodeMutation, { loading: sendingDisableCode }] =
    useMutation<SendTwoFactorDisableCodeData>(SEND_TWO_FACTOR_DISABLE_CODE, SILENT);
  const [disableMutation, { loading: disabling }] = useMutation<DisableTwoFactorData>(DISABLE_TWO_FACTOR, SILENT);
  const busy = enabling || confirming || sendingDisableCode || disabling;

  const [mode, setMode] = useState<Mode | null>(null);
  const [step, setStep] = useState<Step>("password");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState("");
  const [info, setInfo] = useState("");

  const passwordRequired = status?.passwordRequired !== false;

  const reset = () => {
    setPassword("");
    setCode("");
    setFormError("");
    setInfo("");
  };

  const openDialog = (next: Mode) => {
    if (!known || busy) return;
    reset();
    setMode(next);
    setStep(passwordRequired ? "password" : "send");
  };

  const closeDialog = () => {
    if (busy) return;
    setMode(null);
    reset(); // never keep a typed password around after the dialog closes
  };

  const refusal = (res: TwoFactorMutationResult | undefined | null, transport: unknown) =>
    twoFactorErrorKey(res?.error, transport as { message?: string } | null) ?? "unavailable";

  /** After any change, show only what the server now says. */
  const finish = async (message: string) => {
    setMode(null);
    reset();
    toast.success(message);
    try {
      await refetch();
    } catch {
      // The status row shows its own error + Retry.
    }
  };

  /* ------------------------------- Turn ON -------------------------------- */

  const sendEnableCode = async () => {
    setFormError("");
    setInfo("");
    if (passwordRequired && !password) {
      setFormError(t("dialog.passwordMissing"));
      return;
    }
    const result = await enableMutation({ variables: { password: passwordRequired ? password : null } });
    const res = result.data?.enableTwoFactor;
    if (res?.success) {
      setStep("code");
      setCode("");
      setInfo(t("dialog.codeSent"));
      return;
    }
    const key = refusal(res, result.error);
    if (key === "resendTooSoon") {
      // A code went out moments ago; let them type it.
      setStep("code");
      setInfo(te("resendTooSoon"));
      return;
    }
    if (key === "alreadyEnabled") {
      await finish(t("enabledToast"));
      return;
    }
    setFormError(te(key));
  };

  const confirmEnable = async () => {
    setFormError("");
    if (!/^\d{6}$/.test(code)) {
      setFormError(t("dialog.codeIncomplete"));
      return;
    }
    const result = await confirmMutation({ variables: { code } });
    const res = result.data?.verifyTwoFactor;
    if (res?.success) {
      await finish(t("enabledToast"));
      return;
    }
    const key = refusal(res, result.error);
    if (key === "alreadyEnabled") {
      await finish(t("enabledToast"));
      return;
    }
    if (key === "codeExpired") setCode("");
    setFormError(te(key));
  };

  /* ------------------------------- Turn OFF ------------------------------- */

  const sendDisableCode = async () => {
    setFormError("");
    setInfo("");
    const result = await sendDisableCodeMutation();
    const res = result.data?.sendTwoFactorDisableCode;
    if (res?.success) {
      setStep("code");
      setCode("");
      setInfo(t("dialog.codeSent"));
      return;
    }
    const key = refusal(res, result.error);
    if (key === "resendTooSoon") {
      setStep("code");
      setInfo(te("resendTooSoon"));
      return;
    }
    if (key === "notEnabled") {
      await finish(t("disabledToast"));
      return;
    }
    setFormError(te(key));
  };

  const disable = async (proof: { password?: string; code?: string }) => {
    setFormError("");
    if (proof.password !== undefined && !proof.password) {
      setFormError(t("dialog.passwordMissing"));
      return;
    }
    if (proof.code !== undefined && !/^\d{6}$/.test(proof.code)) {
      setFormError(t("dialog.codeIncomplete"));
      return;
    }
    const result = await disableMutation({
      variables: { password: proof.password ?? null, code: proof.code ?? null },
    });
    const res = result.data?.disableTwoFactor;
    if (res?.success) {
      await finish(t("disabledToast"));
      return;
    }
    const key = refusal(res, result.error);
    if (key === "notEnabled") {
      await finish(t("disabledToast"));
      return;
    }
    if (key === "codeExpired") setCode("");
    setFormError(te(key));
  };

  /* ------------------------------- Dialog --------------------------------- */

  const onPrimary = async (event?: FormEvent) => {
    event?.preventDefault();
    if (busy || !mode) return;
    if (mode === "enable") {
      if (step === "code") await confirmEnable();
      else await sendEnableCode();
      return;
    }
    if (step === "password") await disable({ password });
    else if (step === "send") await sendDisableCode();
    else await disable({ code });
  };

  const resendCode = async () => {
    if (busy) return;
    if (mode === "enable") await sendEnableCode();
    else await sendDisableCode();
  };

  const title = mode === "disable" ? t("dialog.disableTitle") : t("dialog.enableTitle");
  const description =
    step === "code"
      ? t("dialog.codeBody")
      : mode === "enable"
        ? step === "password"
          ? t("dialog.enablePasswordBody")
          : t("dialog.enableSendBody")
        : step === "password"
          ? t("dialog.disablePasswordBody")
          : t("dialog.disableSendBody");
  const primaryLabel =
    step === "code"
      ? mode === "enable"
        ? t("dialog.turnOn")
        : t("dialog.turnOff")
      : mode === "disable" && step === "password"
        ? t("dialog.turnOff")
        : t("dialog.sendCode");

  return (
    <div className="flex items-center justify-between gap-4" data-testid="two-factor-row">
      <div className="min-w-0">
        <p id="two-factor-title" className="font-medium text-foreground">
          {t("title")}
        </p>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        {loading ? (
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground" data-testid="two-factor-status" aria-live="polite">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            {t("checking")}
          </p>
        ) : !known ? (
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-danger" role="alert" data-testid="two-factor-error">
            {t("loadError")}
            <button
              type="button"
              className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
              onClick={() => {
                refetch().catch(() => undefined);
              }}
              data-testid="two-factor-retry"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              {t("retry")}
            </button>
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground" data-testid="two-factor-status">
            {enabled ? t("statusOn") : t("statusOff")}
          </p>
        )}
      </div>

      <Switch
        aria-labelledby="two-factor-title"
        aria-busy={loading || busy}
        checked={enabled}
        disabled={!known || busy}
        onCheckedChange={(checked) => openDialog(checked ? "enable" : "disable")}
        data-testid="two-factor-switch"
      />

      <Dialog open={mode !== null} onOpenChange={(next) => (next ? undefined : closeDialog())}>
        <DialogContent showCloseButton={!busy} data-testid="two-factor-dialog">
          <form onSubmit={onPrimary} className="space-y-4" noValidate>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>

            {step === "password" && (
              <div className="space-y-2">
                <label htmlFor="two-factor-password" className="text-sm font-medium text-foreground">
                  {t("dialog.passwordLabel")}
                </label>
                <Input
                  id="two-factor-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                  autoFocus
                  aria-invalid={formError ? true : undefined}
                  data-testid="two-factor-password"
                />
              </div>
            )}

            {step === "code" && (
              <TwoFactorCodeField
                id="two-factor-code"
                label={t("dialog.codeLabel")}
                value={code}
                onChange={setCode}
                disabled={busy}
                autoFocus
                testId="two-factor-code"
              />
            )}

            {info && !formError && (
              <p className="text-sm text-muted-foreground" aria-live="polite" data-testid="two-factor-info">
                {info}
              </p>
            )}
            {formError && (
              <p className="text-sm text-text-danger" role="alert" data-testid="two-factor-form-error">
                {formError}
              </p>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {mode === "disable" && step === "password" && (
                <button
                  type="button"
                  className="text-sm font-medium text-text-brand hover:underline disabled:opacity-50"
                  onClick={() => {
                    void sendDisableCode();
                  }}
                  disabled={busy}
                  data-testid="two-factor-use-code"
                >
                  {t("dialog.useCodeInstead")}
                </button>
              )}
              {step === "code" && (
                <button
                  type="button"
                  className="text-sm font-medium text-text-brand hover:underline disabled:opacity-50"
                  onClick={() => {
                    void resendCode();
                  }}
                  disabled={busy}
                  data-testid="two-factor-resend"
                >
                  {t("dialog.resend")}
                </button>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={busy}>
                {t("dialog.cancel")}
              </Button>
              <Button
                type="submit"
                variant={mode === "disable" ? "destructive" : "default"}
                disabled={busy}
                data-testid="two-factor-primary"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {primaryLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
