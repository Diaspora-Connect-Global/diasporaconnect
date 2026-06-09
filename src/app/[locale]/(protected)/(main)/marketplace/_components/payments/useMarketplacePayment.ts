"use client";

import { useCallback, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useLazyQuery, useMutation } from "@apollo/client/react";
import {
  CREATE_PRODUCT_ORDER,
  CREATE_SERVICE_ORDER,
} from "@/services/gql/marketplace";
import {
  CONFIRM_PAYMENT_INTENT,
  MY_PAYMENT_METHODS,
  type ConfirmPaymentIntentResponse,
  type MyPaymentMethodsResponse,
} from "@/services/gql/payments";
import type {
  CreateProductOrderResponse,
  CreateServiceOrderResponse,
  CreateProductOrderInput,
  CreateServiceOrderInput,
} from "@/services/gql/types/marketplace";
import { handleMarketplaceError } from "@/lib/marketplace-error-mapper";
import { toMinorUnits } from "@/types/money";
import { openPaystackMobileMoney } from "@/lib/paystack";
import { useUserStore } from "@/store/useUserStore";
import type { PaymentContext, PaymentResult, PaymentMethod } from "../types";

/**
 * Payment integration seam for Marketplace.
 * Today it just simulates a successful payment; later we can:
 * - create an order via GraphQL
 * - create a payment intent/session
 * - redirect or open a payment modal
 * - confirm payment and finalize order
 */
