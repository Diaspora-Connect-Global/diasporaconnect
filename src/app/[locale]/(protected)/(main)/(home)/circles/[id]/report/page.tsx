'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { ReportCircleForm } from '@/components/circles/report';
import { CircleFormScreen } from '@/components/circles/shell';

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
  const params = useParams();
  const circleId = String(params?.id ?? '');

  return (
    <CircleFormScreen title={t('title')}>
      <ReportCircleForm circleId={circleId} />
    </CircleFormScreen>
  );
}
