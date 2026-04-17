'use client';

import { useQuery } from '@apollo/client/react';
import { GET_USER_PROFILE } from '@/services/gql/profile';
import { GET_OPPORTUNITY } from '@/services/gql/opportunities';
import { GET_EVENT } from '@/services/gql/events';
import { GET_POST } from '@/services/gql/postsFeed';
import { GET_ASSOCIATION } from '@/services/gql/associations';
import { GET_COMMUNITY } from '@/services/gql/community';
import {
  GET_MY_CONNECTIONS,
  GET_ALL_PENDING_CONNECTIONS,
} from '@/services/gql/connection';
import { GET_POST_COMMENTS } from '@/services/gql/postsFeed';
import type { Notification } from '@/services/gql/notification';

/** Shape of a connection peer as returned by the connection queries. */
interface ConnectionPeer {
  userId?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}
/** Shape of a connection row used by the fallback queries. */
interface ConnectionRow {
  id?: string;
  requesterId?: string;
  receiverId?: string;
  acceptedAt?: string | null;
  createdAt?: string | null;
  requester?: ConnectionPeer | null;
  receiver?: ConnectionPeer | null;
}

/**
 * Result of enriching a notification with data resolved from the API.
 *
 * All fields are best-effort; callers must fall back gracefully when a value is
 * null (e.g. render "Someone" or a generic label).
 */
export interface EnrichedNotification {
  /** Best available display name for the acting user, or null when unknown. */
  actorName: string | null;
  /** First name (for shorter sentences), or null when unknown. */
  actorFirstName: string | null;
  /** Avatar URL for the actor, or null when unavailable. */
  actorAvatarUrl: string | null;
  /** The other user's id (profile link target). */
  actorUserId: string | null;
  /** Title of the post/opportunity/event the notification refers to. */
  targetTitle: string | null;
  /** Long preview of the target content (comment text, long post), when relevant. */
  targetSnippet: string | null;
  /** Name of the community/association for membership-style notifications. */
  entityName: string | null;
  /** ISO start date for event notifications, when available. */
  eventWhenISO: string | null;
  /** Opportunity owner display name (poster), when relevant. */
  opportunityPoster: string | null;
  /** True while any of the enrichment queries is in-flight. */
  isLoading: boolean;
}

type NotificationDataRecord = Record<string, unknown> | undefined;

/**
 * Normalise a raw `notification.data` value into a plain object.
 *
 * Some backends send `data` as a JSON-encoded string; this keeps the hook
 * resilient to both shapes without touching callers.
 */
function normalizeData(raw: unknown): NotificationDataRecord {
  if (!raw) return undefined;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : undefined;
    } catch {
      return undefined;
    }
  }
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  return undefined;
}

