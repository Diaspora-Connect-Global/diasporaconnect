'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { MessageSquare, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { REACTION_LABEL_KEY, REACTION_ORDER, reactionIcon, SELECTED_DISC, type ReactionKind } from '@/components/reactions/reactionAdapter';
import { ADD_ENGAGEMENT, REMOVE_ENGAGEMENT, type AddEngagementData, type RemoveEngagementData } from '@/services/gql/postsFeed';
import { readMutationOutcome } from '@/lib/mutationOutcome';
import { Link } from '@/i18n/navigation';

/**
 * The action row of a community-post card, using the platform's own reactions:
 * Happy, Hopeful and Sad (never a "Like"), the real comment total, and Share.
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

  const react = async (kind: ReactionKind) => {
    const prev = { selected, total, liked };
    const clearing = selected === kind;
    setSelected(clearing ? null : kind);
    setLiked(!clearing);
    setTotal((n) => Math.max(0, n + (clearing ? -1 : liked ? 0 : 1)));
    try {
      const res = clearing
        ? await remove({ variables: { input: { postId, engagementType: 'LIKE' } } })
        : await add({ variables: { input: { postId, engagementType: 'LIKE', reactionType: kind } } });
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
      <div className="flex min-w-0 items-center gap-1" role="group" aria-label={t('choose')}>
        {REACTION_ORDER.map((kind) => {
          const on = selected === kind;
          const Icon = reactionIcon(kind, on);
          const label = t(REACTION_LABEL_KEY[kind]);
          return (
            <button
              key={kind}
              type="button"
              onClick={() => react(kind)}
              aria-pressed={on}
              aria-label={label}
              title={label}
              data-reaction={kind}
              className={`grid size-7 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand ${on ? `${SELECTED_DISC} text-white` : 'hover:bg-surface-subtle hover:text-text-primary'}`}
            >
              <Icon className="size-4" aria-hidden />
            </button>
          );
        })}
        {total > 0 && <span className="ml-1 tabular-nums">{total}</span>}
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
