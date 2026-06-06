"use client";

import { useTranslations } from "next-intl";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();
  const t = useTranslations("feedback");

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[100] bg-text-danger text-white text-sm text-center py-2 px-4"
    >
      <span className="font-medium">{t("offline.title")}</span>
      <span className="hidden sm:inline"> — {t("offline.description")}</span>
    </div>
  );
}
