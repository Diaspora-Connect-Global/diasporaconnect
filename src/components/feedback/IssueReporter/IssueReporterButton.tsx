"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Bug } from "@phosphor-icons/react";

import { useIssueReporterConfig } from "@/hooks/useIssueReporterConfig";
import { useUserStore } from "@/store/useUserStore";
import { ISSUE_OPTIONS } from "@/config/issueReporter";
import { submitIssueReport } from "./submitIssueReport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

/**
 * Floating "Report an issue" button. Renders only when a system admin has the
 * `issue_reporter_enabled` platform setting on (or the env fallback is set).
 *
 * The form is native (matches the app theme + language) but submits straight to
 * the "DiaspoPlug – Report an Issue" Google Form, so reports land in a Sheet
 * with no backend involved. Field ids + options are in `config/issueReporter`.
 */
export function IssueReporterButton() {
  const { enabled, action, fields } = useIssueReporterConfig();
  const user = useUserStore((s) => s.user);
  const locale = useLocale();
  const t = useTranslations("issueReporter");

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(user?.email ?? "");
  const [issue, setIssue] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!enabled) return null;

  const reset = () => {
    setEmail(user?.email ?? "");
    setIssue("");
    setDescription("");
  };

  const canSubmit = Boolean(email.trim()) && Boolean(issue) && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      // Append page + locale context so reports are actionable, since the form
      // has no dedicated fields for them.
      const context =
        typeof window !== "undefined"
          ? `\n\n---\nPage: ${window.location.href}\nLocale: ${locale}`
          : `\n\n---\nLocale: ${locale}`;
      const body = `${description.trim()}${context}`;

      await submitIssueReport(action, {
        [fields.email]: email.trim(),
        [fields.issue]: issue,
        [fields.description]: body,
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
              <Label htmlFor="issue-email">{t("emailLabel")}</Label>
              <Input
                id="issue-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="issue-category">{t("issueLabel")}</Label>
              <Select value={issue} onValueChange={setIssue}>
                <SelectTrigger id="issue-category" className="w-full">
                  <SelectValue placeholder={t("issuePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
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
              <Button type="submit" disabled={!canSubmit}>
                {submitting ? t("sending") : t("submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
