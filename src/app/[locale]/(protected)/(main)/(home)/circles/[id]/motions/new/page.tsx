'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { ProposeMotionForm } from '@/components/circles/governance';
import { PinnedRuleNotice } from '@/components/circles/governance';
import { CircleFormScreen } from '@/components/circles/shell';

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
    <CircleFormScreen
      title={t('newMotion.title')}
      subtitle={t('newMotion.subtitle')}
      notice={<PinnedRuleNotice />}
    >
      <ProposeMotionForm circleId={circleId} />
    </CircleFormScreen>
  );
}
