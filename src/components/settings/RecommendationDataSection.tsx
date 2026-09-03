"use client";

/**
 * @fileoverview Settings: "Reset my personalisation" (recommendation data only).
 *
 * Calls `eraseMyAccountData`, which wipes the caller's footprint inside
 * recommendation-service (interest profile, interaction log, feed impressions,
 * blocks, ranking memberships). The account itself is untouched — for that see
 * DeleteAccountSection, which drives the real Art. 17 flow.
 *
 * History: this component used to be presented as "Delete Account" and told the
 * user to "sign out to complete account removal" — which was never true; signing
 * out deletes nothing. Now that the real deletion flow exists, this is scoped and
 * labelled as what it actually is: a personalisation reset.
 *
 * @module components/settings/RecommendationDataSection
 */

import { useMemo, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
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

/** Tables the mutation wipes, in plain English. */
const ERASE_BULLET_KEYS: Array<keyof EraseUserDataRowCounts> = [
  "interest_profile",
  "interaction_log",
  "feed_impression",
  "user_block",
  "user_membership",
];

export default function RecommendationDataSection() {
  const t = useTranslations("settings.recommendationData");
  const [open, setOpen] = useState(false);

  const [eraseMyAccountData, { loading }] =
    useMutation<EraseMyAccountDataData>(ERASE_MY_ACCOUNT_DATA);

  const handleConfirm = async () => {
    try {
      const { data } = await eraseMyAccountData();
      const result = data?.eraseMyAccountData;
      if (!result || !result.success) {
        toast.error(result?.message ?? t("failed"));
        return;
      }

      const total = Object.values(result.rowsDeleted ?? {}).reduce<number>(
        (sum, n) => sum + (typeof n === "number" ? n : 0),
        0,
      );
      // An idempotent re-run legitimately returns all-zero counts.
      toast.success(total > 0 ? t("resetWithCount", { count: total }) : t("alreadyReset"));
      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("unknownError");
      toast.error(t("failedWithReason", { reason: message }));
    }
  };

  const bulletList = useMemo(
    () =>
      ERASE_BULLET_KEYS.map((key) => (
        <li key={key} className="text-sm text-muted-foreground">
          {t(`bullets.${key}`)}
        </li>
      )),
    [t],
  );

  return (
    <div className="bg-surface-default border border-border rounded-lg p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
      </div>

      <p className="text-sm text-muted-foreground">{t("description")}</p>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-foreground">{t("cta")}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          data-testid="reset-personalisation-open"
        >
          <RefreshCw className="h-4 w-4" />
          {t("button")}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(next) => !loading && setOpen(next)}>
        <DialogContent showCloseButton={!loading}>
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>

          <ul className="list-disc pl-6 space-y-1">{bulletList}</ul>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              {t("cancel")}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              data-testid="reset-personalisation-confirm"
            >
              {loading ? t("resetting") : t("confirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
