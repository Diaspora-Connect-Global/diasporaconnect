'use client';

import { NotificationCard } from '@/components/cards/notification/NotificationCard';
import { Check, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
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
import { GET_ASSOCIATION } from '@/services/gql/associations';
import { GET_COMMUNITY } from '@/services/gql/community';
import { useNotificationBadge } from '@/hooks/useNotificationBadge';

function getNotificationTypeLabel(type: string | undefined, t: (key: string) => string): string {
  if (!type) return t('types.default');
  const key = `types.${type}`;
  const label = t(key);
  return label !== key ? label : t('types.default');
}

type NotificationData = {
  actorName?: string;
  actor?: string;
  communityName?: string;
  associationName?: string;
  entityName?: string;
  entityType?: string;
  name?: string;
  eventName?: string;
  eventTitle?: string;
  title?: string;
  [key: string]: unknown;
};

function getEntityName(
  data: NotificationData | undefined,
  kind: 'community' | 'association',
  not?: Notification
): string {
  const entityType = (data?.entityType || '').toString().toLowerCase();
  const d = (data || {}) as Record<string, unknown>;
  const name =
    (d.communityName as string) ||
    (d.associationName as string) ||
    (d.entityName as string) ||
    (d.name as string) ||
    (d.groupName as string) ||
    (d.targetName as string) ||
    (d.association as string) ||
    (d.community as string) ||
    (d.entityTitle as string) ||
    (d.title as string) ||
    '';
  if (name) return String(name).trim();
  if (kind === 'association' && entityType === 'association') return String((d.entityName as string) || (d.name as string) || '').trim();
  if (kind === 'community' && entityType === 'community') return String((d.entityName as string) || (d.name as string) || '').trim();
  if (not?.title && not.title.length > 0 && not.title.length < 80 && (kind === 'association' ? entityType === 'association' : entityType === 'community')) {
    return not.title.trim();
  }
  return '';
}

function getNotificationDescription(
  not: Notification,
  t: (key: string, values?: Record<string, string>) => string
): string {
  const type = (not.type || '').toLowerCase();
  const data = not.data as NotificationData | undefined;
  const entityType = (data?.entityType || '').toString().toLowerCase();
  const actor = data?.actorName || data?.actor || '';
  const communityName = getEntityName(data, 'community', not);
  const associationName = getEntityName(data, 'association', not);
  const eventName = data?.eventName || data?.eventTitle || data?.name || '';
  const opportunityTitle = data?.title || data?.name || '';

  const actorLabel = actor || t('messages.actorFallback');
  const communityLabel = communityName || t('messages.communityFallback');
  const associationLabel = associationName || t('messages.associationFallback');
  const eventLabel = eventName || t('messages.eventFallback');

  const isAssociation = entityType === 'association' || type.includes('association');

  if (isAssociation && (type.includes('approved') || type === 'membership.approved')) {
    return t('messages.associationApproved', { associationName: associationLabel });
  }
  if (isAssociation && (type.includes('request') || type === 'membership.request')) {
    return t('messages.associationRequest', { associationName: associationLabel });
  }
  if (type === 'membership.approved') {
    return t('messages.membershipApproved', { communityName: communityLabel });
  }
  if (type === 'membership.request') {
    return t('messages.membershipRequest', { communityName: communityLabel });
  }
  if (type === 'connection.request') {
    return t('messages.connectionRequest', { actorName: actorLabel });
  }
  if (type === 'connection.accepted') {
    return t('messages.connectionAccepted', { actorName: actorLabel });
  }
  if (type === 'post.like') {
    return t('messages.postLike', { actorName: actorLabel });
  }
  if (type === 'post.comment') {
    return t('messages.postComment', { actorName: actorLabel });
  }
  if (type === 'post.mention') {
    return t('messages.postMention', { actorName: actorLabel });
  }
  if (type === 'message.received') {
    return t('messages.messageReceived', { actorName: actorLabel });
  }
  if (type === 'group.message') {
    return t('messages.groupMessage', { actorName: actorLabel });
  }
  if (type === 'event.reminder') {
    return t('messages.eventReminder', { eventName: eventLabel });
  }
  if (type === 'event.invite') {
    return t('messages.eventInvite', { actorName: actorLabel, eventName: eventLabel });
  }
  if (type.includes('opportunity')) {
    return t('messages.opportunityNew', { title: opportunityTitle || not.title || not.message || '' });
  }

  const msg = not.message || (not as { body?: string }).body || '';
  const title = not.title || '';
  if (actor && msg) return `${actor} — ${msg}`;
  if (actor) return actor;
  if (title && msg) return `${title}. ${msg}`;
  return msg || title;
}

/** Returns the entity/organisation name (or actor, event name) to show as the card title line. */
function getNotificationDisplayTitle(
  not: Notification,
  t: (key: string) => string
): string {
  const type = (not.type || '').toLowerCase();
  const data = not.data as NotificationData | undefined;
  const entityType = (data?.entityType || '').toString().toLowerCase();
  const actor = data?.actorName || data?.actor || '';
  const communityName = getEntityName(data, 'community', not);
  const associationName = getEntityName(data, 'association', not);
  const eventName = data?.eventName || data?.eventTitle || data?.name || '';
  const opportunityTitle = data?.title || data?.name || '';

  const isAssociation = entityType === 'association' || type.includes('association');

  const isGenericTitle = (title: string) => {
    const lower = title.toLowerCase().trim();
    return (
      /^(membership\s+)?approved$/i.test(lower) ||
      /^adhésion\s+approuvée$/i.test(lower) ||
      /^membership\s+approved$/i.test(lower) ||
      /^iscrizione\s+approvata$/i.test(lower) ||
      /^mitgliedschaft\s+genehmigt$/i.test(lower) ||
      /^request\s+to\s+join$/i.test(lower) ||
      /^demande\s+d'adhésion$/i.test(lower) ||
      lower === 'membership approved' ||
      lower === 'membership request'
    );
  };

  if (isAssociation && (type.includes('approved') || type.includes('request') || type === 'membership.approved' || type === 'membership.request')) {
    if (associationName) return associationName;
    if (not.title && !isGenericTitle(not.title)) return not.title;
    return t('messages.associationFallback');
  }
  if (type === 'membership.approved' || type === 'membership.request') {
    if (communityName) return communityName;
    if (not.title && !isGenericTitle(not.title)) return not.title;
    return t('messages.communityFallback');
  }
  if (type === 'connection.request' || type === 'connection.accepted' || type === 'post.like' || type === 'post.comment' || type === 'post.mention' || type === 'message.received' || type === 'group.message') {
    return actor || '';
  }
  if (type === 'event.reminder') return eventName || not.title || '';
  if (type === 'event.invite') return eventName || not.title || '';
  if (type.includes('opportunity')) return opportunityTitle || not.title || not.message || '';

  return not.title || '';
}

const PAGE_SIZE = 20;

type NotificationFilter = 'all' | 'opportunities' | 'events' | 'associations' | 'communities';

/** Resolves association/community name by entityId when not in notification payload. */
function NotificationRow({
  not,
  t,
  onMarkAsRead,
  onClick,
  isReadOptimistic,
}: {
  not: Notification;
  t: (key: string) => string;
  onMarkAsRead: () => void;
  onClick: () => void;
  isReadOptimistic: boolean;
}) {
  const displayTitle = getNotificationDisplayTitle(not, t);
  const data = not.data as { entityId?: string; entityType?: string } | undefined;
  const entityId = data?.entityId as string | undefined;
  const entityType = (data?.entityType || '').toString().toLowerCase();
  const isFallback =
    displayTitle === t('messages.associationFallback') || displayTitle === t('messages.communityFallback');
  const shouldResolve = Boolean(
    entityId && (entityType === 'association' || entityType === 'community') && isFallback
  );

  const { data: assocData } = useQuery<{ getAssociation: { name: string } }>(GET_ASSOCIATION, {
    variables: { id: entityId! },
    skip: !shouldResolve || entityType !== 'association',
  });
  const { data: commData } = useQuery<{ getCommunity: { name: string } }>(GET_COMMUNITY, {
    variables: { id: entityId! },
    skip: !shouldResolve || entityType !== 'community',
  });

  const resolvedName =
    entityType === 'association' ? assocData?.getAssociation?.name : commData?.getCommunity?.name;
  const title = shouldResolve ? (resolvedName ?? '') : displayTitle;

  return (
    <NotificationCard
      typeLabel={getNotificationTypeLabel(not.type, t)}
      title={title || undefined}
      description={getNotificationDescription(not, t)}
      imageUrl={not.imageUrl}
      time={not.createdAt}
      read={(not.read ?? not.isRead) || isReadOptimistic}
      onMarkAsRead={onMarkAsRead}
      onClick={onClick}
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
    return type.includes('community') || entityType === 'community' || (type.includes('membership') && entityType !== 'association');
  }
  return true;
}

export default function NotificationPage() {
  const t = useTranslations('notification');
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const { refetch: refetchBadge } = useNotificationBadge(true);

  const [offset, setOffset] = useState(0);
  const [accumulated, setAccumulated] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const { data, loading, error, refetch } = useQuery<GetNotificationsWithMetaResponse>(
    GET_NOTIFICATIONS_WITH_META,
    {
      variables: { limit: PAGE_SIZE, offset },
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
  const pageNotifications = list?.notifications ?? [];
  const total = list?.total ?? 0;
  const unreadCount = list?.unreadCount ?? 0;
  const hasMore = offset + pageNotifications.length < total;

  const filtered = filter === 'all' ? accumulated : accumulated.filter((n) => matchesFilter(n, filter));
  const emptyMessageKey =
    filter === 'all' ? 'none.all' : `none.${filter}` as 'none.all' | 'none.opportunities' | 'none.events' | 'none.associations' | 'none.communities';

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
    async (notification: Notification) => {
      const id = notification.id;
      const path = getNotificationPath(notification);
      const target = `/${locale}${path}`;

      // Optimistic: show as read immediately
      setReadIds((prev) => new Set(prev).add(id));

      try {
        await markAsReadMutation({ variables: { notificationId: id } });
        await refetchBadge();
        await refetch();
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
    [locale, markAsReadMutation, refetchBadge, refetch, router]
  );

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllAsReadMutation();
      await refetch();
      await refetchBadge();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, [markAllAsReadMutation, refetch, refetchBadge]);

  const markSingleAsRead = useCallback(
    async (id: string) => {
      setReadIds((prev) => new Set(prev).add(id));
      try {
        await markAsReadMutation({ variables: { notificationId: id } });
        await refetch();
        await refetchBadge();
      } catch (err) {
        console.error('Error marking as read:', err);
        setReadIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
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

      {loading ? (
        <div className="text-text-secondary font-medium">Loading...</div>
      ) : error ? (
        <div className="text-text-danger font-medium">Unable to load notifications.</div>
      ) : accumulated.length === 0 ? (
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
              onMarkAsRead={() => markSingleAsRead(not.id)}
              onClick={() => handleNotificationClick(not)}
              isReadOptimistic={readIds.has(not.id)}
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
