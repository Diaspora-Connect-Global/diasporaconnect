'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { MessageSquare, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import ReactionButton from '@/components/reactions/ReactionButton';
import type { ReactionKind } from '@/components/reactions/reactionAdapter';
import { ADD_ENGAGEMENT, REMOVE_ENGAGEMENT, type AddEngagementData, type RemoveEngagementData } from '@/services/gql/postsFeed';
import { readMutationOutcome } from '@/lib/mutationOutcome';
import { Link } from '@/i18n/navigation';

/**
 * The action row of a community-post card: the shared ReactionButton (hover or
 * press-and-hold opens Happy / Hopeful / Sad; never a "Like"), the real comment
 * total, and Share.
 * Reacting uses the same addEngagement / removeEngagement writes as the feed, is
 * optimistic, and rolls back when the server refuses.
 */
export function PostReactionRow({
  postId,
  likes,
  comments,
  mine,
  hasLiked,
}: {
  postId: string;
  likes: number;
  comments: number;
  mine?: ReactionKind | null;
  hasLiked?: boolean;
}) {
  const t = useTranslations('reactions');
  const tRoot = useTranslations();
  const tMeta = useTranslations('redesign.postMeta');
  const [selected, setSelected] = useState<ReactionKind | null>(mine ?? null);
  const [total, setTotal] = useState(likes);
  const [liked, setLiked] = useState(!!hasLiked || !!mine);
  const [add] = useMutation<AddEngagementData>(ADD_ENGAGEMENT, { context: { silentErrors: true } });
  const [remove] = useMutation<RemoveEngagementData>(REMOVE_ENGAGEMENT, { context: { silentErrors: true } });

  const react = async (kind: ReactionKind | null) => {
    const prev = { selected, total, liked };
    const clearing = kind === null;
    setSelected(kind);
    setLiked(!clearing);
    setTotal((n) => Math.max(0, n + (clearing ? -1 : liked ? 0 : 1)));
    try {
      const res = clearing
        ? await remove({ variables: { input: { postId, engagementType: 'LIKE' } } })
        : await add({ variables: { input: { postId, engagementType: 'LIKE', reactionType: kind as ReactionKind } } });
      const outcome = readMutationOutcome(res, (d) => (clearing ? d?.removeEngagement : d?.addEngagement));
      if (!outcome.ok) throw new Error('refused');
    } catch {
      setSelected(prev.selected);
      setTotal(prev.total);
      setLiked(prev.liked);
      toast.error(tRoot('feed.errors.failed'));
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/post/${encodeURIComponent(postId)}`;
    try {
      if (navigator.share) await navigator.share({ url });
      else await navigator.clipboard.writeText(url);
    } catch {
      // Cancelled share sheets and blocked clipboards are not errors worth a toast.
    }
  };

  return (
    <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground" data-testid="post-reaction-row">
      <div className="flex min-w-0 items-center gap-2">
        <ReactionButton variant="compact" selected={selected ?? (liked ? 'HAPPY' : null)} onSelect={react} />
        {total > 0 && (
          <span className="tabular-nums" aria-label={t('reactionCount', { count: total })}>
            {total}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Link href={`/post/${encodeURIComponent(postId)}`} prefetch={false} aria-label={tMeta('comments', { count: comments })} className="inline-flex items-center gap-1 hover:text-text-primary">
          <MessageSquare className="size-4" aria-hidden />
          <span className="tabular-nums">{comments}</span>
        </Link>
        <button type="button" onClick={share} className="inline-flex items-center gap-1 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
          <Share2 className="size-4" aria-hidden />
          {tMeta('share')}
        </button>
      </div>
    </div>
  );
}
