// components/KYCVerification.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { useTranslations } from 'next-intl';
import { useRef } from "react";
import CompleteKYCModal, { CompleteKYCModalRef } from "./modals/CompleteKYCModal";
import { useKYCVerification, isVerifiedKycStatus } from "@/hooks/useKYCVerification";

interface KYCVerificationProps {
  /**
   * Optional legacy fallback from the profile aggregate (e.g. "verified").
   * Live KYC status from getMyKYCStatus takes precedence when available.
   */
  verified?: string | undefined;
  onVerify?: () => void;
}

export function KYCVerification({ verified }: KYCVerificationProps) {
  const t = useTranslations('profile.kyc');
  const modalRef = useRef<CompleteKYCModalRef>(null);

  const { status, profile } = useKYCVerification();

  // Live KYC status wins; fall back to the profile-aggregate string.
  const liveStatus = status?.status;
  const kycLevel = status?.kycLevel ?? profile?.kycLevel ?? 0;
  const rejectionReason = profile?.rejectionReason ?? null;

  const isVerified =
    isVerifiedKycStatus(liveStatus) || verified === 'verified';
  const isRejected = liveStatus === 'REJECTED' || liveStatus === 'EXPIRED';
  const isPending =
    liveStatus === 'SUBMITTED' ||
    liveStatus === 'PENDING' ||
    liveStatus === 'UNDER_REVIEW';

  const statusLabel = isVerified
    ? t('verified')
    : isPending
      ? t('pending')
      : isRejected
        ? t('rejected')
        : t('notVerified');

  const statusColor = isVerified
    ? 'text-text-success'
    : isPending
      ? 'text-text-brand'
      : 'text-text-warning';

  return (
    <>
      <Card className="h-full">
        <CardContent className="h-full flex flex-col">
          <div className="flex-1 min-h-0 flex flex-col justify-between">
            <div
              onClick={() => modalRef.current?.open()}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="text-sm font-medium">{t('title')}</span>
              <ChevronRight className="w-4 h-4" />
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className={`text-sm ${statusColor}`}>{statusLabel}</span>
              {isVerified && kycLevel > 0 && (
                <span className="text-xs text-text-secondary">
                  {t('level', { level: kycLevel })}
                </span>
              )}
            </div>

            {isRejected && rejectionReason && (
              <p className="mt-1 text-xs text-text-warning">{rejectionReason}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <CompleteKYCModal ref={modalRef} />
    </>
  );
}
