import { gql } from "@apollo/client";

export type {
  PaymentProvider,
  PaymentMethodType,
  BeneficiaryType,
  PaymentDomain,
  PaymentPurpose,
  PaymentStatus,
  RefundReason,
  PaymentMethodRecord,
  PaymentIntentRecord,
  RefundRecord,
  DisputeEvidence,
  DisputeRecord,
  PayoutAccountRecord,
  EscrowRecord,
  AddPaymentMethodInput,
  CreatePaymentIntentInput,
  ConfirmPaymentIntentInput,
  RequestRefundInput,
  OpenDisputeInput,
  CreatePayoutAccountInput,
  AddPaymentMethodResponse,
  RemovePaymentMethodResponse,
  MyPaymentMethodsResponse,
  CreatePaymentIntentResponse,
  ConfirmPaymentIntentResponse,
  CancelPaymentIntentResponse,
  GetPaymentIntentResponse,
  MyPaymentIntentsResponse,
  GetEscrowByPaymentIntentResponse,
  RequestRefundResponse,
  OpenDisputeResponse,
  MyDisputesResponse,
  MyPayoutAccountsResponse,
  CreatePayoutAccountResponse,
  SetPrimaryPayoutAccountResponse,
} from "./types/payments";

// ============================================================================
// PAYMENT METHOD OPERATIONS
// ============================================================================

export const MY_PAYMENT_METHODS = gql`
  query MyPaymentMethods {
    myPaymentMethods {
      success
      payment_methods {
        id
        provider
        type
        last4
        brand
        expiry_month
        expiry_year
        is_primary
      }
    }
  }
`;

export const ADD_PAYMENT_METHOD = gql`
  mutation AddPaymentMethod($input: AddPaymentMethodInput!) {
    addPaymentMethod(input: $input) {
      success
      message
      payment_method {
        id
        provider
        type
        last4
        brand
        expiry_month
        expiry_year
        is_primary
      }
    }
  }
`;

export const REMOVE_PAYMENT_METHOD = gql`
  mutation RemovePaymentMethod($payment_method_id: ID!) {
    removePaymentMethod(payment_method_id: $payment_method_id) {
      success
      message
    }
  }
`;

// ============================================================================
// PAYMENT INTENT OPERATIONS
// ============================================================================

export const CREATE_PAYMENT_INTENT = gql`
  mutation CreatePaymentIntent($input: CreatePaymentIntentInput!) {
    createPaymentIntent(input: $input) {
      success
      message
      payment_intent {
        id
        gross_amount
        currency
        status
        provider_transaction_id
      }
    }
  }
`;

export const CONFIRM_PAYMENT_INTENT = gql`
  mutation ConfirmPaymentIntent($input: ConfirmPaymentIntentInput!) {
    confirmPaymentIntent(input: $input) {
      success
      message
      provider_transaction_id
      requires_action
      action_url
    }
  }
`;

export const CANCEL_PAYMENT_INTENT = gql`
  mutation CancelPaymentIntent($payment_intent_id: ID!) {
    cancelPaymentIntent(payment_intent_id: $payment_intent_id) {
      success
      message
      payment_intent {
        id
        status
        gross_amount
        currency
      }
    }
  }
`;

export const GET_PAYMENT_INTENT = gql`
  query GetPaymentIntent($id: ID!) {
    getPaymentIntent(payment_intent_id: $id) {
      success
      payment_intent {
        id
        status
        gross_amount
        currency
        provider_transaction_id
      }
    }
  }
`;

export const MY_PAYMENT_INTENTS = gql`
  query MyPaymentIntents($page: Int, $limit: Int) {
    myPaymentIntents(page: $page, limit: $limit) {
      success
      payment_intents {
        id
        status
        gross_amount
        currency
        purpose
        created_at
      }
      total
    }
  }
`;

export const GET_ESCROW_BY_PAYMENT_INTENT = gql`
  query GetEscrowByPaymentIntent($payment_intent_id: ID!) {
    getEscrowByPaymentIntent(payment_intent_id: $payment_intent_id) {
      success
      escrow {
        id
        status
        amount
        currency
        payment_intent_id
      }
    }
  }
`;

// ============================================================================
// REFUNDS & DISPUTES
// ============================================================================

export const REQUEST_REFUND = gql`
  mutation RequestRefund($input: RequestRefundInput!) {
    requestRefund(input: $input) {
      success
      message
      refund {
        id
        status
        amount
        currency
        reason
        description
      }
    }
  }
`;

export const OPEN_DISPUTE = gql`
  mutation OpenDispute($input: OpenDisputeInput!) {
    openDispute(input: $input) {
      success
      message
      dispute {
        id
        status
        reason
        description
      }
    }
  }
`;

export const MY_DISPUTES = gql`
  query MyDisputes($page: Int, $limit: Int) {
    myDisputes(page: $page, limit: $limit) {
      success
      disputes {
        id
        status
        reason
        description
        payment_intent_id
        created_at
      }
    }
  }
`;

// ============================================================================
// VENDOR PAYOUTS
// ============================================================================

export const MY_PAYOUT_ACCOUNTS = gql`
  query MyPayoutAccounts {
    myPayoutAccounts {
      success
      payout_accounts {
        id
        provider
        account_type
        currency
        last4
        is_primary
        account_name
      }
    }
  }
`;

export const CREATE_PAYOUT_ACCOUNT = gql`
  mutation CreatePayoutAccount($input: CreatePayoutAccountInput!) {
    createPayoutAccount(input: $input) {
      success
      message
      payout_account {
        id
        provider
        account_type
        last4
        is_primary
      }
    }
  }
`;

export const SET_PRIMARY_PAYOUT_ACCOUNT = gql`
  mutation SetPrimaryPayoutAccount($payout_account_id: ID!) {
    setPrimaryPayoutAccount(payout_account_id: $payout_account_id) {
      success
      message
      payout_account {
        id
        provider
        account_type
        is_primary
      }
    }
  }
`;
