'use client';

import { NotificationCard } from '@/components/cards/notification/NotificationCard';
import { Check, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useNotificationStore } from '@/store/useNotificationStore';
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
  locale: string,
  isLoading?: boolean
): NotificationView {
  const type = (not.type || '').toLowerCase();
  const data = (not.data as Record<string, unknown> | undefined) || {};
  const entityType = String(data.entityType || '').toLowerCase();

  const actorName = enriched.actorName || (isLoading ? null : t('messages.actorFallback'));
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
    if (!actorName) return { title: '', imageUrl: actorAvatar, actorHref };
    return {
      title: t('messages.connectionRequest', { actorName }),
      imageUrl: actorAvatar,
      actorHref,
    };
  }
  if (isConnectionAcceptedType) {
    if (!actorName) return { title: '', imageUrl: actorAvatar, actorHref };
    return {
      title: t('messages.connectionAccepted', { actorName }),
      imageUrl: actorAvatar,
      actorHref,
    };
  }

  // Posts — attach the post snippet when we have one
  if (type === 'post.like' || type === 'post.comment' || type === 'post.commented' || type === 'post.mention') {
    if (!actorName) return { title: '', imageUrl: actorAvatar, actorHref };
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
    if (!actorName) return { title: '', imageUrl: actorAvatar, actorHref };
    return {
      title: t('messages.messageReceived', { actorName }),
      imageUrl: actorAvatar,
      actorHref,
    };
  }
  if (type === 'group.message') {
    if (!actorName) return { title: '', imageUrl: actorAvatar, actorHref };
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
    if (!actorName) return { title: '', imageUrl: actorAvatar, actorHref };
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
    if (enriched.actorName) {
      if (!actorName) return { title: '', imageUrl: actorAvatar, actorHref };
      return {
        title: t('messages.associationRequestFromActor', { actorName, associationName }),
        imageUrl: actorAvatar,
        actorHref,
      };
    }
    return {
      title: t('messages.associationRequest', { associationName }),
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
    if (enriched.actorName) {
      if (!actorName) return { title: '', imageUrl: actorAvatar, actorHref };
      return {
        title: t('messages.membershipRequestFromActor', { actorName, communityName }),
        imageUrl: actorAvatar,
        actorHref,
      };
    }
    return {
      title: t('messages.membershipRequest', { communityName }),
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
  const view = buildNotificationView(not, enriched, t, locale, enriched.isLoading);

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

  const liveNotifications = useNotificationStore((s) => s.liveNotifications);
  const clearLiveNotifications = useNotificationStore((s) => s.clearLiveNotifications);
  const setStoreUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const storeUnreadCount = useNotificationStore((s) => s.unreadCount);

  // Reset badge and live buffer when the user opens the notification page
  useEffect(() => {
    clearLiveNotifications();
    setStoreUnreadCount(0);
  }, [clearLiveNotifications, setStoreUnreadCount]);

  const { data, error, fetchMore, networkStatus, refetch } = useQuery<GetNotificationsWithMetaResponse>(
    GET_NOTIFICATIONS_WITH_META,
    {
      variables: { limit: PAGE_SIZE, offset: 0 },
      notifyOnNetworkStatusChange: true,
      pollInterval: 30_000,
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

  const unreadByFilter = useMemo(() => {
    const counts: Record<NotificationFilter, number> = {
      all: 0, opportunities: 0, events: 0, associations: 0, communities: 0,
    };
    for (const n of notifications) {
      if ((n.isRead ?? n.read ?? false) || readIds.has(n.id)) continue;
      counts.all++;
      for (const f of ['opportunities', 'events', 'associations', 'communities'] as const) {
        if (matchesFilter(n, f)) counts[f]++;
      }
    }
    return counts;
  }, [notifications, readIds]);

  const sentinelRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

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
      setStoreUnreadCount(0);
      await refetch({ limit: PAGE_SIZE, offset: 0 });
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, [markAllAsReadMutation, notifications, refetch, setStoreUnreadCount]);

  const markSingleAsRead = useCallback(
    async (id: string) => {
      setReadIds((prev) => new Set(prev).add(id));
      setStoreUnreadCount(Math.max(0, storeUnreadCount - 1));
      try {
        await markAsReadMutation({ variables: { notificationId: id } });
      } catch (err) {
        console.error('Error marking as read:', err);
        setReadIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setStoreUnreadCount(storeUnreadCount); // restore on failure
      }
    },
    [markAsReadMutation, setStoreUnreadCount, storeUnreadCount]
  );

  const openNotificationSettings = useCallback(() => {
    router.push(`/${locale}/settings`);
  }, [locale, router]);

  return (
    <div className="lg:max-w-[63rem] mx-2 lg:mx-auto h-app-inner py-4 flex flex-col">
      <div className="flex-shrink-0">
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
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                filter === key
                  ? 'bg-surface-brand text-text-inverse'
                  : 'bg-surface-subtle text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              {label}
              {unreadByFilter[key] > 0 && (
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full leading-none ${
                  filter === key
                    ? 'bg-white/20 text-text-inverse'
                    : 'bg-surface-brand text-text-inverse'
                }`}>
                  {unreadByFilter[key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {liveNotifications.length > 0 && (
        <button
          type="button"
          onClick={() => { void refetch(); clearLiveNotifications(); }}
          className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-surface-brand/10 border border-surface-brand text-text-brand text-sm font-medium hover:bg-surface-brand/20 transition-colors"
        >
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-text-danger text-white text-[10px] font-bold">
            {liveNotifications.length}
          </span>
          New notification{liveNotifications.length > 1 ? 's' : ''} — tap to refresh
        </button>
      )}

      {isInitialLoading ? (
        <div className="text-text-secondary font-medium">{t('loading')}</div>
      ) : error ? (
        <div className="text-text-danger font-medium">{t('errorLoad')}</div>
      ) : notifications.length === 0 ? (
        <div className="text-text-secondary font-medium">{t('none.all')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-text-secondary font-medium">{t(emptyMessageKey)}</div>
      ) : (
        <div className="bg-surface-default rounded-md lg:p-6 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
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
          <div ref={sentinelRef} className="py-2 flex justify-center">
            {isFetchingMore && (
              <span className="text-text-secondary text-sm">{t('loadMoreLoading')}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