export function useMarketplacePayment() {
  const [isPaying, setIsPaying] = useState(false);
  const [lastResult, setLastResult] = useState<PaymentResult | null>(null);
  const locale = useLocale();
  const router = useRouter();
  const userEmail = useUserStore((state) => state.user?.email);
  const [createProductOrder] =
    useMutation<CreateProductOrderResponse>(CREATE_PRODUCT_ORDER);
  const [createServiceOrder] =
    useMutation<CreateServiceOrderResponse>(CREATE_SERVICE_ORDER);
  const [confirmPaymentIntent] =
    useMutation<ConfirmPaymentIntentResponse>(CONFIRM_PAYMENT_INTENT);
  const [fetchMyPaymentMethods] = useLazyQuery<MyPaymentMethodsResponse>(
    MY_PAYMENT_METHODS,
    { fetchPolicy: "network-only" }
  );

  const resolvePaymentIntentId = (payload: unknown): string | undefined => {
    const root = payload as {
      payment_intent_id?: string;
      paymentIntentId?: string;
      payment_intent?: { id?: string };
      paymentIntent?: { id?: string };
      order?: {
        payment_intent_id?: string;
        paymentIntentId?: string;
        payment_intent?: { id?: string };
        paymentIntent?: { id?: string };
      };
    };

    return (
      root.payment_intent_id ||
      root.paymentIntentId ||
      root.payment_intent?.id ||
      root.paymentIntent?.id ||
      root.order?.payment_intent_id ||
      root.order?.paymentIntentId ||
      root.order?.payment_intent?.id ||
      root.order?.paymentIntent?.id
    );
  };

  const resolvePrimaryStripeCardPaymentMethodId = async (): Promise<string | null> => {
    const { data } = await fetchMyPaymentMethods();
    const methods = data?.myPaymentMethods?.payment_methods ?? [];
    const stripeCards = methods.filter(
      (m) => m.provider === "STRIPE" && m.type === "card"
    );
    const primary = stripeCards.find((m) => Boolean(m.is_primary));
    return (primary ?? stripeCards[0])?.id ?? null;
  };

  const pay = useCallback(
    async (
      ctx: PaymentContext,
      method: PaymentMethod,
      shippingAddress?: string
    ): Promise<PaymentResult> => {
      setIsPaying(true);
      try {
        const stripePaymentMethodId =
          method === "credit"
            ? await resolvePrimaryStripeCardPaymentMethodId()
            : null;

        if (method === "credit" && !stripePaymentMethodId) {
          return { success: false };
        }

        if (method === "mobile" && !userEmail) {
          return { success: false };
        }

        if (ctx.kind === "service") {
          const amountInPesewas = toMinorUnits(ctx.item.price * ctx.item.quantity);
          const input: CreateServiceOrderInput = {
            vendor_id: ctx.item.seller || "",
            service_id: ctx.item.id,
            package_id: ctx.item.selectedPackage,
            notes: `payment_method:${method}`,
          };

          const { data } = await createServiceOrder({ variables: { input } });
          const order = data?.createServiceOrder.order;
          const success = Boolean(data?.createServiceOrder.success && order?.id);
          const paymentIntentId = resolvePaymentIntentId(data?.createServiceOrder);

          if (!success || !paymentIntentId) {
            return { success: false, reference: order?.id };
          }

          if (method === "mobile" && userEmail) {
            const { reference } = await openPaystackMobileMoney({
              email: userEmail,
              amountInPesewas,
              currency: "GHS",
            });

            await confirmPaymentIntent({
              variables: {
                input: {
                  payment_intent_id: paymentIntentId,
                  payment_method_id: reference,
                  provider: "PAYSTACK",
                },
              },
            });
          }

          if (method === "credit" && stripePaymentMethodId) {
            await confirmPaymentIntent({
              variables: {
                input: {
                  payment_intent_id: paymentIntentId,
                  payment_method_id: stripePaymentMethodId,
                  provider: "STRIPE",
                },
              },
            });
          }

          const result: PaymentResult = {
            success,
            reference: order?.id,
          };
          setLastResult(result);
          return result;
        }

        const groupedByVendor = ctx.cart.reduce<Record<string, typeof ctx.cart>>(
          (acc, item) => {
            const vendorId = item.seller || "";
            if (!acc[vendorId]) {
              acc[vendorId] = [];
            }
            acc[vendorId].push(item);
            return acc;
          },
          {}
        );

        let firstOrderId: string | undefined;

        for (const [vendorId, items] of Object.entries(groupedByVendor)) {
          const amountInPesewas = toMinorUnits(
            items.reduce((sum, item) => sum + item.price * item.quantity, 0)
          );
          const input: CreateProductOrderInput = {
            vendor_id: vendorId,
            items: items.map((item) => ({
              product_id: item.id,
              quantity: item.quantity,
              // item.price is a major-unit decimal in the UI; the marketplace
              // API expects integer minor units. Convert major→minor once here.
              price: toMinorUnits(item.price),
              currency: "GHS",
            })),
            shipping_address: shippingAddress,
            notes: `payment_method:${method}`,
          };

          const { data } = await createProductOrder({ variables: { input } });
          const orderId = data?.createProductOrder.order?.id;
          const paymentIntentId = resolvePaymentIntentId(data?.createProductOrder);

          if (!data?.createProductOrder.success || !orderId || !paymentIntentId) {
            return { success: false };
          }

          if (method === "mobile" && userEmail) {
            const { reference } = await openPaystackMobileMoney({
              email: userEmail,
              amountInPesewas,
              currency: "GHS",
            });

            await confirmPaymentIntent({
              variables: {
                input: {
                  payment_intent_id: paymentIntentId,
                  payment_method_id: reference,
                  provider: "PAYSTACK",
                },
              },
            });
          }

          if (method === "credit" && stripePaymentMethodId) {
            await confirmPaymentIntent({
              variables: {
                input: {
                  payment_intent_id: paymentIntentId,
                  payment_method_id: stripePaymentMethodId,
                  provider: "STRIPE",
                },
              },
            });
          }

          if (!firstOrderId) {
            firstOrderId = orderId;
          }
        }

        const result: PaymentResult = {
          success: true,
          reference: firstOrderId,
        };
        setLastResult(result);
        return result;
      } catch (error) {
        handleMarketplaceError({ error, locale, router });
        return { success: false };
      } finally {
        setIsPaying(false);
      }
    },
    [
      confirmPaymentIntent,
      createProductOrder,
      createServiceOrder,
      fetchMyPaymentMethods,
      locale,
      router,
      userEmail,
    ]
  );

  return { pay, isPaying, lastResult };
}

