'use client';

import { NotificationCard } from '@/components/cards/notification/NotificationCard';
import { Check, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { NetworkStatus } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  GET_NOTIFICATIONS_WITH_META,
  GET_UNREAD_COUNT,
  MARK_NOTIFICATION_AS_READ,
  MARK_ALL_NOTIFICATIONS_AS_READ,
  getNotificationPath,
  type Notification,
  type GetNotificationsWithMetaResponse,
  type MarkNotificationAsReadResponse,
  type MarkAllNotificationsAsReadResponse,
} from '@/services/gql/notification';
import { useUserStore } from '@/store/useUserStore';
import {
  useEnrichedNotification,
  type EnrichedNotification,
} from '@/hooks/useEnrichedNotification';
import { formatDateProximity } from '@/macros/time';

type Translator = (key: string, values?: Record<string, string>) => string;

function getNotificationTypeLabel(type: string | undefined, t: Translator): string {
  if (!type) return t('types.default');
  const key = `types.${type}`;
  try {
    return t(key);
  } catch {
    if (type.startsWith('opportunity.')) {
      try {
        return t('types.opportunity.default');
      } catch {
        return t('types.default');
      }
    }
    return t('types.default');
  }
}

interface NotificationView {
  title: string;
  description?: string;
  imageUrl?: string;
  actorHref?: string;
}

/**
 * Build the "who/what happened" sentence for a notification, using enriched
 * data pulled from the API (actor profile, post, opportunity, event, etc.).
 *
 * The returned `title` is the one-line descriptive sentence shown in the card
 * heading. `description` carries optional extra detail (post snippet, event
 * start date) when it adds value beyond the title.
 */
