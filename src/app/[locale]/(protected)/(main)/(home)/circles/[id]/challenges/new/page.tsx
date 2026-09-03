'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';

import { CreateChallengeForm } from '@/components/circles/challenge';
import { Link } from '@/i18n/navigation';
import { CIRCLE_COLUMN_CLASS } from '@/lib/feedColumnLayout';

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
            <h1 className="heading-small text-text-primary">{t('newChallenge.title')}</h1>
            <p className="body-small mt-1 text-text-secondary">
              {t('newChallenge.subtitle')}
            </p>
          </div>

          <CreateChallengeForm circleId={circleId} />
        </div>
      </div>
    </div>
  );
}
