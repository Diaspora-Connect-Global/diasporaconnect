"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { ConfirmationModal } from "@/components/custom/confirmationModal";

interface VendorKycRequiredModalProps {
  open: boolean;
  onClose: () => void;
  mandatory?: boolean;
  onContinueWithoutKyc?: () => void;
}

export default function VendorKycRequiredModal({
  open,
  onClose,
  mandatory = true,
  onContinueWithoutKyc,
}: VendorKycRequiredModalProps) {
  const router = useRouter();
  const locale = useLocale();

  // Primary CTA always launches the verification flow.
  const goToVerification = () => {
    onClose();
    router.push(`/${locale}/verifykyc`);
  };

  const handleConfirm = () => {
    if (!mandatory && onContinueWithoutKyc) {
      onContinueWithoutKyc();
      return;
    }
    goToVerification();
  };

  const handleCancel = () => {
    if (!mandatory) {
      // Secondary action in the "recommended" case is "Complete KYC now".
      goToVerification();
      return;
    }
    onClose();
  };

  return (
    <ConfirmationModal
      open={open}
      onCancel={handleCancel}
      onConfirm={handleConfirm}
      title={mandatory ? "KYC required" : "KYC recommended"}
      description={
        mandatory
          ? "This transaction amount requires identity verification before it can be processed."
          : "You can continue without KYC for smaller payouts, but verification is recommended and required for large transactions."
      }
      confirmText={mandatory ? "Verify identity" : "Continue without KYC"}
      cancelText={mandatory ? "Not now" : "Complete KYC now"}
      maxWidth="md"
    />
  );
}