function buildNotificationView(
  not: Notification,
  enriched: EnrichedNotification,
  t: Translator,
  locale: string
): NotificationView {
  const type = (not.type || '').toLowerCase();
  const data = (not.data as Record<string, unknown> | undefined) || {};
  const entityType = String(data.entityType || '').toLowerCase();

  const actorName = enriched.actorName || t('messages.actorFallback');
  // Whenever a user actor is involved in the notification (comment, like,
  // connection, message, invite, …) we want to show either their real avatar
  // or the default user silhouette — never the system/globe icon. We detect
  // "user actor present" by having a resolved userId, a resolved name, OR
  // any obvious person-typed notification (connection/comment/like/message)
  // so we still render the person silhouette while loading.
  const isPersonNotification =
    type.includes('connection') ||
    type.includes('comment') ||
    type.includes('like') ||
    type.includes('message') ||
    type.includes('mention') ||
    type.includes('invite');
  const hasUserActor = Boolean(
    enriched.actorUserId || enriched.actorName || isPersonNotification
  );
  const actorAvatar =
    enriched.actorAvatarUrl ||
    not.imageUrl ||
    (hasUserActor ? '/PROFILE.png' : undefined);
  const actorHref = enriched.actorUserId ? `/${locale}/${enriched.actorUserId}` : undefined;

  // Connections — match any backend naming variant (dot, camel, snake).
  const isConnectionRequestType =
    type === 'connection.request' ||
    type === 'connection.requested' ||
    type === 'connectionrequest' ||
    type === 'connection_request' ||
    type === 'new_connection_request';
  const isConnectionAcceptedType =
    type === 'connection.accepted' ||
    type === 'connectionaccepted' ||
    type === 'connection_accepted';

  if (isConnectionRequestType) {
    return {
      title: t('messages.connectionRequest', { actorName }),
      imageUrl: actorAvatar,
      actorHref,
    };
  }
  if (isConnectionAcceptedType) {
    return {
      title: t('messages.connectionAccepted', { actorName }),
      imageUrl: actorAvatar,
      actorHref,
    };
  }

  // Posts — attach the post snippet when we have one
  if (type === 'post.like' || type === 'post.comment' || type === 'post.commented' || type === 'post.mention') {
    const hasTitle = Boolean(enriched.targetTitle);
    const key =
      type === 'post.like'
        ? (hasTitle ? 'messages.postLikeWithTitle' : 'messages.postLike')
        : type === 'post.mention'
          ? (hasTitle ? 'messages.postMentionWithTitle' : 'messages.postMention')
          : (hasTitle ? 'messages.postCommentWithTitle' : 'messages.postComment');
    return {
      title: t(key, { actorName, postTitle: enriched.targetTitle || '' }),
      description: enriched.targetSnippet || undefined,
      imageUrl: actorAvatar,
      actorHref,
    };
  }

  // Direct / group messages
  if (type === 'message.received') {
    return {
      title: t('messages.messageReceived', { actorName }),
      imageUrl: actorAvatar,
      actorHref,
    };
  }
  if (type === 'group.message') {
    const groupName = enriched.entityName || '';
    return {
      title: groupName
        ? t('messages.groupMessageWithName', { actorName, groupName })
        : t('messages.groupMessage', { actorName }),
      imageUrl: actorAvatar,
      actorHref,
    };
  }

  // Events
  if (type === 'event.reminder') {
    const eventName = enriched.targetTitle || not.title || t('messages.eventFallback');
    const when = enriched.eventWhenISO ? formatDateProximity(enriched.eventWhenISO) : '';
    return {
      title: when
        ? t('messages.eventReminderWithDate', { eventName, when })
        : t('messages.eventReminder', { eventName }),
      imageUrl: actorAvatar,
      actorHref,
    };
  }
  if (type === 'event.invite') {
    const eventName = enriched.targetTitle || not.title || t('messages.eventFallback');
    return {
      title: t('messages.eventInvite', { actorName, eventName }),
      imageUrl: actorAvatar,
      actorHref,
    };
  }

  // Opportunities
  if (type === 'opportunity.application.submitted') {
    const title = enriched.targetTitle || '';
    const poster = enriched.opportunityPoster || '';
    return {
      title: title
        ? poster
          ? t('messages.opportunityApplicationSubmittedWithPoster', { title, poster })
          : t('messages.opportunityApplicationSubmitted', { title })
        : t('messages.opportunityApplicationSubmittedFallback'),
    };
  }
  if (type === 'opportunity.application.accepted') {
    const title = enriched.targetTitle || '';
    const poster = enriched.opportunityPoster || '';
    return {
      title: title
        ? poster
          ? t('messages.opportunityApplicationAcceptedWithPoster', { title, poster })
          : t('messages.opportunityApplicationAccepted', { title })
        : t('messages.opportunityApplicationAcceptedFallback'),
    };
  }
  if (type === 'opportunity.application.rejected') {
    const title = enriched.targetTitle || '';
    const poster = enriched.opportunityPoster || '';
    return {
      title: title
        ? poster
          ? t('messages.opportunityApplicationRejectedWithPoster', { title, poster })
          : t('messages.opportunityApplicationRejected', { title })
        : t('messages.opportunityApplicationRejectedFallback'),
    };
  }
  if (type.includes('opportunity')) {
    const title = enriched.targetTitle || '';
    const poster = enriched.opportunityPoster || '';
    if (title) {
      return {
        title: poster
          ? t('messages.opportunityNewWithPoster', { title, poster })
          : t('messages.opportunityNew', { title }),
      };
    }
  }

  // Association / community membership
  const isAssociation = entityType === 'association' || type.includes('association');
  if (isAssociation && (type.includes('approved') || type === 'membership.approved')) {
    const associationName = enriched.entityName || t('messages.associationFallback');
    return { title: t('messages.associationApproved', { associationName }) };
  }
  if (isAssociation && (type.includes('request') || type === 'membership.request')) {
    const associationName = enriched.entityName || t('messages.associationFallback');
    return {
      title: enriched.actorName
        ? t('messages.associationRequestFromActor', { actorName, associationName })
        : t('messages.associationRequest', { associationName }),
      imageUrl: actorAvatar,
      actorHref,
    };
  }
  if (type === 'membership.approved') {
    const communityName = enriched.entityName || t('messages.communityFallback');
    return { title: t('messages.membershipApproved', { communityName }) };
  }
  if (type === 'membership.request') {
    const communityName = enriched.entityName || t('messages.communityFallback');
    return {
      title: enriched.actorName
        ? t('messages.membershipRequestFromActor', { actorName, communityName })
        : t('messages.membershipRequest', { communityName }),
      imageUrl: actorAvatar,
      actorHref,
    };
  }

  // Default — fall back to whatever the backend provided.
  const fallback = not.message || (not as { body?: string }).body || not.title || '';
  return {
    title: not.title || fallback || t('types.default'),
    description: not.title && fallback && fallback !== not.title ? fallback : undefined,
  };
}

