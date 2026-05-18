'use client';

/**
 * SimilarPosts — calls the recommendation-service `similarPosts(postId, limit)` GraphQL query
 * and renders a compact list of related posts below the comments section of the post-detail page.
 *
 * Hydration strategy: the recommendation query returns IDs + ranking metadata only. We hydrate
 * by issuing N parallel `GET_POST` calls (one per ranked id) and re-sort the resolved posts
 * back into the original ranking order. Empty / failure states render nothing (best-effort) so
 * the page stays usable when recommendation-service is degraded.
 *
 * TODO (perf): replace the N×GET_POST fan-out with a batched `postsByIds(ids: [String!]!)` query
 *   once post-feed-service exposes one. With N=10 the cost is ~10 round-trips today.
 */

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useQuery, useApolloClient } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { GET_POST, SIMILAR_POSTS } from '@/services/gql/postsFeed';
import type { GetPostData, FeedPostFragment, Post } from '@/services/gql/types/postsFeed';
import type { SimilarPostsData, RankedItemGQL } from '@/services/gql/types/recommendation';
import { normalizeFeedPost } from '@/lib/normalizeFeedPost';
import { formatDateProximity } from '@/macros/time';

interface SimilarPostsProps {
  postId: string;
  limit?: number;
}

interface HydratedItem {
  ranked: RankedItemGQL;
  post: Post;
}

function pickDisplayName(post: Post): string {
  const org = post.authorProfile?.organizationProfile;
  if (org?.name?.trim()) return org.name.trim();
  const user = post.authorProfile?.userProfile;
  if (user?.name?.trim()) return user.name.trim();
  return 'Member';
}

function pickAvatar(post: Post): string {
  const org = post.authorProfile?.organizationProfile;
  if (org?.logo?.trim()) return org.logo.trim();
  const user = post.authorProfile?.userProfile;
  if (user?.avatar?.trim()) return user.avatar.trim();
  return '/PROFILE.png';
}

function makeExcerpt(text: string, max = 140): string {
  const trimmed = (text || '').replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trimEnd() + '…';
}

export default function SimilarPosts({ postId, limit = 10 }: SimilarPostsProps) {
  const router = useRouter();
  const client = useApolloClient();

  const { data, loading, error } = useQuery<SimilarPostsData>(SIMILAR_POSTS, {
    variables: { postId, limit },
    skip: !postId,
    // Recommendation service can return NOT_FOUND / be degraded — don't blow up the page.
    errorPolicy: 'ignore',
    fetchPolicy: 'cache-first',
  });

  const rankedItems = useMemo<RankedItemGQL[]>(() => {
    // Apollo's typed `data` is a DeepPartial — narrow to fully-formed RankedItemGQL.
    const raw = (data?.similarPosts?.items ?? []) as Array<Partial<RankedItemGQL> | undefined>;
    const items: RankedItemGQL[] = [];
    for (const i of raw) {
      if (!i || typeof i.itemId !== 'string' || typeof i.source !== 'string') continue;
      if (i.itemType && i.itemType !== 'POST') continue; // Phase 1: POST only
      items.push({
        itemId: i.itemId,
        itemType: i.itemType ?? 'POST',
        score: typeof i.score === 'number' ? i.score : 0,
        authorId: i.authorId ?? null,
        topics: i.topics ?? null,
        source: i.source,
        createdAt: i.createdAt ?? null,
      });
    }
    return items;
  }, [data]);

  const [hydrated, setHydrated] = useState<HydratedItem[] | null>(null);
  const [hydrating, setHydrating] = useState(false);

  useEffect(() => {
    if (!rankedItems.length) {
      setHydrated([]);
      return;
    }

    let cancelled = false;
    setHydrating(true);

    // Parallel fan-out hydration. Each request goes through Apollo cache so re-renders are cheap.
    Promise.all(
      rankedItems.map((r) =>
        client
          .query<GetPostData>({
            query: GET_POST,
            variables: { id: r.itemId },
            fetchPolicy: 'cache-first',
            errorPolicy: 'ignore',
          })
          .then((res) => {
            const raw = res.data?.post as FeedPostFragment | undefined;
            if (!raw) return null;
            try {
              return { ranked: r, post: normalizeFeedPost(raw) } as HydratedItem;
            } catch {
              return null;
            }
          })
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return;
      // Preserve the rank order returned by recommendation-service — not the resolution order.
      const order = new Map(rankedItems.map((r, idx) => [r.itemId, idx]));
      const ok = (results.filter(Boolean) as HydratedItem[]).sort(
        (a, b) => (order.get(a.post.id) ?? 0) - (order.get(b.post.id) ?? 0),
      );
      setHydrated(ok);
      setHydrating(false);
    });

    return () => {
      cancelled = true;
    };
  }, [rankedItems, client]);

  // Best-effort surface: any unhandled error → render nothing.
  if (error && !data) return null;

  const showSkeleton = loading || hydrating || hydrated === null;

  if (showSkeleton) {
    return (
      <section aria-label="Similar posts" className="mt-4 w-full min-w-0">
        <h2 className="label-large text-text-primary mb-3">Similar posts</h2>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 w-full rounded-lg bg-surface-alt animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (!hydrated.length) {
    return (
      <section aria-label="Similar posts" className="mt-4 w-full min-w-0">
        <h2 className="label-large text-text-primary mb-2">Similar posts</h2>
        <p className="body-small text-text-secondary">No similar posts yet</p>
      </section>
    );
  }

  return (
    <section aria-label="Similar posts" className="mt-4 w-full min-w-0">
      <h2 className="label-large text-text-primary mb-3">Similar posts</h2>
      <ul className="space-y-2">
        {hydrated.map(({ ranked, post }) => {
          const name = pickDisplayName(post);
          const avatar = pickAvatar(post);
          const excerpt = makeExcerpt(post.text, 140);
          const topics = (ranked.topics ?? []).slice(0, 3);

          return (
            <li key={post.id}>
              <button
                type="button"
                onClick={() => router.push(`/post/${post.id}`)}
                className="w-full text-left rounded-lg border border-border bg-surface px-3 py-2 hover:bg-surface-alt focus:outline-none focus-visible:ring-2 focus-visible:ring-text-brand transition-colors"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <div className="h-8 w-8 flex-shrink-0 rounded-full overflow-hidden bg-surface-alt">
                    <Image
                      src={avatar}
                      alt=""
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="caption-medium text-text-primary truncate">{name}</span>
                      <span className="body-small text-text-tertiary truncate">
                        · {formatDateProximity(post.createdAt)}
                      </span>
                    </div>
                    {excerpt ? (
                      <p className="body-small text-text-secondary mt-0.5 line-clamp-2 break-words">
                        {excerpt}
                      </p>
                    ) : null}
                    {topics.length ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {topics.map((t) => (
                          <span
                            key={t}
                            className="caption-medium text-text-brand bg-surface-alt rounded-full px-2 py-0.5"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
