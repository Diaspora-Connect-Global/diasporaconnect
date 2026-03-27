"use client";

import { useCallback, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import {
  CREATE_PRODUCT_ORDER,
  CREATE_SERVICE_ORDER,
} from "@/services/gql/marketplace";
import type {
  CreateProductOrderResponse,
  CreateServiceOrderResponse,
  CreateProductOrderInput,
  CreateServiceOrderInput,
} from "@/services/gql/types/marketplace";
import { handleMarketplaceError } from "@/lib/marketplace-error-mapper";
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
  const [createProductOrder] =
    useMutation<CreateProductOrderResponse>(CREATE_PRODUCT_ORDER);
  const [createServiceOrder] =
    useMutation<CreateServiceOrderResponse>(CREATE_SERVICE_ORDER);

  const pay = useCallback(
    async (
      ctx: PaymentContext,
      method: PaymentMethod,
      shippingAddress?: string
    ): Promise<PaymentResult> => {
      setIsPaying(true);
      try {
        if (ctx.kind === "service") {
          const input: CreateServiceOrderInput = {
            vendor_id: ctx.item.seller || "",
            service_id: ctx.item.id,
            package_id: ctx.item.selectedPackage,
            notes: `payment_method:${method}`,
          };

          const { data } = await createServiceOrder({ variables: { input } });
          const order = data?.createServiceOrder.order;
          const success = Boolean(data?.createServiceOrder.success && order?.id);
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
          const input: CreateProductOrderInput = {
            vendor_id: vendorId,
            items: items.map((item) => ({
              product_id: item.id,
              quantity: item.quantity,
              price: item.price,
              currency: "GHS",
            })),
            shipping_address: shippingAddress,
            notes: `payment_method:${method}`,
          };

          const { data } = await createProductOrder({ variables: { input } });
          const orderId = data?.createProductOrder.order?.id;
          if (!data?.createProductOrder.success || !orderId) {
            return { success: false };
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
    [createProductOrder, createServiceOrder, locale, router]
  );

  return { pay, isPaying, lastResult };
}