const PAGE_SIZE = 20;

type NotificationFilter = 'all' | 'opportunities' | 'events' | 'associations' | 'communities';

function NotificationRow({
  not,
  t,
  locale,
  currentUserId,
  onMarkAsRead,
  onClick,
  isReadOptimistic,
}: {
  not: Notification;
  t: Translator;
  locale: string;
  currentUserId?: string;
  onMarkAsRead: () => void;
  onClick: (actorUserId?: string) => void;
  isReadOptimistic: boolean;
}) {
  const enriched = useEnrichedNotification(not, currentUserId);
  const view = buildNotificationView(not, enriched, t, locale);

  return (
    <NotificationCard
      typeLabel={getNotificationTypeLabel(not.type, t)}
      title={view.title || undefined}
      description={view.description}
      imageUrl={view.imageUrl}
      actorHref={view.actorHref}
      time={not.createdAt}
      read={(not.isRead ?? not.read ?? false) || isReadOptimistic}
      onMarkAsRead={onMarkAsRead}
      onClick={() => onClick(enriched.actorUserId ?? undefined)}
    />
  );
}

function matchesFilter(not: Notification, filter: NotificationFilter): boolean {
  if (filter === 'all') return true;
  const type = (not.type || '').toLowerCase();
  const data = not.data as { entityType?: string } | undefined;
  const entityType = (data?.entityType || '').toLowerCase();
  if (filter === 'opportunities') return type.includes('opportunity');
  if (filter === 'events') return type.startsWith('event.');
  if (filter === 'associations') return type.includes('association') || entityType === 'association';
  if (filter === 'communities') {
    if (entityType === 'association') return false;
    return (
      type.includes('community') ||
      entityType === 'community' ||
      (type.includes('membership') && entityType !== 'association')
    );
  }
  return true;
}

