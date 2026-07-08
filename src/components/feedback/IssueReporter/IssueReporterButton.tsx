"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Bug } from "@phosphor-icons/react";

import { useIssueReporterConfig } from "@/hooks/useIssueReporterConfig";
import { useUserStore } from "@/store/useUserStore";
import { submitIssueReport } from "./submitIssueReport";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CATEGORIES = ["bug", "content", "account", "payment", "other"] as const;

/**
 * Floating "Report an issue" button. Renders only when a system admin has the
 * feature flag on (or the env fallback is set) and a Google Form is configured.
 *
 * The form is native (matches the app theme + language) but submits straight to
 * a Google Form, so reports land in a Google Sheet with no backend involved.
 */
export function IssueReporterButton() {
  const { enabled, action, fields } = useIssueReporterConfig();
  const user = useUserStore((s) => s.user);
  const locale = useLocale();
  const t = useTranslations("issueReporter");

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("bug");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!enabled) return null;

  const reset = () => {
    setCategory("bug");
    setDescription("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = description.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      const meta =
        typeof navigator !== "undefined"
          ? `locale=${locale}; ua=${navigator.userAgent}`
          : `locale=${locale}`;

      await submitIssueReport(action, fields, {
        description: trimmed,
        category,
        email: user?.email,
        userId: user?.userId,
        url: typeof window !== "undefined" ? window.location.href : undefined,
        meta,
      });

      toast.success(t("success"));
      reset();
      setOpen(false);
    } catch {
      toast.error(t("error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("open")}
        className="fixed bottom-20 right-4 z-50 h-12 gap-2 rounded-full shadow-lg md:bottom-6 md:right-6"
      >
        <Bug weight="bold" className="size-5" />
        <span className="hidden sm:inline">{t("open")}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("subtitle")}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="issue-category">{t("categoryLabel")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="issue-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`categories.${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="issue-description">{t("descriptionLabel")}</Label>
              <Textarea
                id="issue-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                rows={5}
                maxLength={2000}
                required
              />
            </div>

            <p className="text-xs text-muted-foreground">{t("privacyNote")}</p>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={submitting || !description.trim()}>
                {submitting ? t("sending") : t("submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
