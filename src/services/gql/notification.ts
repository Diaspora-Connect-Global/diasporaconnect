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
        read
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
  if (data?.postId) return `/post/${data.postId}`;
  if (data?.groupId && data?.messageId)
    return `/messages/group/${data.groupId}?message=${data.messageId}`;
  if (data?.conversationId) return `/chat`; // or `/messages/${data.conversationId}` if you have that route
  if (data?.eventId) return `/events/${data.eventId}`;
  if (data?.connectionId) return `/connections/requests/${data.connectionId}`;
  if (data?.entityId && data?.entityType) {
    const section =
      (data.entityType as string).toLowerCase() === 'association' ? 'association' : 'community';
    return `/${section}/${data.entityId}`;
  }
  if (type?.startsWith('profile.')) return '/profile';
  if (type?.startsWith('connection.')) return '/connections';
  if (type?.startsWith('message.') || type?.startsWith('group.message.')) return '/chat';
  if (type?.startsWith('event.')) return '/events';
  if (type?.startsWith('membership.')) return '/community';

  return '/notification';
}
