'use client';

import { useEffect, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { GET_POSTS_BY_IDS, JOINED_COMMUNITY_FEED } from '@/services/gql/postsFeed';
import type { JoinedCommunityFeedData } from '@/services/gql/types/recommendation';
import type { GetPostsByIdsData, Post } from '@/services/gql/types/postsFeed';
import { normalizeFeedPost } from '@/lib/normalizeFeedPost';

/**
 * The newest few posts from the communities the viewer belongs to, for the
 * "From your community" section on Home and Discover. Two small round trips
 * (ranked ids, then the posts by id) that do NOT touch the main feed's cache,
 * so the full feed below keeps its own paging state. `skip` defers the work.
 */
export function useCommunityPostPreview(limit = 3, skip = false): { posts: Post[]; loading: boolean } {
  const client = useApolloClient();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(!skip);

  useEffect(() => {
    if (skip) return;
    let cancelled = false;
    (async () => {
      try {
        const ranked = await client.query<JoinedCommunityFeedData>({
          query: JOINED_COMMUNITY_FEED,
          variables: { limit },
          fetchPolicy: 'network-only',
          context: { silentErrors: true },
        });
        const ids = (ranked.data?.joinedCommunityFeed?.items ?? []).map((i) => i.itemId).filter(Boolean).slice(0, limit);
        if (!ids.length) return;
        const full = await client.query<GetPostsByIdsData>({
          query: GET_POSTS_BY_IDS,
          variables: { ids },
          context: { silentErrors: true },
        });
        const byId = new Map((full.data?.postsByIds ?? []).filter(Boolean).map((p) => [p.id, p]));
        const ordered = ids.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
        if (!cancelled) setPosts(ordered.map((p) => normalizeFeedPost(p)));
      } catch {
        // A section that cannot load simply stays hidden.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, limit, skip]);

  return { posts, loading };
}
