'use client';

import { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { useRouter, Link } from '@/i18n/navigation';
import { ButtonType2, ButtonType3 } from '@/components/custom/button';
import { useKYCVerification, isVerifiedKycStatus } from '@/hooks/useKYCVerification';

/**
 * Landing page for the itsme OIDC callback success redirect.
 *
 * kyc-service redirects the browser to `/kyc/itsme/success` after a successful
 * code exchange (see kyc.webhook.controller.ts). next-intl middleware prefixes
 * the active locale, so the route lives under [locale]/(protected)/(main).
 *
 * On mount we refetch getMyKYCStatus so the rest of the app reflects the new
 * verified state, then poll briefly in case the webhook is still settling.
 */
export default function ItsmeSuccessPage() {
  const router = useRouter();
  const { status, refetchStatus, refetchProfile, pollStatus } = useKYCVerification();

  useEffect(() => {
    void refetchStatus();
    void refetchProfile();
    // Poll briefly (status may lag the redirect by a moment).
    void pollStatus({ timeoutMs: 30000, intervalMs: 3000 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verified = isVerifiedKycStatus(status?.status);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <CheckCircle className="mb-4 h-16 w-16 text-text-success" />
      <h1 className="heading-medium text-text-primary mb-2">
        Identity verification submitted
      </h1>
      <p className="body-large text-text-secondary mb-6 max-w-md">
        {verified
          ? 'Your identity has been verified. You now have access to higher limits and the verified badge.'
          : 'Thanks — we received your itsme verification and are finalising it. This usually only takes a moment.'}
      </p>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <ButtonType2
          size="lg"
          className="rounded-xl w-full"
          onClick={() => router.push('/profile')}
        >
          Go to profile
        </ButtonType2>
        <Link href="/" className="w-full">
          <ButtonType3 size="lg" className="rounded-xl w-full">
            Back home
          </ButtonType3>
        </Link>
      </div>
    </div>
  );
}
