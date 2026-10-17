/**
 * Reading a refused event operation.
 *
 * Apollo runs with `errorPolicy: 'all'`, so a refused mutation RESOLVES with
 * `data: null` plus an error object; a try/catch around it is dead code. The
 * gateway refuses event operations with `extensions.code = EVENT_*` (never
 * FORBIDDEN / UNAUTHENTICATED, which would sign the user out). This module
 * turns whatever Apollo hands back into a stable, translatable reason.
 *
 * `EVENT_FEATURE_UNAVAILABLE` is the dark-launch refusal: the feature has not
 * been released to this person yet. It is reported as `kind: 'unavailableYet'`
 * so the UI can say "not available yet" instead of "something went wrong".
 */

export type EventRefusalKind = 'unavailableYet' | 'error';

export interface EventRefusal {
  /** The raw `EVENT_*` code, or '' when the failure carried none. */
  code: string;
  kind: EventRefusalKind;
  /** Key under the `eventPage.errors` i18n namespace. */
  key: string;
}

const KEY_BY_CODE: Readonly<Record<string, string>> = {
  EVENT_FEATURE_UNAVAILABLE: 'featureUnavailable',
  EVENT_UNAVAILABLE: 'unavailable',
  EVENT_CONTENT_UNAVAILABLE: 'unavailable',
  EVENT_NETWORKING_UNAVAILABLE: 'unavailable',
  EVENT_NOT_FOUND: 'notFound',
  EVENT_REGISTRATION_NOT_FOUND: 'notFound',
  EVENT_STAFF_NOT_FOUND: 'notFound',
  EVENT_INVALID_ARGUMENT: 'invalid',
  EVENT_RATE_LIMITED: 'rateLimited',
  EVENT_CONFLICT: 'conflict',
  EVENT_REGISTRATION_CONFLICT: 'conflict',
  EVENT_REGISTRATION_INVALID_TRANSITION: 'conflict',
  EVENT_REGISTRATION_ALREADY_REGISTERED: 'alreadyRegistered',
  EVENT_REGISTRATION_WINDOW_CLOSED: 'windowClosed',
  EVENT_REGISTRATION_WINDOW_NOT_YET_OPEN: 'windowNotYetOpen',
  EVENT_REGISTRATION_NOT_OPEN: 'notOpen',
  EVENT_REGISTRATION_INVALID_PROMO_CODE: 'invalidPromoCode',
  EVENT_REGISTRATION_INVALID_INVITE_CODE: 'invalidInviteCode',
  EVENT_REGISTRATION_INVALID_TERMS: 'termsRequired',
  EVENT_REGISTRATION_ATTENDANCE_FORMAT_REQUIRED: 'attendanceFormat',
  EVENT_REGISTRATION_INVALID_ATTENDANCE_FORMAT: 'attendanceFormat',
  EVENT_REGISTRATION_FORM_INCOMPLETE: 'formIncomplete',
  EVENT_REGISTRATION_INVALID_QUANTITY: 'invalidQuantity',
  EVENT_REGISTRATION_INVALID_SOURCE: 'invalid',
  EVENT_REGISTRATION_TICKET_UNAVAILABLE: 'ticketUnavailable',
  EVENT_REGISTRATION_PAYMENT_UNAVAILABLE: 'paymentUnavailable',
  EVENT_SETTINGS_INVALID_WINDOW: 'invalidWindow',
  EVENT_STAFF_INVALID_USER: 'staffInvalid',
  EVENT_STAFF_INVALID_ROLE: 'staffInvalid',
  EVENT_CONTENT_SPEAKER_NOT_IN_EVENT: 'speakerNotInEvent',
  EVENT_ORGANISER_COMMUNITY_REQUIRED: 'organiserRequired',
  EVENT_ORGANISER_NOT_ADMIN: 'organiserNotAdmin',
  EVENT_REFUSED: 'refused',
};

const CODE_SHAPE = /^EVENT_[A-Z0-9_]{1,64}$/;

type Loose = Record<string, unknown> | null | undefined;

function codeFromGraphQLErrors(errors: unknown): string {
  if (!Array.isArray(errors)) return '';
  for (const e of errors) {
    const code = ((e as Loose)?.extensions as Loose)?.code;
    if (typeof code === 'string' && CODE_SHAPE.test(code)) return code;
  }
  return '';
}

/** The first `EVENT_*` code anywhere in an Apollo result / error object. */
export function eventCodeOf(source: unknown): string {
  const seen = new Set<unknown>();
  const walk = (node: unknown, depth: number): string => {
    if (!node || typeof node !== 'object' || depth > 4 || seen.has(node)) return '';
    seen.add(node);
    const n = node as Record<string, unknown>;
    const direct = codeFromGraphQLErrors(n.errors) || codeFromGraphQLErrors(n.graphQLErrors);
    if (direct) return direct;
    const own = (n.extensions as Loose)?.code;
    if (typeof own === 'string' && CODE_SHAPE.test(own)) return own;
    return walk(n.error, depth + 1) || walk(n.cause, depth + 1) || walk(n.networkError, depth + 1);
  };
  return walk(source, 0);
}

/**
 * `extensions.retryAfterSeconds` (a non-negative whole number) from the first error that carries
 * one, else null. 0 means "no more tries"; null means the server did not say.
 */
export function retryAfterSecondsOf(source: unknown): number | null {
  const seen = new Set<unknown>();
  const walk = (node: unknown, depth: number): number | null => {
    if (!node || typeof node !== 'object' || depth > 4 || seen.has(node)) return null;
    seen.add(node);
    const n = node as Record<string, unknown>;
    for (const list of [n.errors, n.graphQLErrors]) {
      if (!Array.isArray(list)) continue;
      for (const e of list) {
        const v = ((e as Loose)?.extensions as Loose | undefined)?.retryAfterSeconds;
        if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return Math.min(Math.floor(v), 86_400);
      }
    }
    const own = (n.extensions as Loose | undefined)?.retryAfterSeconds;
    if (typeof own === 'number' && Number.isFinite(own) && own >= 0) return Math.min(Math.floor(own), 86_400);
    return walk(n.error, depth + 1) ?? walk(n.cause, depth + 1) ?? walk(n.networkError, depth + 1);
  };
  return walk(source, 0);
}

/** Turn a failed result (or thrown error) into a translatable reason. */
export function eventRefusal(source: unknown): EventRefusal {
  const code = eventCodeOf(source);
  const key = KEY_BY_CODE[code] ?? 'failed';
  return { code, kind: code === 'EVENT_FEATURE_UNAVAILABLE' ? 'unavailableYet' : 'error', key };
}

/** True when an Apollo result carries any error (errorPolicy 'all' keeps `data` alongside). */
export function hasErrors(result: unknown): boolean {
  const r = result as { error?: unknown; errors?: unknown[] } | null | undefined;
  return Boolean(r?.error) || (Array.isArray(r?.errors) && r.errors.length > 0);
}
