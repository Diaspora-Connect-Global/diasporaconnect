'use client';

import { NotificationCard } from '@/components/cards/notification/NotificationCard';
import { EmptyState, ErrorState } from '@/components/feedback';
import { Bell, Check, Settings } from 'lucide-react';
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

type Translator = (key: string, values?: Record<string, string | number>) => string;

const SOCIAL_TYPES = ['post.liked', 'post.commented', 'post.mentioned', 'post.shared', 'comment.liked'];

/**
 * Normalize a notification `type` for social-interaction matching. The backend's
 * raw-SQL upsert path stores the enum NAME (e.g. `POST_LIKED`, `POST_COMMENTED`)
 * while the `createAndSend` path stores the dotted value (`post.commented`).
 * Lowercasing and mapping `_`→`.` reconciles both to the canonical dotted form.
 * Scoped to social detection so it doesn't disturb underscore-style aliases used
 * elsewhere (e.g. `new_connection_request`).
 */
function normalizeSocialType(rawType: string | undefined): string {
  return (rawType || '').toLowerCase().replace(/_/g, '.');
}

interface NotificationGroup {
  key: string;
  primary: Notification;
  members: Notification[];
  count: number;
  actorNames: string[];
}

function getNotificationTypeLabel(type: string | undefined, t: Translator): string {
  if (!type) return t('types.default');
  if (type.startsWith('event.') && /regist/.test(type)) {
    return t('types.event.register');
  }
  const key = `types.${type}`;
  const label = t(key);
  // next-intl returns the (possibly namespace-prefixed) key string on a miss
  // instead of throwing, so detect that and fall back gracefully.
  const isMiss = !label || label === key || label.endsWith(key);
  if (isMiss) {
    if (type.startsWith('servicerequest')) return t('types.servicerequest.default');
    if (type.startsWith('opportunity.')) return t('types.opportunity.default');
    return t('types.default');
  }
  return label;
}

/**
 * Turn a machine token like `visa_info` or `UNDER_REVIEW` into a human label
 * such as `Visa info` / `Under review` — split on separators, lowercase, then
 * capitalize the first word only.
 */
