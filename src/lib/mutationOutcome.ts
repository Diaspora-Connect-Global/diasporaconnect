/**
 * Read Apollo mutation outcome when errorPolicy: 'all' makes every refusal
 * a RESOLVED promise with data: null, not a rejected one.
 *
 * Under errorPolicy: 'all', a refused GraphQL mutation resolves with
 * { data: null, error }. The try/catch does not fire. So the ubiquitous
 * shape — try { await mutate(); toast.success() } catch { toast.error() }
 * — is a lie that announces success on failure.
 *
 * This reads { data } and the error object, classifies the refusal, and
 * answers in the caller's own i18n namespace. Call it BEFORE toasting:
 *
 *   const outcome = readMutationOutcome(result, d => d.myMutation);
 *   if (!outcome.ok) {
 *     toast.error(t(refusalMessageKey(outcome.message, 'mymodule.errors')));
 *     return;
 *   }
 *   toast.success(t('mymodule.success'));
 *
 * The selector function pulls the mutation result out of the response —
 * a circles example: `d => d.logCircleContribution`. Pass whatever keys
 * you're looking for; null/undefined is treated as a refusal.
 *
 * Call refusalMessageKey to translate a server message into a namespace key.
 * It classifies by pattern: missing-fields → 'insufficient_data', permission
 * errors → 'not_authorized', not-found → 'not_found', generic → 'failed'.
 * Unrecognised messages → 'unknown_error'. Never returns null; fallback is
 * safe. Pass your own namespace, not 'circles.actions.writeErrors'.
 */

export interface MutationOutcome {
  ok: boolean;
  message?: string;
}

/**
 * Classify a server refusal message into a stable i18n key.
 *
 * The server's message is operator English with raw UUIDs, unsuitable for
 * a multi-locale UI. This maps patterns to key suffixes like 'not_found',
 * 'not_authorized', 'insufficient_data', 'failed', 'unknown_error'.
 *
 * Pass your namespace: `refusalMessageKey(err, 'posts.errors')` →
 * `posts.errors.not_found` or `posts.errors.unknown_error`, etc.
 *
 * Never returns null — the key always exists and always falls back to
 * a sensible default.
 */
export function refusalMessageKey(message: string | undefined, namespace: string): string {
  if (!message) return `${namespace}.unknown_error`;

  const lower = message.toLowerCase();

  // Missing fields: insufficient data or invalid input
  if (
    lower.includes('required') ||
    lower.includes('missing') ||
    lower.includes('empty') ||
    lower.includes('invalid input') ||
    lower.includes('validation') ||
    lower.includes('field')
  ) {
    return `${namespace}.insufficient_data`;
  }

  // Permission errors
  if (
    lower.includes('not authorized') ||
    lower.includes('permission') ||
    lower.includes('forbidden') ||
    lower.includes('access denied') ||
    lower.includes('unauthorized') ||
    lower.includes('no permission') ||
    lower.includes('cannot') ||
    lower.includes('not allowed') ||
    lower.includes('not a member') ||
    lower.includes('only') // "only leads can…", "only members…"
  ) {
    return `${namespace}.not_authorized`;
  }

  // Not found
  if (
    lower.includes('not found') ||
    lower.includes('does not exist') ||
    lower.includes('not exist') ||
    lower.includes('no such') ||
    lower.includes('unknown') ||
    lower.includes('not in') ||
    lower.includes('deleted')
  ) {
    return `${namespace}.not_found`;
  }

  // Conflict / state machine
  if (
    lower.includes('conflict') ||
    lower.includes('already') ||
    lower.includes('duplicate') ||
    lower.includes('exists') ||
    lower.includes('status') ||
    lower.includes('state') ||
    lower.includes('active') ||
    lower.includes('inactive')
  ) {
    return `${namespace}.conflict`;
  }

  // Fallback for everything else
  return `${namespace}.failed`;
}

/**
 * Read a mutation result when errorPolicy: 'all' is in play.
 *
 * @param result — the full Apollo mutation result (may have data, error, etc.)
 * @param selector — a function to pull your mutation's data out of the response.
 *                   Example: `d => d.myMutationName`. Pass null/undefined to
 *                   indicate refusal; truthy values are treated as success.
 * @returns { ok: true } if the mutation succeeded, or { ok: false, message }
 *          if it failed. The message is the server's refusal reason.
 */
export function readMutationOutcome<T>(
  result: any,
  selector: (data: any) => T,
): MutationOutcome {
  try {
    // Under errorPolicy: 'all', the result resolves even on refusal.
    // data: null means the server refused; data: { … } means success.
    const data = result?.data;
    if (!data) {
      // Refusal case: extract the error message.
      const error =
        result?.graphQLErrors?.[0]?.message ||
        result?.networkError?.message ||
        result?.error?.message ||
        'Unknown error';
      return { ok: false, message: error };
    }

    // Try to pull the mutation's actual result from the response.
    const mutationResult = selector(data);

    // Null/undefined from the selector means the server didn't return what
    // we asked for — treat as a refusal.
    if (mutationResult == null) {
      const error = data?.error?.message || 'Operation failed';
      return { ok: false, message: error };
    }

    // Success: the mutation returned data.
    return { ok: true };
  } catch (err) {
    // Defensive: if the selector throws or something goes wrong, treat as
    // a refusal rather than crashing the caller.
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'An error occurred',
    };
  }
}

/**
 * Backward-compat export: circles code can still import readCircleWrite.
 * New code should use readMutationOutcome and pass its own namespace.
 */
export const readCircleWrite = readMutationOutcome;
