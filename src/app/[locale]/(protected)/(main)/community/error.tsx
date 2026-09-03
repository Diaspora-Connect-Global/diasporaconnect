'use client';

import { ErrorState } from '@/components/feedback';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

export default function CommunityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('feedback');

  useEffect(() => {
    console.error('Community route error:', error);
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
