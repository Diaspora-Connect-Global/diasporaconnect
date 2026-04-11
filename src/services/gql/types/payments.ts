/**
 * @fileoverview Payment module GraphQL type definitions.
 * @module services/gql/types/payments
 */

export type PaymentProvider = "STRIPE" | "HUBTEL" | "PAYSTACK" | string;
export type PaymentMethodType = "card" | "bank_account" | "mobile_money" | string;
export type BeneficiaryType = "VENDOR" | "USER" | "COMMUNITY" | "ASSOCIATION" | string;
export type PaymentDomain = "MARKETPLACE" | "EVENT_TICKET" | string;
export type PaymentPurpose = "PRODUCT_ORDER" | "SERVICE_ORDER" | "EVENT_TICKET" | string;
export type PaymentStatus = "PENDING" | "CONFIRMED" | "FAILED" | "CANCELLED" | string;
export type RefundReason = "REQUESTED_BY_CUSTOMER" | "DUPLICATE" | "FRAUDULENT" | string;

export interface PaymentMethodRecord {
  id: string;
  provider: PaymentProvider;
  provider_payment_method_id?: string | null;
  type: PaymentMethodType;
  last4?: string | null;
  brand?: string | null;
  expiry_month?: number | null;
  expiry_year?: number | null;
  is_primary?: boolean | null;
  created_at?: string | null;
}

export interface PaymentIntentRecord {
  id: string;
  gross_amount: number;
  currency: string;
  status: PaymentStatus;
  provider_transaction_id?: string | null;
  beneficiary_type?: BeneficiaryType | null;
  beneficiary_id?: string | null;
  domain?: PaymentDomain | null;
  domain_reference_id?: string | null;
  purpose?: PaymentPurpose | null;
  description?: string | null;
  created_at?: string | null;
}

export interface RefundRecord {
  id: string;
  status: string;
  amount: number;
  currency: string;
  reason?: string | null;
  description?: string | null;
  created_at?: string | null;
}

export interface DisputeEvidence {
  type: string;
  url: string;
}

export interface DisputeRecord {
  id: string;
  status: string;
  reason: string;
  description?: string | null;
  evidence?: DisputeEvidence[] | null;
  payment_intent_id?: string | null;
  escrow_id?: string | null;
  created_at?: string | null;
}

export interface PayoutAccountRecord {
  id: string;
  provider: PaymentProvider;
  account_type: "BANK_ACCOUNT" | "MOBILE_MONEY" | string;
  currency: string;
  last4?: string | null;
  is_primary?: boolean | null;
  account_name?: string | null;
  mobile_number?: string | null;
  created_at?: string | null;
}

export interface EscrowRecord {
  id: string;
  status?: string | null;
  amount?: number | null;
  currency?: string | null;
  payment_intent_id?: string | null;
}

export interface AddPaymentMethodInput {
  provider: PaymentProvider;
  provider_payment_method_id: string;
  type: "card" | string;
  last4?: string;
  brand?: string;
  expiry_month?: number;
  expiry_year?: number;
  set_as_primary?: boolean;
}

export interface CreatePaymentIntentInput {
  beneficiary_type: BeneficiaryType;
  beneficiary_id: string;
  domain: PaymentDomain;
  domain_reference_id: string;
  purpose: PaymentPurpose;
  gross_amount: number;
  currency: string;
  description?: string;
}

export interface ConfirmPaymentIntentInput {
  payment_intent_id: string;
  payment_method_id: string;
  provider: PaymentProvider;
  return_url?: string;
}

export interface RequestRefundInput {
  payment_intent_id: string;
  amount: number;
  reason: RefundReason | string;
  description?: string;
}

export interface OpenDisputeInput {
  payment_intent_id: string;
  escrow_id: string;
  reason: string;
  description?: string;
  evidence?: DisputeEvidence[];
}

