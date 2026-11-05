"use client";

import { useCallback, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useLazyQuery, useMutation } from "@apollo/client/react";
import {
  CREATE_PRODUCT_ORDER,
  CREATE_SERVICE_ORDER,
} from "@/services/gql/marketplace";
import {
  CONFIRM_PAYMENT_INTENT,
  GET_PAYMENT_INTENT,
  type ConfirmPaymentIntentResponse,
  type GetPaymentIntentResponse,
} from "@/services/gql/payments";
import type {
  CreateProductOrderResponse,
  CreateServiceOrderResponse,
} from "@/services/gql/types/marketplace";
import {
  handleMarketplaceError,
  mapMarketplaceErrorToAction,
} from "@/lib/marketplace-error-mapper";
import {
  isPaidIntentStatus,
  resolvePaymentIntentId,
  runCheckout,
  type CheckoutDeps,
  type OrderAttempt,
} from "@/lib/marketplaceCheckout";
import { openPaystackMobileMoney, openPaystackCard } from "@/lib/paystack";
import { useUserStore } from "@/store/useUserStore";
import type { PaymentContext, PaymentResult, PaymentMethod, ShippingAddress } from "../types";

/**
 * Connects the checkout rules in @/lib/marketplaceCheckout to Apollo and the
 * payment providers. Apollo runs errorPolicy 'all' here, so a refused mutation
 * RESOLVES with data: null: every answer below is read from `data`, never assumed
 * from the call having returned.
 */
export function useMarketplacePayment() {
  const [isPaying, setIsPaying] = useState(false);
  const [lastResult, setLastResult] = useState<PaymentResult | null>(null);
  // Orders created but not yet paid. Outlives each press of Pay: a retry resumes
  // these rather than creating and charging new ones.
  const attempts = useRef(new Map<string, OrderAttempt>());
  // isPaying only takes effect on the next render; a double press must not start twice.
  const inFlight = useRef(false);
  const locale = useLocale();
  const router = useRouter();
  const userEmail = useUserStore((state) => state.user?.email);
  const [createProductOrder] =
    useMutation<CreateProductOrderResponse>(CREATE_PRODUCT_ORDER);
  const [createServiceOrder] =
    useMutation<CreateServiceOrderResponse>(CREATE_SERVICE_ORDER);
  const [confirmPaymentIntent] =
    useMutation<ConfirmPaymentIntentResponse>(CONFIRM_PAYMENT_INTENT);
  const [fetchPaymentIntent] = useLazyQuery<GetPaymentIntentResponse>(
    GET_PAYMENT_INTENT,
    { fetchPolicy: "network-only" }
  );

  const pay = useCallback(
    async (
      ctx: PaymentContext,
      method: PaymentMethod,
      shippingAddress?: ShippingAddress
    ): Promise<PaymentResult> => {
      if (inFlight.current) return { success: false };
      inFlight.current = true;
      setIsPaying(true);

      // A refused mutation carries its error here rather than throwing. An expired
      // session still has to reach the sign-in redirect.
      const redirectIfSignedOut = (error: unknown) => {
        if (error && mapMarketplaceErrorToAction(error) === "AUTH_REDIRECT") {
          handleMarketplaceError({ error, locale, router });
        }
      };

      const readOrderReply = (
        reply: { success?: boolean; order?: { id?: string; total_amount?: number } | null } | null | undefined,
        error: unknown
      ) => {
        redirectIfSignedOut(error);
        if (!reply?.success || !reply.order?.id) return {};
        return {
          orderId: reply.order.id,
          paymentIntentId: resolvePaymentIntentId(reply),
          totalMinor: reply.order.total_amount,
        };
      };

      const deps: CheckoutDeps = {
        hasEmail: Boolean(userEmail),
        createOrder: async (order) => {
          if (order.kind === "product") {
            const { data, error } = await createProductOrder({
              variables: { input: order.input },
            });
            return readOrderReply(data?.createProductOrder, error);
          }
          const { data, error } = await createServiceOrder({
            variables: { input: order.input },
          });
          return readOrderReply(data?.createServiceOrder, error);
        },
        isIntentPaid: async (id) => {
          const { data } = await fetchPaymentIntent({ variables: { id } });
          return isPaidIntentStatus(data?.getPaymentIntent?.payment_intent?.status);
        },
        takePaystackPayment: async ({ amountMinor, currency, method: chosen, paymentIntentId }) => {
          const open = chosen === "mobile" ? openPaystackMobileMoney : openPaystackCard;
          const { reference } = await open({
            email: userEmail ?? "",
            amountInPesewas: amountMinor,
            currency,
            paymentIntentId,
          });
          return reference;
        },
        confirm: async (input) => {
          const { data, error } = await confirmPaymentIntent({
            variables: { input },
          });
          redirectIfSignedOut(error);
          const reply = data?.confirmPaymentIntent;
          if (!reply) return "unknown";
          return reply.success && !reply.requires_action ? "confirmed" : "refused";
        },
      };

      try {
        const outcome = await runCheckout({
          cart: ctx.kind === "cart" ? ctx.cart : [{ ...ctx.item, isService: true }],
          method,
          shippingAddress,
          attempts: attempts.current,
          deps,
        });
        const result: PaymentResult = {
          success: outcome.success,
          reference: outcome.orderIds[0],
          paid: outcome.paid,
          failure: outcome.failure,
        };
        setLastResult(result);
        return result;
      } finally {
        inFlight.current = false;
        setIsPaying(false);
      }
    },
    [
      confirmPaymentIntent,
      createProductOrder,
      createServiceOrder,
      fetchPaymentIntent,
      locale,
      router,
      userEmail,
    ]
  );

  return { pay, isPaying, lastResult };
}
