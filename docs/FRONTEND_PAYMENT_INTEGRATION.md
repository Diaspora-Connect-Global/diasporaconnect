# Frontend Payment Integration Guide

This guide describes how to integrate frontend payment flows with the GraphQL payment module.

## API Base

- GraphQL endpoint: `https://api.diaspoplug.net/graphql`
- Auth header for all requests: `Authorization: Bearer <jwt_token>`
- Stripe publishable key (test): `pk_test_51TJeEwIH1dxyvgROX495JCiQ3gXVWdLWwgSLcW1gFVTUbU8otqehzz0wQuVWndR7gSTA7dFNjNkX3EiUwHAsoSIF0024ZEAQRt`

## Provider matrix

| Provider | Keys | Webhook | Mobile Money |
| --- | --- | --- | --- |
| Stripe | ✅ | `https://api.diaspoplug.net/webhooks/stripe` | ❌ (cards only) |
| Paystack | ✅ | `https://api.diaspoplug.net/webhooks/paystack` | ✅ MTN / Vodafone / AirtelTigo |
| PayPal | ✅ | `https://api.diaspoplug.net/webhooks/paypal` | ❌ |

## 1) Install Stripe.js

```bash
npm install @stripe/stripe-js
# or
npm install @stripe/react-stripe-js @stripe/stripe-js
```

## 2) Save card before paying

Use Stripe.js in the client to create a Payment Method, then send the resulting `paymentMethod.id` to GraphQL.

```ts
import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe('pk_test_51TJeEw...');
const { paymentMethod, error } = await stripe.createPaymentMethod({
  type: 'card',
  card: cardElement,
});
```

GraphQL mutation:

```graphql
mutation AddPaymentMethod($input: AddPaymentMethodInput!) {
  addPaymentMethod(input: $input)
}
```

Variables:

```json
{
  "input": {
    "provider": "STRIPE",
    "provider_payment_method_id": "<paymentMethod.id>",
    "type": "card",
    "last4": "<paymentMethod.card.last4>",
    "brand": "<paymentMethod.card.brand>",
    "expiry_month": 12,
    "expiry_year": 2030,
    "set_as_primary": true
  }
}
```

Fetch saved cards:

```graphql
query {
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
```

## 3) Create payment intent

### Marketplace orders

Do **not** call `createPaymentIntent` directly for product/service orders. The marketplace backend creates payment intents automatically during order placement.

### Event tickets

Call `createPaymentIntent` directly.

```graphql
mutation CreatePaymentIntent($input: CreatePaymentIntentInput!) {
  createPaymentIntent(input: $input) {
    success
    payment_intent {
      id
      gross_amount
      currency
      status
      provider_transaction_id
    }
  }
}
```

Variables example:

```json
{
  "input": {
    "beneficiary_type": "VENDOR",
    "beneficiary_id": "<vendor_id>",
    "domain": "EVENT_TICKET",
    "domain_reference_id": "<ticket_id>",
    "purpose": "EVENT_TICKET",
    "gross_amount": 50,
    "currency": "GHS",
    "description": "Event ticket"
  }
}
```

## 4) Confirm payment intent

```graphql
mutation ConfirmPaymentIntent($input: ConfirmPaymentIntentInput!) {
  confirmPaymentIntent(input: $input) {
    success
    message
    provider_transaction_id
    requires_action
    action_url
  }
}
```

Variables:

```json
{
  "input": {
    "payment_intent_id": "<intent_id>",
    "payment_method_id": "<saved_payment_method_id>",
    "provider": "STRIPE",
    "return_url": "https://yourapp.com/payment/complete"
  }
}
```

If `requires_action = true`, redirect to `action_url` or run Stripe next-action flow:

```ts
await stripe.handleNextAction({
  clientSecret: providerTransactionId,
});
```

## 4b) Paystack mobile money (mobile money only)

Install:

```bash
npm install @paystack/inline-js
```

Client flow:

```ts
import PaystackPop from '@paystack/inline-js';

const paystack = new PaystackPop();
paystack.newTransaction({
  key: 'pk_test_a941b987b0cc71abf69f358dbe5b5bdeff170533',
  email: user.email,
  amount: amountInPesewas,
  currency: 'GHS',
  channels: ['mobile_money'],
  onSuccess: (transaction) => {
    // transaction.reference -> send as payment_method_id
  },
  onCancel: () => {
    // handle cancel
  },
});
```

Confirm payment:

```graphql
mutation ConfirmPaymentIntent($input: ConfirmPaymentIntentInput!) {
  confirmPaymentIntent(input: $input) {
    success
  }
}
```

Variables:

```json
{
  "input": {
    "payment_intent_id": "<id>",
    "payment_method_id": "<transaction.reference>",
    "provider": "PAYSTACK"
  }
}
```

## 5) Check payment status

Use polling or order updates.

```graphql
query GetPaymentIntent($id: ID!) {
  getPaymentIntent(payment_intent_id: $id) {
    success
    payment_intent {
      id
      status
      gross_amount
      currency
    }
  }
}
```

Status progression: `PENDING -> CONFIRMED | FAILED | CANCELLED`

## 6) Refunds

```graphql
mutation RequestRefund($input: RequestRefundInput!) {
  requestRefund(input: $input) {
    success
    refund {
      id
      status
      amount
      currency
    }
  }
}
```

## 7) Disputes

```graphql
mutation OpenDispute($input: OpenDisputeInput!) {
  openDispute(input: $input) {
    success
    dispute {
      id
      status
      reason
    }
  }
}
```

## 8) Vendor payout account setup

Bank account:

```json
{
  "input": {
    "provider": "STRIPE",
    "account_type": "BANK_ACCOUNT",
    "currency": "GHS",
    "account_number": "000123456789",
    "routing_number": "110000000",
    "account_name": "John Doe"
  }
}
```

Mobile money:

```json
{
  "input": {
    "provider": "HUBTEL",
    "account_type": "MOBILE_MONEY",
    "currency": "GHS",
    "account_number": "0241234567",
    "mobile_number": "0241234567",
    "account_name": "John Doe"
  }
}
```

## Available frontend GraphQL operations

- `myPaymentMethods`
- `addPaymentMethod`
- `removePaymentMethod`
- `createPaymentIntent` *(event ticket flows)*
- `confirmPaymentIntent`
- `cancelPaymentIntent`
- `getPaymentIntent`
- `myPaymentIntents`
- `getEscrowByPaymentIntent`
- `requestRefund`
- `openDispute`
- `myDisputes`
- `myPayoutAccounts`
- `createPayoutAccount`
- `setPrimaryPayoutAccount`

## Code references in this repository

- GraphQL operations: [src/services/gql/payments.ts](../src/services/gql/payments.ts)
- Type definitions: [src/services/gql/types/payments.ts](../src/services/gql/types/payments.ts)