function humanize(s: string): string {
  const words = s
    .split(/[_\-.]+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .map((w) => w.toLowerCase());
  if (words.length === 0) return '';
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.join(' ');
}

interface NotificationView {
  title: string;
  description?: string;
  imageUrl?: string;
  actorHref?: string;
}

// Backend-provided titles/messages occasionally carry decorative emoji (e.g.
// "Daily group chat summary 📝"). This project renders no emoji in copy, so we
// strip them from any string sourced from the notification payload.
const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{1F1E6}-\u{1F1FF}]/gu;
function stripEmoji(value: string | null | undefined): string {
  return (value || '').replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ').trim();
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
  isLoading?: boolean,
  group?: NotificationGroup
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

  // Social interactions on posts/comments — likes, comments, mentions, shares,
  // comment-likes. These can be grouped client-side (one card per post/comment),
  // so we vary the copy based on the group count. The backend's raw-SQL upserts
  // store the enum NAME (e.g. POST_LIKED), while createAndSend rows use the dotted
  // value (post.commented) — normalize underscores→dots so both forms match.
  const stype = normalizeSocialType(not.type);
  const isPostLike = stype === 'post.liked' || stype === 'post.like';
  const isPostComment = stype === 'post.commented' || stype === 'post.comment';
  const isPostMention = stype === 'post.mentioned' || stype === 'post.mention';
  const isPostShare = stype === 'post.shared' || stype === 'post.share';
  const isCommentLike = stype === 'comment.liked' || stype === 'comment.like';
  if (isPostLike || isPostComment || isPostMention || isPostShare || isCommentLike) {
    const count = group?.count ?? 1;
    const groupActor = group?.actorNames?.[0];
    // While still resolving the actor for a singleton, defer rendering so the
    // card doesn't flash a generic fallback before the name loads.
    if (count === 1 && !groupActor && !enriched.actorName && isLoading) {
      return { title: '', imageUrl: actorAvatar, actorHref };
    }
    const resolvedActor = groupActor || enriched.actorName || t('messages.actorFallback');
    const hasTitle = Boolean(enriched.targetTitle);
    const description =
      isPostLike || isPostComment ? enriched.targetSnippet || undefined : undefined;

    if (count > 1) {
      const others = count - 1;
      const values = { actorName: resolvedActor, others, postTitle: enriched.targetTitle || '' };
      const key = isPostLike
        ? hasTitle
          ? 'messages.groupedPostLikeWithTitle'
          : 'messages.groupedPostLike'
        : isPostComment
          ? 'messages.groupedPostComment'
          : isPostMention
            ? 'messages.groupedPostMention'
            : isPostShare
              ? 'messages.groupedPostShare'
              : 'messages.groupedCommentLike';
      return {
        title: t(key, values),
        description,
        imageUrl: actorAvatar,
        actorHref,
      };
    }

    // Singleton — use the existing singular keys where they exist. For shared /
    // comment-liked there is no singular key, so fall back to the backend copy
    // rather than emitting a raw key.
    if (isPostLike) {
      return {
        title: t(hasTitle ? 'messages.postLikeWithTitle' : 'messages.postLike', {
          actorName: resolvedActor,
          postTitle: enriched.targetTitle || '',
        }),
        description,
        imageUrl: actorAvatar,
        actorHref,
      };
    }
    if (isPostComment) {
      return {
        title: t(hasTitle ? 'messages.postCommentWithTitle' : 'messages.postComment', {
          actorName: resolvedActor,
          postTitle: enriched.targetTitle || '',
        }),
        description,
        imageUrl: actorAvatar,
        actorHref,
      };
    }
    if (isPostMention) {
      return {
        title: t(hasTitle ? 'messages.postMentionWithTitle' : 'messages.postMention', {
          actorName: resolvedActor,
          postTitle: enriched.targetTitle || '',
        }),
        imageUrl: actorAvatar,
        actorHref,
      };
    }
    // post.shared / comment.liked singular.
    if (isPostShare) {
      return {
        title: t(hasTitle ? 'messages.postShareWithTitle' : 'messages.postShare', {
          actorName: resolvedActor,
          postTitle: enriched.targetTitle || '',
        }),
        imageUrl: actorAvatar,
        actorHref,
      };
    }
    return {
      title: t('messages.commentLike', { actorName: resolvedActor }),
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

  // Daily group-chat digest. The summary prose itself is AI-generated by the
  // backend and only exists in English, so the row shows a localized line
  // naming the group instead; the full summary is on the group's digest card.
  if (type.startsWith('group.chat.digest')) {
    const groupName = enriched.entityName || '';
    return {
      title: groupName
        ? t('messages.groupChatDigest', { groupName })
        : t('messages.groupChatDigestFallback'),
    };
  }

  // Events
  const isEventRegistered = type.startsWith('event.') && /regist/.test(type);
  if (isEventRegistered) {
    const eventName =
      enriched.targetTitle ||
      (typeof data.eventName === 'string' && data.eventName.trim() ? String(data.eventName).trim() : '') ||
      (typeof data.eventTitle === 'string' && data.eventTitle.trim() ? String(data.eventTitle).trim() : '') ||
      (typeof data.name === 'string' && data.name.trim() ? String(data.name).trim() : '') ||
      (typeof data.title === 'string' && data.title.trim() ? String(data.title).trim() : '') ||
      t('messages.eventFallback');
    return {
      title: t('messages.eventRegistered', { eventName }),
      imageUrl: actorAvatar,
      actorHref,
    };
  }
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

  // Left / removed from a community or association. These are self-referential
  // (no actor), and without a localized branch they fell through to the
  // backend's English title ("Left the community").
  const isLeftType = stype === 'membership.left' || stype === 'association.membership.left';
  const isRemovedType =
    stype === 'membership.removed' || stype === 'association.membership.removed';
  if (isLeftType || isRemovedType) {
    const asAssociation = isAssociation || stype.startsWith('association.');
    const entityName =
      enriched.entityName ||
      t(asAssociation ? 'messages.associationFallback' : 'messages.communityFallback');
    const key = asAssociation
      ? isLeftType
        ? 'messages.associationLeft'
        : 'messages.associationRemoved'
      : isLeftType
        ? 'messages.membershipLeft'
        : 'messages.membershipRemoved';
    return {
      title: t(key, asAssociation ? { associationName: entityName } : { communityName: entityName }),
    };
  }

  // Service requests — system-issued (no user actor). Build a descriptive
  // title/body from the structured payload + enriched request status/service.
  if (type.startsWith('servicerequest')) {
    const requestNumber = String(data.requestNumber || '');
    const status = enriched.requestStatus
      ? humanize(enriched.requestStatus)
      : (data.status ? humanize(String(data.status)) : '');
    const service =
      enriched.serviceName || (data.category ? humanize(String(data.category)) : '');
    const community = enriched.serviceOwnerName || '';
    const values: Record<string, string> = { requestNumber, service, status, community };

    let titleKey: string;
    let bodyKey: string;
    switch (type) {
      case 'servicerequest.submitted':
        titleKey = 'messages.serviceRequestSubmittedTitle';
        bodyKey = community
          ? service
            ? 'messages.serviceRequestSubmittedWithCommunityService'
            : 'messages.serviceRequestSubmittedWithCommunity'
          : service
            ? 'messages.serviceRequestSubmittedWithService'
            : 'messages.serviceRequestSubmitted';
        break;
      case 'servicerequest.assigned':
        titleKey = 'messages.serviceRequestAssignedTitle';
        bodyKey = 'messages.serviceRequestAssigned';
        break;
      case 'servicerequest.status.changed':
        titleKey = 'messages.serviceRequestStatusChangedTitle';
        bodyKey = 'messages.serviceRequestStatusChanged';
        break;
      case 'servicerequest.info.requested':
        titleKey = 'messages.serviceRequestInfoRequestedTitle';
        bodyKey = 'messages.serviceRequestInfoRequested';
        break;
      case 'servicerequest.approved':
        titleKey = 'messages.serviceRequestApprovedTitle';
        bodyKey = 'messages.serviceRequestApproved';
        break;
      case 'servicerequest.rejected':
        titleKey = 'messages.serviceRequestRejectedTitle';
        bodyKey = 'messages.serviceRequestRejected';
        break;
      case 'servicerequest.completed':
        titleKey = 'messages.serviceRequestCompletedTitle';
        bodyKey = 'messages.serviceRequestCompleted';
        break;
      case 'servicerequest.note.added':
        titleKey = 'messages.serviceRequestNoteAddedTitle';
        bodyKey = 'messages.serviceRequestNoteAdded';
        break;
      case 'servicerequest.document.added':
        titleKey = 'messages.serviceRequestDocumentAddedTitle';
        bodyKey = 'messages.serviceRequestDocumentAdded';
        break;
      default:
        titleKey = 'messages.serviceRequestDefaultTitle';
        bodyKey = 'messages.serviceRequestFallback';
        break;
    }

    const title = t(titleKey, values);
    const description = t(bodyKey, values);
    return {
      title: title || t('messages.serviceRequestDefaultTitle', values),
      description: description || undefined,
      imageUrl: undefined,
      actorHref: undefined,
    };
  }

  // Default — fall back to whatever the backend provided (emoji stripped).
  const fallbackTitle = stripEmoji(not.title);
  const fallbackBody = stripEmoji(not.message || (not as { body?: string }).body);
  const primary = fallbackTitle || fallbackBody || t('types.default');
  return {
    title: primary,
    description:
      fallbackTitle && fallbackBody && fallbackBody !== fallbackTitle ? fallbackBody : undefined,
  };
}

const PAGE_SIZE = 20;

type NotificationFilter = 'all' | 'opportunities' | 'events' | 'associations' | 'communities';

function NotificationRow({
  group,
  t,
  locale,
  currentUserId,
  onMarkAsRead,
  onClick,
  readIds,
}: {
  group: NotificationGroup;
  t: Translator;
  locale: string;
  currentUserId?: string;
  onMarkAsRead: () => void;
  onClick: (actorUserId?: string) => void;
  readIds: Set<string>;
}) {
  const not = group.primary;
  const enriched = useEnrichedNotification(not, currentUserId);
  const view = buildNotificationView(not, enriched, t, locale, enriched.isLoading, group);

  const isRead = group.members.every(
    (m) => (m.isRead ?? m.read ?? false) || readIds.has(m.id)
  );

  return (
    <NotificationCard
      typeLabel={getNotificationTypeLabel(not.type, t)}
      title={view.title || undefined}
      description={view.description}
      imageUrl={view.imageUrl}
      actorHref={view.actorHref}
      time={not.createdAt}
      read={isRead}
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
  const tFeedback = useTranslations('feedback');
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

  // Group social interactions (likes/comments/mentions/shares/comment-likes)
  // per target post/comment so the list shows one card per target with an
  // aggregated count. Everything else stays a singleton. `filtered` is already
  // sorted newest-first, so the Map preserves that order (primary = newest).
  const groups = useMemo<NotificationGroup[]>(() => {
    const map = new Map<string, NotificationGroup>();
    for (const n of filtered) {
      const type = normalizeSocialType(n.type);
      const d = (n.data as Record<string, unknown> | undefined) || {};
      const rawTargetId = type === 'comment.liked' ? d.commentId : d.postId;
      const targetId =
        rawTargetId !== undefined && rawTargetId !== null && String(rawTargetId).trim()
          ? String(rawTargetId)
          : undefined;

      const isSocial = SOCIAL_TYPES.includes(type) && Boolean(targetId);
      const key = isSocial ? `${type}:${targetId}` : n.id;

      const existing = map.get(key);
      if (existing) {
        existing.members.push(n);
      } else {
        map.set(key, { key, primary: n, members: [n], count: 1, actorNames: [] });
      }
    }

    const result: NotificationGroup[] = [];
    for (const group of map.values()) {
      const primary = group.primary;
      const type = normalizeSocialType(primary.type);
      const pData = (primary.data as Record<string, unknown> | undefined) || {};
      const isSocial = SOCIAL_TYPES.includes(type) && group.members.length >= 1 && group.key !== primary.id;

      if (type === 'post.liked' && group.key !== primary.id) {
        group.count = Number(pData.totalLikeCount) || group.members.length;
        group.actorNames = [String(pData.topLikerName || '')].filter(Boolean);
      } else if (isSocial) {
        group.count = group.members.length;
        const names: string[] = [];
        for (const m of group.members) {
          const md = (m.data as Record<string, unknown> | undefined) || {};
          const name = String(
            md.commentByDisplayName ||
              md.actorName ||
              md.topLikerName ||
              md.commentByUserName ||
              ''
          ).trim();
          if (name && !names.includes(name)) names.push(name);
          if (names.length >= 3) break;
        }
        group.actorNames = names;
      } else {
        group.count = 1;
        group.actorNames = [];
      }
      result.push(group);
    }
    return result;
  }, [filtered]);

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

        {/* Filters — a single scrollable row on mobile. Localized labels
            ("Alle meldingen", "Gemeenschappen") wrapped into three ragged rows
            when these were flex-wrap, eating the top of the list. */}
        <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide -mx-2 px-2 pb-1 lg:flex-wrap lg:overflow-visible lg:mx-0 lg:px-0 lg:pb-0">
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
              className={`flex-shrink-0 whitespace-nowrap px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[13px] sm:text-sm font-medium transition-colors flex items-center gap-1.5 ${
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
          {t('newNotifications', { count: liveNotifications.length })}
        </button>
      )}

      {isInitialLoading ? (
        <div className="text-text-secondary font-medium">{t('loading')}</div>
      ) : error ? (
        <ErrorState
          title={tFeedback('error.title')}
          description={tFeedback('error.description')}
          retryLabel={tFeedback('error.retry')}
          onRetry={() => void refetch()}
        />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={tFeedback('empty.notifications.title')}
          description={tFeedback('empty.notifications.description')}
        />
      ) : filtered.length === 0 ? (
        <EmptyState size="sm" title={t(emptyMessageKey)} />
      ) : (
        <div className="bg-surface-default rounded-md lg:p-6 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
          {groups.map((group) => (
            <NotificationRow
              key={group.key}
              group={group}
              t={t}
              locale={locale}
              currentUserId={currentUserId}
              onMarkAsRead={() => group.members.forEach((m) => markSingleAsRead(m.id))}
              onClick={(actorUserId) => handleNotificationClick(group.primary, actorUserId)}
              readIds={readIds}
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
