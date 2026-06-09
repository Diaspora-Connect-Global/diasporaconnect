'use client';

import { useState, useMemo, useEffect, type FormEvent } from 'react';
import { useMutation } from '@apollo/client/react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { StripeElementsOptions } from '@stripe/stripe-js';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, CreditCard, Smartphone, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ButtonType2, ButtonType3 } from '@/components/custom/button';
import { Link } from '@/i18n/navigation';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { openPaystackMobileMoney } from '@/lib/paystack';
import { isMobileMoneySupported } from '@/types/money';
import { CONFIRM_PAYMENT_INTENT } from '@/services/gql/payments';
import type {
  ConfirmPaymentIntentResponse,
  ConfirmPaymentIntentInput,
} from '@/services/gql/payments';
import { useUserStore } from '@/store/useUserStore';
import type {
  MembershipEntity,
  RequestMembershipResult,
  SubscriptionPeriod,
} from '@/types/membership';

export interface MembershipPaymentModalProps {
  open: boolean;
  onClose: () => void;
  entity: MembershipEntity;
  /**
   * Caller-supplied invocation of REQUEST_MEMBERSHIP_{kind}. The modal calls
   * this from Step 1 once the user confirms the plan. Returning the envelope
   * lets the modal branch into Stripe or Paystack without knowing the
   * mutation shape.
   *
   * Callers should: send entityId + entityType, include `period` when the
   * entity uses SUBSCRIPTION billing, and translate BE errors into thrown
   * Error instances.
   */
  requestMembership: (args: {
    entityId: string;
    entityKind: 'community' | 'association';
    period?: SubscriptionPeriod;
  }) => Promise<RequestMembershipResult>;
  /** Fired once payment is fully confirmed (or no payment was needed). */
  onSuccess: (membershipId: string) => void;
  /** Optional override for the success-step CTA href. */
  successHref?: string;
}

type Step = 'plan' | 'pay' | 'done';
type PaymentMethod = 'card' | 'mobile';

/**
 * Membership payment modal — entity-agnostic (community + association).
 *
 * v1 deviation from contracts §3: the modal does NOT receive `provider` /
 * `paymentIntentId` / `subscriptionId` from the BE envelope. Instead it mirrors
 * the paid-events pattern: user picks the rail in Step 2 ("Card" → Stripe,
 * "Mobile Money" → Paystack). The paymentIntentId is parsed from the
 * Stripe-format `clientSecret` (`pi_xxx_secret_yyy`). See
 * /tmp/payments-coder-notes.md.
 */
