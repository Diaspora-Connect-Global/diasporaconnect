import type { FriendType } from '@/components/friends/TypeOfFriend';

/**
 * Maps `getProfile(userId)` connectionStatus from the API to UI `FriendType`.
 * Handles legacy/alternate spellings (`pending_request` vs `pending_received`, casing).
 */
export function mapApiConnectionStatusToFriendType(
  status: string | undefined | null
): FriendType {
  const s = (status ?? '').trim().toLowerCase();
  if (s === 'blocked') return 'blocked';
  if (s === 'pending_sent') return 'request-sent';
  if (s === 'pending_received' || s === 'pending_request') return 'request-received';
  if (s === 'none' || s === 'not_connected' || s === '') return 'suggested';
  if (s === 'connected' || s === 'friends') return 'friends';
  return 'suggested';
}
