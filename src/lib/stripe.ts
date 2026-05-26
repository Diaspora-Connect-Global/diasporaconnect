import { loadStripe, type Stripe } from '@stripe/stripe-js';

/**
 * Lazy-loaded singleton for the Stripe.js SDK.
 *
 * Uses NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY. The key must be the publishable
 * key (pk_test_... / pk_live_...). If the env var is missing or empty we
 * resolve to `null` rather than calling loadStripe with '' — that lets
 * callers detect the misconfig (`stripe == null`) and render a friendly
 * message instead of letting Stripe throw an unhandled "Please call
 * Stripe() with your publishable key. You used an empty string." into
 * the console.
 */
let stripePromise: Promise<Stripe | null> | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
    if (!publishableKey) {
      // Resolve to null so consumers can branch on this without an
      // unhandled IntegrationError leaking to the browser console.
      stripePromise = Promise.resolve(null);
    } else {
      stripePromise = loadStripe(publishableKey);
    }
  }
  return stripePromise;
}