export function MembershipPaymentModal({
  open,
  onClose,
  entity,
  requestMembership,
  onSuccess,
  successHref,
}: MembershipPaymentModalProps) {
  const t = useTranslations('membership.payment');
  const locale = useLocale();
  const userEmail = useUserStore((s) => s.user?.email);

  const { paymentType, price, subscriptionPeriods } = entity.access;
  const isSubscription = paymentType === 'SUBSCRIPTION';
  const availablePeriods: SubscriptionPeriod[] = useMemo(() => {
    if (!isSubscription) return [];
    const fromAccess = subscriptionPeriods?.length ? subscriptionPeriods : null;
    return fromAccess ?? (['monthly', 'yearly'] as SubscriptionPeriod[]);
  }, [isSubscription, subscriptionPeriods]);

  const [step, setStep] = useState<Step>('plan');
  const [selectedPeriod, setSelectedPeriod] = useState<SubscriptionPeriod | undefined>(
    isSubscription ? availablePeriods[0] : undefined,
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [requestResult, setRequestResult] = useState<RequestMembershipResult | null>(null);
  const [planSubmitting, setPlanSubmitting] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const [confirmPaymentIntent] = useMutation<
    ConfirmPaymentIntentResponse,
    { input: ConfirmPaymentIntentInput }
  >(CONFIRM_PAYMENT_INTENT);

  const stripeOptions: StripeElementsOptions | undefined =
    requestResult?.clientSecret
      ? { clientSecret: requestResult.clientSecret, appearance: { theme: 'stripe' } }
      : undefined;

  const formatAmount = (value: number, currency: string): string => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `${currency} ${value.toFixed(2)}`;
    }
  };

  const priceLabel = useMemo(() => {
    if (!price) return null;
    const amount = price.amountInCents / 100;
    const base = formatAmount(amount, price.currency);
    if (isSubscription && selectedPeriod) {
      return `${base}/${selectedPeriod}`;
    }
    return base;
  }, [price, isSubscription, selectedPeriod, locale]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetTransient = () => {
    setPlanError(null);
    setPlanSubmitting(false);
  };

  const handleClose = () => {
    // Reset to a safe baseline so the next open starts fresh. We intentionally
    // do not auto-cancel any in-flight membership; the BE leaves PENDING_PAYMENT
    // memberships claimable on retry (idempotency key = membershipId).
    setStep('plan');
    setRequestResult(null);
    setPaymentMethod('card');
    setSelectedPeriod(isSubscription ? availablePeriods[0] : undefined);
    resetTransient();
    onClose();
  };

  const handleContinue = async () => {
    if (planSubmitting) return;
    setPlanError(null);
    setPlanSubmitting(true);
    try {
      const envelope = await requestMembership({
        entityId: entity.id,
        entityKind: entity.kind,
        period: isSubscription ? selectedPeriod : undefined,
      });
      setRequestResult(envelope);

      // BE returns a stale PENDING row when the user already has a
      // pending request for this entity — short-circuits the create
      // path with `requiresPayment: false` and a message explaining
      // it. Without this branch we'd silently jump to the "done"
      // success state for a paid entity that the user never paid for.
      // Detect the stuck state by paid-entity + PENDING + !clientSecret
      // and surface the BE message so the user can act on it.
      const isPaidEntity =
        entity.access.paymentType === 'ONE_TIME' ||
        entity.access.paymentType === 'SUBSCRIPTION';
      if (
        isPaidEntity &&
        !envelope.requiresPayment &&
        envelope.status === 'PENDING' &&
        !envelope.clientSecret
      ) {
        const stuckMessage =
          envelope.message ||
          t('errors.alreadyPending');
        toast.error(stuckMessage);
        setPlanError(stuckMessage);
        return;
      }

      if (!envelope.requiresPayment) {
        onSuccess(envelope.membershipId);
        setStep('done');
        return;
      }

      if (!envelope.clientSecret) {
        // Shouldn't happen if requiresPayment===true under v1 contracts.
        setPlanError(t('errors.confirmFailed'));
        return;
      }
      setStep('pay');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.network');
      setPlanError(message);
      toast.error(message);
    } finally {
      setPlanSubmitting(false);
    }
  };

  // Auto-advance Step 1 for one-time payments — there's nothing to pick
  // (no subscription period), so the "Choose your plan" intermediate step
  // is pure noise. Matches paid-events, which has no equivalent step at
  // all. For SUBSCRIPTION entities we still show Step 1 so the user can
  // pick monthly/yearly.
  useEffect(() => {
    if (!open) return;
    if (step !== 'plan') return;
    if (isSubscription) return;
    if (planSubmitting) return;
    if (requestResult) return; // already fired (e.g. coming back from pay step)
    void handleContinue();
    // handleContinue is stable per render; deps intentionally minimal to
    // avoid re-firing once it transitions step → 'pay'.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, isSubscription, planSubmitting, requestResult]);

  const handlePaidSuccess = (membershipId: string) => {
    onSuccess(membershipId);
    setStep('done');
  };

  // Parse 'pi_xxx' from 'pi_xxx_secret_yyy'. Same approach paid-events uses.
  const parsePaymentIntentIdFromClientSecret = (clientSecret: string): string | null => {
    const marker = '_secret';
    const idx = clientSecret.indexOf(marker);
    if (idx <= 0) return null;
    return clientSecret.slice(0, idx);
  };

  const computedSuccessHref =
    successHref ?? (entity.kind === 'community' ? `/community/${entity.id}` : `/association/${entity.id}`);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'done' ? t('step3.success') : t('step1.title')}
          </DialogTitle>
          <DialogDescription>
            {entity.name}
            {priceLabel ? ` · ${priceLabel}` : ''}
          </DialogDescription>
        </DialogHeader>

        {step === 'plan' && (
          <PlanStep
            isSubscription={isSubscription}
            availablePeriods={availablePeriods}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            priceLabel={priceLabel}
            planError={planError}
            submitting={planSubmitting}
            onCancel={handleClose}
            onContinue={handleContinue}
          />
        )}

        {step === 'pay' && requestResult?.clientSecret && stripeOptions && isStripeConfigured() && (
          <Elements stripe={getStripe()} options={stripeOptions}>
            <PayStep
              entity={entity}
              clientSecret={requestResult.clientSecret}
              membershipId={requestResult.membershipId}
              paymentIntentIdHint={
                requestResult.paymentIntentId ??
                parsePaymentIntentIdFromClientSecret(requestResult.clientSecret)
              }
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              userEmail={userEmail ?? null}
              confirmPaymentIntent={async (input) => {
                await confirmPaymentIntent({ variables: { input } });
              }}
              onBackToPlan={() => setStep('plan')}
              onPaid={handlePaidSuccess}
            />
          </Elements>
        )}

        {/* Stripe publishable key not configured in this deployment.
            Fail loudly and clearly instead of letting Stripe.js throw an
            IntegrationError("empty string") into the console. */}
        {step === 'pay' && requestResult?.clientSecret && !isStripeConfigured() && (
          <div className="space-y-4">
            <div className="rounded-md border border-border-subtle bg-surface-warning/10 p-3">
              <p className="text-sm text-text-primary font-medium">{t('errors.stripeNotConfiguredTitle')}</p>
              <p className="text-sm text-text-secondary mt-1">{t('errors.stripeNotConfiguredBody')}</p>
            </div>
            <div className="flex justify-end gap-2">
              <ButtonType3
                type="button"
                className="py-2 px-3"
                onClick={() => setStep('plan')}
              >
                {t('step1.cancelCta')}
              </ButtonType3>
            </div>
          </div>
        )}

        {step === 'done' && (
          <DoneStep
            entityKind={entity.kind}
            entityName={entity.name}
            successHref={computedSuccessHref}
            status={requestResult?.status ?? 'ACTIVE'}
            onClose={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================================
 * Step 1 — Plan & disclosure
 * ============================================================================ */

interface PlanStepProps {
  isSubscription: boolean;
  availablePeriods: SubscriptionPeriod[];
  selectedPeriod?: SubscriptionPeriod;
  onPeriodChange: (period: SubscriptionPeriod) => void;
  priceLabel: string | null;
  planError: string | null;
  submitting: boolean;
  onCancel: () => void;
  onContinue: () => void;
}

function PlanStep({
  isSubscription,
  availablePeriods,
  selectedPeriod,
  onPeriodChange,
  priceLabel,
  planError,
  submitting,
  onCancel,
  onContinue,
}: PlanStepProps) {
  const t = useTranslations('membership.payment');

  return (
    <div className="space-y-4">
      {isSubscription && availablePeriods.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm text-text-primary">{t('step1.title')}</legend>
          <div className="flex gap-2">
            {availablePeriods.map((period) => (
              <label
                key={period}
                className={`flex-1 cursor-pointer rounded-md border px-3 py-2 text-sm capitalize ${
                  selectedPeriod === period
                    ? 'border-border-brand bg-surface-brand-subtle text-text-brand'
                    : 'border-border-subtle bg-surface-default text-text-primary'
                }`}
              >
                <input
                  type="radio"
                  name="membership-period"
                  value={period}
                  checked={selectedPeriod === period}
                  onChange={() => onPeriodChange(period)}
                  className="sr-only"
                />
                {period}
              </label>
            ))}
          </div>
          {priceLabel && (
            <p className="text-xs text-text-secondary">
              {t('step1.subscriptionDisclosure', { price: priceLabel })}
            </p>
          )}
        </fieldset>
      )}

      {!isSubscription && priceLabel && (
        <p className="text-sm text-text-primary">{priceLabel}</p>
      )}

      {planError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {planError}
        </p>
      )}

      <div className="flex justify-end gap-2 mt-2">
        <ButtonType3 type="button" className="py-2 px-3" onClick={onCancel} disabled={submitting}>
          {t('step1.cancelCta')}
        </ButtonType3>
        <ButtonType2
          type="button"
          className="py-2 px-3"
          onClick={onContinue}
          disabled={submitting || (isSubscription && !selectedPeriod)}
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('step1.continueCta')}
            </span>
          ) : (
            t('step1.continueCta')
          )}
        </ButtonType2>
      </div>
    </div>
  );
}

