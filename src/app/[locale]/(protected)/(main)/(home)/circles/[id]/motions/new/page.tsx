'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';

import { ProposeMotionForm } from '@/components/circles/governance';
import { PinnedRuleNotice } from '@/components/circles/governance';
import { Link } from '@/i18n/navigation';
import { CIRCLE_COLUMN_CLASS } from '@/lib/feedColumnLayout';

/**
 * Propose a motion — the general governance entry point.
 *
 * `PinnedRuleNotice` sits above the form because the rule shown beside the
 * chosen kind is TODAY'S rule, and the motion will pin its own copy the moment
 * it opens. A member reading "half the circle must vote" here should know that
 * is the number their motion keeps, not a number that can move under it.
 */
export default function NewCircleMotionPage() {
  const t = useTranslations('circles');
  const params = useParams();
  const circleId = String(params?.id ?? '');

  return (
    <div className="h-app-inner flex overflow-hidden">
      <div className={`${CIRCLE_COLUMN_CLASS} overflow-y-auto`}>
        <div className="mx-auto w-full max-w-md pb-8">
          <div className="mb-4 flex items-center">
            <Link
              href={`/circles/${circleId}`}
              aria-label={t('common.back')}
              className="-ml-2 inline-flex size-9 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="heading-small text-text-primary">{t('newMotion.title')}</h1>
            <p className="body-small mt-1 text-text-secondary">
              {t('newMotion.subtitle')}
            </p>
          </div>

          <PinnedRuleNotice className="mb-6" />

          <ProposeMotionForm circleId={circleId} />
        </div>
      </div>
    </div>
  );
}
