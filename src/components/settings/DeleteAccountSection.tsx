"use client";

/**
 * @fileoverview Settings: "Delete my recommendation data" (GDPR right-to-erase).
 *
 * Calls the api-gateway `eraseMyAccountData` mutation, which wipes the caller's
 * footprint inside the recommendation-service (interest profile, interaction
 * log, feed impressions, blocks, memberships). This does NOT delete the user's
 * account in auth-service / user-service — that's a separate, not-yet-built flow.
 *
 * UX:
 *  - Primary CTA is a destructive button.
 *  - Confirmation dialog requires typing "DELETE" (case-sensitive) before
 *    enabling the confirm button — prevents accidental clicks.
 *  - On success: green toast w/ per-table counts, then nudges the user toward
 *    sign-out (routes to /signin after 3s).
 *  - On error: red toast w/ message; stays on the page.
 *  - Idempotent re-run (all zero counts) shows "Already erased — no data to
 *    remove." instead of "Removed 0..." for a friendlier read.
 *
 * @module components/settings/DeleteAccountSection
 */

import { useMemo, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

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
import { ERASE_MY_ACCOUNT_DATA } from "@/services/gql/postsFeed";
import type {
  EraseMyAccountDataData,
  EraseUserDataRowCounts,
} from "@/services/gql/types/recommendation";

const CONFIRM_PHRASE = "DELETE";
const POST_SUCCESS_REDIRECT_MS = 3000;

/** Plain-English description of each table that the mutation wipes. */
const ERASE_BULLETS: Array<{ key: keyof EraseUserDataRowCounts; label: string }> = [
  { key: "interest_profile", label: "Your interest topics and personalisation profile" },
  { key: "interaction_log", label: "Your view, like, save and share history" },
  { key: "feed_impression", label: "What posts the feed has already shown you (impressions)" },
  { key: "user_block", label: "Your hidden authors, posts and topics" },
  { key: "user_membership", label: "Your community/association memberships used for ranking" },
];

/**
 * Compose a human-readable summary of per-table deletions for the success toast.
 *
 * Uses singular/plural-aware noun phrases. Returns `null` when every count is
 * zero (the caller renders an "already erased" message instead).
 */
function formatDeletedSummary(counts: EraseUserDataRowCounts): string | null {
  const parts: string[] = [];
  if (counts.interest_profile > 0) {
    parts.push(`${counts.interest_profile} interest profile`);
  }
  if (counts.interaction_log > 0) {
    parts.push(`${counts.interaction_log} interaction events`);
  }
  if (counts.feed_impression > 0) {
    parts.push(`${counts.feed_impression} impressions`);
  }
  if (counts.user_block > 0) {
    parts.push(`${counts.user_block} blocks`);
  }
  if (counts.user_membership > 0) {
    parts.push(`${counts.user_membership} memberships`);
  }
  if (parts.length === 0) return null;
  return `Removed ${parts.join(", ")}.`;
}

export default function DeleteAccountSection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const [eraseMyAccountData, { loading }] = useMutation<EraseMyAccountDataData>(
    ERASE_MY_ACCOUNT_DATA,
  );

  const isConfirmReady = confirmText === CONFIRM_PHRASE && !loading;

  /** Reset confirmation text on close so re-opening starts clean. */
  const handleOpenChange = (next: boolean) => {
    if (loading) return; // don't allow dismissing mid-flight
    setOpen(next);
    if (!next) setConfirmText("");
  };

  const handleConfirm = async () => {
    if (!isConfirmReady) return;
    try {
      const { data } = await eraseMyAccountData();
      const result = data?.eraseMyAccountData;
      if (!result || !result.success) {
        toast.error(result?.message ?? "Failed to erase recommendation data. Please try again.");
        return;
      }

      const summary = formatDeletedSummary(result.rowsDeleted);
      const headline =
        "Your recommendation data has been erased. Sign-out to complete account removal.";
      toast.success(summary ? `${headline} ${summary}` : `${headline} Already erased — no data to remove.`, {
        duration: POST_SUCCESS_REDIRECT_MS,
      });

      setOpen(false);
      setConfirmText("");

      // Soft-nudge to sign-out. We don't programmatically log them out yet —
      // the auth/user-service deletion is a separate, not-yet-built flow.
      setTimeout(() => {
        router.push("/signin");
      }, POST_SUCCESS_REDIRECT_MS);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Could not erase recommendation data: ${message}`);
    }
  };

  // Memoise the bullet list so the dialog markup stays readable.
  const bulletList = useMemo(
    () =>
      ERASE_BULLETS.map((b) => (
        <li key={b.key} className="text-sm text-muted-foreground">
          {b.label}
        </li>
      )),
    [],
  );

  return (
    <div className="bg-surface-default border border-red-300 dark:border-red-900/50 rounded-lg p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-red-600" />
        <h2 className="text-lg font-semibold text-foreground">
          Delete my recommendation data
        </h2>
      </div>

      <p className="text-sm text-muted-foreground">
        This permanently removes your interest profile, view history, and community
        memberships from our recommendation engine. Your posts and account remain.
        This action cannot be undone.
      </p>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-foreground">
          Erase my recommendation footprint
        </p>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
          onClick={() => setOpen(true)}
          data-testid="delete-account-open"
        >
          <Trash2 className="h-4 w-4" />
          Delete data
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent showCloseButton={!loading}>
          <DialogHeader>
            <DialogTitle className="text-red-600">
              Are you absolutely sure?
            </DialogTitle>
            <DialogDescription>
              The following will be permanently removed from our recommendation
              engine. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <ul className="list-disc pl-6 space-y-1">{bulletList}</ul>

          <div className="space-y-2">
            <label
              htmlFor="delete-confirm-input"
              className="text-sm font-medium text-foreground"
            >
              Type <span className="font-mono font-semibold">{CONFIRM_PHRASE}</span> to confirm
            </label>
            <Input
              id="delete-confirm-input"
              autoComplete="off"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={loading}
              placeholder={CONFIRM_PHRASE}
              data-testid="delete-account-confirm-input"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!isConfirmReady}
              data-testid="delete-account-confirm"
            >
              {loading ? "Erasing..." : "Erase my data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
