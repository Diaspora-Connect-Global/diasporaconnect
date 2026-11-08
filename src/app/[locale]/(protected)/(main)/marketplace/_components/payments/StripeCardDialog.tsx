"use client";

import { useState, type FormEvent } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import { getStripe } from "@/lib/stripe";
import { formatMoney } from "@/types/money";

export interface CardPaymentRequest {
  clientSecret: string;
  /** Integer minor units. Divided by 100 once, here, for display. */
  amountMinor: number;
  currency: string;
}

/**
 * The card form for a USD/EUR/GBP marketplace order.
 *
 * "succeeded" only means Stripe accepted the card in this browser. It is NOT proof of
 * payment: the order is paid when the server has recorded Stripe's signed webhook, and
 * the checkout asks the server that (see waitForStripeRecord in @/lib/marketplaceCheckout).
 * Closing the dialog is "cancelled".
 */
export function StripeCardDialog({
  request,
  onClose,
}: {
  request: CardPaymentRequest | null;
  onClose: (result: "succeeded" | "cancelled") => void;
}) {
  const t = useTranslations("marketplacePage.cardDialog");
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const amount = request ? formatMoney(request.amountMinor, request.currency, locale) : "";

  return (
    <Dialog
      open={Boolean(request)}
      // Once the card is being charged, closing would hide the outcome from the customer.
      onOpenChange={(open) => {
        if (!open && !busy) onClose("cancelled");
      }}
    >
      <DialogContent showCloseButton={false} className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description", { amount })}</DialogDescription>
        </DialogHeader>
        {request && (
          <Elements
            // A new payment gets a fresh form: Elements cannot change its client secret.
            key={request.clientSecret}
            stripe={getStripe()}
            options={{ clientSecret: request.clientSecret, appearance: { theme: "stripe" } }}
          >
            <CardForm amount={amount} busy={busy} setBusy={setBusy} onClose={onClose} />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CardForm({
  amount,
  busy,
  setBusy,
  onClose,
}: {
  amount: string;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onClose: (result: "succeeded" | "cancelled") => void;
}) {
  const t = useTranslations("marketplacePage.cardDialog");
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        // Stay on the page unless the card's bank insists on a redirect.
        redirect: "if_required",
      });
      if (stripeError) {
        setError(stripeError.message || t("genericError"));
        return;
      }
      if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
        onClose("succeeded");
        return;
      }
      setError(t("genericError"));
    } catch {
      setError(t("genericError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
      <PaymentElement onLoadError={() => setError(t("loadError"))} />
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <ButtonType3
          type="button"
          className="min-h-11 px-4 py-2"
          onClick={() => onClose("cancelled")}
          disabled={busy}
        >
          {t("cancelCta")}
        </ButtonType3>
        <ButtonType2
          type="submit"
          className="min-h-11 px-4 py-2"
          disabled={!stripe || !elements || busy}
        >
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t("processing")}
            </span>
          ) : (
            t("payCta", { amount })
          )}
        </ButtonType2>
      </div>
    </form>
  );
}
