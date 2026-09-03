'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';

import { CreateCircleScreen } from '@/components/circles/create';
import { Link } from '@/i18n/navigation';
import { CIRCLE_COLUMN_CLASS } from '@/lib/feedColumnLayout';

/**
 * Create a circle.
 *
 * Thin by design, matching `circles/[id]/page.tsx` and the settings route: it
 * owns the back link — which is route-level navigation, not part of the form —
 * and hands everything else to `CreateCircleScreen`. The state, the three
 * submit steps and both mutations live in `components/circles/create/`.
 *
 * `max-w-3xl` rather than the old `max-w-md`: the screen is now two columns on
 * desktop, and a measure sized for a single stacked column would squeeze them
 * both. It still centres, so the form does not stretch across a wide monitor.
 */
export default function CreateCirclePage() {
  const t = useTranslations('circles');

  return (
    <div className="h-app-inner flex overflow-hidden">
      <div className={CIRCLE_COLUMN_CLASS}>
        <div className="mx-auto w-full max-w-3xl">
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

          <CreateCircleScreen />
        </div>
      </div>
    </div>
  );
}
