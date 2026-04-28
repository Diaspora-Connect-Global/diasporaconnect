import { gql } from '@apollo/client';

export type {
  Notification,
  NotificationList,
  UnreadCountResponse,
  NotificationActionResponse,
  GetNotificationsWithMetaResponse,
  GetUnreadNotificationsResponse,
  MarkNotificationAsReadResponse,
  MarkAllNotificationsAsReadResponse,
} from './types/notification';

import type { Notification } from './types/notification';

function pickString(data: Record<string, unknown> | undefined, keys: string[]): string | undefined {
  if (!data) return undefined;
  for (const k of keys) {
    const v = data[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

/** Other party in a connection (for profile links); uses requester/receiver vs current user when possible. */
function resolveConnectionPeerUserId(
  data: Record<string, unknown> | undefined,
  currentUserId?: string
): string | undefined {
  if (!data) return undefined;

  const requesterId = pickString(data, ['requesterId']);
  const receiverId = pickString(data, ['receiverId']);

  if (currentUserId && requesterId && receiverId) {
    if (requesterId === currentUserId) return receiverId;
    if (receiverId === currentUserId) return requesterId;
  }

  const fromActor = pickString(data, [
    'actorId',
    'fromUserId',
    'senderId',
    'userId',
    'peerUserId',
  ]);
  if (fromActor) return fromActor;

  if (requesterId) return requesterId;
  if (receiverId) return receiverId;

  return undefined;
}

function ensureLeadingSlash(path: string): string {
  const p = path.trim();
  if (!p) return '/notification';
  return p.startsWith('/') ? p : `/${p}`;
}

/* ------------------------------------------------------------------ */
/* Queries */
/* ------------------------------------------------------------------ */

/**
 * Fetch notifications + badge count (preferred — single request).
 * Variables: { limit?: number, offset?: number } — defaults: limit 50, offset 0.
 */
export const GET_NOTIFICATIONS_WITH_META = gql`
  query GetNotificationsWithMeta($limit: Int, $offset: Int) {
    getNotificationsWithMeta(limit: $limit, offset: $offset) {
      notifications {
        id
        type
        title
        message
        isRead
        actionUrl
        link
        imageUrl
        data
        createdAt
        readAt
      }
      total
      limit
      offset
      unreadCount
    }
  }
`;

/** Badge count only (lightweight poll). Recommended interval: 30–60s. */
export const GET_UNREAD_COUNT = gql`
  query GetUnreadCount {
    getUnreadNotificationCount {
      count
    }
  }
`;

/** Unread notifications only. */
export const GET_UNREAD_NOTIFICATIONS = gql`
  query GetUnreadNotifications {
    getUnreadNotifications {
      id
      type
      title
      message
      actionUrl
      link
      createdAt
    }
  }
`;

/* ------------------------------------------------------------------ */
/* Mutations */
/* ------------------------------------------------------------------ */

/** Mark a single notification as read. */
export const MARK_NOTIFICATION_AS_READ = gql`
  mutation MarkAsRead($notificationId: String!) {
    markNotificationAsRead(notificationId: $notificationId) {
      success
      message
    }
  }
`;

/** Mark all notifications as read. */
export const MARK_ALL_NOTIFICATIONS_AS_READ = gql`
  mutation MarkAllAsRead {
    markAllNotificationsAsRead {
      success
      message
    }
  }
`;

/* ------------------------------------------------------------------ */
/* Navigation */
/* ------------------------------------------------------------------ */

export type GetNotificationPathOptions = {
  /** Current user's id — used to pick the *other* user for connection notifications. */
  currentUserId?: string;
  /** Resolved actor user id from enriched notification data — fallback for connection routing. */
  actorUserId?: string;
};

/**
 * Returns the path (with leading slash) to navigate to for a notification.
 * Caller builds the full URL, e.g. `/${locale}${path}` (path already starts with `/`).
 *
 * Resolution order is deliberate:
 *   1. Type-specific rules that need to ignore the raw `link`/`actionUrl` (connections,
 *      post comments with commentId deep-link, opportunities, events, memberships).
 *      These take precedence because the server may return API-style URLs that aren't
 *      valid in the app (e.g. `connections/requests/{connectionId}`).
 *   2. Direct entity ids present in `data` (postId, opportunityId, eventId, …).
 *   3. Server-provided `link` / `actionUrl` (as a last resort, for types we don't know about).
 *   4. Section-level fallbacks derived from `type`.
 */
export function getNotificationPath(
  notification: Pick<Notification, 'type' | 'data' | 'link' | 'actionUrl'>,
  options?: GetNotificationPathOptions
): string {
  const { type, data } = notification;
  const d = data as Record<string, unknown> | undefined;
  const t = (type || '').toLowerCase();
  const entityType = pickString(d, ['entityType'])?.toLowerCase();

  // ── 1. Type-specific routing (must run before link/actionUrl) ────────────────

  // Connections → peer profile
  if (t.startsWith('connection.')) {
    const peer = resolveConnectionPeerUserId(d, options?.currentUserId) ?? options?.actorUserId;
    if (peer) return `/${peer}`;
    return '/feed';
  }

  // Post comment / reply: open the post and deep-link to the triggering comment
  if (
    (t === 'post.comment' ||
      t === 'post.commented' ||
      t === 'post.reply' ||
      t === 'post.replied') &&
    d?.postId
  ) {
    const pid = String(d.postId);
    const commentId = pickString(d, [
      'commentId',
      'targetCommentId',
      'targetId',
      'replyCommentId',
      'replyId',
    ]);
    if (commentId) {
      return `/post/${pid}?commentId=${encodeURIComponent(commentId)}`;
    }
    return `/post/${pid}`;
  }

  // Other post interactions (like, mention, …) → post detail
  if (t.startsWith('post.') && d?.postId) {
    return `/post/${String(d.postId)}`;
  }

  // Opportunities (new, application submitted/accepted/rejected, …) → opportunity detail
  const opportunityId = pickString(d, [
    'opportunityId',
    'jobId',
    'listingId',
    'applicationOpportunityId',
  ]);
  if (t.includes('opportunity') && opportunityId) {
    return `/opportunities/${opportunityId}`;
  }

  // Events → event detail when we have an id, else the events list
  if (t.startsWith('event.')) {
    if (d?.eventId) return `/events/${String(d.eventId)}`;
    return '/events';
  }

  // Association / community membership — route to the specific page when we can
  const isAssociationHint = entityType === 'association' || t.includes('association');
  const isCommunityHint = entityType === 'community' || t.includes('community');
  if ((t.startsWith('membership.') || isAssociationHint || isCommunityHint) && d?.entityId) {
    const section = isAssociationHint ? 'association' : 'community';
    return `/${section}/${String(d.entityId)}`;
  }

  // Messages → chat, with a tab hint so the right panel opens
  if (t.startsWith('group.message') || t === 'group.message.received') {
    return '/chat?ct=group';
  }
  if (t.startsWith('message.')) {
    return '/chat?ct=direct';
  }

  // ── 2. Direct entity ids in `data` ───────────────────────────────────────────

  if (d?.postId) return `/post/${String(d.postId)}`;
  if (opportunityId) return `/opportunities/${opportunityId}`;
  if (d?.eventId) return `/events/${String(d.eventId)}`;

  if (d?.groupId && d?.messageId) return '/chat?ct=group';
  if (d?.conversationId) return '/chat?ct=direct';

  if (d?.connectionId) {
    const peerId = pickString(d, [
      'requesterId',
      'senderId',
      'actorId',
      'userId',
      'fromUserId',
      'receiverId',
    ]);
    if (peerId) return `/${peerId}`;
    return '/feed';
  }

  if (d?.entityId && entityType) {
    const section = entityType === 'association' ? 'association' : 'community';
    return `/${section}/${String(d.entityId)}`;
  }

  // ── 3. Server-provided link (last resort — may be external/API style) ────────

  if (notification.link) return ensureLeadingSlash(notification.link);
  if (notification.actionUrl) return ensureLeadingSlash(notification.actionUrl);

  // ── 4. Section-level fallbacks based on type ─────────────────────────────────

  if (t.startsWith('profile.')) return '/profile';
  if (t.includes('opportunity')) return '/opportunities';
  if (t.includes('association')) return '/association';
  if (t.includes('community') || t.startsWith('membership.')) return '/community';

  return '/notification';
}
