/**
 * Members-only content of a gated community/association.
 *
 * A community is GATED when it is PRIVATE or its join policy is APPROVAL,
 * INVITE_ONLY or PAID. Anyone who is not an ACTIVE member of a gated one sees a
 * PREVIEW only; the server marks that with `isContentLocked: true` and rejects
 * every content query with a `COMMUNITY_CONTENT_LOCKED` error. The server is the
 * authority — this module only helps the UI present that state.
 */

export const COMMUNITY_CONTENT_LOCKED_CODE = 'COMMUNITY_CONTENT_LOCKED';

type ErrorLike = {
  code?: unknown;
  extensions?: { code?: unknown } | null;
  errors?: readonly ErrorLike[];
  graphQLErrors?: readonly ErrorLike[];
};

function hasLockedCode(e: ErrorLike | null | undefined): boolean {
  if (!e) return false;
  return e.code === COMMUNITY_CONTENT_LOCKED_CODE || e.extensions?.code === COMMUNITY_CONTENT_LOCKED_CODE;
}

/**
 * True when an Apollo error (v3 `graphQLErrors` or v4 `CombinedGraphQLErrors.errors`)
 * carries the lock code. The gateway puts `code` at the top level of the error;
 * `extensions.code` is checked defensively.
 */
export function isCommunityContentLockedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as ErrorLike;
  if (hasLockedCode(e)) return true;
  return [...(e.errors ?? []), ...(e.graphQLErrors ?? [])].some(hasLockedCode);
}

/** The single action a locked preview offers. */
export type LockedAction = 'request' | 'pay' | 'inviteOnly' | 'pending' | 'banned';

export interface LockedActionInput {
  joinPolicy?: string | null;
  paymentType?: string | null;
  membershipStatus?: string | null;
}

/**
 * Status first (a pending/banned person must never be offered "join" again),
 * then policy. `REQUEST` is the legacy alias of `APPROVAL`; a PRIVATE entity
 * with an otherwise open policy still needs a request, so the fallback is
 * `request`.
 */
export function resolveLockedAction(input: LockedActionInput): LockedAction {
  const status = (input.membershipStatus ?? '').toUpperCase();
  if (status === 'BANNED') return 'banned';
  if (status === 'PENDING' || status === 'PENDING_PAYMENT') return 'pending';
  const policy = (input.joinPolicy ?? '').toUpperCase();
  if (policy === 'INVITE_ONLY') return 'inviteOnly';
  if (policy === 'PAID' || input.paymentType === 'ONE_TIME' || input.paymentType === 'SUBSCRIPTION') {
    return 'pay';
  }
  return 'request';
}
