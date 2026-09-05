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
import { SERVICE_REQUEST } from '@/services/gql/embassyServices';
import { GET_MY_GROUPS } from '@/services/gql/groups';
import { toCdnUrl } from '@/lib/cdn';
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
 * What kind of thing a notification is ABOUT. Drives which picture the row's
 * avatar shows (and, for the renderer, which placeholder shape to use when no
 * picture resolved).
 */
export type NotificationSubjectKind =
  | 'user'
  | 'community'
  | 'association'
  | 'event'
  | 'opportunity'
  | 'post'
  | 'group';

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
  /** Current status of a service request (raw enum), or null. */
  requestStatus: string | null;
  /** Human-readable service/request name for a service request, or null. */
  serviceName: string | null;
  /** Owning community/embassy name for a service request, or null. */
  serviceOwnerName: string | null;

  /* ---------------------------------------------------------------- *
   * Subject — the entity the notification is ABOUT.
   *
   * NOT the actor: a "membership approved" notification is about the
   * COMMUNITY, even though a person approved it. `null` on all three means
   * "this notification has no subject entity" (a pure system notice such as
   * "Here's what you missed") — only then should the caller fall back to a
   * generic platform icon.
   *
   * Resolved entirely from data the hook already fetches; see
   * `resolveSubject` below for the per-type mapping.
   * ---------------------------------------------------------------- */

  /**
   * The entity the notification is ABOUT — what the row's avatar should show.
   * Already run through `toCdnUrl`; empty values normalise to `null`, never `''`.
   */
  subjectImageUrl: string | null;
  /**
   * Display name of that entity — used for the avatar's initial letter AND the
   * alt text. Populated even when `subjectImageUrl` is null, so a community
   * called "Better Africa Today" can still render a "B".
   */
  subjectName: string | null;
  /** Which kind of entity the subject is, or null when there isn't one. */
  subjectKind: NotificationSubjectKind | null;

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

/**
 * Turn a machine token like `visa_info` or `UNDER_REVIEW` into a human label
 * such as `Visa info` / `Under review`.
 */
