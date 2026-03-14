'use client';

import { NotificationCard } from '@/components/cards/notification/NotificationCard';
import { Check, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  GET_NOTIFICATIONS_WITH_META,
  MARK_NOTIFICATION_AS_READ,
  MARK_ALL_NOTIFICATIONS_AS_READ,
  getNotificationPath,
  type Notification,
  type GetNotificationsWithMetaResponse,
  type MarkNotificationAsReadResponse,
  type MarkAllNotificationsAsReadResponse,
} from '@/services/gql/notification';
import { useNotificationBadge } from '@/hooks/useNotificationBadge';

const PAGE_SIZE = 20;

export default function NotificationPage() {
  const t = useTranslations('notification');
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const { refetch: refetchBadge } = useNotificationBadge(true);

  const [offset, setOffset] = useState(0);
  const [accumulated, setAccumulated] = useState<Notification[]>([]);

  const { data, loading, error, refetch } = useQuery<GetNotificationsWithMetaResponse>(
    GET_NOTIFICATIONS_WITH_META,
    {
      variables: { limit: PAGE_SIZE, offset },
    }
  );

  const [markAsReadMutation] = useMutation<MarkNotificationAsReadResponse>(MARK_NOTIFICATION_AS_READ);
  const [markAllAsReadMutation] = useMutation<MarkAllNotificationsAsReadResponse>(
    MARK_ALL_NOTIFICATIONS_AS_READ
  );

  const list = data?.getNotificationsWithMeta;
  const pageNotifications = list?.notifications ?? [];
  const total = list?.total ?? 0;
  const unreadCount = list?.unreadCount ?? 0;
  const hasMore = offset + pageNotifications.length < total;

  useEffect(() => {
    if (!list) return;
    if (offset === 0) {
      setAccumulated(list.notifications);
    } else {
      setAccumulated((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const toAdd = list.notifications.filter((n) => !existingIds.has(n.id));
        return toAdd.length ? [...prev, ...toAdd] : prev;
      });
    }
  }, [list, offset]);

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      const id = notification.id;
      const path = getNotificationPath(notification);
      const target = `/${locale}${path}`;

      // Optimistic: mark as read (fire-and-forget), then navigate
      markAsReadMutation({ variables: { notificationId: id } }).then(() => refetchBadge());
      refetch();
      router.push(target);
    },
    [locale, markAsReadMutation, refetchBadge, refetch, router]
  );

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllAsReadMutation();
      await refetch();
      refetchBadge();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, [markAllAsReadMutation, refetch, refetchBadge]);

  const markSingleAsRead = useCallback(
    async (id: string) => {
      try {
        await markAsReadMutation({ variables: { notificationId: id } });
        await refetch();
        refetchBadge();
      } catch (err) {
        console.error('Error marking as read:', err);
      }
    },
    [markAsReadMutation, refetch, refetchBadge]
  );

  const loadMore = useCallback(() => {
    setOffset((prev) => prev + PAGE_SIZE);
  }, []);

  return (
    <div className="lg:max-w-[63rem] mx-2 lg:mx-auto h-app-inner py-4">
      <div className="h-[30%] lg:h-[20%]">
        <div className="lg:flex justify-between items-center mb-4">
          <p className="text-2xl font-heading-large">{t('notifications')}</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="flex items-center gap-2 text-text-brand hover:text-text-brand-dark transition-colors cursor-pointer"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              <Check size={16} />
              <span className="text-sm">{t('markall')}</span>
            </button>
            <div className="w-px h-4 bg-border-subtle" />
            <button
              type="button"
              className="flex items-center gap-2 text-text-brand hover:text-text-brand-dark transition-colors cursor-pointer"
            >
              <Settings size={16} />
              <span className="text-sm">{t('preference')}</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-text-secondary font-medium">Loading...</div>
      ) : error ? (
        <div className="text-text-danger font-medium">Unable to load notifications.</div>
      ) : accumulated.length === 0 ? (
        <div className="text-text-secondary font-medium">{t('none.all')}</div>
      ) : (
        <div className="bg-surface-default rounded-md lg:p-6 h-[70%] lg:h-[80%] overflow-y-auto scrollbar-hide">
          {accumulated.map((not) => (
            <NotificationCard
              key={not.id}
              title={not.title}
              description={not.message || not.body}
              imageUrl={not.imageUrl}
              time={not.createdAt}
              read={not.read ?? not.isRead}
              onMarkAsRead={() => markSingleAsRead(not.id)}
              onClick={() => handleNotificationClick(not)}
            />
          ))}
          {hasMore && (
            <div className="flex justify-center py-4">
              <button
                type="button"
                className="text-text-brand text-sm hover:underline"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
