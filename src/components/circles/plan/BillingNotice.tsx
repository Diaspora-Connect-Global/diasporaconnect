'use client';

import { Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { circlePlanIsFree } from '@/services/gql/circles-billing';
import type { CirclePlan } from '@/services/gql/types/circles';

/**
 * "You can't buy a paid plan here yet."
 *
 * Circles genuinely cannot be charged: payment-service has no subscription
 * model, so circle-service's billing port is a Noop and the only routes onto a
 * paid tier are a platform-admin grant and a plan priced at zero. Aiming
 * `changeCirclePlan` at a priced plan fails.
 *
 * The honest response to that is to show the catalogue with a way to reach a
 * human — which is a real route that works — and to say why the buy button is
 * missing. The dishonest response is a checkout that collects an intent it
 * cannot fulfil, or a silently disabled button that leaves a lead clicking at
 * nothing and assuming the app is broken.
 *
 * Rendered only when the catalogue actually contains something priced. On a
 * catalogue of free plans it is an answer to a question nobody asked.
 */
export interface BillingNoticeProps {
  plans: CirclePlan[];
}

export function BillingNotice({ plans }: BillingNoticeProps) {
  const t = useTranslations('circles.plan.billing');

  const hasPricedPlan = plans.some((plan) => !circlePlanIsFree(plan));
  if (!hasPricedPlan) return null;

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-subtle p-4">
      <div className="flex items-start gap-3">
        <Wallet aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-text-brand" />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="label-medium text-text-primary">{t('heading')}</h2>
          <p className="caption-small text-text-secondary">{t('body')}</p>
          <Link href="/contact" className="label-small mt-1 w-fit text-text-brand">
            {t('cta')}
          </Link>
        </div>
      </div>
    </section>
  );
}
