'use client';

import { useTranslations } from 'next-intl';

import { StatusPill } from '@/components/circles/primitives';
import { ButtonType1 } from '@/components/custom/button';
import { Link } from '@/i18n/navigation';
import { circlePlanIsFree } from '@/services/gql/circles-billing';
import type { CirclePlan } from '@/services/gql/types/circles';

import { buildCircleAllowances } from './allowances';
import { AllowanceValue } from './PlanAllowances';
import { PlanPriceList } from './PlanPrice';

/**
 * The plan catalogue.
 *
 * ── NO UPGRADE, NO DOWNGRADE ────────────────────────────────────────────────
 * Plans are listed in the catalogue's own `sortOrder`, never ranked, and no
 * card says "upgrade", "better", "more" or "pro". Entitlements are defined per
 * plan by an admin, so a costlier plan is not guaranteed to be a superset of a
 * cheaper one — it might raise the member cap and drop custom branding. Any
 * word implying direction would be a claim the data cannot support. The
 * operation is `changeCirclePlan`, and the button says "switch".
 *
 * ── NO CHECKOUT, BECAUSE THERE IS NO CHECKOUT ───────────────────────────────
 * Circles cannot be charged: payment-service has no subscription model and
 * circle-service's billing port is a Noop. A priced plan is therefore shown
 * with an honest "not available yet" and a way to talk to a human, NOT a
 * payment button that would fail after the user has committed to it. Free
 * plans (and admin-granted ones) are the only routes onto a tier today, and a
 * zero-priced plan does switch for real, which is why that button is live.
 */

export interface PlanCatalogueProps {
  plans: CirclePlan[];
  /** The plan the circle is on, badged rather than offered. */
  currentPlanId?: string | null;
  /** LEAD only — matching `assertCircleLead` on the gateway mutation. */
  canManage: boolean;
  onChoose: (plan: CirclePlan) => void;
}

export function PlanCatalogue({
  plans,
  currentPlanId,
  canManage,
  onChoose,
}: PlanCatalogueProps) {
  const t = useTranslations('circles.plan.catalogue');

  const ordered = [...plans].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="heading-xsmall text-text-primary">{t('heading')}</h2>
        <p className="caption-small text-text-secondary">{t('intro')}</p>
      </div>

      {ordered.length === 0 ? (
        <p className="body-small text-text-secondary">{t('unavailable')}</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {ordered.map((plan) => (
            <li key={plan.id} className="flex">
              <PlanCard
                plan={plan}
                isCurrent={plan.id === currentPlanId}
                canManage={canManage}
                onChoose={onChoose}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Only a lead may change the plan; saying so beats an unexplained absence. */}
      {!canManage && (
        <p className="caption-small text-text-secondary">{t('leadOnly')}</p>
      )}
    </section>
  );
}

interface PlanCardProps {
  plan: CirclePlan;
  isCurrent: boolean;
  canManage: boolean;
  onChoose: (plan: CirclePlan) => void;
}

function PlanCard({ plan, isCurrent, canManage, onChoose }: PlanCardProps) {
  const t = useTranslations('circles.plan.catalogue');
  const tAllowance = useTranslations('circles.plan.allowance');

  // The plan's entitlements with no usage attached: this describes what the
  // plan COVERS, not what the circle is using. Passing the circle's usage in
  // here would read as "you have 40 of 20" on a plan it is not even on.
  const allowances = buildCircleAllowances(plan.entitlements, null);

  const purchasable = circlePlanIsFree(plan);

  return (
    <article className="flex w-full flex-col rounded-2xl border border-border-subtle p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="label-large text-text-primary">{plan.name}</h3>
          {plan.description && (
            <p className="caption-small text-text-secondary">{plan.description}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {isCurrent && <StatusPill variant="brand" label={t('current')} />}
          {!isCurrent && plan.isDefault && (
            <StatusPill variant="neutral" label={t('default')} />
          )}
        </div>
      </div>

      <div className="mt-3">
        <PlanPriceList plan={plan} />
      </div>

      <dl className="mt-4 flex flex-1 flex-col gap-1.5 border-t border-border-subtle pt-3">
        {allowances.map((allowance) => (
          <div key={allowance.key} className="flex items-baseline justify-between gap-3">
            <dt className="caption-small text-text-secondary">
              {tAllowance(`name.${allowance.key}`)}
            </dt>
            <dd className="caption-small text-right text-text-primary">
              <AllowanceValue allowance={allowance} />
            </dd>
          </div>
        ))}
      </dl>

      {!isCurrent && canManage && (
        <div className="mt-4">
          {purchasable ? (
            <ButtonType1 onClick={() => onChoose(plan)}>{t('switchTo')}</ButtonType1>
          ) : (
            /*
             * A priced plan gets a route to a person, not a disabled button
             * with no explanation and not a checkout that cannot complete. The
             * sentence above it says why, so this reads as "here is how", not
             * "you are blocked".
             *
             * Deliberately a text link rather than a button: a bordered pill
             * here would sit in the same visual slot as the free plans' real
             * "Switch to this plan" button and read as its equivalent, which is
             * exactly the impression this screen must not give.
             */
            <div className="flex flex-col gap-1.5">
              <p className="caption-small text-text-secondary">{t('notPurchasable')}</p>
              <Link href="/contact" className="label-small w-fit text-text-brand">
                {t('contactUs')}
              </Link>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
