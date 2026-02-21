import { gql } from '@apollo/client';

export type {
  Notification,
  GetNotificationsResponse,
  MarkAsReadResponse,
  DeleteNotificationResponse,
  NotificationType,
} from './types/notification';

/**
 * Fetches user notifications with optional pagination.
 * 
 * @example
 * ```typescript
 * import { useQuery } from '@apollo/client';
 * import { GET_NOTIFICATIONS, GetNotificationsResponse } from '@/services/gql/notification';
 * 
 * function NotificationList() {
 *   const { data, loading } = useQuery<GetNotificationsResponse>(GET_NOTIFICATIONS, {
 *     variables: { limit: 20, offset: 0 }
 *   });
 * 
 *   return (
 *     <div>
 *       {data?.getNotifications.map(notification => (
 *         <div key={notification.id}>{notification.title}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export const GET_NOTIFICATIONS = gql`
  query GetNotifications($limit: Int, $offset: Int) {
    getNotifications(limit: $limit, offset: $offset) {
      id
      recipientId
      type
      title
      body
      data
      isRead
      createdAt
    }
  }
`;

/**
 * Marks a notification as read.
 * 
 * @example
 * ```typescript
 * import { useMutation } from '@apollo/client';
 * import { MARK_AS_READ, MarkAsReadResponse } from '@/services/gql/notification';
 * 
 * function NotificationItem({ id }: { id: string }) {
 *   const [markAsRead] = useMutation<MarkAsReadResponse>(MARK_AS_READ);
 * 
 *   const handleMarkRead = async () => {
 *     await markAsRead({
 *       variables: { notificationId: id }
 *     });
 *   };
 * 
 *   return <button onClick={handleMarkRead}>Mark as Read</button>;
 * }
 * ```
 */
export const MARK_AS_READ = gql`
  mutation MarkAsRead($notificationId: String!) {
    markAsRead(notificationId: $notificationId)
  }
`;

/**
 * Deletes a notification.
 * 
 * @example
 * ```typescript
 * import { useMutation } from '@apollo/client';
 * import { DELETE_NOTIFICATION, DeleteNotificationResponse } from '@/services/gql/notification';
 * 
 * function NotificationItem({ id }: { id: string }) {
 *   const [deleteNotification] = useMutation<DeleteNotificationResponse>(DELETE_NOTIFICATION);
 * 
 *   const handleDelete = async () => {
 *     await deleteNotification({
 *       variables: { notificationId: id }
 *     });
 *   };
 * 
 *   return <button onClick={handleDelete}>Delete</button>;
 * }
 * ```
 */
export const DELETE_NOTIFICATION = gql`
  mutation DeleteNotification($notificationId: String!) {
    deleteNotification(notificationId: $notificationId)
  }
`;
