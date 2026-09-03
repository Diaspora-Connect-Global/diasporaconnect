'use client';

import { ErrorState } from '@/components/feedback';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

/**
 * Route-level error boundary for the invite-link redeem screen.
 *
 * Copies the sibling `circles/error.tsx` pattern deliberately, including its
 * shared `feedback` copy: this catches a RENDER crash, which is a bug in our
 * code and has nothing to say about the invite link. Every refusal the link
 * itself can produce — expired, revoked, spent, unknown, circle full — is
 * handled inside `page.tsx` with its own words and never reaches this file.
 *
 * The logged error deliberately does NOT include the URL. The token is a
 * bearer credential and `console.error(window.location.href)` is the easiest
 * way on this screen to put a live one into a log or a bug report.
 */
export default function CircleJoinError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('feedback');

  useEffect(() => {
    console.error('Circle join route error:', error);
  }, [error]);

  return (
    <div className="flex h-app-inner items-center justify-center px-4">
      <ErrorState
        size="lg"
        title={t('error.title')}
        description={t('error.description')}
        retryLabel={t('error.retry')}
        onRetry={reset}
      />
    </div>
  );
}
