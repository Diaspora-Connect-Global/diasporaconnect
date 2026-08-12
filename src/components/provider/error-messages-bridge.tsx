'use client';

import { useTranslations } from 'next-intl';

import {
  registerErrorTranslator,
  type ErrorMessageKey,
} from '@/lib/client-error-messages';

/**
 * Hands the active locale's `toasts.errors` translator to non-React code (the
 * Apollo error link). Registration happens during render rather than in an
 * effect because a query can fail before layout effects have run, and the
 * assignment is idempotent. Renders nothing.
 */
export default function ErrorMessagesBridge() {
  const t = useTranslations('toasts.errors');
  // Browser only: the registry is module state, so registering it during SSR
  // would share one request's locale with every other request on the server.
  if (typeof window !== 'undefined') {
    registerErrorTranslator((key: ErrorMessageKey) => t(key));
  }
  return null;
}
