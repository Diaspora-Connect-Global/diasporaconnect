'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

import {
  BillingNotice,
  buildCircleAllowances,
  CancelToFreeDialog,
  ChangePlanDialog,
  CurrentPlanCard,
  PlanAllowances,
  PlanCatalogue,
} from '@/components/circles/plan';
import { EmptyState, ErrorState } from '@/components/feedback';
import { ButtonType1 } from '@/components/custom/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, useRouter } from '@/i18n/navigation';
import { CIRCLE_COLUMN_CLASS } from '@/lib/feedColumnLayout';
import { CIRCLE_PLAN_SCREEN } from '@/services/gql/circles-billing';
import type {
  CirclePlanScreenData,
  CirclePlanScreenVariables,
} from '@/services/gql/types/circles-billing';
import type { CirclePlan } from '@/services/gql/types/circles';

/**
 * Screen — Plan & usage.
 *
 * What this circle is on, what that allows, and what it is currently using.
 *
 * ── EVERY CIRCLE IS ON A PLAN ───────────────────────────────────────────────
 * There is no such thing as a circle without a subscription: the free one is
 * created in the same transaction as the circle and is priced at zero rather
 * than being absent. So this screen has NO "no plan yet" empty state. A null
 * `circleSubscription` means one of exactly two things — the viewer is not a
 * member (the gateway's member gate returns null, not an error), or the read
 * failed — and both are rendered as what they are. Rendering an absence-of-plan
 * state for either would be a lie about the product.
 *
 * ── LEAD GATES THE ACTIONS, NOT THE SCREEN ──────────────────────────────────
 * Any member may see the plan and the usage; that is the whole point, since
 * usage explains why an action is refused. `changeCirclePlan` and
 * `cancelCircleSubscription` are LEAD-gated on the gateway, so the buttons
 * follow `myCircleMembership.isLead` — and the catalogue says so rather than
 * silently omitting them.
 *
 * ── AND THE LEAD GATE IS NOT THE LAST WORD ──────────────────────────────────
 * CHANGE_PLAN is also a MotionKind. A circle whose own rules require a vote for
 * it will have the direct mutation refused by circle-service no matter who
 * calls it. That refusal is the circle's governance working, and it surfaces as
 * a message in the dialog rather than being retried or hidden.
 */
export default function CirclePlanPage() {
  const params = useParams();
  const router = useRouter();

  const t = useTranslations('circles.plan');
  const tCommon = useTranslations('circles.common');
  const tGlobal = useTranslations('common');

  const circleId = typeof params.id === 'string' ? params.id : '';

  const [planToChange, setPlanToChange] = useState<CirclePlan | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data, loading, error, refetch } = useQuery<
    CirclePlanScreenData,
    CirclePlanScreenVariables
  >(CIRCLE_PLAN_SCREEN, {
    variables: { circleId },
    skip: !circleId,
    // The two MEMBER-gated roots are nullable, so a refusal nulls only those
    // and still delivers the catalogue and the membership verdict — which is
    // precisely what the "members only" branch below needs to tell a refusal
    // apart from a failure.
    errorPolicy: 'all',
  });

  const subscription = data?.circleSubscription ?? null;
  const entitlements = data?.circleEntitlements ?? null;
  const plans = useMemo(() => data?.circlePlans ?? [], [data?.circlePlans]);
  const membership = data?.myCircleMembership ?? null;

  /*
   * The subscription's entitlements are SNAPSHOTTED at purchase; `circleEntitlements`
   * resolves the live picture and is the only one carrying usage. Prefer it, and
   * fall back to the snapshot so a partial failure still shows what the circle
   * may do — with no usage counts rather than invented ones.
   */
  const allowances = useMemo(
    () =>
      buildCircleAllowances(
        entitlements?.entitlements ?? subscription?.entitlements,
        entitlements?.usage,
      ),
    [entitlements, subscription],
  );

  const currentPlan = useMemo(
    () => plans.find((plan) => plan.id === subscription?.planId),
    [plans, subscription?.planId],
  );

  const canManage = membership?.isLead === true;

  const header = (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => router.push(`/circles/${circleId}`)}
        aria-label={tGlobal('previousPage')}
        className="cursor-pointer rounded-full p-1.5 text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
      >
        <ArrowLeft className="size-5" />
      </button>
      <h1 className="label-large text-text-primary">{t('title')}</h1>
    </div>
  );

  const shell = (children: ReactNode) => (
    <div className="h-app-inner flex overflow-hidden">
      <div className={CIRCLE_COLUMN_CLASS}>
        {header}
        {children}
      </div>
    </div>
  );

  if (loading && !subscription) {
    return shell(
      <div className="flex flex-col gap-4 py-4">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-5 w-40" />
        {[...Array(4)].map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>,
    );
  }

  /*
   * A non-member is told the plan is member-visible — NOT that the circle has
   * no plan. The gateway returns null here rather than an error, so this branch
   * has to draw the distinction the response does not.
   */
  if (membership && !membership.isMember) {
    return shell(
      <EmptyState
        size="lg"
        title={t('membersOnly.title')}
        description={t('membersOnly.description')}
        action={
          <Link href={`/circles/${circleId}`}>
            <ButtonType1>{tCommon('back')}</ButtonType1>
          </Link>
        }
      />,
    );
  }

  // No subscription for a member means the read failed, never "no plan".
  if (!subscription) {
    return shell(
      <div className="flex flex-1 items-center justify-center">
        <ErrorState
          size="lg"
          description={t('loadError')}
          retryLabel={tCommon('retry')}
          onRetry={() => void refetch()}
        />
      </div>,
    );
  }

  return (
    <>
      {shell(
        <div className="flex flex-col gap-6 py-4">
          {/* A partial failure that still produced a subscription is worth naming. */}
          {error && (
            <p className="caption-small text-text-secondary">{t('partialLoad')}</p>
          )}

          <CurrentPlanCard
            subscription={subscription}
            plan={currentPlan}
            canManage={canManage}
            onCancel={() => setCancelOpen(true)}
          />

          <PlanAllowances
            entitlements={entitlements?.entitlements ?? subscription.entitlements}
            usage={entitlements?.usage}
          />

          <BillingNotice plans={plans} />

          <PlanCatalogue
            plans={plans}
            currentPlanId={subscription.planId}
            canManage={canManage}
            onChoose={setPlanToChange}
          />
        </div>,
      )}

      <ChangePlanDialog
        circleId={circleId}
        plan={planToChange}
        currentAllowances={allowances}
        currentCurrency={subscription.currency}
        onOpenChange={(open) => {
          if (!open) setPlanToChange(null);
        }}
        onChanged={() => void refetch()}
      />

      <CancelToFreeDialog
        circleId={circleId}
        open={cancelOpen}
        currentPeriodEnd={subscription.currentPeriodEnd}
        onOpenChange={setCancelOpen}
        onCancelled={() => void refetch()}
      />
    </>
  );
}
