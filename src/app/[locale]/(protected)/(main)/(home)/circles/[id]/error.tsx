'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { ErrorState } from '@/components/feedback';

/**
 * Error boundary for one circle.
 *
 * Distinct from `circles/error.tsx` (the index) so a crash inside a single
 * circle says so — "We couldn't load this circle", not "we couldn't load your
 * circles" — and `reset()` retries only this segment.
 *
 * Recoverable data failures are handled INSIDE `CircleHome` with an inline
 * retry, because a failed motions query should not blank the conversation. This
 * boundary is the backstop for a render-time throw.
 */
export default function CircleHomeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('circles');
  // `ErrorState`'s own default title is hard-coded English; the shared feedback
  // catalogue already carries a translated one.
  const tFeedback = useTranslations('feedback');

  useEffect(() => {
    console.error('Circle home route error:', error);
  }, [error]);

  return (
    <div className="flex h-app-inner items-center justify-center px-4">
      <ErrorState
        size="lg"
        title={tFeedback('error.title')}
        description={t('errors.loadCircle')}
        retryLabel={t('common.retry')}
        onRetry={reset}
      />
    </div>
  );
}
