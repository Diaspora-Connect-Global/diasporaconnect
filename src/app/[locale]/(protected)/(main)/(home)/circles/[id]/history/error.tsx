'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { ErrorState } from '@/components/feedback';

/**
 * Error boundary for the decision history.
 *
 * Its own boundary rather than leaning on `circles/[id]/error.tsx` so a crash
 * here says what actually failed — "we couldn't load the decision history", not
 * "we couldn't load this circle" — and `reset()` retries only this segment.
 *
 * Recoverable data failures are handled INSIDE the page with an inline retry.
 * This is the backstop for a render-time throw. Note that it says nothing about
 * the hash chain: a component crash is a bug in this app and is not evidence
 * about the integrity of the circle's record, and implying otherwise would be
 * the worst possible misreading of this screen.
 */
export default function CircleHistoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('circles.history');
  const tCommon = useTranslations('circles.common');
  // `ErrorState`'s own default title is hard-coded English; the shared feedback
  // catalogue already carries a translated one.
  const tFeedback = useTranslations('feedback');

  useEffect(() => {
    console.error('Circle history route error:', error);
  }, [error]);

  return (
    <div className="flex h-app-inner items-center justify-center px-4">
      <ErrorState
        size="lg"
        title={tFeedback('error.title')}
        description={t('error.load')}
        retryLabel={tCommon('retry')}
        onRetry={reset}
      />
    </div>
  );
}
