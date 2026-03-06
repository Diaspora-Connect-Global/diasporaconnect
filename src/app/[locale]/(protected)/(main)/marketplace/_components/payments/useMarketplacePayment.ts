"use client";

import { useCallback, useState } from "react";
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

  const pay = useCallback(
    async (ctx: PaymentContext, method: PaymentMethod): Promise<PaymentResult> => {
      setIsPaying(true);
      try {
        // Placeholder: simulate network + return a reference.
        await new Promise((r) => setTimeout(r, 650));
        const res: PaymentResult = {
          success: true,
          reference: `${ctx.kind}-${method}-${Date.now()}`,
        };
        setLastResult(res);
        return res;
      } finally {
        setIsPaying(false);
      }
    },
    []
  );

  return { pay, isPaying, lastResult };
}

