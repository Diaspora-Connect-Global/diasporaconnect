export interface Notification {
  id: string;
  userId: string;
  recipientId: string;
  type: string; // e.g. "connection.request", "post.like", "message.received"
  title: string;
  message: string;
  body: string; // alias for message
  data?: Record<string, unknown>; // contextual payload (postId, groupId, eventId, etc.)
  /** @deprecated Prefer isRead from API */
  read?: boolean;
  isRead: boolean;
  actionUrl?: string; // preferred navigation target
  link?: string; // alias for actionUrl
  imageUrl?: string;
  createdAt: string; // ISO 8601
  readAt?: string; // ISO 8601, only if read
}

export interface NotificationList {
  notifications: Notification[];
  total: number;
  limit: number;
  offset: number;
  unreadCount: number; // use this for badge count
}

export interface UnreadCountResponse {
  getUnreadNotificationCount: {
    count: number;
  };
}

export interface NotificationActionResponse {
  success: boolean;
  message?: string;
}

export interface GetNotificationsWithMetaResponse {
  getNotificationsWithMeta: NotificationList;
}

export interface GetUnreadNotificationsResponse {
  getUnreadNotifications: Notification[];
}

export interface MarkNotificationAsReadResponse {
  markNotificationAsRead: NotificationActionResponse;
}

export interface MarkAllNotificationsAsReadResponse {
  markAllNotificationsAsRead: NotificationActionResponse;
}
