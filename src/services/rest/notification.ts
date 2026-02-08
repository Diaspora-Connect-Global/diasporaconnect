import { apiClient } from './client';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
}

export interface UnreadCountResponse {
  count: number;
}

// GET endpoints
export const getNotifications = async (page = 1, limit = 20): Promise<NotificationResponse> => {
  const response = await apiClient.get(`/notifications?page=${page}&limit=${limit}`);
  return response.data;
};

export const getUnreadNotifications = async (): Promise<Notification[]> => {
  const response = await apiClient.get('/notifications/unread');
  return response.data;
};

export const getUnreadCount = async (): Promise<UnreadCountResponse> => {
  const response = await apiClient.get('/notifications/unread/count');
  return response.data;
};

// PATCH endpoints
export const markAsRead = async (id: string): Promise<void> => {
  await apiClient.patch(`/notifications/${id}/read`);
};

export const markAllAsRead = async (): Promise<void> => {
  await apiClient.patch('/notifications/read-all');
};

// DELETE endpoints
export const deleteNotification = async (id: string): Promise<void> => {
  await apiClient.delete(`/notifications/${id}`);
};

export const deleteAllNotifications = async (): Promise<void> => {
  await apiClient.delete('/notifications');
};