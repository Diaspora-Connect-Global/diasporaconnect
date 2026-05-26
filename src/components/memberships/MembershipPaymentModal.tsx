'use client';

import { useState, useMemo, useEffect } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
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
import { openPaystackMobileMoney } from '@/lib/paystack';
import {
  CONFIRM_PAYMENT_INTENT,
  MY_PAYMENT_METHODS,
} from '@/services/gql/payments';
import type {
  ConfirmPaymentIntentResponse,
  ConfirmPaymentIntentInput,
  MyPaymentMethodsResponse,
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

  // Mirror the paid-events flow: look up the user's saved Stripe card via
  // MY_PAYMENT_METHODS instead of collecting it inline. Lazy so we don't
  // hit the BE until the user actually reaches the pay step.
  const [fetchMyPaymentMethods] = useLazyQuery<MyPaymentMethodsResponse>(
    MY_PAYMENT_METHODS,
    { fetchPolicy: 'network-only' },
  );

  const getPrimaryStripeCardPaymentMethodId = async (): Promise<string | null> => {
    const { data } = await fetchMyPaymentMethods();
    const methods = data?.myPaymentMethods?.payment_methods ?? [];
    const stripeCards = methods.filter(
      (m) => m.provider === 'STRIPE' && m.type === 'card',
    );
    const primary = stripeCards.find((m) => Boolean(m.is_primary));
    return (primary ?? stripeCards[0])?.id ?? null;
  };

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

        {step === 'pay' && requestResult?.clientSecret && (
          <PayStep
            entity={entity}
            membershipId={requestResult.membershipId}
            paymentIntentIdHint={
              requestResult.paymentIntentId ??
              parsePaymentIntentIdFromClientSecret(requestResult.clientSecret)
            }
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            userEmail={userEmail ?? null}
            getPrimaryStripeCardPaymentMethodId={getPrimaryStripeCardPaymentMethodId}
            confirmPaymentIntent={async (input) => {
              await confirmPaymentIntent({ variables: { input } });
            }}
            onBackToPlan={() => setStep('plan')}
            onPaid={handlePaidSuccess}
          />
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
  membershipId: string;
  paymentIntentIdHint: string | null;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  userEmail: string | null;
  getPrimaryStripeCardPaymentMethodId: () => Promise<string | null>;
  confirmPaymentIntent: (input: ConfirmPaymentIntentInput) => Promise<void>;
  onBackToPlan: () => void;
  onPaid: (membershipId: string) => void;
}

function PayStep({
  entity,
  membershipId,
  paymentIntentIdHint,
  paymentMethod,
  onPaymentMethodChange,
  userEmail,
  getPrimaryStripeCardPaymentMethodId,
  confirmPaymentIntent,
  onBackToPlan,
  onPaid,
}: PayStepProps) {
  const t = useTranslations('membership.payment');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Saved-card lookup state. `null` means "haven't checked yet"; `''` means
  // checked and none found; otherwise the saved Stripe card's id. Matches
  // paid-events pattern — user must add a card in the wallet first.
  const [savedCardId, setSavedCardId] = useState<string | null>(null);
  const [cardCheckLoading, setCardCheckLoading] = useState(true);

  // Pre-flight the saved-card lookup when the step mounts so the UI can show
  // either the "Pay with saved card" button or the "Add card in wallet"
  // fallback immediately, without making the user click first to find out.
  useEffect(() => {
    let cancelled = false;
    setCardCheckLoading(true);
    getPrimaryStripeCardPaymentMethodId()
      .then((id) => {
        if (!cancelled) setSavedCardId(id ?? '');
      })
      .catch(() => {
        if (!cancelled) setSavedCardId('');
      })
      .finally(() => {
        if (!cancelled) setCardCheckLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [getPrimaryStripeCardPaymentMethodId]);

  const price = entity.access.price;

  const handleStripeSubmit = async () => {
    if (submitting) return;
    if (!paymentIntentIdHint) {
      setErrorMessage(t('errors.confirmFailed'));
      return;
    }
    if (!savedCardId) {
      setErrorMessage(t('errors.noSavedCard'));
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await confirmPaymentIntent({
        payment_intent_id: paymentIntentIdHint,
        payment_method_id: savedCardId,
        provider: 'STRIPE',
      });
      onPaid(membershipId);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.confirmFailed');
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
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
      <fieldset className="space-y-2">
        <legend className="text-sm text-text-primary">{t('step2.title')}</legend>
        <div className="grid grid-cols-2 gap-2">
          <label
            className={`flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm ${
              paymentMethod === 'card'
                ? 'border-border-brand bg-surface-brand-subtle text-text-brand'
                : 'border-border-subtle bg-surface-default text-text-primary'
            }`}
          >
            <input
              type="radio"
              name="membership-method"
              value="card"
              checked={paymentMethod === 'card'}
              onChange={() => onPaymentMethodChange('card')}
              className="sr-only"
            />
            {t('step2.methodCard')}
          </label>
          <label
            className={`flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm ${
              paymentMethod === 'mobile'
                ? 'border-border-brand bg-surface-brand-subtle text-text-brand'
                : 'border-border-subtle bg-surface-default text-text-primary'
            }`}
          >
            <input
              type="radio"
              name="membership-method"
              value="mobile"
              checked={paymentMethod === 'mobile'}
              onChange={() => onPaymentMethodChange('mobile')}
              className="sr-only"
            />
            {t('step2.methodMobile')}
          </label>
        </div>
      </fieldset>

      {paymentMethod === 'card' ? (
        <div className="space-y-4">
          {cardCheckLoading ? (
            <p className="inline-flex items-center gap-2 text-sm text-text-secondary">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('step2.checkingCard')}
            </p>
          ) : savedCardId ? (
            <p className="text-sm text-text-secondary">{t('step2.savedCardReady')}</p>
          ) : (
            <div className="space-y-2 rounded-md border border-border-subtle bg-surface-default p-3">
              <p className="text-sm text-text-primary">{t('errors.noSavedCard')}</p>
              <Link
                href="/wallet"
                className="text-sm text-text-brand underline underline-offset-2"
              >
                {t('step2.addCardCta')}
              </Link>
            </div>
          )}
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
              onClick={handleStripeSubmit}
              disabled={submitting || cardCheckLoading || !savedCardId}
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
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">{t('step2.methodMobile')}</p>
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
