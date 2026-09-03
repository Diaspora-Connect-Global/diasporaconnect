'use client';

import type { ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { useLocale, useTranslations } from 'next-intl';
import { Scale } from 'lucide-react';

import { BillingNotice, CirclePriceLine } from '@/components/circles/plan';
import { StatusPill, type StatusPillVariant } from '@/components/circles/primitives';
import { ButtonType1 } from '@/components/custom/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { circleEntitlementLimit, findCircleEntitlement } from '@/services/gql/circles';
import { CIRCLE_PLAN_SCREEN } from '@/services/gql/circles-billing';
import type { CircleSubscriptionStatus } from '@/services/gql/types/circles';
import type {
  CirclePlanScreenData,
  CirclePlanScreenVariables,
} from '@/services/gql/types/circles-billing';

import { SettingsSection } from './SettingsSection';

/**
 * Plan & billing, inside settings.
 *
 * ── A SUMMARY, NOT A SECOND PLAN SCREEN ─────────────────────────────────────
 * `/circles/[id]/plan` owns the catalogue, the capacity cards and the change
 * flow. This panel answers only the questions a settings screen is asked — what
 * are we on, when is the next bill, how much, and what is it charged to — and
 * hands off for the rest. It reads `CIRCLE_PLAN_SCREEN`, the same query that
 * route uses, so following the button lands on a screen already warm in the
 * cache instead of a spinner.
 *
 * ── THE CALLOUT IS THE POINT OF THE PANEL ───────────────────────────────────
 * Money and governance are deliberately separate in a circle: `purchasedByUserId`
 * is recorded and confers nothing, and there is no rpc anywhere that lets a
 * payer decide anything alone. A billing screen is precisely where people
 * assume the opposite, so the rule is stated here rather than left implied.
 *
 * ── NO CHECKOUT, AND NO CARD ────────────────────────────────────────────────
 * Circles cannot be charged today: payment-service has no subscription model,
 * circle-service's billing port is a Noop, and the only routes onto a paid plan
 * are a platform-admin grant or a plan priced at zero. There is therefore no
 * stored payment method to show and no update flow to run. The row says so in
 * words and offers the route that does work — talking to a human. A disabled
 * "Update" button would be the same claim with worse manners: it would say a
 * card exists and the app is merely broken.
 *
 * ── MONEY ───────────────────────────────────────────────────────────────────
 * `amountMinor` is an INTEGER in minor units all the way here. `CirclePriceLine`
 * is the single ÷100, and it takes the subscription's own currency — nothing in
 * this file names a currency or does arithmetic on an amount.
 */

/** Same mapping as `CurrentPlanCard`; the two are read side by side. */
const STATUS_VARIANT: Record<CircleSubscriptionStatus, StatusPillVariant> = {
  ACTIVE: 'success',
  PAST_DUE: 'warning',
  CANCELLED: 'neutral',
  EXPIRED: 'neutral',
};

export interface CirclePlanBillingSectionProps {
  circleId: string;
}

export function CirclePlanBillingSection({ circleId }: CirclePlanBillingSectionProps) {
  const t = useTranslations('circles.settings.plan');
  const tCurrent = useTranslations('circles.plan.current');
  const tGovernance = useTranslations('circles.plan.governance');
  const locale = useLocale();

  const { data, loading } = useQuery<
    CirclePlanScreenData,
    CirclePlanScreenVariables
  >(CIRCLE_PLAN_SCREEN, {
    variables: { circleId },
    skip: !circleId,
    // The two member-gated roots are nullable, so a refusal nulls only those
    // and the rest of the response still arrives.
    errorPolicy: 'all',
  });

  const subscription = data?.circleSubscription ?? null;
  const plans = data?.circlePlans ?? [];
  const plan = plans.find((row) => row.id === subscription?.planId);
  const canManage = data?.myCircleMembership?.isLead === true;

  /*
   * Live entitlements first, the purchase-time snapshot as a fallback. Both
   * describe the same circle; the live read is the one carrying usage, and
   * falling back means a partial failure still shows what the plan covers.
   */
  const entitlements =
    data?.circleEntitlements?.entitlements ?? subscription?.entitlements ?? null;

  /*
   * `null` is UNLIMITED, never zero — the wire sends `intValue: 0` with
   * `hasIntValue: false` because proto3 has no nullable int, and reading that
   * 0 as a cap would tell an unlimited circle it may have no members at all.
   * `circleEntitlementLimit` is what encodes the rule; never touch `intValue`.
   */
  const memberLimit = circleEntitlementLimit(
    findCircleEntitlement(entitlements, 'MAX_MEMBERS'),
  );

  const formatDate = (iso?: string | null) => {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
  };

  const periodEnd = formatDate(subscription?.currentPeriodEnd);

  const planLink = (label: string) => (
    <Link href={`/circles/${circleId}/plan`} className="w-fit shrink-0">
      <ButtonType1>{label}</ButtonType1>
    </Link>
  );

  const body = () => {
    if (loading && !subscription) {
      return (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      );
    }

    /*
     * A member with no subscription means the READ failed — never "this circle
     * has no plan". Every circle is created with an ACTIVE free subscription in
     * the same transaction as the circle itself, so that state does not exist
     * and rendering an absence-of-plan message would be a lie about the
     * product.
     */
    if (!subscription) {
      return (
        <p className="body-small text-text-secondary">{t('loadFailed')}</p>
      );
    }

    const statusVariant = STATUS_VARIANT[subscription.status];
    // `planCode` is DISPLAY ONLY, used here purely as the label for a plan that
    // has been retired from the catalogue. Nothing in this file branches on it —
    // what the circle may do is the entitlement list, a different question.
    const planName = plan?.name || subscription.planCode || tCurrent('unnamedPlan');

    return (
      <div className="flex flex-col gap-4">
        {/* ── Current plan ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border-subtle p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="heading-xsmall text-text-primary">{planName}</h3>
                <StatusPill
                  variant={statusVariant ?? 'neutral'}
                  label={
                    statusVariant
                      ? tCurrent(`status.${subscription.status}`)
                      : subscription.status
                  }
                />
              </div>
              <p className="caption-small text-text-secondary">
                {memberLimit === null
                  ? t('membersUnlimited')
                  : t('membersIncluded', {
                      limit: new Intl.NumberFormat(locale).format(memberLimit),
                    })}
              </p>
            </div>

            {/*
              A lead may change the plan; every other member may still read the
              catalogue, so the row navigates either way and only the label
              changes. Hiding it from members would leave "why can't we add
              anyone?" unanswerable from the screen that raises it.
            */}
            {planLink(canManage ? t('changePlan') : t('seePlans'))}
          </div>

          <dl className="mt-4 flex flex-col gap-2 border-t border-border-subtle pt-3">
            {periodEnd && (
              <Row
                /*
                  A scheduled cancellation is a MOVE, not an ending: the circle
                  lands on the free plan, it does not stop. Same wording as the
                  plan screen so the two never contradict each other.
                */
                label={
                  subscription.cancelAtPeriodEnd
                    ? tCurrent('endingLabel')
                    : t('nextBillingLabel')
                }
                value={periodEnd}
              />
            )}

            <Row
              label={t('amountLabel')}
              value={
                <CirclePriceLine
                  amountMinor={subscription.amountMinor}
                  currency={subscription.currency}
                  interval={subscription.interval}
                  className="label-small"
                />
              }
            />
          </dl>
        </div>

        {/*
          ── NO PAYMENT-METHOD ROW, DELIBERATELY ──────────────────────────
          `CircleSubscription` carries no card, no last-four, no expiry and no
          provider reference, because there is nothing to carry: circles cannot
          be charged at all yet — payment-service has no subscription model and
          circle-service's billing port is a Noop, so the only routes onto a
          paid plan are a platform-admin grant or a plan priced at zero.

          A "•••• 4242 / Update" row would therefore be invented data attached
          to a flow that cannot run, and a disabled Update button would make the
          same false claim more quietly — it says a card exists and the app is
          merely broken. `BillingNotice` is the honest answer that already
          ships, in five locales: it explains why there is no self-serve
          purchase and offers the route that does work. It renders itself only
          when the catalogue actually contains a priced plan.
        */}
        <BillingNotice plans={plans} />

        {/* ── The rule ──────────────────────────────────────────────────── */}
        <div className="rounded-xl bg-surface-brand-light p-4 text-text-brand">
          <div className="flex items-start gap-3">
            <Scale aria-hidden className="mt-0.5 size-5 shrink-0" />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="label-medium">{tGovernance('title')}</p>
              <p className="body-small">{tGovernance('body')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <SettingsSection title={t('title')} description={t('description')}>
      {body()}
    </SettingsSection>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <dt className="caption-small text-text-secondary">{label}</dt>
      <dd className="label-small text-right text-text-primary">{value}</dd>
    </div>
  );
}
