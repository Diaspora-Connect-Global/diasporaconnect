'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { CreateChallengeForm } from '@/components/circles/challenge';
import { CircleFormScreen } from '@/components/circles/shell';

/**
 * Start a challenge.
 *
 * Its own route because of `verificationMode`: the choice is frozen the moment
 * the challenge is activated, seconds after this form is submitted, and there
 * is no path anywhere that changes it afterwards. A decision that permanent
 * should not be made inside a dialog that can be dismissed by a stray click.
 */
export default function NewCircleChallengePage() {
  const t = useTranslations('circles');
  const params = useParams();
  const circleId = String(params?.id ?? '');

  return (
    <CircleFormScreen title={t('newChallenge.title')} subtitle={t('newChallenge.subtitle')}>
      <CreateChallengeForm circleId={circleId} />
    </CircleFormScreen>
  );
}
