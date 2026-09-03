'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';

import { ReportCircleForm } from '@/components/circles/report';
import { Link } from '@/i18n/navigation';
import { CIRCLE_COLUMN_CLASS } from '@/lib/feedColumnLayout';

/**
 * Report a circle to DiaspoPlug.
 *
 * The one route out of a circle. Everything else in Circles is the circle
 * deciding for itself — motions, votes, an audit trail the platform does not
 * arbitrate. This screen is where a member escalates PAST all of that, and it
 * exists only for illegal activity and platform-rule violations. The form's
 * intro paragraph says so plainly, because the alternative is a Trust & Safety
 * queue full of internal arguments the platform has no standing to settle.
 */
export default function CircleReportPage() {
  const t = useTranslations('circles.report');
  const tCommon = useTranslations('circles.common');
  const params = useParams();
  const circleId = String(params?.id ?? '');

  return (
    <div className="h-app-inner flex overflow-hidden">
      <div className={`${CIRCLE_COLUMN_CLASS} overflow-y-auto`}>
        <div className="mx-auto w-full max-w-md pb-8">
          <div className="mb-4 flex items-center">
            <Link
              href={`/circles/${circleId}`}
              aria-label={tCommon('back')}
              className="-ml-2 inline-flex size-9 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </Link>
          </div>

          <h1 className="heading-small mb-6 text-text-primary">{t('title')}</h1>

          <ReportCircleForm circleId={circleId} />
        </div>
      </div>
    </div>
  );
}
