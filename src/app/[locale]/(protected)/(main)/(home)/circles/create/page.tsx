'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';

import { CreateCircleForm } from '@/components/circles/index';
import { Link } from '@/i18n/navigation';
import { CIRCLE_COLUMN_CLASS } from '@/lib/feedColumnLayout';

export default function CreateCirclePage() {
  const t = useTranslations('circles');

  return (
    <div className="h-app-inner flex overflow-hidden">
      <div className={CIRCLE_COLUMN_CLASS}>
        <div className="mx-auto w-full max-w-md">
          <div className="mb-4 flex items-center">
            <Link
              href="/circles"
              /*
               * A link, not `router.back()`: this page is reachable directly
               * (and from the empty state), and "back" would then leave the
               * feature entirely. The label is borrowed from
               * `errors.notFound.cta` — the only "Back to Circles" string in the
               * catalogue today; `circles.common.back` is the key it wants.
               */
              aria-label={t('errors.notFound.cta')}
              className="-ml-2 inline-flex size-9 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </Link>
          </div>

          <div className="mb-6 text-center">
            <h1 className="heading-small text-text-primary">
              {t('create.title')}
            </h1>
            <p className="body-small mt-1 text-text-secondary">
              {t('create.subtitle')}
            </p>
          </div>

          <CreateCircleForm />
        </div>
      </div>
    </div>
  );
}
