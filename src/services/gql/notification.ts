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

/**
 * Returns the path (with leading slash) to navigate to for a notification.
 * Prefer link/actionUrl; fall back to type + data. Caller should prepend locale, e.g. `/${locale}${path}`.
 */
export function getNotificationPath(notification: Pick<Notification, 'type' | 'data' | 'link' | 'actionUrl'>): string {
  if (notification.link) return notification.link;
  if (notification.actionUrl) return notification.actionUrl;

  const { type, data } = notification;
  const d = data as Record<string, unknown> | undefined;

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
  if (type?.startsWith('connection.')) return '/feed';
  if (type?.startsWith('message.') || type?.startsWith('group.message.')) return '/chat';
  if (type?.startsWith('event.')) return '/events';
  if (type?.startsWith('membership.')) return '/community';

  return '/notification';
}
