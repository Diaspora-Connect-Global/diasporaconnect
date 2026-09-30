import type { PrivateReply, PrivateReplySystemEvent } from '@/services/gql/privateReplies';

/**
 * Pure helpers for private replies (a private conversation inside a group
 * chat). Everything that turns ids into words lives here so the "never show a
 * user id" rule is enforced in one place: a person is always a resolved name,
 * "you", or the translated "a former member" — never an id.
 */

/** Resolves a user id to a display name, or null when unknown (left the group, deleted). */
export type NameOf = (userId: string) => string | null;

export interface PersonLabels {
    /** "you" as the object of a sentence / in a list ("added you and Esi"). */
    you: string;
    /** A deleted account (the server sends an empty id). */
    formerMember: string;
    /**
     * Someone this client can't name: not among the loaded group members (a
     * large group, or they left). Neutral on purpose — "former member" would be
     * wrong for a current member we simply haven't loaded.
     */
    unknown: string;
}

/** One person, as words. Empty/missing id = a deleted account. */
export function personLabel(
    userId: string | null | undefined,
    currentUserId: string | null | undefined,
    nameOf: NameOf,
    labels: PersonLabels,
): string {
    if (!userId) return labels.formerMember;
    if (currentUserId && userId === currentUserId) return labels.you;
    return nameOf(userId) || labels.unknown;
}

/** Joins names the way the locale does ("Ama, Esi and you"). */
export function joinNames(names: string[], locale: string): string {
    if (names.length <= 1) return names[0] ?? '';
    try {
        return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(names);
    } catch {
        return names.join(', ');
    }
}

/**
 * Who can see a private reply, as a sentence fragment: the other members by
 * name first, "you" last ("Ama, Esi and you").
 */
export function audienceText(
    memberUserIds: string[],
    currentUserId: string | null | undefined,
    nameOf: NameOf,
    labels: PersonLabels,
    locale: string,
): string {
    const others = memberUserIds
        .filter((id) => id !== currentUserId)
        .map((id) => personLabel(id, currentUserId, nameOf, labels));
    const includesMe = !!currentUserId && memberUserIds.includes(currentUserId);
    return joinNames(includesMe ? [...others, labels.you] : others, locale);
}

/** Translation function shape (next-intl's `t` with ICU values). */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * The line shown for a membership change ("Kofi added Kwame"). Keys live under
 * `chat.group.privateReply.events.*` and use ICU `select` on `self`
 * ("yes" when the current user is the actor/subject) because verbs conjugate
 * differently for "you" in most of our locales.
 * Returns '' for an event kind this client doesn't know.
 */
export function describeSystemEvent(
    event: PrivateReplySystemEvent,
    currentUserId: string | null | undefined,
    nameOf: NameOf,
    labels: PersonLabels,
    locale: string,
    t: Translate,
): string {
    const actorId = event.actorUserId || '';
    const targets = event.targetUserIds ?? [];
    const self = (id: string) => (!!currentUserId && id === currentUserId ? 'yes' : 'no');
    const name = (id: string) => personLabel(id, currentUserId, nameOf, labels);
    const firstTarget = targets[0] ?? '';
    const line = (text: string) => (text ? text.charAt(0).toLocaleUpperCase(locale) + text.slice(1) : '');

    switch (event.kind) {
        case 'STARTED':
            return line(t('events.started', { self: self(actorId), actor: name(actorId) }));
        case 'MEMBERS_ADDED': {
            const onlyMe = targets.length === 1 && self(firstTarget) === 'yes';
            return line(
                t('events.added', {
                    self: self(actorId),
                    actor: name(actorId),
                    targetSelf: onlyMe ? 'yes' : 'no',
                    names: joinNames(targets.map(name), locale),
                }),
            );
        }
        case 'MEMBER_REMOVED':
            return line(t('events.removed', { self: self(actorId), actor: name(actorId), name: name(firstTarget) }));
        case 'MEMBER_LEFT':
            return line(t('events.left', { self: self(firstTarget), name: name(firstTarget) }));
        case 'MEMBER_LEFT_GROUP':
            return line(t('events.leftGroup', { self: self(firstTarget), name: name(firstTarget) }));
        case 'MANAGER_CHANGED':
            return line(t('events.managerChanged', { self: self(firstTarget), name: name(firstTarget) }));
        default:
            return '';
    }
}

/** The viewer's private replies keyed by the group message they started from. */
export function groupByAnchor(replies: readonly PrivateReply[]): Map<string, PrivateReply[]> {
    const map = new Map<string, PrivateReply[]>();
    for (const reply of replies) {
        const anchorId = reply.anchor?.messageId;
        if (!anchorId) continue;
        const list = map.get(anchorId) ?? [];
        list.push(reply);
        map.set(anchorId, list);
    }
    return map;
}

/** Total unread across the viewer's private replies in one group. */
export function totalUnread(replies: readonly PrivateReply[]): number {
    return replies.reduce((sum, r) => sum + (r.isMember ? Math.max(0, r.unreadCount || 0) : 0), 0);
}

/**
 * How many more people can be added: the platform maximum counts everyone,
 * including whoever started it. Never negative (a conversation over a lowered
 * limit keeps its people but can't add more).
 */
export function remainingSlots(memberCount: number, maxMembers: number): number {
    return Math.max(0, maxMembers - memberCount);
}

/** Translation key (under `chat.group.privateReply.errors`) for a refused private-reply operation. */
export type PrivateReplyErrorKey =
    | 'limitReached'
    | 'forbidden'
    | 'managementDisabled'
    | 'notFound'
    | 'invalid'
    | 'unavailable'
    | 'generic';

const ERROR_CODE_TO_KEY: Record<string, PrivateReplyErrorKey> = {
    PRIVATE_REPLY_LIMIT_REACHED: 'limitReached',
    PRIVATE_REPLY_FORBIDDEN: 'forbidden',
    PRIVATE_REPLY_MANAGEMENT_DISABLED: 'managementDisabled',
    PRIVATE_REPLY_NOT_FOUND: 'notFound',
    PRIVATE_REPLY_INVALID: 'invalid',
    PRIVATE_REPLY_UNAVAILABLE: 'unavailable',
};

/**
 * Maps a GraphQL error (Apollo's CombinedGraphQLErrors, or anything with an
 * `errors` array / `graphQLErrors`) to a translated-message key via the
 * `extensions.code` the gateway passes through. Never returns raw server text.
 */
export function privateReplyErrorKey(error: unknown): PrivateReplyErrorKey {
    const e = error as { errors?: unknown; graphQLErrors?: unknown } | null | undefined;
    const list = (Array.isArray(e?.errors) ? e?.errors : Array.isArray(e?.graphQLErrors) ? e?.graphQLErrors : []) as Array<{
        extensions?: { code?: unknown };
    }>;
    for (const item of list) {
        const code = typeof item?.extensions?.code === 'string' ? item.extensions.code : '';
        if (ERROR_CODE_TO_KEY[code]) return ERROR_CODE_TO_KEY[code];
    }
    return 'generic';
}
