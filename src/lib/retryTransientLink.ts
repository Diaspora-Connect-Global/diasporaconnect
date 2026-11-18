import { ApolloLink } from '@apollo/client';
import { Observable } from '@apollo/client/utilities';

/**
 * Re-sends a QUERY that failed for a transient reason — the gateway's
 * "Timeout has occurred" (a backend call ran past its deadline), an unavailable
 * backend, or a network-level timeout / 502 / 503 / 504 — up to MAX_RETRIES
 * times with a short back-off, before the result reaches the error link
 * (which logs it and shows the toast).
 *
 * Mutations and subscriptions are NEVER retried: re-sending a mutation could do
 * the thing twice. A response is retried only when EVERY error in it is
 * transient, so a real refusal (validation, permission, not found) is returned
 * at once, exactly as before.
 */

export const MAX_RETRIES = 2;
const DELAYS_MS = [600, 1500];

const TRANSIENT_MESSAGE = /timeout has occurred|deadline exceeded|\b14 UNAVAILABLE\b|no connection established/i;
const TRANSIENT_CODES = new Set(['DEADLINE_EXCEEDED', 'UNAVAILABLE', 'GATEWAY_TIMEOUT', 'SERVICE_UNAVAILABLE']);
const TRANSIENT_NETWORK = /timeout|timed out|failed to fetch|networkerror|load failed|network request failed/i;
const TRANSIENT_STATUS = new Set([502, 503, 504]);

interface GqlErrorLike {
  message?: string;
  extensions?: { code?: unknown } | null;
}

export function isTransientGraphQLError(e: GqlErrorLike | null | undefined): boolean {
  if (!e) return false;
  const code = typeof e.extensions?.code === 'string' ? e.extensions.code : '';
  return TRANSIENT_MESSAGE.test(e.message ?? '') || TRANSIENT_CODES.has(code);
}

/** A result is worth re-sending only if it failed and every failure is transient. */
export function hasOnlyTransientErrors(result: { errors?: ReadonlyArray<GqlErrorLike> | null } | null | undefined): boolean {
  const errors = result?.errors;
  return !!errors && errors.length > 0 && errors.every(isTransientGraphQLError);
}

export function isTransientNetworkError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { statusCode?: unknown; message?: unknown };
  if (typeof e.statusCode === 'number' && TRANSIENT_STATUS.has(e.statusCode)) return true;
  return typeof e.message === 'string' && TRANSIENT_NETWORK.test(e.message);
}

function isQuery(operation: ApolloLink.Operation): boolean {
  const def = operation.query.definitions.find((d) => d.kind === 'OperationDefinition');
  return !!def && 'operation' in def && def.operation === 'query';
}

function delayFor(attempt: number): number {
  const base = DELAYS_MS[Math.min(attempt, DELAYS_MS.length - 1)];
  return base + Math.floor(Math.random() * 200); // small jitter so many tabs don't retry in lock-step
}

export const retryTransientLink = new ApolloLink((operation, forward) => {
  if (!isQuery(operation)) return forward(operation);

  return new Observable<ApolloLink.Result>((observer) => {
    let attempt = 0;
    let retryPending = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let current: { unsubscribe(): void } | null = null;

    const scheduleRetry = (why: string) => {
      retryPending = true;
      const wait = delayFor(attempt);
      attempt += 1;
      console.warn(`[retry] ${operation.operationName ?? 'query'}: ${why} — retry ${attempt}/${MAX_RETRIES} in ${wait} ms`);
      current?.unsubscribe();
      timer = setTimeout(() => {
        timer = null;
        retryPending = false;
        run();
      }, wait);
    };

    const run = () => {
      current = forward(operation).subscribe({
        next: (result) => {
          if (attempt < MAX_RETRIES && hasOnlyTransientErrors(result)) {
            scheduleRetry('transient GraphQL error');
            return; // drop this failed result; the retry answers instead
          }
          observer.next(result);
        },
        error: (err) => {
          if (attempt < MAX_RETRIES && isTransientNetworkError(err)) {
            scheduleRetry('transient network error');
            return;
          }
          observer.error(err);
        },
        complete: () => {
          if (!retryPending) observer.complete();
        },
      });
    };

    run();

    return () => {
      if (timer) clearTimeout(timer);
      current?.unsubscribe();
    };
  });
});
