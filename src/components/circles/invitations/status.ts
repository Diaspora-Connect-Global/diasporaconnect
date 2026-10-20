/**
 * Statuses on circle invitations and join requests.
 *
 * The gateway types these fields as plain strings and has been seen carrying
 * both the bare value (`PENDING`) and the enum-prefixed one
 * (`INVITATION_PENDING` / `JOIN_REQUEST_PENDING`), so every comparison goes
 * through `bareStatus` rather than trusting one spelling.
 */
export function bareStatus(status?: string | null): string {
  return (status ?? '').trim().toUpperCase().replace(/^(INVITATION|JOIN_REQUEST)_/, '');
}

/** Pending and not yet past its expiry. An expired invitation cannot be answered. */
export function isPendingInvitation(
  invitation: { status?: string | null; expiresAt?: string | null },
  now: number = Date.now(),
): boolean {
  if (bareStatus(invitation.status) !== 'PENDING') return false;
  if (!invitation.expiresAt) return true;
  const expires = Date.parse(invitation.expiresAt);
  return Number.isNaN(expires) || expires > now;
}

export function isPendingJoinRequest(request: { status?: string | null }): boolean {
  return bareStatus(request.status) === 'PENDING';
}

/** The refusal -> `circles.invitations.errors.*` key. Server wording is never shown. */
export function invitationErrorKey(refusal: string | null): string {
  switch (refusal) {
    case 'ENTITLEMENT_LOCKED':
      return 'full';
    case 'NOT_A_MEMBER':
    case 'PROPOSER_ROLE':
      return 'gone';
    default:
      return 'unknown';
  }
}
