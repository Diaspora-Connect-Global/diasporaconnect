import PaystackPop from '@paystack/inline-js';

export interface PaystackMobileMoneyParams {
  email: string;
  amountInPesewas: number;
  currency?: 'GHS' | string;
  publicKey?: string;
}

export async function openPaystackMobileMoney(
  params: PaystackMobileMoneyParams
): Promise<{ reference: string }> {
  const key =
    params.publicKey ||
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
    'pk_test_a941b987b0cc71abf69f358dbe5b5bdeff170533';

  return new Promise((resolve, reject) => {
    try {
      const paystack = new PaystackPop();

      paystack.newTransaction({
        key,
        email: params.email,
        amount: params.amountInPesewas,
        currency: params.currency ?? 'GHS',
        channels: ['mobile_money'],
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
