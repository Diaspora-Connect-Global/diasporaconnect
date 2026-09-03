"use client";

/**
 * @fileoverview Settings: "Delete my account" (GDPR Art. 17 right-to-erasure).
 *
 * This is the REAL account-deletion flow. It calls `requestAccountDeletion`,
 * which moves the account into a reversible 30-day grace window; a nightly job
 * in auth-service performs the irreversible platform-wide erase at expiry.
 *
 * Not to be confused with `eraseMyAccountData` (see RecommendationDataSection),
 * which only clears the recommendation engine's footprint.
 *
 * UX decisions worth keeping:
 *  - Scheduling REVOKES ALL SESSIONS server-side, so we must sign the user out
 *    immediately afterwards. Leaving them on a "logged in" screen with a dead
 *    token produces confusing 401s on the next click.
 *  - The grace window is surfaced as a persistent banner with an Undo, because a
 *    deletion the user cannot see or reverse is the worst failure mode here.
 *  - Deletion is presented as reversible-for-30-days, never as instant, so the
 *    copy matches what the backend actually does.
 *  - We deliberately do NOT block on legal holds client-side: the server decides,
 *    and a held account still shows as PENDING_DELETION (deferred, not cancelled).
 *
 * @module components/settings/DeleteAccountSection
 */

import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

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
import {
  REQUEST_ACCOUNT_DELETION,
  CANCEL_ACCOUNT_DELETION,
  MY_ACCOUNT_DELETION_STATUS,
} from "@/services/gql/account";
import type {
  RequestAccountDeletionData,
  CancelAccountDeletionData,
  MyAccountDeletionStatusData,
} from "@/services/gql/types/account";
import { useAuthStore } from "@/store/useAuthStore";

const CONFIRM_PHRASE = "DELETE";
const SIGN_OUT_DELAY_MS = 2500;

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

export default function DeleteAccountSection() {
  const t = useTranslations("settings.deleteAccount");
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");

  const { data: statusData, refetch } = useQuery<MyAccountDeletionStatusData>(
    MY_ACCOUNT_DELETION_STATUS,
    { fetchPolicy: "network-only" },
  );

  const [requestDeletion, { loading: deleting }] =
    useMutation<RequestAccountDeletionData>(REQUEST_ACCOUNT_DELETION);
  const [cancelDeletion, { loading: cancelling }] =
    useMutation<CancelAccountDeletionData>(CANCEL_ACCOUNT_DELETION);

  const status = statusData?.myAccountDeletionStatus;
  const isPending = status?.status === "PENDING_DELETION";
  const isConfirmReady = confirmText === CONFIRM_PHRASE && !deleting;

  const handleOpenChange = (next: boolean) => {
    if (deleting) return; // don't allow dismissing mid-flight
    setOpen(next);
    if (!next) {
      setConfirmText("");
      setReason("");
    }
  };

  const handleConfirm = async () => {
    if (!isConfirmReady) return;
    try {
      const { data } = await requestDeletion({
        variables: { reason: reason.trim() || null },
      });
      const res = data?.requestAccountDeletion;
      if (!res?.success) {
        toast.error(res?.message ?? t("couldNotSchedule"));
        return;
      }

      const purgeOn = formatDate(res.purgeAfter);
      toast.success(
        purgeOn ? t("scheduledOn", { date: purgeOn }) : t("scheduled"),
        { duration: SIGN_OUT_DELAY_MS },
      );
      setOpen(false);
      setConfirmText("");

      // The server has already revoked every session — keeping the user "logged
      // in" here would just 401 on their next action. Sign out and send them to
      // sign-in, where logging back in is the documented undo path.
      setTimeout(() => {
        clearAuth();
        router.push("/signin");
      }, SIGN_OUT_DELAY_MS);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("unknownError");
      toast.error(t("couldNotScheduleWithReason", { reason: message }));
    }
  };

  const handleCancel = async () => {
    try {
      const { data } = await cancelDeletion();
      const res = data?.cancelAccountDeletion;
      if (!res?.success) {
        toast.error(res?.message ?? t("couldNotCancel"));
        return;
      }
      toast.success(t("cancelled"));
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("unknownError");
      toast.error(t("couldNotCancelWithReason", { reason: message }));
    }
  };

  /* ---------------------------------------------------------------- */
  /* Pending state: show the countdown + undo instead of the delete CTA */
  /* ---------------------------------------------------------------- */
  if (isPending) {
    return (
      <div
        className="bg-surface-default border border-amber-400 dark:border-amber-700/60 rounded-lg p-6 space-y-4 shadow-sm"
        data-testid="delete-account-pending"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-foreground">
            {t("pendingTitle")}
          </h2>
        </div>

        <p className="text-sm text-muted-foreground">
          {t("pendingBody", {
            days: status?.daysRemaining ?? 0,
            date: formatDate(status?.purgeAfter),
          })}
        </p>

        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-foreground">{t("changedYourMind")}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={cancelling}
            data-testid="delete-account-cancel"
          >
            {cancelling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            {t("keepAccount")}
          </Button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Default state                                                     */
  /* ---------------------------------------------------------------- */
  return (
    <div className="bg-surface-default border border-red-300 dark:border-red-900/50 rounded-lg p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-red-600" />
        <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
      </div>

      <p className="text-sm text-muted-foreground">{t("description")}</p>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-foreground">{t("cta")}</p>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
          onClick={() => setOpen(true)}
          data-testid="delete-account-open"
        >
          <Trash2 className="h-4 w-4" />
          {t("button")}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent showCloseButton={!deleting}>
          <DialogHeader>
            <DialogTitle className="text-red-600">{t("dialogTitle")}</DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>

          <ul className="list-disc pl-6 space-y-1">
            <li className="text-sm text-muted-foreground">{t("bulletGrace")}</li>
            <li className="text-sm text-muted-foreground">{t("bulletSignOut")}</li>
            <li className="text-sm text-muted-foreground">{t("bulletUndo")}</li>
            <li className="text-sm text-muted-foreground">{t("bulletFinal")}</li>
            <li className="text-sm text-muted-foreground">{t("bulletExport")}</li>
          </ul>

          <div className="space-y-2">
            <label htmlFor="delete-reason-input" className="text-sm font-medium text-foreground">
              {t("reasonLabel")}
            </label>
            <Input
              id="delete-reason-input"
              autoComplete="off"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={deleting}
              placeholder={t("reasonPlaceholder")}
              data-testid="delete-account-reason"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="delete-confirm-input" className="text-sm font-medium text-foreground">
              {t.rich("confirmLabel", {
                phrase: (chunks) => (
                  <span className="font-mono font-semibold">{chunks}</span>
                ),
              })}
            </label>
            <Input
              id="delete-confirm-input"
              autoComplete="off"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={deleting}
              placeholder={CONFIRM_PHRASE}
              data-testid="delete-account-confirm-input"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={deleting}>
              {t("keepMyAccount")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!isConfirmReady}
              data-testid="delete-account-confirm"
            >
              {deleting ? t("scheduling") : t("confirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
