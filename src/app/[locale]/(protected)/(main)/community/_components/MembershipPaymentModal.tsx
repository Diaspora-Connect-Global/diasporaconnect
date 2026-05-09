'use client';

import { useState, type FormEvent } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { StripeElementsOptions } from '@stripe/stripe-js';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ButtonType2, ButtonType3 } from '@/components/custom/button';
import { getStripe } from '@/lib/stripe';

// User-facing copy lives under the `community.payment` namespace in the
// locale messages. Cancel/processing remain under common.* since they are
// shared across the app.

interface MembershipPaymentModalProps {
  /** Controls modal visibility. */
  open: boolean;
  /** Stripe PaymentIntent / Subscription clientSecret returned from requestMembership. */
  clientSecret: string | null;
  /** Community being joined — used for display copy and the return_url. */
  communityId: string;
  communityName?: string;
  /** Called after Stripe confirms the payment in-modal (no redirect). */
  onSuccess: () => void;
  /** Called when the user dismisses the modal without paying. The membership
   *  remains in PENDING_PAYMENT on the backend; we do not auto-cancel. */
  onClose: () => void;
}

/**
 * Stripe Elements modal for paid community membership.
 *
 * Mirrors the convention used elsewhere in the app for clientSecret-based
 * payments: wrap PaymentElement in <Elements>, call confirmPayment with
 * redirect: 'if_required' so the success path stays in-modal.
 */
export function MembershipPaymentModal({
  open,
  clientSecret,
  communityId,
  communityName,
  onSuccess,
  onClose,
}: MembershipPaymentModalProps) {
  const t = useTranslations('community.payment');

  const options: StripeElementsOptions | undefined = clientSecret
    ? { clientSecret, appearance: { theme: 'stripe' } }
    : undefined;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {communityName
              ? t('descriptionWithName', { name: communityName })
              : t('description')}
          </DialogDescription>
        </DialogHeader>

        {clientSecret && options ? (
          <Elements stripe={getStripe()} options={options}>
            <MembershipPaymentForm
              communityId={communityId}
              onSuccess={onSuccess}
              onCancel={onClose}
            />
          </Elements>
        ) : (
          <div className="flex items-center justify-center py-8 text-text-secondary">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span>{t('preparing')}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface MembershipPaymentFormProps {
  communityId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function MembershipPaymentForm({
  communityId,
  onSuccess,
  onCancel,
}: MembershipPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const tCommon = useTranslations('common');
  const t = useTranslations('community.payment');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setErrorMessage(null);

    const returnUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/community/${communityId}`
        : '/';

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message ?? t('errorGeneric'));
      setSubmitting(false);
      return;
    }

    // No error and no redirect means the PaymentIntent is in a terminal state.
    if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess();
      return;
    }

    if (paymentIntent && paymentIntent.status === 'processing') {
      // Webhook will finalize the membership; treat as success from the UI
      // perspective so the join-card refreshes.
      onSuccess();
      return;
    }

    setErrorMessage(t('errorIncomplete'));
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      {errorMessage && (
        <p
          role="alert"
          className="text-sm text-red-600 dark:text-red-400"
        >
          {errorMessage}
        </p>
      )}

      <div className="flex justify-end gap-2 mt-2">
        <ButtonType3
          type="button"
          className="py-2 px-3"
          onClick={onCancel}
          disabled={submitting}
        >
          {tCommon('cancel')}
        </ButtonType3>
        <ButtonType2
          type="submit"
          className="py-2 px-3"
          disabled={!stripe || !elements || submitting}
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {tCommon('processing')}
            </span>
          ) : (
            t('pay')
          )}
        </ButtonType2>
      </div>
    </form>
  );
}
