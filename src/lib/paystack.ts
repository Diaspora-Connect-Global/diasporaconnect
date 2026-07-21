// NOTE: `@paystack/inline-js` touches `window` at module-evaluation time, so it
// must NOT be imported statically — a top-level import makes every module that
// pulls in this file crash during SSR with "window is not defined" (500 on hard
// refresh of any page whose bundle includes a payment modal). It is loaded
// lazily inside `openPaystackCheckout`, which only ever runs in the browser.

export type PaystackChannel = 'card' | 'mobile_money' | 'bank' | 'ussd' | 'qr' | 'bank_transfer';

export interface PaystackCheckoutParams {
  email: string;
  /** Integer amount in the currency's minor units (pesewas/cents/kobo). */
  amountInPesewas: number;
  /** ISO 4217 — GHS (default), NGN, KES, etc. Paystack settles African currencies. */
  currency?: string;
  /** Payment channels to enable. Defaults to card + mobile money. */
  channels?: PaystackChannel[];
  publicKey?: string;
}

/** Back-compat alias for the original mobile-money-only shape. */
export type PaystackMobileMoneyParams = PaystackCheckoutParams;

/**
 * Open the Paystack inline popup. Paystack is the rail for GHS/NGN/KES (card AND
 * mobile money); pass `channels` to control which methods show.
 */
export async function openPaystackCheckout(
  params: PaystackCheckoutParams,
): Promise<{ reference: string }> {
  const key =
    params.publicKey ||
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
    'pk_test_a941b987b0cc71abf69f358dbe5b5bdeff170533';

  // Browser-only SDK — import it lazily so this module is safe to evaluate on
  // the server (see note at top of file).
  const { default: PaystackPop } = await import('@paystack/inline-js');

  return new Promise((resolve, reject) => {
    try {
      const paystack = new PaystackPop();

      paystack.newTransaction({
        key,
        email: params.email,
        amount: params.amountInPesewas,
        currency: (params.currency ?? 'GHS').toUpperCase(),
        channels: params.channels ?? ['card', 'mobile_money'],
        onSuccess: (transaction: { reference?: string }) => {
          if (!transaction?.reference) {
            reject(new Error('Paystack transaction reference is missing.'));
            return;
          }
          resolve({ reference: transaction.reference });
        },
        onCancel: () => {
          reject(new Error('Payment cancelled.'));
        },
      });
    } catch (error) {
      reject(error);
    }
  });
}

/** GHS mobile-money checkout (mobile_money channel only). */
export async function openPaystackMobileMoney(
  params: PaystackMobileMoneyParams,
): Promise<{ reference: string }> {
  return openPaystackCheckout({ ...params, channels: ['mobile_money'] });
}

/** Card checkout via Paystack (for NGN/KES, which Stripe cannot settle). */
export async function openPaystackCard(
  params: PaystackCheckoutParams,
): Promise<{ reference: string }> {
  return openPaystackCheckout({ ...params, channels: ['card'] });
}
