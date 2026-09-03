'use client';

/**
 * Localized error copy for code that runs outside React.
 *
 * The Apollo error link (`graph-client.ts`) is a module-level singleton, so it
 * cannot call `useTranslations`. `ErrorMessagesBridge` — mounted inside
 * `NextIntlClientProvider` — registers the active locale's `toasts.errors`
 * translator here, and `errorMessage()` resolves keys against it. Before the
 * bridge renders (or if a lookup throws) we fall back to the English copy, so a
 * missing translation can never surface a blank toast.
 */

export type ErrorMessageKey =
  | 'generic'
  | 'connection'
  | 'timeout'
  | 'notFound'
  | 'server'
  | 'sessionExpired'
  | 'validation'
  | 'businessRule'
  | 'insufficientInventory'
  | 'orderCancellationNotAllowed'
  | 'invalidStatusTransition'
  | 'priceMismatch'
  | 'unsupportedCurrencyPair'
  | 'vendorProfileRequired'
  | 'kycRequired';

const FALLBACK: Record<ErrorMessageKey, string> = {
  generic: 'Something went wrong. Please try again.',
  connection: 'Unable to connect. Please try again later.',
  timeout: 'This is taking longer than expected. Please try again.',
  notFound: "We couldn't find what you're looking for.",
  server: 'Something went wrong on our end. Please try again later.',
  sessionExpired: 'Your session expired. Please sign in again.',
  validation: 'Please check the details you entered and try again.',
  businessRule: "This action isn't available right now.",
  insufficientInventory: "There isn't enough stock to complete this order.",
  orderCancellationNotAllowed: 'This order can no longer be cancelled.',
  invalidStatusTransition: "That status change isn't allowed.",
  priceMismatch: 'The price changed. Please refresh and try again.',
  unsupportedCurrencyPair: "That currency combination isn't supported.",
  vendorProfileRequired: 'You need a vendor profile to continue.',
  kycRequired: 'Complete identity verification to continue.',
};

let translate: ((key: ErrorMessageKey) => string) | null = null;

export function registerErrorTranslator(
  fn: (key: ErrorMessageKey) => string
): void {
  translate = fn;
}

export function errorMessage(key: ErrorMessageKey): string {
  try {
    return translate?.(key) || FALLBACK[key];
  } catch {
    return FALLBACK[key];
  }
}
