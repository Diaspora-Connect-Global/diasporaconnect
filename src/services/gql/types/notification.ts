export interface Notification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export interface GetNotificationsResponse {
  getNotifications: Notification[];
}

export interface MarkAsReadResponse {
  markAsRead: boolean;
}

export interface DeleteNotificationResponse {
  deleteNotification: boolean;
}

export enum NotificationType {
  SYSTEM = 'SYSTEM',
  MESSAGE = 'MESSAGE',
  EVENT_REMINDER = 'EVENT_REMINDER',
  COMMUNITY_UPDATE = 'COMMUNITY_UPDATE',
  PAYMENT_CONFIRMATION = 'PAYMENT_CONFIRMATION'
}