function humanizeToken(s: string): string {
  const words = s
    .split(/[_\-.]+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .map((w) => w.toLowerCase());
  if (words.length === 0) return '';
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.join(' ');
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

/**
 * Normalise a stored media URL for display: trim, rewrite through the CDN the
 * rest of the app uses, and collapse anything empty to `null`.
 *
 * `toCdnUrl` returns `''` for nullish input and is a no-op for non-GCS URLs, so
 * the second emptiness check is what guarantees callers never receive `''`.
 */
function normalizeImageUrl(value: string | null | undefined): string | null {
  const raw = (value || '').trim();
  if (!raw) return null;
  const cdn = (toCdnUrl(raw) || '').trim();
  return cdn || null;
}

/**
 * First displayable image among a post's attachments. Posts carry their own
 * media, which is the most honest picture of "this post" when we can't resolve
 * a person for the row.
 */
function firstImageAttachmentUrl(
  attachments:
    | Array<{ type?: string; mimeType?: string; url?: string } | null>
    | null
    | undefined
): string | undefined {
  if (!attachments) return undefined;
  for (const att of attachments) {
    if (!att?.url) continue;
    const kind = (att.type || '').toLowerCase();
    const mime = (att.mimeType || '').toLowerCase();
    if (kind.includes('image') || mime.startsWith('image/')) return att.url;
  }
  return undefined;
}

/**
 * Generic "someone" placeholders the backend might interpolate into the
 * notification `title`/`message`. If we extract one of these from a message
 * string we treat it as an unresolved name rather than a real one.
 */
const GENERIC_ACTOR_WORDS = new Set([
  'someone',
  "quelqu'un",
  'quelquun',
  'qualcuno',
  'jemand',
  'alguien',
  'user',
  'a user',
  'new',
]);

function isGenericActorLabel(value: string | null | undefined): boolean {
  const v = (value || '').trim().toLowerCase();
  if (!v) return true;
  if (GENERIC_ACTOR_WORDS.has(v)) return true;
  // Reject names where any individual word is a known generic placeholder
  // e.g. "Bernice Someone" → rejected because "someone" is in the set
  return v.split(/\s+/).some((word) => GENERIC_ACTOR_WORDS.has(word));
}

/**
 * Keywords that typically come right after the actor name in a human-readable
 * notification message (EN + common translations). We use these as anchors to
 * grab the leading name when the structured `data.actorName` isn't set.
 */
const NAME_SPLIT_PATTERNS: RegExp[] = [
  /^(.+?)\s+(?:sent|wants|accepted|declined|rejected|commented|replied|liked|loved|reacted|mentioned|tagged|invited|shared|started|added|joined|followed|posted|applied|viewed)\b/i,
  // French
  /^(.+?)\s+(?:a\s+envoyé|veut|souhaite|a\s+accepté|a\s+commenté|a\s+aimé|vous\s+a)/i,
  // Italian
  /^(.+?)\s+(?:ha\s+inviato|vuole|ha\s+accettato|ha\s+commentato|ha\s+apprezzato)/i,
  // German
  /^(.+?)\s+(?:hat|möchte|moechte)/i,
];

/**
 * Try to extract an actor's display name from a free-form notification message
 * such as "John Doe sent you a connection request". Returns `null` when the
 * resulting name looks generic (e.g. "Someone") so callers can keep searching.
 */
function extractNameFromMessage(
  ...messages: Array<string | null | undefined>
): string | null {
  for (const raw of messages) {
    if (!raw) continue;
    const msg = String(raw).trim();
    if (!msg) continue;
    for (const re of NAME_SPLIT_PATTERNS) {
      const m = msg.match(re);
      const candidate = m?.[1]?.trim();
      if (!candidate) continue;
      if (isGenericActorLabel(candidate)) continue;
      if (isUuidLike(candidate)) continue;
      // Plausible names are short; reject obviously long captures that are
      // probably an entire sentence the regex couldn't split cleanly.
      if (candidate.length > 60) continue;
      // Realistic human names fit in 4 words or fewer. Longer captures usually
      // mean the regex swallowed modifiers like "just" or "recently" before
      // reaching the action verb.
      if (candidate.split(/\s+/).filter(Boolean).length > 4) continue;
      return candidate;
    }
  }
  return null;
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
  // The backend's raw-SQL upsert path stores the enum NAME (`POST_LIKED`,
  // `GROUP_CHAT_DIGEST`) while `createAndSend` stores the dotted value
  // (`post.liked`). `subjectType` reconciles both to the dotted form and is
  // used for SUBJECT classification only — the query gates below keep matching
  // on the raw `type` exactly as before, so this cannot change how many
  // requests the hook issues.
  const subjectType = type.replace(/_/g, '.');
  const rawData = normalizeData(notification.data) || {};

  // Some backends wrap the actual payload inside a `data`/`payload`/`metadata`
  // envelope. Flatten a single level so later lookups find the expected keys
  // without each caller having to know where the body lives.
  const data: Record<string, unknown> = { ...rawData };
  for (const envelope of ['data', 'payload', 'metadata', 'body']) {
    const inner = rawData[envelope];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      for (const [k, v] of Object.entries(inner as Record<string, unknown>)) {
        if (!(k in data)) data[k] = v;
      }
    }
  }

  // Broad connection-type detection — keep in sync with `getNotificationPath`
  // so anything that routes to the connection UI also tries connection-aware
  // peer/name resolution. We normalize by also matching variants without a dot
  // separator (e.g. `connectionRequest`).
  const isConnectionRequest =
    type.startsWith('connection.request') ||
    type === 'connectionrequest' ||
    type === 'connection_request' ||
    type === 'new_connection_request';
  const isConnectionAccepted =
    type.startsWith('connection.accept') ||
    type === 'connectionaccepted' ||
    type === 'connection_accepted';
  const isConnectionType =
    type.startsWith('connection.') ||
    type.includes('connection') ||
    isConnectionRequest ||
    isConnectionAccepted;

  // Find any embedded user object on `data`. Backends sometimes put the full
  // actor payload under `actor`, `user`, `from`, or (for connection rows) a
  // `requester`/`receiver` object. Using whichever the backend sent saves a
  // round-trip.
  let nestedActor: NestedUserShape | undefined;
  let actorUserId: string | undefined;

  if (isConnectionType) {
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
        'topLikerUserId',
        'commentByUserId',
        'sourceUserId',
      ]) || nestedUserId(nestedActor);
  }

  // Try flat "name" fields first; if none are present, also try to compose a
  // full name from split firstName/lastName fields (some backends emit those).
  const flatNameInPayload = pickString(data, [
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
  ]);

  const splitFirst = pickString(data, [
    'actorFirstName',
    'senderFirstName',
    'fromUserFirstName',
    'requesterFirstName',
    'receiverFirstName',
    'authorFirstName',
    'firstName',
  ]);
  const splitLast = pickString(data, [
    'actorLastName',
    'senderLastName',
    'fromUserLastName',
    'requesterLastName',
    'receiverLastName',
    'authorLastName',
    'lastName',
  ]);
  const splitName = [splitFirst, splitLast].filter(Boolean).join(' ').trim() || undefined;

  // Some backends interpolate "Someone" (or a locale equivalent) into the
  // structured name fields instead of leaving them empty. Treat those as
  // unresolved so our fallback queries still run.
  const rawPayloadName =
    flatNameInPayload || splitName || nestedUserName(nestedActor);
  const actorNameInPayload =
    rawPayloadName && !isGenericActorLabel(rawPayloadName) && !isUuidLike(rawPayloadName)
      ? rawPayloadName
      : undefined;

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
  const groupId = pickString(data, ['groupId']);
  const requestId = pickString(data, ['requestId']);
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
  const needsServiceRequest = Boolean(requestId && type.startsWith('servicerequest'));

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

  // NOTE: `GET_POST` selects the full `FullPost` fragment — author, author
  // profile and attachments are already on the wire. The extra fields below are
  // a TYPE widening only; they add nothing to the request.
  const postQuery = useQuery<{
    post: {
      id: string;
      text?: string;
      content?: string;
      author?: {
        id?: string;
        displayName?: string;
        avatarUrl?: string;
      } | null;
      authorProfile?: {
        userProfile?: {
          id?: string;
          name?: string;
          displayName?: string;
          avatarUrl?: string;
        } | null;
        organizationProfile?: {
          id?: string;
          name?: string;
          logoUrl?: string;
        } | null;
      } | null;
      attachments?: Array<{
        type?: string;
        mimeType?: string;
        url?: string;
      }> | null;
    } | null;
  }>(GET_POST, {
    variables: { id: postId ?? '' },
    skip: !needsPost,
    fetchPolicy: 'cache-first',
    errorPolicy: 'ignore',
  });

  // `owner.avatarUrl` is already in the `GET_OPPORTUNITY` selection set — an
  // opportunity has no image of its own, so the poster's avatar/logo is the
  // only picture available for it.
  const opportunityQuery = useQuery<{
    getOpportunity: {
      id: string;
      title?: string;
      owner?: {
        id?: string;
        name?: string;
        type?: string;
        avatarUrl?: string;
      } | null;
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

  // `avatarUrl` is already selected by both queries — type widening only.
  const associationQuery = useQuery<{
    getAssociation: { name?: string; avatarUrl?: string } | null;
  }>(GET_ASSOCIATION, {
    variables: { id: entityId ?? '' },
    skip: !needsAssociation,
    fetchPolicy: 'cache-first',
  });

  const communityQuery = useQuery<{
    getCommunity: { name?: string; avatarUrl?: string } | null;
  }>(GET_COMMUNITY, {
    variables: { id: entityId ?? '' },
    skip: !needsCommunity,
    fetchPolicy: 'cache-first',
  });

  // Service request — resolve the live status and (humanized) category so the
  // notification sentence reflects the current state of the request.
  const serviceRequestQuery = useQuery<{
    serviceRequest: { status?: string; category?: string | null } | null;
  }>(SERVICE_REQUEST, {
    variables: { id: requestId ?? '' },
    skip: !needsServiceRequest,
    fetchPolicy: 'cache-first',
    errorPolicy: 'ignore',
  });

  // Owning community/embassy for a service request — the entity that received
  // the request. Resolve its name from the community service so notifications
  // can read "<Community> received your <service> request". The id lives under
  // ownerEntityId/communityId/entityId depending on the backend path.
  const serviceCommunityId = type.startsWith('servicerequest')
    ? pickString(data, ['ownerEntityId', 'communityId', 'entityId'])
    : undefined;
  const needsServiceCommunity = Boolean(serviceCommunityId);
  const serviceCommunityQuery = useQuery<{
    getCommunity: { name?: string; avatarUrl?: string } | null;
  }>(GET_COMMUNITY, {
    variables: { id: serviceCommunityId ?? '' },
    skip: !needsServiceCommunity,
    fetchPolicy: 'cache-first',
    errorPolicy: 'ignore',
  });

  // Group subject: group notifications carry a `groupId` but not always a name,
  // and never an avatar — the daily chat digest sends only
  // `{ conversationId, groupId, digestDate, … }`, so without this lookup a
  // digest row has no name to show an initial letter for either.
  //
  // Deliberately the BATCH query rather than a per-row `GET_GROUP`: a group
  // notification is by definition about a group the viewer belongs to, so one
  // `getMyGroups` page covers every group row on the screen. Variables are
  // fixed, so Apollo dedupes it to a SINGLE request no matter how many rows
  // mount — and they match the chat sidebar's, so it is often already cached.
  const isGroupType = subjectType.startsWith('group.');
  const groupNameInPayload = pickString(data, ['groupName']);
  const groupImageInPayload = pickString(data, ['groupAvatarUrl', 'groupImageUrl']);
  const needsGroupLookup = Boolean(
    isGroupType && groupId && (!groupNameInPayload || !groupImageInPayload)
  );

  const myGroupsQuery = useQuery<{
    getMyGroups: {
      success: boolean;
      groups: Array<{ id: string; name?: string; avatarUrl?: string }>;
    };
  }>(GET_MY_GROUPS, {
    variables: { limit: 50, offset: 0 },
    skip: !needsGroupLookup,
    fetchPolicy: 'cache-first',
    errorPolicy: 'ignore',
  });

  const matchedGroup = needsGroupLookup
    ? myGroupsQuery.data?.getMyGroups?.groups?.find((g) => g.id === groupId) || null
    : null;

  // Connection fallback: when the notification payload doesn't expose a peer
  // name (or even a user id), we resolve it by listing the current user's
  // connections and picking the matching row. Apollo cache-first makes this a
  // single network hit shared across every connection notification on the page.
  //
  // We fire BOTH the pending and accepted lookups whenever the payload doesn't
  // give us a ready-to-render name. A pending row may already have been accepted
  // between the notification being created and the list being opened, and
  // vice-versa, so trying both gives us the best chance of matching the peer.
  const needsConnectionFallback = isConnectionType && !actorNameInPayload;

  const myConnectionsQuery = useQuery<{
    getConnections: {
      success: boolean;
      connections: ConnectionRow[];
    };
  }>(GET_MY_CONNECTIONS, {
    variables: { limit: 100, offset: 0 },
    skip: !needsConnectionFallback,
    fetchPolicy: 'cache-first',
  });

  const pendingConnectionsQuery = useQuery<{
    getPendingConnections: {
      success: boolean;
      connections: ConnectionRow[];
    };
  }>(GET_ALL_PENDING_CONNECTIONS, {
    variables: { limit: 100, offset: 0 },
    skip: !needsConnectionFallback,
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
        // Prefer the side that isn't the current user. When we don't know the
        // current user, fall back to whichever side has a name/avatar populated.
        const preferredByUser =
          currentUserId && match.requesterId === currentUserId
            ? match.receiver
            : currentUserId && match.receiverId === currentUserId
              ? match.requester
              : null;
        const fallback =
          (match.requester?.userId && match.requester.userId !== currentUserId
            ? match.requester
            : null) ||
          (match.receiver?.userId && match.receiver.userId !== currentUserId
            ? match.receiver
            : null);
        const peer = preferredByUser || fallback;
        if (peer?.userId) return peer;
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

  // Try the appropriate list first based on the notification subtype, but
  // fall back to the other one if it didn't match (e.g. a request that has
  // since been accepted, or vice-versa).
  const preferPending = isConnectionRequest;
  const firstList = preferPending
    ? pendingConnectionsQuery.data?.getPendingConnections?.connections
    : myConnectionsQuery.data?.getConnections?.connections;
  const secondList = preferPending
    ? myConnectionsQuery.data?.getConnections?.connections
    : pendingConnectionsQuery.data?.getPendingConnections?.connections;

  const connectionPeer: ConnectionPeer | null = needsConnectionFallback
    ? pickPeerFromConnections(firstList) || pickPeerFromConnections(secondList)
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

  // Last-resort: many backends interpolate the actor's name into the human-
  // readable `title`/`message` fields (e.g. "John Doe sent you a connection
  // request") even when the structured `data` payload has no actorName. Parse
  // that string and reject obvious placeholders like "Someone".
  const messageExtractedName =
    extractNameFromMessage(
      notification.title,
      notification.message,
      notification.body
    ) || null;

  const actorName =
    actorNameInPayload ||
    fromQueryFullName ||
    fallbackFullName ||
    peerName ||
    commentAuthorName ||
    messageExtractedName ||
    null;
  const actorFirstName =
    (actorNameInPayload ? actorNameInPayload.split(' ')[0] : undefined) ||
    first ||
    fallbackFirst ||
    connectionPeer?.firstName ||
    (commentAuthorName ? commentAuthorName.split(' ')[0] : undefined) ||
    (messageExtractedName ? messageExtractedName.split(' ')[0] : undefined) ||
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

  // Dev-only: surface the raw payload shape + query state whenever we still
  // don't have a display name. We also log connection notifications where we
  // had to fall back, so it's obvious why "Someone" appeared.
  if (
    process.env.NODE_ENV !== 'production' &&
    !actorName &&
    typeof window !== 'undefined'
  ) {
    // eslint-disable-next-line no-console
    console.debug('[useEnrichedNotification] unresolved actor', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      body: notification.body,
      imageUrl: notification.imageUrl,
      rawData: notification.data,
      flattenedData: data,
      actorUserId,
      resolvedActorUserId,
      actorNameInPayload,
      isConnectionType,
      needsConnectionFallback,
      myConnections: myConnectionsQuery.data?.getConnections?.connections?.length,
      pendingConnections:
        pendingConnectionsQuery.data?.getPendingConnections?.connections?.length,
      connectionPeer,
      needsCommentFallback,
      commentAuthor,
      profileQueryLoading: actorQuery.loading,
      profileResult: profile,
      fallbackProfileLoading: fallbackProfileQuery.loading,
      fallbackProfileResult: fallbackProfile,
      messageExtractedName,
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

  // Service request status + service name. Prefer the live request status; for
  // the service name we humanize the category when no display name is available.
  const serviceRequestObj = serviceRequestQuery.data?.serviceRequest;
  const requestStatus = serviceRequestObj?.status?.trim() || null;
  const serviceCategory = serviceRequestObj?.category?.trim();
  const serviceName = serviceCategory ? humanizeToken(serviceCategory) : null;

  // Owning community/embassy display name — prefer an explicit name field in the
  // payload, then the resolved community. Only for service-request notifications.
  const serviceOwnerName = type.startsWith('servicerequest')
    ? cleanDisplayName(
        pickString(data, ['communityName', 'ownerEntityName', 'embassyName', 'entityName']) ||
          serviceCommunityQuery.data?.getCommunity?.name
      )
    : null;

  /* ------------------------------------------------------------------ *
   * Subject — the entity the notification is ABOUT.
   *
   * Every row used to fall back to the same globe because the only image the
   * page ever resolved was a PERSON's avatar. Everything below is extracted
   * from data the hook was ALREADY fetching (community, association, event,
   * opportunity, post) — the only lookup added for it is the single shared
   * `getMyGroups` batch above.
   *
   * The mapping follows one rule: pick the entity whose NAME the row already
   * displays, so the picture and the sentence agree.
   * ------------------------------------------------------------------ */

  // Entity-scoped image keys ONLY. The generic `avatarUrl` / `imageUrl` payload
  // keys are already consumed as the ACTOR's avatar further up; reusing them
  // here would put the approver's face on a community row.
  const entityImageInPayload = pickString(data, [
    'communityAvatarUrl',
    'communityLogoUrl',
    'associationAvatarUrl',
    'associationLogoUrl',
    'entityAvatarUrl',
    'entityImageUrl',
    'entityLogoUrl',
  ]);
  const eventImageInPayload = pickString(data, [
    'eventCoverImageUrl',
    'eventImageUrl',
    'eventBannerUrl',
  ]);

  const isAssociationSubject =
    entityType === 'association' || subjectType.includes('association');
  const isCommunitySubject =
    entityType === 'community' ||
    subjectType.includes('community') ||
    subjectType.startsWith('membership.');

  type Subject = Pick<
    EnrichedNotification,
    'subjectImageUrl' | 'subjectName' | 'subjectKind'
  >;
  const NO_SUBJECT: Subject = {
    subjectImageUrl: null,
    subjectName: null,
    subjectKind: null,
  };

  // A person is the subject as soon as we know *of* one, even if the name and
  // avatar are still resolving — `subjectKind: 'user'` with null fields tells
  // the renderer to draw a person placeholder rather than the platform globe.
  const personSubjectKnown = Boolean(
    actorName || actorAvatarUrl || resolvedActorUserId
  );
  const personSubject = (): Subject =>
    personSubjectKnown
      ? {
          // `notification.imageUrl` is only trusted for a person subject: for
          // entity rows it is just as likely to be the actor's face.
          subjectImageUrl: normalizeImageUrl(actorAvatarUrl || notification.imageUrl),
          subjectName: cleanDisplayName(actorName),
          subjectKind: 'user',
        }
      : NO_SUBJECT;

  const communitySubject = (): Subject => ({
    subjectImageUrl: normalizeImageUrl(
      entityImageInPayload || communityQuery.data?.getCommunity?.avatarUrl
    ),
    subjectName: cleanDisplayName(entityName),
    subjectKind: 'community',
  });

  const associationSubject = (): Subject => ({
    subjectImageUrl: normalizeImageUrl(
      entityImageInPayload || associationQuery.data?.getAssociation?.avatarUrl
    ),
    subjectName: cleanDisplayName(entityName),
    subjectKind: 'association',
  });

  const groupSubject = (): Subject => ({
    subjectImageUrl: normalizeImageUrl(groupImageInPayload || matchedGroup?.avatarUrl),
    subjectName: cleanDisplayName(groupNameInPayload || matchedGroup?.name || entityName),
    subjectKind: 'group',
  });

  const eventSubject = (): Subject => ({
    subjectImageUrl: normalizeImageUrl(eventImageInPayload || eventObj?.coverImageUrl),
    subjectName: cleanDisplayName(
      targetTitle ||
        pickString(data, ['eventName', 'eventTitle', 'name', 'title']) ||
        eventObj?.title
    ),
    subjectKind: 'event',
  });

  // An opportunity has no image of its own (verified against the Opportunity
  // type) — the poster's avatar/logo is the only picture there is.
  const opportunitySubject = (): Subject => ({
    subjectImageUrl: normalizeImageUrl(opp?.owner?.avatarUrl),
    subjectName: cleanDisplayName(
      targetTitle ||
        pickString(data, [
          'opportunityTitle',
          'opportunityName',
          'jobTitle',
          'listingTitle',
          'title',
          'name',
        ]) ||
        opp?.title
    ),
    subjectKind: 'opportunity',
  });

  // Only reached when a post notification has no resolvable actor at all. The
  // post's own media is the most honest picture of "this post"; its author's
  // avatar is the fallback.
  const postSubject = (): Subject => {
    const image =
      firstImageAttachmentUrl(postObj?.attachments) ||
      postObj?.author?.avatarUrl ||
      postObj?.authorProfile?.userProfile?.avatarUrl ||
      postObj?.authorProfile?.organizationProfile?.logoUrl;
    const name =
      postTitle ||
      cleanDisplayName(postObj?.author?.displayName) ||
      cleanDisplayName(
        postObj?.authorProfile?.userProfile?.displayName ||
          postObj?.authorProfile?.userProfile?.name
      ) ||
      cleanDisplayName(postObj?.authorProfile?.organizationProfile?.name);
    if (!image && !name) return NO_SUBJECT;
    return {
      subjectImageUrl: normalizeImageUrl(image),
      subjectName: name || null,
      subjectKind: 'post',
    };
  };

  function resolveSubject(): Subject {
    // Service request → the owning community/embassy, which is the name the
    // row's sentence already carries ("<Community> received your … request").
    if (subjectType.startsWith('servicerequest')) {
      return {
        subjectImageUrl: normalizeImageUrl(
          entityImageInPayload || serviceCommunityQuery.data?.getCommunity?.avatarUrl
        ),
        subjectName: serviceOwnerName,
        subjectKind: 'community',
      };
    }

    // Post / comment interactions → the person who acted; the row reads
    // "<Name> liked your post". The post itself is the fallback when no actor
    // resolves, so these rows never degrade to the globe.
    if (subjectType.startsWith('post.') || subjectType.startsWith('comment.')) {
      return personSubjectKnown ? personSubject() : postSubject();
    }

    // Connection requests / accepts and direct messages → the other person.
    if (isConnectionType || subjectType.startsWith('message.')) {
      return personSubject();
    }

    // The daily chat digest is machine-written — there is no actor, and the
    // row names only the group.
    if (subjectType.startsWith('group.chat.digest')) return groupSubject();

    // Any other group notification is "<Name> sent a message in <Group>": the
    // sender leads the sentence, the group backs it up.
    if (isGroupType) {
      return personSubjectKnown ? personSubject() : groupSubject();
    }

    if (subjectType.startsWith('event.') || (subjectType.includes('event') && eventId)) {
      return eventSubject();
    }

    if (subjectType.includes('opportunity')) return opportunitySubject();

    // Membership lifecycle (approved / requested / left / removed) is about the
    // ORG, even though a person performed the action.
    if (isAssociationSubject) return associationSubject();
    if (isCommunitySubject) return communitySubject();

    // Unknown type: show the person when one is involved. Otherwise this is a
    // pure system notice ("Here's what you missed") with no subject entity —
    // the only case where the renderer should keep the globe.
    return personSubjectKnown ? personSubject() : NO_SUBJECT;
  }

  const subject = resolveSubject();

  const isLoading =
    (needsServiceRequest && serviceRequestQuery.loading) ||
    (needsServiceCommunity && serviceCommunityQuery.loading) ||
    (needsActor && actorQuery.loading) ||
    (needsPost && postQuery.loading) ||
    (needsOpportunity && opportunityQuery.loading) ||
    (needsOpportunityOwnerProfile && opportunityOwnerQuery.loading) ||
    (needsEvent && eventQuery.loading) ||
    (needsAssociation && associationQuery.loading) ||
    (needsCommunity && communityQuery.loading) ||
    (needsGroupLookup && myGroupsQuery.loading) ||
    (needsConnectionFallback &&
      (myConnectionsQuery.loading || pendingConnectionsQuery.loading)) ||
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
    requestStatus,
    serviceName,
    serviceOwnerName,
    subjectImageUrl: subject.subjectImageUrl,
    subjectName: subject.subjectName,
    subjectKind: subject.subjectKind,
    isLoading,
  };
}