export default function NotificationPage() {
  const t = useTranslations('notification');
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const currentUserId = useUserStore((s) => s.user?.userId);

  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const { data, error, fetchMore, networkStatus, refetch } = useQuery<GetNotificationsWithMetaResponse>(
    GET_NOTIFICATIONS_WITH_META,
    {
      variables: { limit: PAGE_SIZE, offset: 0 },
      notifyOnNetworkStatusChange: true,
    }
  );

  const [markAsReadMutation] = useMutation<MarkNotificationAsReadResponse>(MARK_NOTIFICATION_AS_READ, {
    refetchQueries: [{ query: GET_UNREAD_COUNT }],
  });
  const [markAllAsReadMutation] = useMutation<MarkAllNotificationsAsReadResponse>(
    MARK_ALL_NOTIFICATIONS_AS_READ,
    { refetchQueries: [{ query: GET_UNREAD_COUNT }] }
  );

  const list = data?.getNotificationsWithMeta;
  const notifications = list?.notifications ?? [];
  const total = list?.total ?? 0;
  const unreadCount = list?.unreadCount ?? 0;
  const hasMore = notifications.length < total;

  const isInitialLoading = networkStatus === NetworkStatus.loading && !list;
  const isFetchingMore = networkStatus === NetworkStatus.fetchMore;

  const filtered =
    filter === 'all' ? notifications : notifications.filter((n) => matchesFilter(n, filter));
  const emptyMessageKey =
    filter === 'all'
      ? 'none.all'
      : (`none.${filter}` as 'none.all' | 'none.opportunities' | 'none.events' | 'none.associations' | 'none.communities');

  const loadMore = useCallback(() => {
    if (!hasMore || isFetchingMore) return;
    void fetchMore({
      variables: { offset: notifications.length },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult?.getNotificationsWithMeta) return prev;
        if (!prev?.getNotificationsWithMeta) return fetchMoreResult;
        const prevNotes = prev.getNotificationsWithMeta.notifications;
        const nextNotes = fetchMoreResult.getNotificationsWithMeta.notifications;
        const seen = new Set(prevNotes.map((n) => n.id));
        const merged = [...prevNotes];
        for (const n of nextNotes) {
          if (!seen.has(n.id)) {
            seen.add(n.id);
            merged.push(n);
          }
        }
        return {
          getNotificationsWithMeta: {
            ...fetchMoreResult.getNotificationsWithMeta,
            notifications: merged,
            total: fetchMoreResult.getNotificationsWithMeta.total,
            unreadCount: fetchMoreResult.getNotificationsWithMeta.unreadCount,
          },
        };
      },
    });
  }, [fetchMore, hasMore, isFetchingMore, notifications.length]);

  const handleNotificationClick = useCallback(
    async (notification: Notification, actorUserId?: string) => {
      const id = notification.id;
      const path = getNotificationPath(notification, { currentUserId, actorUserId });
      const target = `/${locale}${path}`;

      setReadIds((prev) => new Set(prev).add(id));

      try {
        await markAsReadMutation({ variables: { notificationId: id } });
      } catch (err) {
        console.error('Error marking notification as read:', err);
        setReadIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
      router.push(target);
    },
    [locale, markAsReadMutation, router, currentUserId]
  );

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllAsReadMutation();
      setReadIds(new Set(notifications.map((n) => n.id)));
      await refetch({ limit: PAGE_SIZE, offset: 0 });
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, [markAllAsReadMutation, notifications, refetch]);

  const markSingleAsRead = useCallback(
    async (id: string) => {
      setReadIds((prev) => new Set(prev).add(id));
      try {
        await markAsReadMutation({ variables: { notificationId: id } });
      } catch (err) {
        console.error('Error marking as read:', err);
        setReadIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [markAsReadMutation]
  );

  const openNotificationSettings = useCallback(() => {
    router.push(`/${locale}/settings`);
  }, [locale, router]);

  return (
    <div className="lg:max-w-[63rem] mx-2 lg:mx-auto h-app-inner py-4">
      <div className="h-[30%] lg:h-[20%]">
        <div className="lg:flex justify-between items-center mb-4">
          <p className="text-2xl heading-large">{t('notifications')}</p>
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
              onClick={openNotificationSettings}
            >
              <Settings size={16} />
              <span className="text-sm">{t('preference')}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {(
            [
              { key: 'all' as const, label: t('allnotifications') },
              { key: 'opportunities' as const, label: t('opportunities') },
              { key: 'events' as const, label: t('events') },
              { key: 'associations' as const, label: t('associations') },
              { key: 'communities' as const, label: t('communities') },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-surface-brand text-text-inverse'
                  : 'bg-surface-subtle text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isInitialLoading ? (
        <div className="text-text-secondary font-medium">{t('loading')}</div>
      ) : error ? (
        <div className="text-text-danger font-medium">{t('errorLoad')}</div>
      ) : notifications.length === 0 ? (
        <div className="text-text-secondary font-medium">{t('none.all')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-text-secondary font-medium">{t(emptyMessageKey)}</div>
      ) : (
        <div className="bg-surface-default rounded-md lg:p-6 h-[70%] lg:h-[80%] overflow-y-auto scrollbar-hide">
          {filtered.map((not) => (
            <NotificationRow
              key={not.id}
              not={not}
              t={t}
              locale={locale}
              currentUserId={currentUserId}
              onMarkAsRead={() => markSingleAsRead(not.id)}
              onClick={(actorUserId) => handleNotificationClick(not, actorUserId)}
              isReadOptimistic={readIds.has(not.id)}
            />
          ))}
          {hasMore && (
            <div className="flex justify-center py-4">
              <button
                type="button"
                className="text-text-brand text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={loadMore}
                disabled={isFetchingMore}
              >
                {isFetchingMore ? t('loadMoreLoading') : t('loadMore')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
