/**
 * What the viewer can do about an event, derived from the fields the gateway
 * exposes. One place so the rail, the Register tab and the ticket page can never
 * disagree about, say, whether someone is waitlisted.
 *
 * `myRegistrationStatus` is authoritative when present. Older gateways only send
 * `isRegistered` / `myRegistrationId`, which we read as "confirmed" (what they
 * always meant) so a mixed deploy degrades instead of breaking.
 */

export type RegistrationStanding =
  | 'PENDING'
  | 'PENDING_APPROVAL'
  | 'CONFIRMED'
  | 'WAITLISTED'
  | 'REJECTED'
  | 'CANCELLED';

export interface RegistrationStateInput {
  status?: string | null;
  phase?: string | null;
  endAt?: string | null;
  isFull?: boolean | null;
  requiresApproval?: boolean | null;
  registrationOpensAt?: string | null;
  registrationClosesAt?: string | null;
  myRegistrationStatus?: string | null;
  myRegistrationId?: string | null;
  isRegistered?: boolean | null;
}

export type RegistrationUiState =
  | 'confirmed'
  | 'awaitingPayment'
  | 'pendingApproval'
  | 'waitlisted'
  | 'rejected'
  | 'eventCancelled'
  | 'ended'
  | 'notYetOpen'
  | 'closed'
  | 'full'
  | 'open';

/** Registered in any live way (holds a place, or is waiting for one). */
export const REGISTERED_STATES: ReadonlySet<RegistrationUiState> = new Set([
  'confirmed',
  'awaitingPayment',
  'pendingApproval',
  'waitlisted',
]);

export function standingOf(e: RegistrationStateInput): RegistrationStanding | null {
  const raw = String(e.myRegistrationStatus ?? '').toUpperCase();
  if (raw) return raw as RegistrationStanding;
  if (e.isRegistered || e.myRegistrationId) return 'CONFIRMED';
  return null;
}

export function deriveRegistrationState(e: RegistrationStateInput, now: Date = new Date()): RegistrationUiState {
  const standing = standingOf(e);
  switch (standing) {
    case 'CONFIRMED':
      return 'confirmed';
    case 'PENDING':
      return 'awaitingPayment';
    case 'PENDING_APPROVAL':
      return 'pendingApproval';
    case 'WAITLISTED':
      return 'waitlisted';
    case 'REJECTED':
      return 'rejected';
    default:
      break; // CANCELLED / none: the person is not registered, fall through
  }

  const status = String(e.status ?? '').toLowerCase();
  const phase = String(e.phase ?? '').toUpperCase();
  if (status === 'cancelled' || phase === 'CANCELLED') return 'eventCancelled';
  const ended = e.endAt ? new Date(e.endAt).getTime() < now.getTime() : false;
  if (status === 'completed' || phase === 'ENDED' || phase === 'ARCHIVED' || ended) return 'ended';

  const closesAt = e.registrationClosesAt ? new Date(e.registrationClosesAt).getTime() : null;
  if (phase === 'REGISTRATION_CLOSED' || (closesAt != null && closesAt < now.getTime())) return 'closed';
  const opensAt = e.registrationOpensAt ? new Date(e.registrationOpensAt).getTime() : null;
  if (opensAt != null && opensAt > now.getTime()) return 'notYetOpen';
  if (e.isFull) return 'full';
  return 'open';
}

/** Can the Register tab offer the form? (Full still can: it registers onto the waitlist.) */
export function canStartRegistration(state: RegistrationUiState): boolean {
  return state === 'open' || state === 'full';
}
