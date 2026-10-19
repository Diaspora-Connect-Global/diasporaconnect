import { CombinedGraphQLErrors } from '@apollo/client';

/**
 * What `circleJoin` can answer, as stable codes (`extensions.code`).
 *
 * The server's message is operator English; it is matched never, shown never.
 * A refusal the UI does not recognise falls to `UNKNOWN` and gets the generic
 * "we couldn't add you" text. The gateway no longer answers circle refusals with
 * FORBIDDEN (that signed people out); a non-member is `CIRCLE_NOT_A_MEMBER`.
 */
export type CircleJoinCode =
  | 'CIRCLE_NOT_OPEN'
  | 'CIRCLE_FULL'
  | 'CIRCLE_JOIN_NOT_ALLOWED'
  | 'CIRCLE_NOT_JOINABLE'
  | 'CIRCLE_NOT_FOUND'
  | 'CIRCLE_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'CIRCLE_IS_OPEN'
  | 'UNKNOWN';

const KNOWN: readonly CircleJoinCode[] = [
  'CIRCLE_NOT_OPEN',
  'CIRCLE_FULL',
  'CIRCLE_JOIN_NOT_ALLOWED',
  'CIRCLE_NOT_JOINABLE',
  'CIRCLE_NOT_FOUND',
  'CIRCLE_UNAVAILABLE',
  'RATE_LIMITED',
  'CIRCLE_IS_OPEN',
];

export type CircleJoinResult = { ok: true } | { ok: false; code: CircleJoinCode };

function codeFrom(error: unknown): CircleJoinCode {
  if (CombinedGraphQLErrors.is(error)) {
    for (const e of error.errors) {
      const code = e.extensions?.code;
      const hit = KNOWN.find((k) => k === code);
      if (hit) return hit;
    }
  }
  return 'UNKNOWN';
}

/**
 * Read a `circleJoin` mutate result. Under `errorPolicy: 'all'` a refusal
 * RESOLVES with `data: null` plus an `error`, so success is "data carried the
 * mutation field", never "the promise did not throw".
 */
export function readCircleJoin(result: {
  data?: { circleJoin?: unknown } | null;
  error?: unknown;
}): CircleJoinResult {
  if (result.data?.circleJoin) return { ok: true };
  return { ok: false, code: codeFrom(result.error) };
}

/** A thrown (link-level) failure is never a recognised refusal. */
export function readCircleJoinThrown(error: unknown): CircleJoinResult {
  return { ok: false, code: codeFrom(error) };
}
