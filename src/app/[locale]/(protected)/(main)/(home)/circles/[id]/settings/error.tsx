'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { ErrorState } from '@/components/feedback';

/**
 * Error boundary for circle settings.
 *
 * Copies the sibling `circles/[id]/error.tsx` shape, including its reason for
 * a per-segment boundary: a crash while editing settings should say so and
 * `reset()` should retry only this segment, rather than the parent claiming it
 * could not load the circle at all.
 *
 * Recoverable data failures are handled INSIDE `CircleSettingsScreen` with an
 * inline retry — a failed `circle` query must not blank the whole screen. This
 * boundary is the backstop for a render-time throw.
 */
export default function CircleSettingsError({
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
    console.error('Circle settings route error:', error);
  }, [error]);

  return (
    <div className="flex h-app-inner items-center justify-center px-4">
      <ErrorState
        size="lg"
        title={tFeedback('error.title')}
        description={t('settings.loadFailed')}
        retryLabel={t('common.retry')}
        onRetry={reset}
      />
    </div>
  );
}
