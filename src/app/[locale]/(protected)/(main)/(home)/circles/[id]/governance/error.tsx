'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { ErrorState } from '@/components/feedback';

/**
 * Error boundary for the governance rules view.
 *
 * Its own boundary rather than leaning on `circles/[id]/error.tsx` so a crash
 * here names what failed — "we couldn't load the governance rules" — and
 * `reset()` retries only this segment.
 *
 * Recoverable data failures are handled INSIDE the page with an inline retry;
 * this is the backstop for a render-time throw.
 */
export default function CircleGovernanceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('circles.governance');
  const tCommon = useTranslations('circles.common');
  // `ErrorState`'s own default title is hard-coded English; the shared feedback
  // catalogue already carries a translated one.
  const tFeedback = useTranslations('feedback');

  useEffect(() => {
    console.error('Circle governance route error:', error);
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
