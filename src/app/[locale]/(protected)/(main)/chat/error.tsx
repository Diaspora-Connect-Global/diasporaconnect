"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { ErrorState } from "@/components/feedback";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("feedback");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center w-full h-full">
      <ErrorState
        size="lg"
        title={t("error.title")}
        description={t("error.description")}
        retryLabel={t("error.retry")}
        onRetry={reset}
      />
    </div>
  );
}
