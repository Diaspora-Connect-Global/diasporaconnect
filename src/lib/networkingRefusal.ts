/**
 * Reading a refused networking operation.
 *
 * Apollo runs with `errorPolicy: 'all'`, so a refusal RESOLVES with
 * `data: null` plus an error carrying `extensions.code = EVENT_NETWORKING_*`
 * (the gateway never uses FORBIDDEN / UNAUTHENTICATED for these, which would
 * sign the user out). This turns whatever Apollo hands back into a stable key
 * under `networking.errors`.
 *
 * `unavailableYet` is the dark-launch refusal: "not available yet", not an error.
 * `notFound` is deliberately ONE bucket: a person that does not exist, is
 * hidden, blocked or ineligible must read identically.
 */

import { eventCodeOf } from '@/lib/eventRefusal';

export type NetworkingRefusalKind = 'unavailableYet' | 'notFound' | 'error';

export interface NetworkingRefusal {
  code: string;
  kind: NetworkingRefusalKind;
  /** Key under the `networking.errors` namespace. */
  key: string;
}

const KEY_BY_CODE: Readonly<Record<string, string>> = {
  EVENT_NETWORKING_FEATURE_UNAVAILABLE: 'featureUnavailable',
  EVENT_FEATURE_UNAVAILABLE: 'featureUnavailable',
  EVENT_NETWORKING_UNAVAILABLE: 'unavailable',
  EVENT_NETWORKING_NOT_FOUND: 'notFound',
  EVENT_NETWORKING_PERSON_NOT_FOUND: 'notFound',
  EVENT_NETWORKING_INVALID_ARGUMENT: 'invalid',
  EVENT_NETWORKING_RATE_LIMITED: 'rateLimited',
  EVENT_NETWORKING_CONSENT_REQUIRED: 'consentRequired',
  EVENT_NETWORKING_CONFLICT: 'conflict',
  EVENT_NETWORKING_NOT_ELIGIBLE: 'notEligible',
  EVENT_NETWORKING_CLOSED: 'closed',
  EVENT_NETWORKING_NOT_OPEN: 'closed',
  EVENT_NETWORKING_NOT_PARTICIPANT: 'notParticipant',
  EVENT_NETWORKING_REFUSED: 'refused',
  EVENT_NETWORKING_REVEAL_CONFIRMATION_REQUIRED: 'revealConfirmation',
  EVENT_NETWORKING_INTERESTS_PAUSED: 'interestsPaused',
  EVENT_NETWORKING_INTEREST_LIMIT_REACHED: 'interestLimit',
  EVENT_NETWORKING_CONNECT_COOLDOWN: 'connectCooldown',
  EVENT_NETWORKING_CONNECTION_LIMIT_REACHED: 'connectionLimit',
  EVENT_NETWORKING_CONNECT_REFUSED: 'connectRefused',
};

const NOT_FOUND_KEYS = new Set(['notFound']);

export function networkingRefusal(source: unknown): NetworkingRefusal {
  const code = eventCodeOf(source);
  const key = KEY_BY_CODE[code] ?? (code.startsWith('EVENT_NETWORKING_') ? 'refused' : 'generic');
  const kind: NetworkingRefusalKind = key === 'featureUnavailable' ? 'unavailableYet' : NOT_FOUND_KEYS.has(key) ? 'notFound' : 'error';
  return { code, kind, key };
}

/** True when the failure (a thrown error or an Apollo result) carries any error at all. */
export function hasFailure(source: unknown): boolean {
  const s = source as { error?: unknown; errors?: unknown[] } | null | undefined;
  return Boolean(s && (s.error || (Array.isArray(s.errors) && s.errors.length > 0)));
}
