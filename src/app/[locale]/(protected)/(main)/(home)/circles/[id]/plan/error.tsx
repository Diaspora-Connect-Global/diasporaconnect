'use client';

import { ErrorState } from '@/components/feedback';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

/**
 * Route-level error boundary for the plan screen — the same shape as
 * `circles/error.tsx`, so a crash here looks like a crash anywhere else in the
 * feature rather than like something specific to billing.
 *
 * This catches a RENDER failure. A failed READ is handled inside the page,
 * which can say the more useful thing ("we couldn't load your plan") and offer
 * a refetch instead of a remount.
 */
export default function CirclePlanError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('feedback');

  useEffect(() => {
    console.error('Circle plan route error:', error);
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