export interface CreatePayoutAccountInput {
  provider: PaymentProvider;
  account_type: "BANK_ACCOUNT" | "MOBILE_MONEY" | string;
  currency: string;
  account_number: string;
  routing_number?: string;
  mobile_number?: string;
  account_name: string;
}

export interface AddPaymentMethodPayload {
  success: boolean;
  message?: string | null;
  payment_method?: PaymentMethodRecord | null;
}

export interface RemovePaymentMethodPayload {
  success: boolean;
  message?: string | null;
}

export interface MyPaymentMethodsPayload {
  success: boolean;
  payment_methods: PaymentMethodRecord[];
}

export interface CreatePaymentIntentPayload {
  success: boolean;
  message?: string | null;
  payment_intent?: PaymentIntentRecord | null;
}

export interface ConfirmPaymentIntentPayload {
  success: boolean;
  message?: string | null;
  provider_transaction_id?: string | null;
  requires_action?: boolean | null;
  action_url?: string | null;
}

export interface CancelPaymentIntentPayload {
  success: boolean;
  message?: string | null;
  payment_intent?: PaymentIntentRecord | null;
}

export interface GetPaymentIntentPayload {
  success: boolean;
  message?: string | null;
  payment_intent?: PaymentIntentRecord | null;
}

export interface MyPaymentIntentsPayload {
  success: boolean;
  payment_intents: PaymentIntentRecord[];
  total?: number | null;
}

export interface GetEscrowByPaymentIntentPayload {
  success: boolean;
  escrow?: EscrowRecord | null;
}

export interface RequestRefundPayload {
  success: boolean;
  message?: string | null;
  refund?: RefundRecord | null;
}

export interface OpenDisputePayload {
  success: boolean;
  message?: string | null;
  dispute?: DisputeRecord | null;
}

export interface MyDisputesPayload {
  success: boolean;
  disputes: DisputeRecord[];
}

export interface MyPayoutAccountsPayload {
  success: boolean;
  payout_accounts: PayoutAccountRecord[];
}

export interface CreatePayoutAccountPayload {
  success: boolean;
  message?: string | null;
  payout_account?: PayoutAccountRecord | null;
}

export interface SetPrimaryPayoutAccountPayload {
  success: boolean;
  message?: string | null;
  payout_account?: PayoutAccountRecord | null;
}

export interface AddPaymentMethodResponse {
  addPaymentMethod: AddPaymentMethodPayload;
}

export interface RemovePaymentMethodResponse {
  removePaymentMethod: RemovePaymentMethodPayload;
}

export interface MyPaymentMethodsResponse {
  myPaymentMethods: MyPaymentMethodsPayload;
}

export interface CreatePaymentIntentResponse {
  createPaymentIntent: CreatePaymentIntentPayload;
}

export interface ConfirmPaymentIntentResponse {
  confirmPaymentIntent: ConfirmPaymentIntentPayload;
}

export interface CancelPaymentIntentResponse {
  cancelPaymentIntent: CancelPaymentIntentPayload;
}

export interface GetPaymentIntentResponse {
  getPaymentIntent: GetPaymentIntentPayload;
}

export interface MyPaymentIntentsResponse {
  myPaymentIntents: MyPaymentIntentsPayload;
}

export interface GetEscrowByPaymentIntentResponse {
  getEscrowByPaymentIntent: GetEscrowByPaymentIntentPayload;
}

export interface RequestRefundResponse {
  requestRefund: RequestRefundPayload;
}

export interface OpenDisputeResponse {
  openDispute: OpenDisputePayload;
}

export interface MyDisputesResponse {
  myDisputes: MyDisputesPayload;
}

export interface MyPayoutAccountsResponse {
  myPayoutAccounts: MyPayoutAccountsPayload;
}

export interface CreatePayoutAccountResponse {
  createPayoutAccount: CreatePayoutAccountPayload;
}

export interface SetPrimaryPayoutAccountResponse {
  setPrimaryPayoutAccount: SetPrimaryPayoutAccountPayload;
}
