declare module '@paystack/inline-js' {
  export interface PaystackTransaction {
    reference?: string;
    [key: string]: unknown;
  }

  export interface PaystackNewTransactionOptions {
    key: string;
    email: string;
    amount: number;
    currency?: string;
    channels?: Array<'mobile_money' | 'card' | string>;
    onSuccess?: (transaction: PaystackTransaction) => void;
    onCancel?: () => void;
  }

  export default class PaystackPop {
    newTransaction(options: PaystackNewTransactionOptions): void;
  }
}
