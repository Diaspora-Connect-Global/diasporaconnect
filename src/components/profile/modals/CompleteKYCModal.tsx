"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import { toast } from "sonner";
import CustomDialog from "@/components/custom/customDialog";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import { useRouter } from "@/i18n/navigation";
import OnfidoFlow from "@/components/profile/kyc/OnfidoFlow";
import {
  useKYCVerification,
  isVerifiedKycStatus,
} from "@/hooks/useKYCVerification";
import type { KycProvider } from "@/services/gql/types/kyc";

export interface CompleteKYCModalRef {
  open: () => void;
}

type Phase = "choose" | "onfido" | "verifying" | "done";

/**
 * Inline KYC starter dialog. Replaces the old static QR/email placeholder.
 *  - "Document & selfie" -> initiateKYCVerification(ONFIDO) -> mount Onfido inline.
 *  - "itsme"             -> initiateKYCVerification(ITSME) -> redirect (OIDC).
 *  - no SDK token/URL    -> route to the full /verifykyc manual flow.
 */
const CompleteKYCModal = forwardRef<CompleteKYCModalRef>((_, ref) => {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("choose");
  const [onfidoToken, setOnfidoToken] = useState<string | null>(null);

  const { initiate, initiating, pollStatus } = useKYCVerification();

  useImperativeHandle(ref, () => ({
    open: () => {
      setPhase("choose");
      setOnfidoToken(null);
      setIsDialogOpen(true);
    },
  }));

  const closeDialog = () => setIsDialogOpen(false);

  const start = async (provider: KycProvider) => {
    try {
      const res = await initiate(provider);

      if (provider === "ITSME") {
        if (res?.redirectUrl) {
          window.location.assign(res.redirectUrl);
          return;
        }
        // itsme disabled -> hand off to the full flow.
        closeDialog();
        router.push("/verifykyc");
        return;
      }

      if (res?.sdkToken) {
        setOnfidoToken(res.sdkToken);
        setPhase("onfido");
        return;
      }

      // No provider SDK token -> fall back to the full manual flow.
      closeDialog();
      router.push("/verifykyc");
    } catch {
      toast.error("Could not start verification. Please try again.");
    }
  };

  const handleOnfidoComplete = async () => {
    setPhase("verifying");
    const final = await pollStatus({ timeoutMs: 90000, intervalMs: 3000 });
    if (isVerifiedKycStatus(final.status)) {
      setPhase("done");
      toast.success("Identity verified.");
    } else if (final.status === "REJECTED" || final.status === "EXPIRED") {
      toast.error("Verification was not approved. Please try again.");
      setPhase("choose");
    } else {
      // Still pending after timeout — leave the user informed.
      setPhase("done");
      toast.message("Verification submitted. We will notify you once it is reviewed.");
    }
  };

  return (
    <CustomDialog
      contentClassName="lg:min-w-[40rem] h-[90vh] overflow-y-auto scrollbar-hidden"
      showFooter={false}
      title="Verify your identity"
      open={isDialogOpen}
      onOpenChange={closeDialog}
      preventOutsideClose={phase === "onfido" || phase === "verifying"}
    >
      <div className="h-[80vh] overflow-y-auto scrollbar-hide bg-surface-default px-5 py-4">
        {phase === "choose" && (
          <div className="flex flex-col gap-4">
            <p className="text-text-secondary body-large">
              Verify your identity to unlock higher limits and the verified badge.
            </p>

            <button
              type="button"
              disabled={initiating}
              onClick={() => start("ONFIDO")}
              className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-border-brand disabled:opacity-50"
            >
              <p className="label-medium text-text-primary">Document & selfie</p>
              <p className="body-small text-text-secondary">
                Verify with your passport or national ID and a quick selfie.
              </p>
            </button>

            <button
              type="button"
              disabled={initiating}
              onClick={() => start("ITSME")}
              className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-border-brand disabled:opacity-50"
            >
              <p className="label-medium text-text-primary">itsme (Belgium)</p>
              <p className="body-small text-text-secondary">
                Verify instantly with your Belgian digital identity.
              </p>
            </button>

            <ButtonType3
              size="lg"
              className="w-full mt-2"
              onClick={() => {
                closeDialog();
                router.push("/verifykyc");
              }}
            >
              Open full verification page
            </ButtonType3>
          </div>
        )}

        {phase === "onfido" && onfidoToken && (
          <OnfidoFlow
            sdkToken={onfidoToken}
            className="min-h-[60vh]"
            onComplete={() => {
              void handleOnfidoComplete();
            }}
            onError={() => {
              toast.error("Verification could not be completed. Please try again.");
              setPhase("choose");
            }}
            onCancel={() => setPhase("choose")}
          />
        )}

        {phase === "verifying" && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-text-success text-6xl mb-6">✓</div>
            <h2 className="text-xl font-semibold mb-3">We are verifying you</h2>
            <p className="text-text-secondary">
              This usually only takes a moment. You can keep this open.
            </p>
          </div>
        )}

        {phase === "done" && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-text-success text-6xl mb-6">✓</div>
            <h2 className="text-2xl font-bold mb-2">Done</h2>
            <p className="text-text-secondary mb-6">
              Your identity verification is complete.
            </p>
            <ButtonType2 size="lg" className="w-full max-w-xs" onClick={closeDialog}>
              Close
            </ButtonType2>
          </div>
        )}
      </div>
    </CustomDialog>
  );
});

CompleteKYCModal.displayName = "CompleteKYCModal";
export default CompleteKYCModal;
