'use client';

import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { deriveKindDelta, type ReactionKind } from '@/components/reactions/reactionAdapter';
import { readMutationOutcome, refusalMessageKey } from '@/lib/mutationOutcome';
import {
  ADD_ENGAGEMENT,
  REMOVE_ENGAGEMENT,
  CREATE_COMMENT,
  type AddEngagementData,
  type RemoveEngagementData,
  type CreateCommentData,
} from '@/services/gql/postsFeed';

type UpdatePostCounts = (
  postId: string,
  delta: Partial<{ likes: number; comments: number; shares: number; saves: number; hasLiked: boolean; hasSaved: boolean; myReaction: 'HAPPY' | 'HOPEFUL' | 'SAD' | null; happy: number; hopeful: number; sad: number }>,
) => void;

/**
 * The reaction / save / share / comment handlers every full post card needs,
 * shared by Home and Community so both keep the same optimistic updates and
 * rollbacks (moved verbatim out of the Home page).
 */
export function usePostEngagementHandlers(updatePostCounts: UpdatePostCounts) {
  // Root-scoped on purpose: `refusalMessageKey` returns a FULLY QUALIFIED key.
  const tRoot = useTranslations();
  const [addEngagement] = useMutation<AddEngagementData>(ADD_ENGAGEMENT);
  const [removeEngagement] = useMutation<RemoveEngagementData>(REMOVE_ENGAGEMENT);
  const [createComment] = useMutation<CreateCommentData>(CREATE_COMMENT);

  // Wrapped in useCallback so the references stay stable across home-page
  // re-renders. The cards are memoised — if these handlers churned on every
  // render every visible card would re-render too, which was the main cause
  // of stutter at the `loadMore` boundary.
  // Apollo is configured with `errorPolicy: 'all'`, so a REFUSED mutation
  // RESOLVES with `data: null` instead of throwing — the try/catch below
  // never fires for a server refusal, only for a transport failure. Every
  // optimistic engagement therefore has to be gated on
  // `readMutationOutcome` or a refused reaction would sit on screen looking
  // successful forever. The rollback re-runs the inverse delta, which the
  // card picks up through its prop-sync effects.
  const handleReact = useCallback(
    async (
      postId: string,
      op: 'add' | 'remove',
      reaction: ReactionKind | null,
      delta: number,
      // Deliberately NOT defaulted. A default made every call site compile
      // while silently rolling back to the wrong reaction, which is exactly
      // the kind of omission tsc should be catching for us.
      previousReaction: ReactionKind | null,
    ) => {
      const adding = op === 'add';
      // `delta` comes from the card, which knows the BEFORE state. A SWITCH
      // (Happy→Sad) sends 0: the server updates the row in place rather than
      // inserting a second one, so the total must not move.
      // What hasLiked was BEFORE this change, derived from the transition:
      //   remove            -> was reacted
      //   add with delta 0  -> a switch, so was already reacted
      //   add with delta 1  -> a first reaction, so was not
      const wasReacted = !adding || delta === 0;

      // A SWITCH moves one reaction between buckets: the old kind loses a
      // count, the new kind gains one, and the TOTAL does not move.
      //
      // `previousReaction` is null for a pre-migration untyped like, which
      // belongs to no bucket — so nothing is decremented and the untyped
      // remainder simply shrinks by one on its own. That is correct.
      const kindDelta = deriveKindDelta(previousReaction, reaction, adding);

      const toCountsDelta = (d: typeof kindDelta) => ({
        ...(d.HAPPY !== undefined ? { happy: d.HAPPY } : {}),
        ...(d.HOPEFUL !== undefined ? { hopeful: d.HOPEFUL } : {}),
        ...(d.SAD !== undefined ? { sad: d.SAD } : {}),
      });
      const invert = (d: typeof kindDelta) =>
        Object.fromEntries(Object.entries(d).map(([k, v]) => [k, -v])) as typeof kindDelta;

      // `myReaction` and the per-kind counts travel WITH `hasLiked`, forwards
      // and on rollback. Updating one without the others tells the card "you
      // reacted" while leaving it to guess which — and it guesses Happy — or
      // leaves the old kind sitting in the breakdown beside the new one.
      updatePostCounts(postId, {
        likes: delta,
        hasLiked: adding,
        myReaction: adding ? reaction : null,
        ...toCountsDelta(kindDelta),
      });
      const rollback = () =>
        updatePostCounts(postId, {
          likes: -delta,
          hasLiked: wasReacted,
          myReaction: previousReaction,
          ...toCountsDelta(invert(kindDelta)),
        });

      try {
        const result = adding
          ? await addEngagement({
              variables: {
                // reactionType is sent EXPLICITLY. Omitting it stores NULL —
                // an untyped like, indistinguishable from a pre-migration row.
                input: { postId, engagementType: 'LIKE', reactionType: reaction ?? 'HAPPY' },
              },
            })
          : await removeEngagement({ variables: { input: { postId, engagementType: 'LIKE' } } });
        const outcome = readMutationOutcome(result, (d) =>
          adding ? d?.addEngagement : d?.removeEngagement,
        );
        if (!outcome.ok) {
          rollback();
          toast.error(tRoot(refusalMessageKey(outcome.message, 'feed.errors')));
        }
      } catch (err) {
        rollback();
        console.error(`Failed to ${adding ? 'react to' : 'un-react'} post:`, err);
        toast.error(tRoot('feed.errors.failed'));
      }
    },
    [addEngagement, removeEngagement, updatePostCounts, tRoot],
  );

  const handleSave = useCallback(async (postId: string, saved: boolean) => {
    updatePostCounts(postId, { saves: saved ? 1 : -1, hasSaved: saved });
    try {
      if (saved) {
        await addEngagement({ variables: { input: { postId, engagementType: 'SAVE' } } });
      } else {
        await removeEngagement({ variables: { input: { postId, engagementType: 'SAVE' } } });
      }
    } catch (err) {
      updatePostCounts(postId, { saves: saved ? -1 : 1, hasSaved: !saved });
      console.error(`Failed to ${saved ? 'save' : 'unsave'} post:`, err);
      toast.error(`Failed to ${saved ? 'save' : 'unsave'} post`);
    }
  }, [addEngagement, removeEngagement, updatePostCounts]);

  const handleShare = useCallback(async (postId: string) => {
    updatePostCounts(postId, { shares: 1 });
    try {
      await addEngagement({ variables: { input: { postId, engagementType: 'SHARE' } } });
    } catch (err) {
      updatePostCounts(postId, { shares: -1 });
      console.error('Failed to share post:', err);
      toast.error('Failed to share post');
    }
  }, [addEngagement, updatePostCounts]);

  // Handle new comment (or reply when parentId is set)
  const handleSendComment = useCallback(async (postId: string, content: string, parentId?: string, mentions?: import('@/components/custom/richTextRenderer').MentionInputItem[]) => {
    if (!content.trim()) return;

    updatePostCounts(postId, { comments: 1 });
    try {
      await createComment({
        variables: {
          input: {
            postId,
            text: content,
            idempotencyKey: crypto.randomUUID(),
            ...(parentId ? { parentId } : {}),
            ...(mentions?.length ? { mentions } : {}),
          }
        }
      });
      // The post.comment.created Kafka event published by the
      // CreateCommentHandler is the canonical signal — no client-side
      // dual-fire needed (removed to avoid double-counting).

      toast.success('Comment posted!');
    } catch (err) {
      updatePostCounts(postId, { comments: -1 });
      console.error('Failed to post comment:', err);
      toast.error('Failed to post comment');
      throw err;
    }
  }, [createComment, updatePostCounts]);

  return { handleReact, handleSave, handleShare, handleSendComment };
}
