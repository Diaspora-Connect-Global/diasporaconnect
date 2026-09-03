"use client";

/**
 * @fileoverview Settings: "Download my data" (GDPR Art. 15 / Art. 20).
 *
 * Kicks off an async export job in admin-service, polls it, and hands back a
 * time-limited signed download URL.
 *
 * Notes for future maintainers:
 *  - The job is async because it fans out gRPC reads across ~17 services; it is
 *    normal for READY to take tens of seconds.
 *  - `signedUrl` EXPIRES. We deliberately do not cache it or persist it across
 *    reloads — a stale link 404s, which reads as "the export is broken". The
 *    user re-requests instead; the backend job is resumable and cheap to re-poll.
 *  - Polling stops on READY/FAILED, on unmount, and after MAX_POLLS so a stuck
 *    job cannot spin forever in a background tab.
 *
 * @module components/settings/DataExportSection
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { Download, FileJson, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { REQUEST_MY_DATA_EXPORT, GET_MY_DATA_EXPORT } from "@/services/gql/account";
import type {
  RequestMyDataExportData,
  GetMyDataExportData,
  DataExportStatus,
} from "@/services/gql/types/account";

const POLL_INTERVAL_MS = 3000;
/** ~3 minutes at 3s. Beyond this we stop and let the user retry. */
const MAX_POLLS = 60;

export default function DataExportSection() {
  const t = useTranslations("settings.dataExport");
  const client = useApolloClient();

  const [status, setStatus] = useState<DataExportStatus | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  // Timer + poll count live in refs so the polling loop never races React state.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollsRef = useRef(0);
  const cancelledRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Stop polling if the user navigates away mid-export.
  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      stopPolling();
    };
  }, [stopPolling]);

  const [requestExport] = useMutation<RequestMyDataExportData>(REQUEST_MY_DATA_EXPORT);

  const poll = useCallback(
    async (jobId: string) => {
      if (cancelledRef.current) return;

      if (pollsRef.current >= MAX_POLLS) {
        setWorking(false);
        setStatus("FAILED");
        toast.error(t("timedOut"));
        return;
      }
      pollsRef.current += 1;

      try {
        // network-only: a cached PENDING would make the job look stuck forever.
        const { data } = await client.query<GetMyDataExportData>({
          query: GET_MY_DATA_EXPORT,
          variables: { jobId },
          fetchPolicy: "network-only",
        });

        if (cancelledRef.current) return;
        const job = data?.getMyDataExport;
        if (!job) {
          timerRef.current = setTimeout(() => void poll(jobId), POLL_INTERVAL_MS);
          return;
        }

        setStatus(job.status);

        if (job.status === "READY") {
          setSignedUrl(job.signedUrl ?? null);
          setWorking(false);
          toast.success(t("ready"));
          return;
        }
        if (job.status === "FAILED") {
          setWorking(false);
          toast.error(job.error ? t("failedWithReason", { reason: job.error }) : t("failed"));
          return;
        }

        timerRef.current = setTimeout(() => void poll(jobId), POLL_INTERVAL_MS);
      } catch {
        if (cancelledRef.current) return;
        // A transient network blip shouldn't kill the whole export — keep polling.
        // MAX_POLLS still bounds this, so a hard-down backend can't spin forever.
        timerRef.current = setTimeout(() => void poll(jobId), POLL_INTERVAL_MS);
      }
    },
    [client, t],
  );

  const handleRequest = async () => {
    setWorking(true);
    setSignedUrl(null);
    setStatus(null);
    pollsRef.current = 0;

    try {
      const { data } = await requestExport();
      const res = data?.requestMyDataExport;
      if (!res?.success || !res.jobId) {
        setWorking(false);
        toast.error(res?.message ?? t("couldNotStart"));
        return;
      }
      setStatus(res.status ?? "PENDING");
      toast.info(t("started"));
      void poll(res.jobId);
    } catch (err) {
      setWorking(false);
      const message = err instanceof Error ? err.message : t("unknownError");
      toast.error(t("couldNotStartWithReason", { reason: message }));
    }
  };

  const isBusy = working && status !== "READY" && status !== "FAILED";

  return (
    <div className="bg-surface-default border border-border rounded-lg p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <FileJson className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
      </div>

      <p className="text-sm text-muted-foreground">{t("description")}</p>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-foreground">
          {isBusy ? t("preparing") : t("cta")}
        </p>

        {signedUrl ? (
          <Button asChild size="sm" data-testid="data-export-download">
            <a href={signedUrl} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" />
              {t("download")}
            </a>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRequest}
            disabled={isBusy}
            data-testid="data-export-request"
          >
            {isBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("preparingShort")}
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                {t("request")}
              </>
            )}
          </Button>
        )}
      </div>

      {signedUrl && (
        <p className="text-xs text-muted-foreground">{t("linkExpires")}</p>
      )}
    </div>
  );
}
