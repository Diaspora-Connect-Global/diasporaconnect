// components/KYCVerification.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
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
  const isRejected = !isVerified && (liveStatus === 'REJECTED' || liveStatus === 'EXPIRED');
  const isPending =
    !isVerified &&
    (liveStatus === 'SUBMITTED' ||
      liveStatus === 'PENDING' ||
      liveStatus === 'UNDER_REVIEW');

  const openModal = () => modalRef.current?.open();

  const linkClass =
    "mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#1F5FD6] cursor-pointer rounded-md hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5FD6]";

  let body;
  if (isVerified) {
    body = (
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-text-success">
          <CheckCircleIcon size={22} weight="fill" aria-hidden />
          {t('verified')}
        </span>
        {kycLevel > 0 && (
          <span className="text-xs text-text-secondary">{t('level', { level: kycLevel })}</span>
        )}
      </div>
    );
  } else if (isPending) {
    body = (
      <>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#1F5FD6]">
          <ClockIcon size={22} weight="fill" aria-hidden />
          {t('pending')}
        </span>
        <p className="mt-1.5 text-sm text-text-secondary">{t('pendingHint')}</p>
      </>
    );
  } else if (isRejected) {
    body = (
      <>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-text-danger">
          <WarningCircleIcon size={22} weight="fill" aria-hidden />
          {t('rejected')}
        </span>
        {rejectionReason && (
          <p className="mt-1.5 text-sm text-text-secondary break-words">{rejectionReason}</p>
        )}
        <button type="button" onClick={openModal} className={linkClass}>
          {t('tryAgain')}
          <ArrowRightIcon size={16} aria-hidden />
        </button>
      </>
    );
  } else {
    body = (
      <>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-text-danger">
          <WarningCircleIcon size={22} weight="fill" aria-hidden />
          {t('notVerified')}
        </span>
        <p className="mt-1.5 text-sm text-text-secondary">{t('notVerifiedHint')}</p>
        <button type="button" onClick={openModal} className={linkClass}>
          {t('verifyIdentity')}
          <ArrowRightIcon size={16} aria-hidden />
        </button>
      </>
    );
  }

  return (
    <>
      <Card className="h-full gap-0 py-0 rounded-2xl border-[#E7ECF5] shadow-none">
        <CardContent className="p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-[#1B2A5E] dark:text-text-primary">
            <ShieldCheckIcon size={20} className="text-[#1F5FD6]" aria-hidden />
            {t('title')}
          </h2>
          <div className="mt-3">{body}</div>
        </CardContent>
      </Card>

      <CompleteKYCModal ref={modalRef} />
    </>
  );
}
