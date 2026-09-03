'use client';

import { useLocale, useTranslations } from 'next-intl';

import { StatusPill, type StatusPillVariant } from '@/components/circles/primitives';
import { ButtonType3 } from '@/components/custom/button';
import { circleUserDisplayName, useCircleUser } from '@/hooks/useCircleUsers';
import type {
  CirclePlan,
  CircleSubscription,
  CircleSubscriptionStatus,
} from '@/services/gql/types/circles';

import { CirclePriceLine } from './PlanPrice';

/**
 * What this circle is on, right now.
 *
 * ── THERE IS ALWAYS A PLAN ──────────────────────────────────────────────────
 * Every circle is created with an ACTIVE subscription in the same transaction
 * as the circle itself, and the free plan is priced at zero rather than being
 * absent. So this card never renders an "no plan yet" empty state and nothing
 * downstream branches on "has a subscription": that state does not exist.
 *
 * ── PAYING BUYS NO POWER ────────────────────────────────────────────────────
 * `purchasedByUserId` is recorded and confers nothing. It is shown WITH that
 * fact stated, because a payer's name displayed on its own invites exactly the
 * wrong inference in a circle whose entire premise is one member one vote. If
 * the line ever feels redundant, it is doing its job.
 *
 * ── STATUS IS A BARE DOMAIN STRING ──────────────────────────────────────────
 * `status` reads back as `ACTIVE` / `PAST_DUE` / `CANCELLED` / `EXPIRED` — the
 * prefixed `SUBSCRIPTION_*` spelling belongs only to gateway `@Args` filter
 * arguments, which this screen never sends. Matching on the prefixed form here
 * would fall through every branch and render a blank pill.
 */

const STATUS_VARIANT: Record<CircleSubscriptionStatus, StatusPillVariant> = {
  ACTIVE: 'success',
  // Overdue, not broken. The circle keeps working; this is a billing state.
  PAST_DUE: 'warning',
  // Neutral, not danger: a cancelled subscription means the circle is heading
  // back to the free plan, which is a plan, not a loss of service.
  CANCELLED: 'neutral',
  EXPIRED: 'neutral',
};

export interface CurrentPlanCardProps {
  subscription: CircleSubscription;
  /** The catalogue row, when the plan is still listed. Absent for a retired plan. */
  plan?: CirclePlan;
  /** Whether the viewer may act — LEAD only, matching the gateway's gate. */
  canManage: boolean;
  onCancel: () => void;
}

export function CurrentPlanCard({
  subscription,
  plan,
  canManage,
  onCancel,
}: CurrentPlanCardProps) {
  const t = useTranslations('circles.plan.current');
  const tCommon = useTranslations('circles.common');
  const locale = useLocale();

  const { user: payer } = useCircleUser(subscription.purchasedByUserId);

  const formatDate = (iso?: string | null) => {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
  };

  const periodEnd = formatDate(subscription.currentPeriodEnd);
  const startedOn = formatDate(subscription.createdAt);

  // `planCode` is DISPLAY ONLY — used here purely as a fallback label when the
  // plan has been retired from the catalogue. Nothing branches on it; what the
  // circle may do is the entitlement list, which is a different question.
  const planName = plan?.name || subscription.planCode || t('unnamedPlan');

  /*
   * Guarded rather than interpolated straight into `t()`. Status is a bare
   * domain string typed by hand against the gateway DTO, so an added state
   * would reach this component before this file knows about it — and a missing
   * message key renders as the key path, which is worse than the raw value.
   */
  const statusVariant = STATUS_VARIANT[subscription.status];
  const statusLabel = statusVariant
    ? t(`status.${subscription.status}`)
    : subscription.status;

  /*
   * Cancelling returns the circle to the DEFAULT plan, so offering it while the
   * circle is already on the default would be a no-op dressed up as an action.
   * When the plan is not in the catalogue at all (retired) the offer stands —
   * moving back to the current default is then a real change.
   */
  const onDefaultPlan = plan?.isDefault === true;
  const showCancel = canManage && !onDefaultPlan;

  return (
    <section className="rounded-2xl border border-border-subtle p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="caption-small text-text-secondary">{t('heading')}</p>
          <h2 className="heading-small text-text-primary">{planName}</h2>
        </div>
        <StatusPill variant={statusVariant ?? 'neutral'} label={statusLabel} />
      </div>

      <div className="mt-3">
        <CirclePriceLine
          amountMinor={subscription.amountMinor}
          currency={subscription.currency}
          interval={subscription.interval}
        />
      </div>

      {plan?.description && (
        <p className="body-small mt-2 text-text-secondary">{plan.description}</p>
      )}

      <dl className="mt-4 flex flex-col gap-2">
        {/*
          A scheduled cancellation is stated as a MOVE rather than an ending.
          "Your subscription ends on the 3rd" is technically true and reads as
          "the circle stops on the 3rd", which is not what happens at all.
        */}
        {subscription.cancelAtPeriodEnd && periodEnd && (
          <Row label={t('endingLabel')} value={periodEnd} />
        )}

        {!subscription.cancelAtPeriodEnd && periodEnd && (
          <Row label={t('renewsLabel')} value={periodEnd} />
        )}

        {startedOn && <Row label={t('sinceLabel')} value={startedOn} />}

        {subscription.purchasedByUserId && (
          <Row
            label={t('paidByLabel')}
            value={circleUserDisplayName(payer, tCommon('loading'))}
          />
        )}
      </dl>

      {subscription.purchasedByUserId && (
        <p className="caption-small mt-2 text-text-secondary">{t('payerNote')}</p>
      )}

      <p className="caption-small mt-3 text-text-secondary">{t('alwaysOnAPlan')}</p>

      {showCancel && (
        <ButtonType3 className="mt-3 px-0" onClick={onCancel}>
          {t('moveToFree')}
        </ButtonType3>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="caption-small text-text-secondary">{label}</dt>
      <dd className="label-small text-right text-text-primary">{value}</dd>
    </div>
  );
}