/* ============================================================================
 * Step 2 — Pay (Stripe or Paystack, user-picked)
 * ============================================================================ */

interface PayStepProps {
  entity: MembershipEntity;
  clientSecret: string;
  membershipId: string;
  paymentIntentIdHint: string | null;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  userEmail: string | null;
  confirmPaymentIntent: (input: ConfirmPaymentIntentInput) => Promise<void>;
  onBackToPlan: () => void;
  onPaid: (membershipId: string) => void;
}

function PayStep({
  entity,
  clientSecret,
  membershipId,
  paymentIntentIdHint,
  paymentMethod,
  onPaymentMethodChange,
  userEmail,
  confirmPaymentIntent,
  onBackToPlan,
  onPaid,
}: PayStepProps) {
  // clientSecret is consumed by the parent's <Elements> wrapper, not directly here.
  // Keep it as a prop so the contract stays explicit.
  void clientSecret;
  const t = useTranslations('membership.payment');
  const stripe = useStripe();
  const elements = useElements();

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const price = entity.access.price;

  // Mobile money (Paystack) settles GHS only. Hide it for non-GHS-priced
  // entities; the backend rejects a non-GHS charge on the mobile-money rail.
  const listingCurrency = (price?.currency ?? 'GHS').toUpperCase();
  const mobileMoneyAvailable = isMobileMoneySupported(listingCurrency);

  useEffect(() => {
    if (!mobileMoneyAvailable && paymentMethod === 'mobile') {
      onPaymentMethodChange('card');
    }
  }, [mobileMoneyAvailable, paymentMethod, onPaymentMethodChange]);

  // Inline Stripe submit. Cards are NOT saved — the PaymentIntent has no
  // setup_future_usage on it (BE default), so this is a one-shot charge.
  // `redirect: 'if_required'` keeps the flow inside the modal for 3DS-less
  // cards; only flows that NEED 3DS will leave the page.
  const handleStripeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErrorMessage(null);

    const returnUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/${entity.kind}/${entity.id}`
        : '/';

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message ?? t('errors.cardDeclined'));
      setSubmitting(false);
      return;
    }

    const status = paymentIntent?.status;
    if (status === 'succeeded' || status === 'processing') {
      // Inform BE so the payment-service can publish the confirmed event
      // even if the webhook is slow / dropped. Matches the paid-events
      // post-confirm pattern.
      try {
        const intentId = paymentIntent?.id ?? paymentIntentIdHint;
        if (intentId) {
          await confirmPaymentIntent({
            payment_intent_id: intentId,
            payment_method_id: intentId,
            provider: 'STRIPE',
          });
        }
        onPaid(membershipId);
      } catch (err) {
        const message = err instanceof Error ? err.message : t('errors.confirmFailed');
        setErrorMessage(message);
        setSubmitting(false);
      }
      return;
    }

    setErrorMessage(t('errors.confirmFailed'));
    setSubmitting(false);
  };

  const handlePaystack = async () => {
    if (!price || !userEmail || submitting) {
      if (!userEmail) setErrorMessage(t('errors.network'));
      return;
    }
    if (!paymentIntentIdHint) {
      setErrorMessage(t('errors.confirmFailed'));
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const { reference } = await openPaystackMobileMoney({
        email: userEmail,
        amountInPesewas: price.amountInCents,
        currency: price.currency,
      });
      await confirmPaymentIntent({
        payment_intent_id: paymentIntentIdHint,
        payment_method_id: reference,
        provider: 'PAYSTACK',
      });
      onPaid(membershipId);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.confirmFailed');
      if (message === 'Payment cancelled.') {
        // User dismissed Paystack popup — treat as recoverable, return to plan.
        toast.info(t('errors.paystackCancelled'));
        onBackToPlan();
        return;
      }
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Method picker — visually mirrors the paid-events modal at
          (home)/events/[id]/Step2.tsx so the two surfaces feel like the
          same app. Big icon buttons with descriptions instead of radio
          chips; selected state shows a checkmark. */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-text-primary">{t('step2.title')}</h3>

        <button
          type="button"
          onClick={() => onPaymentMethodChange('card')}
          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
            paymentMethod === 'card'
              ? 'border-border-brand bg-surface-brand/5'
              : 'border-border-subtle bg-surface-subtle hover:bg-surface-hover'
          }`}
        >
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ${
              paymentMethod === 'card'
                ? 'bg-surface-brand text-text-white'
                : 'bg-surface-default text-text-primary'
            }`}
          >
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-text-primary text-sm">{t('step2.methodCard')}</p>
            <p className="text-xs text-text-secondary mt-0.5">{t('step2.cardSubtitle')}</p>
          </div>
          {paymentMethod === 'card' && (
            <CheckCircle2 className="w-5 h-5 text-text-brand flex-shrink-0" />
          )}
        </button>

        {mobileMoneyAvailable && (
          <button
            type="button"
            onClick={() => onPaymentMethodChange('mobile')}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
              paymentMethod === 'mobile'
                ? 'border-border-brand bg-surface-brand/5'
                : 'border-border-subtle bg-surface-subtle hover:bg-surface-hover'
            }`}
          >
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ${
                paymentMethod === 'mobile'
                  ? 'bg-surface-brand text-text-white'
                  : 'bg-surface-default text-text-primary'
              }`}
            >
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-text-primary text-sm">{t('step2.methodMobile')}</p>
              <p className="text-xs text-text-secondary mt-0.5">{t('step2.mobileSubtitle')}</p>
            </div>
            {paymentMethod === 'mobile' && (
              <CheckCircle2 className="w-5 h-5 text-text-brand flex-shrink-0" />
            )}
          </button>
        )}
      </div>

      {paymentMethod === 'card' ? (
        <form onSubmit={handleStripeSubmit} className="space-y-4">
          {/* Stripe Elements card form — collects card number / expiry / CVC
              inline. Default behavior: one-shot charge, card is NOT saved
              (PaymentIntent has no setup_future_usage). */}
          <PaymentElement />
          {errorMessage && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <ButtonType3
              type="button"
              className="py-2 px-3"
              onClick={onBackToPlan}
              disabled={submitting}
            >
              {t('step1.cancelCta')}
            </ButtonType3>
            <ButtonType2
              type="submit"
              className="py-2 px-3"
              disabled={!stripe || !elements || submitting}
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('step2.payCta')}
                </span>
              ) : (
                t('step2.payCta')
              )}
            </ButtonType2>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {/* Mobile money: the Paystack inline form (network + phone number)
              opens when the user clicks Pay. Same hosted-form flow paid-events
              uses. We don't reimplement the form because Paystack already
              renders one — embedded in a popup that overlays this modal. */}
          <p className="text-sm text-text-secondary">{t('step2.mobileHint')}</p>
          {errorMessage && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <ButtonType3
              type="button"
              className="py-2 px-3"
              onClick={onBackToPlan}
              disabled={submitting}
            >
              {t('step1.cancelCta')}
            </ButtonType3>
            <ButtonType2
              type="button"
              className="py-2 px-3"
              onClick={handlePaystack}
              disabled={submitting || !userEmail}
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('step2.payCta')}
                </span>
              ) : (
                t('step2.payCta')
              )}
            </ButtonType2>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * Step 3 — Result
 * ============================================================================ */

interface DoneStepProps {
  entityKind: 'community' | 'association';
  entityName: string;
  successHref: string;
  status: RequestMembershipResult['status'];
  onClose: () => void;
}

function DoneStep({ entityKind, entityName, successHref, status, onClose }: DoneStepProps) {
  const t = useTranslations('membership.payment');
  const isPending = status === 'PENDING';

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-primary">
        {isPending ? t('step3.pendingApproval') : t('step3.success')}
      </p>
      <p className="text-sm text-text-secondary">{entityName}</p>
      <div className="flex justify-end gap-2 mt-2">
        <Link href={successHref} prefetch={false} onClick={onClose}>
          <ButtonType2 type="button" className="py-2 px-3">
            {t('step3.goToEntityCta', { kind: entityKind })}
          </ButtonType2>
        </Link>
      </div>
    </div>
  );
}
