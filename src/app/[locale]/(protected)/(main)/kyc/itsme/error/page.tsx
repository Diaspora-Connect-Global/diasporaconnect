'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { XCircle } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { ButtonType2, ButtonType3 } from '@/components/custom/button';

/**
 * Landing page for the itsme OIDC callback error redirect.
 *
 * kyc-service redirects to `/kyc/itsme/error?reason=<reason>` on failure
 * (see kyc.webhook.controller.ts: reasons include the OIDC `error`,
 * `missing_params`, the rejected status string, or `server_error`).
 */
function reasonToMessage(reason: string | null): string {
  switch (reason) {
    case 'missing_params':
      return 'The verification link was incomplete. Please start again.';
    case 'server_error':
      return 'Something went wrong on our end while verifying you. Please try again.';
    case 'access_denied':
      return 'Verification was cancelled. You can try again whenever you are ready.';
    case null:
    case '':
      return 'We could not complete your itsme verification.';
    default:
      return `Verification could not be completed (${reason}). Please try again.`;
  }
}

function ItsmeErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <XCircle className="mb-4 h-16 w-16 text-text-warning" />
      <h1 className="heading-medium text-text-primary mb-2">Verification failed</h1>
      <p className="body-large text-text-secondary mb-6 max-w-md">
        {reasonToMessage(reason)}
      </p>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link href="/verifykyc" className="w-full">
          <ButtonType2 size="lg" className="rounded-xl w-full">
            Try again
          </ButtonType2>
        </Link>
        <Link href="/profile" className="w-full">
          <ButtonType3 size="lg" className="rounded-xl w-full">
            Back to profile
          </ButtonType3>
        </Link>
      </div>
    </div>
  );
}

export default function ItsmeErrorPage() {
  return (
    <Suspense fallback={null}>
      <ItsmeErrorContent />
    </Suspense>
  );
}
