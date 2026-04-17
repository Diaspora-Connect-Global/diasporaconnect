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
};

/**
 * Returns the path (with leading slash) to navigate to for a notification.
 * Caller builds the full URL, e.g. `/${locale}${path}` (path already starts with `/`).
 *
 * For `connection.*` types, we always resolve the **peer user's profile** from `data` and ignore
 * `link` / `actionUrl`, which may point at API-style routes like `connections/requests/{connectionId}`.
 */
export function getNotificationPath(
  notification: Pick<Notification, 'type' | 'data' | 'link' | 'actionUrl'>,
  options?: GetNotificationPathOptions
): string {
  const { type, data } = notification;
  const d = data as Record<string, unknown> | undefined;

  if (type?.startsWith('connection.')) {
    const peer = resolveConnectionPeerUserId(d, options?.currentUserId);
    if (peer) return `/${peer}`;
    return '/feed';
  }

  // Post comment / reply: open the post with comments and deep-link to the triggering comment
  // (must run before link/actionUrl — API may send non-app URLs).
  if (
    (type === 'post.comment' ||
      type === 'post.commented' ||
      type === 'post.reply' ||
      type === 'post.replied') &&
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

  if (notification.link) return ensureLeadingSlash(notification.link);
  if (notification.actionUrl) return ensureLeadingSlash(notification.actionUrl);

  if (d?.postId) return `/post/${String(d.postId)}`;
  if (d?.eventId) return `/events/${String(d.eventId)}`;

  if (d?.groupId && d?.messageId) {
    return '/chat';
  }
  if (d?.conversationId) return '/chat';

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

  if (d?.entityId && d?.entityType) {
    const section =
      String(d.entityType).toLowerCase() === 'association' ? 'association' : 'community';
    return `/${section}/${String(d.entityId)}`;
  }
  if (type?.startsWith('profile.')) return '/profile';
  if (type?.startsWith('message.') || type?.startsWith('group.message.')) return '/chat';
  if (type?.startsWith('event.')) return '/events';
  if (type?.startsWith('membership.')) return '/community';

  return '/notification';
}
