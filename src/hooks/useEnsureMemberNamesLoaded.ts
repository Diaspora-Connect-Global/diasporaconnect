'use client';

import { useEffect, useRef } from 'react';
import type { NameOf } from '@/lib/privateReplies';

/**
 * Group members load in pages (`GET_GROUP_MEMBERS`). A private reply can
 * reference a member outside the pages loaded so far — a group over 100
 * people is the common case — and that member then renders as "a member"
 * instead of their name even though they are a real, current member.
 *
 * The gateway has no "profiles by id" batch lookup a regular user can call
 * for just the missing ids (`batchGetUserProfiles` is an internal gRPC
 * client used by admin-only/staff resolvers), so the only way to find a name
 * with what exists today is to page in more group members until the id
 * turns up. This hook does exactly that — automatically, but only when
 * something actually on screen needs a name it doesn't have yet, and only
 * while the roster isn't exhausted. It is self-limiting: once every id in
 * `ids` resolves, or `hasMore` goes false, it stops calling `onLoadMore`. A
 * small or fully-loaded group therefore never triggers a single extra
 * request.
 *
 * `MAX_AUTO_PAGES` is a belt-and-braces ceiling in case `hasMore` ever gets
 * stuck true — a real group runs out via `hasMore` long before it matters.
 */
const MAX_AUTO_PAGES = 50;

export function useEnsureMemberNamesLoaded(
    ids: readonly (string | null | undefined)[],
    nameOf: NameOf,
    currentUserId: string | null | undefined,
    hasMore: boolean,
    loadingMore: boolean,
    onLoadMore: () => void,
): void {
    const pagesRequestedRef = useRef(0);

    useEffect(() => {
        if (!hasMore || loadingMore) return;
        if (pagesRequestedRef.current >= MAX_AUTO_PAGES) return;
        const unresolved = ids.some((id) => !!id && id !== currentUserId && nameOf(id) === null);
        if (!unresolved) return;
        pagesRequestedRef.current += 1;
        onLoadMore();
    }, [ids, nameOf, currentUserId, hasMore, loadingMore, onLoadMore]);
}