function pickString(data: NotificationDataRecord, keys: string[]): string | undefined {
  if (!data) return undefined;
  for (const k of keys) {
    const v = data[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    // Some backends emit numeric ids; coerce them safely.
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return undefined;
}

/**
 * Returns true when `value` looks like a UUID. Used to filter out ids that the
 * backend occasionally slips into display-name fields (e.g. the opportunity
 * owner's user id instead of a resolved full name).
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuidLike(value: string | null | undefined): boolean {
  return !!value && UUID_RE.test(value.trim());
}

/**
 * Safely return a string only when it's a human-readable display value
 * (non-empty and not a UUID). Everything else collapses to `null`.
 */
function cleanDisplayName(value: string | null | undefined): string | null {
  const v = (value || '').trim();
  if (!v) return null;
  if (isUuidLike(v)) return null;
  return v;
}

/** Common nested object keys that could hold a user-shaped payload. */
const USER_NEST_KEYS = [
  'actor',
  'user',
  'fromUser',
  'sender',
  'author',
  'initiator',
  'commenter',
  'liker',
  'requester',
  'receiver',
  'profile',
  'from',
  'source',
] as const;

interface NestedUserShape {
  userId?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  displayName?: string;
  avatarUrl?: string;
  avatar?: string;
  imageUrl?: string;
  email?: string;
}

/**
 * Look through common nested user containers in `data` and return the first
 * one that resembles a user (has an id or a name). The returned object uses
 * the loose `NestedUserShape` so callers can handle whichever field is present.
 */
function findNestedUser(
  data: NotificationDataRecord,
  preferKeys: readonly string[] = USER_NEST_KEYS
): NestedUserShape | undefined {
  if (!data) return undefined;
  for (const key of preferKeys) {
    const candidate = data[key];
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      const u = candidate as NestedUserShape;
      if (u.userId || u.id || u.firstName || u.name || u.fullName || u.displayName) {
        return u;
      }
    }
  }
  return undefined;
}

function nestedUserId(u: NestedUserShape | undefined): string | undefined {
  const v = u?.userId || u?.id;
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function nestedUserName(u: NestedUserShape | undefined): string | undefined {
  if (!u) return undefined;
  const explicit = u.fullName || u.name || u.displayName;
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim();
  const first = typeof u.firstName === 'string' ? u.firstName.trim() : '';
  const last = typeof u.lastName === 'string' ? u.lastName.trim() : '';
  const combined = [first, last].filter(Boolean).join(' ').trim();
  return combined || undefined;
}

function nestedUserAvatar(u: NestedUserShape | undefined): string | undefined {
  const v = u?.avatarUrl || u?.avatar || u?.imageUrl;
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

/**
 * Pick the "other" user's id for a connection notification — the peer whose
 * name/avatar we actually want to display. Tries nested user objects first
 * (backends often embed `requester`/`receiver`), then flat ids.
 */
function resolveConnectionPeerId(
  data: NotificationDataRecord,
  currentUserId?: string
): { peerId?: string; peerUser?: NestedUserShape } {
  const requesterObj = findNestedUser(data, ['requester']);
  const receiverObj = findNestedUser(data, ['receiver']);
  const requesterId = pickString(data, ['requesterId']) || nestedUserId(requesterObj);
  const receiverId = pickString(data, ['receiverId']) || nestedUserId(receiverObj);

  if (currentUserId) {
    if (requesterId && requesterId === currentUserId) {
      return { peerId: receiverId, peerUser: receiverObj };
    }
    if (receiverId && receiverId === currentUserId) {
      return { peerId: requesterId, peerUser: requesterObj };
    }
  }

  // Fallback to a generic actor-ish field, then whichever side we know.
  const fallbackId =
    pickString(data, [
      'actorId',
      'fromUserId',
      'senderId',
      'peerUserId',
      'initiatorId',
    ]) || requesterId || receiverId;

  const fallbackUser =
    findNestedUser(data, ['actor', 'fromUser', 'sender', 'initiator']) ||
    requesterObj ||
    receiverObj;

  return { peerId: fallbackId, peerUser: fallbackUser };
}

/**
 * Resolves the actor (who performed the action) and the target (post, opportunity,
 * event, community, association) referenced by a notification, so the UI can
 * render specific sentences like "Jane Doe commented on your post "Welcome"".
 *
 * Queries are lazily triggered via Apollo's `skip` option — if the backend
 * already embeds `actorName`/`actorAvatarUrl` in `notification.data`, no
 * network request is issued. Apollo cache dedupes repeat lookups across rows.
 */
export function useEnrichedNotification(
  notification: Notification,
  currentUserId?: string
): EnrichedNotification {
  const type = (notification.type || '').toLowerCase();
  const data = normalizeData(notification.data) || {};

  // Find any embedded user object on `data`. Backends sometimes put the full
  // actor payload under `actor`, `user`, `from`, or (for connection rows) a
  // `requester`/`receiver` object. Using whichever the backend sent saves a
  // round-trip.
  let nestedActor: NestedUserShape | undefined;
  let actorUserId: string | undefined;

  if (type.startsWith('connection.')) {
    const resolved = resolveConnectionPeerId(data, currentUserId);
    actorUserId = resolved.peerId;
    nestedActor = resolved.peerUser;
  } else {
    nestedActor = findNestedUser(data);
    actorUserId =
      pickString(data, [
        'actorId',
        'fromUserId',
        'senderId',
        'authorId',
        'userId',
        'peerUserId',
        'initiatorId',
        'commenterId',
        'likerId',
        'sourceUserId',
      ]) || nestedUserId(nestedActor);
  }

  const actorNameInPayload =
    pickString(data, [
      'actorName',
      'actorFullName',
      'senderName',
      'fromUserName',
      'fromUserFullName',
      'requesterName',
      'receiverName',
      'authorName',
      'initiatorName',
      'commenterName',
      'likerName',
      'userName',
      'fullName',
      'displayName',
    ]) || nestedUserName(nestedActor);

  const actorAvatarInPayload =
    pickString(data, [
      'actorAvatarUrl',
      'actorAvatar',
      'fromUserAvatarUrl',
      'fromUserAvatar',
      'senderAvatarUrl',
      'senderAvatar',
      'requesterAvatarUrl',
      'receiverAvatarUrl',
      'authorAvatarUrl',
      'avatarUrl',
      'avatar',
      'userAvatarUrl',
    ]) || nestedUserAvatar(nestedActor);

  // Target identifiers
  const postId = pickString(data, ['postId', 'targetPostId']);
  const opportunityId = pickString(data, [
    'opportunityId',
    'jobId',
    'listingId',
    'applicationOpportunityId',
  ]);
  const eventId = pickString(data, ['eventId']);
  const entityId = pickString(data, ['entityId']);
  const entityType = pickString(data, ['entityType'])?.toLowerCase();
  const connectionIdInPayload = pickString(data, [
    'connectionId',
    'connection_id',
    'connId',
    'id',
  ]);

  // Gate each query. Everything uses cache-first so repeat actors/posts/etc
  // across rows only hit the network once. We still fetch the profile when the
  // payload only has a name but no avatar (or vice-versa) so the avatar
  // eventually shows up.
  const needsActor = Boolean(
    actorUserId && (!actorNameInPayload || !actorAvatarInPayload)
  );
  const needsPost = Boolean(
    postId &&
      (type === 'post.like' ||
        type === 'post.comment' ||
        type === 'post.commented' ||
        type === 'post.reply' ||
        type === 'post.replied' ||
        type === 'post.mention')
  );
  const needsOpportunity = Boolean(opportunityId && type.includes('opportunity'));
  const needsEvent = Boolean(eventId && type.startsWith('event.'));
  const needsAssociation = Boolean(entityId && entityType === 'association');
  const needsCommunity = Boolean(entityId && entityType === 'community');

  const actorQuery = useQuery<{
    getProfile: {
      success: boolean;
      profile?: {
        userId?: string;
        firstName?: string;
        lastName?: string;
        avatarUrl?: string;
      };
    };
  }>(GET_USER_PROFILE, {
    variables: { userId: actorUserId ?? '' },
    skip: !needsActor,
    fetchPolicy: 'cache-first',
  });

  const postQuery = useQuery<{
    post: { id: string; text?: string; content?: string } | null;
  }>(GET_POST, {
    variables: { id: postId ?? '' },
    skip: !needsPost,
    fetchPolicy: 'cache-first',
  });

  const opportunityQuery = useQuery<{
    getOpportunity: {
      id: string;
      title?: string;
      owner?: { id?: string; name?: string; type?: string } | null;
    } | null;
  }>(GET_OPPORTUNITY, {
    variables: { id: opportunityId ?? '' },
    skip: !needsOpportunity,
    fetchPolicy: 'cache-first',
  });

  // Opportunity owner profile — the backend sometimes returns the owner's user
  // id in the `name` field for user-owned opportunities. When that happens we
  // resolve the real name via the user profile service so we don't render a
  // raw UUID as the "poster".
  const oppOwner = opportunityQuery.data?.getOpportunity?.owner;
  const oppOwnerIsUser = (oppOwner?.type || '').toLowerCase() === 'user';
  const oppOwnerName = oppOwner?.name;
  const oppOwnerId = oppOwner?.id;
  const needsOpportunityOwnerProfile = Boolean(
    needsOpportunity &&
      oppOwnerIsUser &&
      oppOwnerId &&
      (!oppOwnerName || isUuidLike(oppOwnerName))
  );

  const opportunityOwnerQuery = useQuery<{
    getProfile: {
      success: boolean;
      profile?: {
        userId?: string;
        firstName?: string;
        lastName?: string;
        avatarUrl?: string;
      };
    };
  }>(GET_USER_PROFILE, {
    variables: { userId: oppOwnerId ?? '' },
    skip: !needsOpportunityOwnerProfile,
    fetchPolicy: 'cache-first',
  });

  const eventQuery = useQuery<{
    getEvent: {
      id: string;
      title?: string;
      startAt?: string;
      coverImageUrl?: string;
    } | null;
  }>(GET_EVENT, {
    variables: { id: eventId ?? '' },
    skip: !needsEvent,
    fetchPolicy: 'cache-first',
  });

  const associationQuery = useQuery<{ getAssociation: { name?: string } | null }>(
    GET_ASSOCIATION,
    {
      variables: { id: entityId ?? '' },
      skip: !needsAssociation,
      fetchPolicy: 'cache-first',
    }
  );

  const communityQuery = useQuery<{ getCommunity: { name?: string } | null }>(
    GET_COMMUNITY,
    {
      variables: { id: entityId ?? '' },
      skip: !needsCommunity,
      fetchPolicy: 'cache-first',
    }
  );

  // Connection fallback: when the notification payload doesn't expose a peer
  // user id (or even a name), we resolve it by listing the current user's
  // connections and picking the matching row. Apollo cache-first makes this a
  // single network hit shared across every connection notification on the page.
  const isConnectionAccepted =
    type === 'connection.accepted' ||
    type === 'connection.removed' ||
    type === 'connectionaccepted';
  const isConnectionRequest =
    type === 'connection.request' ||
    type === 'connection.request.received' ||
    type === 'connection.requested' ||
    type === 'connectionrequest';

  // We fire the fallback whenever we still don't have a usable actor name in
  // the payload — having an id alone isn't enough because GET_USER_PROFILE may
  // fail silently and leave us with "Someone".
  const needsConnectionAcceptedFallback =
    isConnectionAccepted && !actorNameInPayload;
  const needsConnectionPendingFallback =
    isConnectionRequest && !actorNameInPayload;

  const myConnectionsQuery = useQuery<{
    getConnections: {
      success: boolean;
      connections: ConnectionRow[];
    };
  }>(GET_MY_CONNECTIONS, {
    variables: { limit: 100, offset: 0 },
    skip: !needsConnectionAcceptedFallback,
    fetchPolicy: 'cache-first',
  });

  const pendingConnectionsQuery = useQuery<{
    getPendingConnections: {
      success: boolean;
      connections: ConnectionRow[];
    };
  }>(GET_ALL_PENDING_CONNECTIONS, {
    variables: { limit: 100, offset: 0 },
    skip: !needsConnectionPendingFallback,
    fetchPolicy: 'cache-first',
  });

  /**
   * Given a list of connection rows, pick the one that matches the current
   * notification and return the peer (the side that isn't the current user).
   */
  function pickPeerFromConnections(
    rows: ConnectionRow[] | undefined
  ): ConnectionPeer | null {
    if (!rows || rows.length === 0) return null;

    // 1. Exact match on connection id, when the payload carries one.
    if (connectionIdInPayload) {
      const match = rows.find((r) => r.id === connectionIdInPayload);
      if (match) {
        const peer =
          currentUserId && match.requesterId === currentUserId
            ? match.receiver
            : match.requester;
        if (peer) return peer;
      }
    }

    // 2. Otherwise take the most recent connection (by acceptedAt/createdAt)
    //    whose peer isn't the current user. Close enough to disambiguate for
    //    the common "just happened" notification.
    const sorted = [...rows].sort((a, b) => {
      const at = a.acceptedAt || a.createdAt || '';
      const bt = b.acceptedAt || b.createdAt || '';
      return at < bt ? 1 : at > bt ? -1 : 0;
    });
    for (const row of sorted) {
      const peer =
        currentUserId && row.requesterId === currentUserId
          ? row.receiver
          : row.requester;
      if (peer?.userId && peer.userId !== currentUserId) return peer;
    }
    return null;
  }

  const connectionPeer: ConnectionPeer | null = needsConnectionAcceptedFallback
    ? pickPeerFromConnections(myConnectionsQuery.data?.getConnections?.connections)
    : needsConnectionPendingFallback
      ? pickPeerFromConnections(
          pendingConnectionsQuery.data?.getPendingConnections?.connections
        )
      : null;

  // Comment fallback: when a post-comment notification doesn't include the
  // commenter id/name, pull the most recent comment on that post (or match on
  // a comment id when the payload provides one) and use the comment's author
  // info. Apollo cache-first keeps this cheap across rows on the same post.
  const isCommentType =
    type === 'post.comment' ||
    type === 'post.commented' ||
    type === 'post.reply' ||
    type === 'post.replied' ||
    type === 'comment.created' ||
    type === 'comment.reply';

  const commentIdInPayload = pickString(data, [
    'commentId',
    'comment_id',
    'replyId',
    'reply_id',
  ]);

  const needsCommentFallback = Boolean(
    isCommentType && postId && !actorNameInPayload
  );

  const postCommentsQuery = useQuery<{
    postComments: Array<{
      id: string;
      authorId?: string;
      authorDisplayName?: string;
      authorAvatarUrl?: string;
      createdAt?: string;
    }>;
  }>(GET_POST_COMMENTS, {
    variables: { postId: postId ?? '', limit: 20, offset: 0 },
    skip: !needsCommentFallback,
    fetchPolicy: 'cache-first',
  });

  type CommentRow = {
    id: string;
    authorId?: string;
    authorDisplayName?: string;
    authorAvatarUrl?: string;
    createdAt?: string;
  };

  function pickComment(rows: CommentRow[] | undefined): CommentRow | null {
    if (!rows || rows.length === 0) return null;
    if (commentIdInPayload) {
      const match = rows.find((r) => r.id === commentIdInPayload);
      if (match) return match;
    }
    // Most recent comment that isn't from the current user.
    const sorted = [...rows].sort((a, b) => {
      const at = a.createdAt || '';
      const bt = b.createdAt || '';
      return at < bt ? 1 : at > bt ? -1 : 0;
    });
    return sorted.find((r) => r.authorId && r.authorId !== currentUserId) || null;
  }

  const commentAuthor: CommentRow | null = needsCommentFallback
    ? pickComment(postCommentsQuery.data?.postComments)
    : null;

  // Secondary profile fetch — once a fallback (comment author or connection
  // peer) gives us a user id but the payload didn't, resolve the canonical
  // profile so we get a fresh avatar (comment `authorAvatarUrl` is
  // denormalized and can be stale or empty).
  const fallbackUserId =
    !actorUserId &&
    (commentAuthor?.authorId || connectionPeer?.userId)
      ? commentAuthor?.authorId || connectionPeer?.userId || ''
      : '';

  const fallbackProfileQuery = useQuery<{
    getProfile: {
      success: boolean;
      profile?: {
        userId?: string;
        firstName?: string;
        lastName?: string;
        avatarUrl?: string;
      };
    };
  }>(GET_USER_PROFILE, {
    variables: { userId: fallbackUserId },
    skip: !fallbackUserId,
    fetchPolicy: 'cache-first',
  });

  // Actor name/avatar
  const profile = actorQuery.data?.getProfile?.profile;
  const fallbackProfile = fallbackProfileQuery.data?.getProfile?.profile;
  const first = profile?.firstName?.trim() || '';
  const last = profile?.lastName?.trim() || '';
  const fromQueryFullName = [first, last].filter(Boolean).join(' ').trim();

  const peerName = connectionPeer
    ? [connectionPeer.firstName, connectionPeer.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || null
    : null;

  const commentAuthorName =
    cleanDisplayName(commentAuthor?.authorDisplayName) || null;

  const fallbackFirst = fallbackProfile?.firstName?.trim() || '';
  const fallbackLast = fallbackProfile?.lastName?.trim() || '';
  const fallbackFullName = [fallbackFirst, fallbackLast]
    .filter(Boolean)
    .join(' ')
    .trim();

  const actorName =
    actorNameInPayload ||
    fromQueryFullName ||
    fallbackFullName ||
    peerName ||
    commentAuthorName ||
    null;
  const actorFirstName =
    (actorNameInPayload ? actorNameInPayload.split(' ')[0] : undefined) ||
    first ||
    fallbackFirst ||
    connectionPeer?.firstName ||
    (commentAuthorName ? commentAuthorName.split(' ')[0] : undefined) ||
    null;
  const actorAvatarUrl =
    actorAvatarInPayload ||
    profile?.avatarUrl ||
    fallbackProfile?.avatarUrl ||
    connectionPeer?.avatarUrl ||
    commentAuthor?.authorAvatarUrl ||
    null;
  const resolvedActorUserId =
    actorUserId ||
    connectionPeer?.userId ||
    commentAuthor?.authorId ||
    null;

  // Dev-only: surface the raw payload shape when we still couldn't resolve
  // anything useful about the actor. This helps during integration because
  // backend field names vary (actorId vs fromUserId vs senderId …).
  if (
    process.env.NODE_ENV !== 'production' &&
    !actorName &&
    !resolvedActorUserId &&
    typeof window !== 'undefined'
  ) {
    // eslint-disable-next-line no-console
    console.debug('[useEnrichedNotification] unresolved actor', {
      id: notification.id,
      type: notification.type,
      data: notification.data,
    });
  }

  // Post title/snippet — posts don't have titles, so we derive one from text.
  const postObj = postQuery.data?.post;
  const postText = (postObj?.text || postObj?.content || '').trim();
  const postTitle = postText ? postText.split('\n')[0].slice(0, 80) : null;
  const postSnippet =
    postText && postText.length > (postTitle?.length ?? 0)
      ? postText.slice(0, 140) + (postText.length > 140 ? '…' : '')
      : null;

  const opp = opportunityQuery.data?.getOpportunity;
  const eventObj = eventQuery.data?.getEvent;

  let targetTitle: string | null = null;
  let targetSnippet: string | null = null;

  if (needsPost) {
    targetTitle = postTitle;
    targetSnippet = postSnippet;
  } else if (needsOpportunity) {
    // Prefer backend-supplied names in the payload to avoid an extra request
    // when possible. We only fall through to the fetched title otherwise.
    targetTitle =
      pickString(data, [
        'opportunityTitle',
        'opportunityName',
        'jobTitle',
        'roleTitle',
        'positionTitle',
        'listingTitle',
        'title',
        'name',
      ]) ||
      opp?.title ||
      null;
  } else if (needsEvent) {
    targetTitle =
      pickString(data, ['eventName', 'eventTitle', 'name', 'title']) ||
      eventObj?.title ||
      null;
  }

  const entityName =
    pickString(data, [
      'communityName',
      'associationName',
      'entityName',
      'groupName',
      'targetName',
      'name',
      'title',
    ]) ||
    associationQuery.data?.getAssociation?.name ||
    communityQuery.data?.getCommunity?.name ||
    null;

  const eventWhenISO = eventObj?.startAt || null;

  // Resolve opportunity poster, preferring (in order):
  //   1. A non-UUID name embedded in the notification payload.
  //   2. The resolved profile name when the owner is a user and the backend
  //      returned the user id in `owner.name`.
  //   3. A non-UUID `owner.name` from the opportunity query.
  const ownerProfile = opportunityOwnerQuery.data?.getProfile?.profile;
  const resolvedOwnerProfileName = ownerProfile
    ? [ownerProfile.firstName, ownerProfile.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || null
    : null;

  const opportunityPoster =
    cleanDisplayName(
      pickString(data, ['opportunityPoster', 'ownerName', 'posterName'])
    ) ||
    cleanDisplayName(resolvedOwnerProfileName) ||
    cleanDisplayName(opp?.owner?.name) ||
    null;

  const isLoading =
    (needsActor && actorQuery.loading) ||
    (needsPost && postQuery.loading) ||
    (needsOpportunity && opportunityQuery.loading) ||
    (needsOpportunityOwnerProfile && opportunityOwnerQuery.loading) ||
    (needsEvent && eventQuery.loading) ||
    (needsAssociation && associationQuery.loading) ||
    (needsCommunity && communityQuery.loading) ||
    (needsConnectionAcceptedFallback && myConnectionsQuery.loading) ||
    (needsConnectionPendingFallback && pendingConnectionsQuery.loading) ||
    (needsCommentFallback && postCommentsQuery.loading) ||
    (Boolean(fallbackUserId) && fallbackProfileQuery.loading);

  return {
    actorName,
    actorFirstName,
    actorAvatarUrl,
    actorUserId: resolvedActorUserId,
    targetTitle,
    targetSnippet,
    entityName,
    eventWhenISO,
    opportunityPoster,
    isLoading,
  };
}
