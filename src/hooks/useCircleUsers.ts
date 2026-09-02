'use client';

import { useEffect, useMemo, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { GET_USER_PROFILE } from '@/services/gql/profile';
import { toCdnUrl } from '@/lib/cdn';

/**
 * Resolve display identities for a small set of user ids.
 *
 * ## Why this exists
 *
 * Nothing in the circle GraphQL surface resolves a user profile: `circleMembers`,
 * `circleLeaderboard.rows`, `circleContributions` and `goalProgress.byMember` all
 * come back as a bare `userId`. Four of the eight Circles screens show people, so
 * without a single shared resolver each screen would grow its own — and they would
 * drift on fallbacks, avatar handling and loading behaviour.
 *
 * ## Why N queries instead of one batch query
 *
 * There is no batch profile query in this API (`searchUsers` is a text search, not
 * a lookup by id list). The existing precedent is `useEnrichedNotification`, which
 * issues one `GET_USER_PROFILE` per subject and degrades gracefully.
 *
 * That is acceptable *here specifically* because a Circle is small by design — the
 * member cap is an entitlement (12 on the free plan), not an unbounded list — and
 * Apollo dedupes identical `getProfile(userId)` documents, so the same person
 * appearing in the members list, the leaderboard and a contribution row costs one
 * request. **Do not reuse this hook for an unbounded list** (a feed, a search
 * result page); it would issue one request per row. If Circles ever grows an
 * unbounded people list, add a real batch query to the gateway instead of paging
 * this.
 *
 * Resolution is best-effort by contract: a failed or missing profile yields a
 * `null` name and the caller renders its own fallback, exactly as
 * `useEnrichedNotification` documents. A person who cannot be resolved must still
 * appear in the list — dropping them would silently under-report a leaderboard or
 * a members count.
 */
export interface CircleUser {
  userId: string;
  /** Full display name, or null when the profile could not be resolved. */
  name: string | null;
  /** First name, for tighter strings ("Proposed by Nana"). */
  firstName: string | null;
  /** CDN-rewritten avatar URL, or null. */
  avatarUrl: string | null;
}

interface GetProfileResponse {
  getProfile?: {
    success?: boolean;
    profile?: {
      userId?: string;
      firstName?: string | null;
      lastName?: string | null;
      avatarUrl?: string | null;
    } | null;
  } | null;
}

/** Map a raw profile response onto the display shape. Never throws. */
function toCircleUser(userId: string, data: GetProfileResponse | undefined): CircleUser {
  const p = data?.getProfile?.profile;
  const first = p?.firstName?.trim() || null;
  const last = p?.lastName?.trim() || null;
  return {
    userId,
    name: [first, last].filter(Boolean).join(' ') || null,
    firstName: first,
    avatarUrl: p?.avatarUrl ? toCdnUrl(p.avatarUrl) : null,
  };
}

/** Resolve one user. Safe to call with an empty id — the query is skipped. */
export function useCircleUser(userId?: string | null): {
  user: CircleUser | null;
  loading: boolean;
} {
  const { data, loading } = useQuery<GetProfileResponse>(GET_USER_PROFILE, {
    variables: { userId: userId ?? '' },
    skip: !userId,
    // Identities change rarely and are read on nearly every Circles screen;
    // serving them from cache keeps a members list from re-fetching on each
    // mount. The global default in this app is `network-only`, so this is a
    // deliberate override rather than an inherited default.
    fetchPolicy: 'cache-first',
    errorPolicy: 'all',
  });

  const user = useMemo<CircleUser | null>(
    () => (userId ? toCircleUser(userId, data) : null),
    [userId, data],
  );

  return { user, loading };
}

/**
 * Resolve several users at once and index them by id.
 *
 * The id list does NOT need to be memoised: the effect keys on the sorted,
 * deduped *contents* of the list, not its identity, so building the array inline
 * from a query result on every render is fine and re-ordering it re-fetches
 * nothing. Keep the list small — see the note on batching above.
 */
export function useCircleUsers(userIds: string[]): {
  usersById: Record<string, CircleUser>;
  loading: boolean;
} {
  const client = useApolloClient();
  const [usersById, setUsersById] = useState<Record<string, CircleUser>>({});
  const [loading, setLoading] = useState(false);

  // Deduped + sorted, and joined to a primitive so the effect depends on the
  // CONTENT of the list rather than the array identity — callers build these
  // arrays inline from query results, so a fresh array every render is the
  // normal case, not the exception.
  const key = useMemo(
    () => Array.from(new Set(userIds.filter(Boolean))).sort().join(','),
    [userIds],
  );

  useEffect(() => {
    const ids = key ? key.split(',') : [];
    if (ids.length === 0) {
      setUsersById({});
      return;
    }

    // Fetched imperatively rather than by mapping `useCircleUser` over the list:
    // a hook called in a loop breaks the rules of hooks the moment the list
    // length changes between renders, which for a members list is every time
    // somebody joins. Apollo still caches each `getProfile(userId)`, so a person
    // shown on several screens is fetched once.
    let cancelled = false;
    setLoading(true);

    Promise.all(
      ids.map((userId) =>
        client
          .query<GetProfileResponse>({
            query: GET_USER_PROFILE,
            variables: { userId },
            fetchPolicy: 'cache-first',
            errorPolicy: 'all',
          })
          .then(({ data }) => toCircleUser(userId, data))
          // Best-effort by contract: one unresolvable profile must not blank the
          // whole list, so a rejection yields an unnamed entry and the caller
          // renders its fallback.
          .catch(() => toCircleUser(userId, undefined)),
      ),
    ).then((resolved) => {
      if (cancelled) return;
      const map: Record<string, CircleUser> = {};
      for (const u of resolved) map[u.userId] = u;
      setUsersById(map);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [key, client]);

  return { usersById, loading };
}

/**
 * The label to render when a profile could not be resolved.
 *
 * Deliberately not "Unknown" or an empty string: the person is a real member of
 * this circle whose name we failed to load, and the UI should read as a loading
 * gap rather than an accusation that they do not exist.
 */
export function circleUserDisplayName(
  user: CircleUser | null | undefined,
  fallback: string,
): string {
  return user?.name?.trim() || fallback;
}
