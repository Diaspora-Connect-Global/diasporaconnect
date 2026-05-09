import { loadStripe, type Stripe } from '@stripe/stripe-js';

/**
 * Lazy-loaded singleton for the Stripe.js SDK.
 *
 * Uses NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY. The key must be the publishable
 * key (pk_test_... / pk_live_...). If it's missing, loadStripe receives an
 * empty string which causes Stripe.js to throw a clear error at first use.
 */
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}
