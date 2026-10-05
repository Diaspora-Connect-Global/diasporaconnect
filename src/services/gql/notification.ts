import { gql } from '@apollo/client';

export type {
  Notification,
  NotificationList,
  UnreadCountResponse,
  NotificationActionResponse,
  GetNotificationsWithMetaResponse,
  GetUnreadNotificationsResponse,
  MarkNotificationAsReadResponse,
  MarkAllNotificationsAsReadResponse,
} from './types/notification';

import type { Notification } from './types/notification';
import { isKnownAppPath } from '@/lib/appRoutes';

function pickString(data: Record<string, unknown> | undefined, keys: string[]): string | undefined {
  if (!data) return undefined;
  for (const k of keys) {
    const v = data[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

/** Other party in a connection (for profile links); uses requester/receiver vs current user when possible. */
function resolveConnectionPeerUserId(
  data: Record<string, unknown> | undefined,
  currentUserId?: string
): string | undefined {
  if (!data) return undefined;

  const requesterId = pickString(data, ['requesterId']);
  const receiverId = pickString(data, ['receiverId']);

  if (currentUserId && requesterId && receiverId) {
    if (requesterId === currentUserId) return receiverId;
    if (receiverId === currentUserId) return requesterId;
  }

  const fromActor = pickString(data, [
    'actorId',
    'fromUserId',
    'senderId',
    'userId',
    'peerUserId',
  ]);
  if (fromActor) return fromActor;

  if (requesterId) return requesterId;
  if (receiverId) return receiverId;

  return undefined;
}

const enc = encodeURIComponent;

/** `/community/{id}` or `/association/{id}` for an owner type, else undefined. */
function ownerSection(ownerType: string | undefined): 'community' | 'association' | undefined {
  const o = ownerType?.toLowerCase();
  if (o === 'community') return 'community';
  if (o === 'association') return 'association';
  return undefined;
}

/** Re-encode a path segment that may or may not already be percent-encoded. */
function reencode(segment: string): string {
  try {
    return enc(decodeURIComponent(segment));
  } catch {
    return enc(segment);
  }
}

/**
 * Server-supplied `link` / `actionUrl` → a same-origin relative path, or undefined.
 * Absolute URLs, protocol-relative (`//host`) and backslash forms are refused outright
 * (open-redirect), never "fixed up" into something navigable.
 */
function sanitizeServerPath(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const p = raw.trim();
  if (!p) return undefined;
  if (/[\\\u0000-\u001f\u007f]/.test(p)) return undefined;
  if (/^[a-z][a-z0-9+.-]*:/i.test(p)) return undefined; // https:, javascript:, data:, …
  if (p.startsWith('//')) return undefined;
  return p.startsWith('/') ? p : `/${p}`;
}

/**
 * Rewrites the legacy server `actionUrl` shapes (rows stored before the backend fix)
 * that point at routes this app never had, onto the nearest route that exists.
 * Anything it doesn't recognise is returned unchanged and left to the
 * `isKnownAppPath` guard.
 */
export function normalizeLegacyAppPath(path: string): string {
  const m = /^([^?#]*)([?#].*)?$/.exec(path);
  if (!m) return path;
  const pathname = m[1].length > 1 ? m[1].replace(/\/+$/, '') : m[1];
  const rest = m[2] ?? '';
  let r: RegExpExecArray | null;

  if ((r = /^\/posts\/([^/]+)$/.exec(pathname))) return `/post/${r[1]}${rest}`;
  if ((r = /^\/profile\/([^/]+)$/.exec(pathname))) return `/${r[1]}`;
  if (/^\/connections\/requests(\/.*)?$/.test(pathname)) return '/profile?m=friends&t=3';
  if (/^\/connections(\/.*)?$/.test(pathname)) return '/profile?m=friends';
  if ((r = /^\/messages\/group\/([^/]+)(\/.*)?$/.exec(pathname))) {
    return `/chat?t=groups&ct=group&gid=${reencode(r[1])}`;
  }
  if (/^\/messages(\/.*)?$/.test(pathname)) return '/chat?t=direct';
  if (/^\/vendor\/payouts(\/.*)?$/.test(pathname)) return '/vendors/payouts';
  if (/^\/vendor(\/.*)?$/.test(pathname)) return '/vendors';
  if (/^\/orders(\/.*)?$/.test(pathname) || pathname === '/payment-methods') return '/wallet';
  if (pathname === '/settings/verification') return '/verifykyc';
  if (/^\/settings\/.+$/.test(pathname)) return '/settings';
  if ((r = /^\/(communities|associations)\/([^/]+)\/calendar$/.exec(pathname))) {
    return `/${r[1] === 'communities' ? 'community' : 'association'}/${r[2]}?tab=events&calendar=1`;
  }
  if ((r = /^\/(communities|associations)\/([^/]+)(\/.*)?$/.exec(pathname))) {
    return `/${r[1] === 'communities' ? 'community' : 'association'}/${r[2]}`;
  }
  if ((r = /^\/events\/([^/]+)\/(stats|tickets|attendance)$/.exec(pathname))) return `/events/${r[1]}/manage`;
  if (/^\/events\/[^/]+\/payment$/.test(pathname)) return '/events';
  if ((r = /^\/opportunities\/([^/]+)\/applications$/.exec(pathname))) return `/opportunities/${r[1]}`;
  if (/^\/(cases|service-requests)(\/.*)?$/.test(pathname)) return '/notification';
  if (/^\/resources(\/.*)?$/.test(pathname)) return '/feed';
  if (pathname === '/calendar') return '/events';
  return path;
}

/* ------------------------------------------------------------------ */
/* Queries */
/* ------------------------------------------------------------------ */

/**
 * Fetch notifications + badge count (preferred — single request).
 * Variables: { limit?: number, offset?: number } — defaults: limit 50, offset 0.
 */
export const GET_NOTIFICATIONS_WITH_META = gql`
  query GetNotificationsWithMeta($limit: Int, $offset: Int) {
    getNotificationsWithMeta(limit: $limit, offset: $offset) {
      notifications {
        id
        type
        title
        message
        isRead
        actionUrl
        link
        imageUrl
        data
        createdAt
        readAt
      }
      total
      limit
      offset
      unreadCount
    }
  }
`;

/** Badge count only (lightweight poll). Recommended interval: 30–60s. */
export const GET_UNREAD_COUNT = gql`
  query GetUnreadCount {
    getUnreadNotificationCount {
      count
    }
  }
`;

/** Unread notifications only. */
export const GET_UNREAD_NOTIFICATIONS = gql`
  query GetUnreadNotifications {
    getUnreadNotifications {
      id
      type
      title
      message
      actionUrl
      link
      createdAt
    }
  }
`;

/* ------------------------------------------------------------------ */
/* Mutations */
/* ------------------------------------------------------------------ */

/** Mark a single notification as read. */
export const MARK_NOTIFICATION_AS_READ = gql`
  mutation MarkAsRead($notificationId: String!) {
    markNotificationAsRead(notificationId: $notificationId) {
      success
      message
    }
  }
`;

/** Mark all notifications as read. */
export const MARK_ALL_NOTIFICATIONS_AS_READ = gql`
  mutation MarkAllAsRead {
    markAllNotificationsAsRead {
      success
      message
    }
  }
`;

/* ------------------------------------------------------------------ */
/* Navigation */
/* ------------------------------------------------------------------ */

export type GetNotificationPathOptions = {
  /** Current user's id — used to pick the *other* user for connection notifications. */
  currentUserId?: string;
  /** Resolved actor user id from enriched notification data — fallback for connection routing. */
  actorUserId?: string;
};

/**
 * Returns the path (with leading slash) to navigate to for a notification.
 * Caller builds the full URL, e.g. `/${locale}${path}` (path already starts with `/`).
 *
 * Resolution order is deliberate:
 *   1. Type-specific rules that need to ignore the raw `link`/`actionUrl` (connections,
 *      post comments with commentId deep-link, opportunities, events, memberships, cases…).
 *      These take precedence because the server may return URLs that aren't valid in the
 *      app (e.g. `connections/requests/{connectionId}`, `/cases/{id}`).
 *   2. Direct entity ids present in `data` (postId, opportunityId, eventId, …).
 *   3. Server-provided `link` / `actionUrl` (last resort, for types we don't know about),
 *      first rewritten by `normalizeLegacyAppPath` and refused unless it is a same-origin
 *      relative path.
 *   4. Section-level fallbacks derived from `type`.
 *
 * Whatever comes out is verified with `isKnownAppPath`; a path that fails falls back to
 * the section-4 type fallback and ultimately `/notification` — this function never
 * returns a path that would 404.
 */
export function getNotificationPath(
  notification: Pick<Notification, 'type' | 'data' | 'link' | 'actionUrl'>,
  options?: GetNotificationPathOptions
): string {
  const t = (notification.type || '').toLowerCase();

  const primary = resolvePrimaryPath(notification, options);
  if (primary && isKnownAppPath(primary)) return primary;

  const fallback = resolveTypeFallback(t);
  if (isKnownAppPath(fallback)) return fallback;
  return '/notification';
}

/** Section 4. */
function resolveTypeFallback(t: string): string {
  if (t.startsWith('profile.')) return '/profile';
  if (t.includes('opportunity')) return '/opportunities';
  if (t.includes('association')) return '/association';
  if (t.includes('community') || t.startsWith('membership.')) return '/community';
  return '/notification';
}

/** Sections 1–3. May return a path that fails the guard; the caller checks. */
function resolvePrimaryPath(
  notification: Pick<Notification, 'type' | 'data' | 'link' | 'actionUrl'>,
  options?: GetNotificationPathOptions
): string | undefined {
  const { type, data } = notification;
  const d = data as Record<string, unknown> | undefined;
  const t = (type || '').toLowerCase();
  const entityType = pickString(d, ['entityType'])?.toLowerCase();

  // ── 1. Type-specific routing (must run before link/actionUrl) ────────────────

  // Connections → peer profile
  if (t.startsWith('connection.')) {
    const peer = resolveConnectionPeerUserId(d, options?.currentUserId) ?? options?.actorUserId;
    if (peer) return `/${enc(peer)}`;
    return '/feed';
  }

  // New follower → their profile
  if (t === 'follow.new') {
    const follower = pickString(d, ['followerId']);
    return follower ? `/${enc(follower)}` : '/profile?m=friends';
  }

  // Payments, payouts, vendor status, KYC
  if (t === 'payment.confirmed' || t === 'payment.failed') return '/wallet';
  if (t === 'escrow.released') return '/vendors/payouts';
  if (t === 'vendor.verified' || t === 'vendor.suspended') return '/vendors';
  if (t === 'kyc.approved') return '/profile';
  if (t === 'kyc.rejected') return '/verifykyc';

  // Support cases → the case inside its owning community / association
  if (t.startsWith('case.')) {
    const section = ownerSection(pickString(d, ['ownerType']));
    const ownerId = pickString(d, ['ownerEntityId']);
    const caseId = pickString(d, ['caseId']);
    if (section && ownerId) {
      return `/${section}/${enc(ownerId)}?tab=support${caseId ? `&case=${enc(caseId)}` : ''}`;
    }
    return '/notification';
  }

  // Published resource → the owning community / association
  if (t === 'resource.published') {
    const section = ownerSection(pickString(d, ['ownerType']));
    const ownerId = pickString(d, ['ownerEntityId']);
    return section && ownerId ? `/${section}/${enc(ownerId)}` : '/feed';
  }

  // Calendar reminder → that owner's calendar (personal reminders → events)
  if (t === 'calendar.reminder') {
    const section = ownerSection(pickString(d, ['ownerType']));
    const ownerId = pickString(d, ['ownerId']);
    return section && ownerId ? `/${section}/${enc(ownerId)}?tab=events&calendar=1` : '/events';
  }

  // Skills (endorsements…) live in work experience under About
  if (t.startsWith('skill.')) return '/profile?tab=about';

  // Suggested people
  if (t === 'friend.suggestion' || t === 'alumni.match' || t === 'colleague.match') {
    return '/profile?m=friends&t=2';
  }

  // Post comment / reply: open the post and deep-link to the triggering comment
  if (
    (t === 'post.comment' ||
      t === 'post.commented' ||
      t === 'post.reply' ||
      t === 'post.replied') &&
    d?.postId
  ) {
    const pid = enc(String(d.postId));
    const commentId = pickString(d, [
      'commentId',
      'targetCommentId',
      'targetId',
      'replyCommentId',
      'replyId',
    ]);
    if (commentId) {
      return `/post/${pid}?commentId=${enc(commentId)}`;
    }
    return `/post/${pid}`;
  }

  // Other post interactions (like, mention, …) → post detail
  if (t.startsWith('post.') && d?.postId) {
    return `/post/${enc(String(d.postId))}`;
  }

  // Opportunities (new, application submitted/accepted/rejected, …) → opportunity detail
  const opportunityId = pickString(d, [
    'opportunityId',
    'jobId',
    'listingId',
    'applicationOpportunityId',
  ]);
  if (t.includes('opportunity') && opportunityId) {
    return `/opportunities/${enc(opportunityId)}`;
  }

  // Service requests → the request's Track Requests detail in its owning community / association
  if (t.startsWith('servicerequest')) {
    // No owner type (older rows) means the community form they always used; an
    // owner type with no page here (MARKETPLACE, SYSTEM) has nowhere to open.
    const ownerType = pickString(d, ['ownerType']);
    const section = ownerType ? ownerSection(ownerType) : 'community';
    if (!section) return '/notification';
    const ownerId = pickString(d, ['ownerEntityId', 'communityId', 'entityId']);
    const requestId = pickString(d, ['requestId', 'serviceRequestId', 'id']);
    if (ownerId && requestId) {
      return `/${section}/${enc(ownerId)}?tab=track-requests&request=${enc(requestId)}`;
    }
    if (ownerId) return `/${section}/${enc(ownerId)}?tab=track-requests`;
    // The server's actionUrl for these points at a route that doesn't exist.
    return '/notification';
  }

  // Events → event detail when we have an id, else the events list. Owner-facing
  // types open the manage page.
  if (t.startsWith('event.')) {
    if (d?.eventId) {
      const eid = enc(String(d.eventId));
      if (t === 'event.completed' || t === 'event.ticket.sold_out' || t === 'event.check_in') {
        return `/events/${eid}/manage`;
      }
      return `/events/${eid}`;
    }
    return '/events';
  }

  // Association / community membership — route to the specific page when we can
  const isAssociationHint = entityType === 'association' || t.includes('association');
  const isCommunityHint = entityType === 'community' || t.includes('community');
  if ((t.startsWith('membership.') || isAssociationHint || isCommunityHint) && d?.entityId) {
    const section = isAssociationHint ? 'association' : 'community';
    return `/${section}/${enc(String(d.entityId))}`;
  }

  // Daily group-chat digest → open that specific group's conversation
  if (t.startsWith('group.chat.digest')) {
    const gid = pickString(d, ['groupId']);
    return gid ? `/chat?ct=group&gid=${enc(gid)}` : '/chat?ct=group';
  }

  // Messages → chat, with a tab hint so the right panel opens. Deep-link to the
  // specific group when we know its id.
  if (t.startsWith('group.message') || t === 'group.message.received') {
    const gid = pickString(d, ['groupId']);
    // A private reply opens inside its group chat, in its own panel.
    const pr = pickString(d, ['privateReplyId']);
    if (gid && pr) return `/chat?ct=group&gid=${enc(gid)}&pr=${enc(pr)}`;
    return gid ? `/chat?ct=group&gid=${enc(gid)}` : '/chat?ct=group';
  }
  if (t.startsWith('message.')) {
    return '/chat?ct=direct';
  }

  // ── 2. Direct entity ids in `data` ───────────────────────────────────────────

  if (d?.postId) return `/post/${enc(String(d.postId))}`;
  if (opportunityId) return `/opportunities/${enc(opportunityId)}`;
  if (d?.eventId) return `/events/${enc(String(d.eventId))}`;

  if (d?.groupId && d?.messageId) return '/chat?ct=group';
  if (d?.conversationId) return '/chat?ct=direct';

  if (d?.connectionId) {
    const peerId = pickString(d, [
      'requesterId',
      'senderId',
      'actorId',
      'userId',
      'fromUserId',
      'receiverId',
    ]);
    if (peerId) return `/${enc(peerId)}`;
    return '/feed';
  }

  if (d?.entityId && entityType) {
    const section = entityType === 'association' ? 'association' : 'community';
    return `/${section}/${enc(String(d.entityId))}`;
  }

  // ── 3. Server-provided link (last resort — legacy/API-style shapes rewritten, then
  //      accepted only if it is a real same-origin route) ───────────────────────────

  for (const raw of [notification.link, notification.actionUrl]) {
    const safe = sanitizeServerPath(raw);
    if (!safe) continue;
    const normalized = normalizeLegacyAppPath(safe);
    if (isKnownAppPath(normalized)) return normalized;
  }

  return undefined;
}
